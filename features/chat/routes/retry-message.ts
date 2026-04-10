import { z } from 'zod';
import { v4 } from 'uuid';

import { procedure } from '@/server/trpc';
import { UserRole } from '@/features/shared/types/user';
import { ChatCompletionMessage } from '@/features/ai-provider/sources/types';
import { MessageRole, ContextType, Citation, DeepResearchStatus } from '@/features/chat/types/message';
import { getDeepResearchQueue } from '@/features/ai-provider/sources/deep-research/deepResearchQueue';
import {
  BadRequest,
  Forbidden,
  InternalServerError,
} from '@/features/shared/errors/routeErrors';
import logger from '@/server/logger';
import getChat from '@/features/chat/dal/getChat';
import { getChatAccess } from '@/features/chat/dal/getChatAccess';
import createMessages, {
  CreateMessagesInput,
} from '@/features/chat/dal/createMessages';
import getMessages from '@/features/chat/dal/getMessages';
import {
  extractArtifactsFromMessage,
  addChatMessageIdToArtifacts,
} from '@/features/chat/utils/artifactHelperFunctions';
import {
  extractFollowUpQuestionsFromMessage,
} from '@/features/chat/utils/followUpQuestionsHelpers';
import getContentFromKbs, {
  KbResults,
} from '@/features/chat/knowledge-bases/getContentFromKbs';
import { embedContent } from '@/features/shared/dal/document-upload/embedContent';
import getEmbeddingsForDocuments from '@/features/chat/dal/getEmbeddingsForDocuments';
import addContextToMessage from '@/features/chat/knowledge-bases/addContextToMessage';
import { addSystemInstructions } from '@/features/chat/utils/chatHelperFunctions';
import getUserKnowledgeBases from '@/features/shared/dal/getUserKnowledgeBases';
import getSystemConfig from '@/features/shared/dal/getSystemConfig';
import getDocuments from '@/features/shared/dal/document-upload/getDocuments';
import getBedrockModelAccess from '@/features/shared/dal/getBedrockModelAccess';

// This is the maximum number of messages that will be used to generate the completion
const MaxExistingMessages = -24;

const inputSchema = z.object({
  chatId: z.string().uuid(),
  customInstructions: z.string().optional(),
  knowledgeBaseIds: z.array(z.string().uuid()),
  documentIds: z.array(z.string().uuid()),
  deepResearchEnabled: z.boolean().optional(),
});

const outputSchema = z.object({
  chatId: z.string().uuid(),
  messages: z.array(
    z.object({
      id: z.string().uuid(),
      role: z.string(),
      content: z.string(),
      messagedAt: z.date(),
      citations: z.array(
        z.discriminatedUnion('contextType', [
          z.object({
            contextType: z.literal(ContextType.KNOWLEDGE_BASE),
            knowledgeBaseId: z.string().uuid(),
            sourceLabel: z.string(),
            citation: z.string(),
          }),
          z.object({
            contextType: z.literal(ContextType.DOCUMENT_LIBRARY),
            documentId: z.string().uuid(),
            sourceLabel: z.string(),
            citation: z.string(),
          }),
        ])
      ),
      artifacts: z.array(
        z.object({
          id: z.string().uuid(),
          chatMessageId: z.string().uuid(),
          label: z.string(),
          content: z.string(),
          fileExtension: z.string(),
          createdAt: z.date(),
        })
      ),
      followUps: z.array(
        z.object({
          id: z.string().uuid(),
          chatMessageId: z.string().uuid(),
          content: z.string(),
          createdAt: z.date(),
          updatedAt: z.date(),
        })
      ),
      deepResearch: z.boolean(),
      deepResearchJobId: z.string().nullable().optional(),
      deepResearchStatus: z.string().nullable().optional(),
    })
  ),
  failedKbs: z.array(z.string()).optional(),
});

export default procedure
  .input(inputSchema)
  .output(outputSchema)
  .mutation(async ({ input, ctx }) => {
    const { chatId, deepResearchEnabled, documentIds, knowledgeBaseIds } = input;

    // START: build system message context
    // Knowledge Bases
    const userKnowledgeBases = await getUserKnowledgeBases(ctx.userId);
    const selectedKnowledgeBases = userKnowledgeBases.filter(kb => knowledgeBaseIds.includes(kb.id));
    // Document Libray
    const systemConfig = await getSystemConfig();
    const documentUploadProviderId = systemConfig?.documentLibraryDocumentUploadProviderId || null;
    const hasBedrockModelAccess = await getBedrockModelAccess(ctx.userId);
    const hasDocumentLibrary = !!(documentUploadProviderId && hasBedrockModelAccess);
    const userDocuments = await getDocuments({
      userId: ctx.userId,
      documentUploadProviderId,
    });
    const selectedDocuments = userDocuments.filter(doc => documentIds.includes(doc.id));
    // END: build system message context

    const chat = await getChat(chatId);

    if (ctx.userRole !== UserRole.Admin) {
      const access = await getChatAccess(chatId, ctx.userId);
      if (!access || access === 'Viewer') {
        logger.error(
          `You do not have permission to use this chat: userId: ${ctx.userId}, chatId: ${chat.id}`
        );
        throw Forbidden('You do not have permission to use this chat');
      }
    }

    if (!chat.modelId) {
      logger.error(`Model for chat has not been set: ${chat.id}`);
      throw BadRequest('Model for chat has not been set');
    }

    const messages = await getMessages(chat.id);

    const retryMessages: ChatCompletionMessage[] = messages
      .slice(MaxExistingMessages)
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
        citations: msg.citations,
        artifacts: msg.artifacts,
      }));

    const lastMessageIndex = retryMessages.length - 1;

    let message = retryMessages[lastMessageIndex].content;

    // START: Manage additional context (document library files, knowledge bases) citations
    let documentLibraryCitations: Citation[] = [];
    if (documentIds.length) {
      const embeddedContent = await embedContent(message, ctx.userId);

      if (!embeddedContent.embeddings?.length) {
        ctx.logger.debug('There was a problem embedding the users query');
        throw InternalServerError('Something went wrong embedding your message. Please try again later');
      }

      // Since we don't chunk the query, there should only be one embedding
      const embeddedQuery = embeddedContent.embeddings[0].embedding;

      // Query the vector store using specific document IDs
      const embeddingResult = await getEmbeddingsForDocuments({
        userId: ctx.userId,
        embeddedQuery,
        documentIds,
      });
      ctx.logger.info(`Retrieved ${embeddingResult.length} document embeddings from specific documents`);

      documentLibraryCitations.push(...embeddingResult.map(context => context.citation));
    }

    let knowledgeBaseCitations: Citation[] = [];
    let failedKbs: string[] = [];

    if (knowledgeBaseIds.length) {
      const kbResults: KbResults = await getContentFromKbs(ctx, { message, knowledgeBaseIds });
      knowledgeBaseCitations = kbResults.citations;
      failedKbs = kbResults.failedKbs;
    }

    const citations: Citation[] = [
      ...knowledgeBaseCitations,
      ...documentLibraryCitations,
    ];

    message = addContextToMessage(message, citations);
    // END: Manage additional context (document library files, knowledge bases) citations

    // Add custom instructions directing LLM to regenerate response
    if (input.customInstructions) {
      message += input.customInstructions;
    }

    retryMessages[lastMessageIndex].content = message;

    let createMsgInput: CreateMessagesInput;

    // Regular regeneration uses source.chatCompletion 
    if (!deepResearchEnabled) {
      try {
        const ai = await ctx.ai.buildUserSource(chat.modelId);
        messages[0].content = addSystemInstructions(
          messages[0].content,
          ctx.userRole === UserRole.Admin,
          userKnowledgeBases,
          selectedKnowledgeBases,
          hasDocumentLibrary,
          userDocuments,
          selectedDocuments
        );

        const assistantMessage = await ai.source.chatCompletion(retryMessages, {
          model: ai.model.externalId,
          randomness: 0.2,
          repetitiveness: 0.5,
        });

        const { artifacts, cleanedText } = extractArtifactsFromMessage(assistantMessage.text);
        const { followUpQuestions, cleanedText: finalCleanedText } = extractFollowUpQuestionsFromMessage(cleanedText);

        const chatMsgId = v4();
        addChatMessageIdToArtifacts(artifacts, chatMsgId);
        
        createMsgInput = {
          chatId: chat.id,
          senderId: ctx.userId,
          messages: [
            {
              id: chatMsgId,
              role: MessageRole.Assistant,
              content: finalCleanedText,
              createdAt: new Date(),
              citations: citations,
              artifacts: artifacts,
              followUpQuestions: followUpQuestions,
              deepResearch: false,
            },
          ],
        };
      } catch (error) {
        ctx.logger.error('There was an error regenerating response', { error });
        return {
          chatId: chat.id,
          messages: [],
        };
      }

    // Deep Research regeneration uses source.deepResearch
    } else {
      const deepResearchJobId = v4();
      const chatMsgId = v4();
      
      ctx.logger.info(`Starting deep research regeneration for user ${ctx.userId}`, { 
        userId: ctx.userId,
        chatId: chat.id,
        jobId: deepResearchJobId,
      });
      
      createMsgInput = {
        chatId: chat.id,
        senderId: ctx.userId,
        messages: [
          {
            id: chatMsgId,
            role: MessageRole.Assistant,
            content: '**Deep Research**',
            createdAt: new Date(),
            citations: citations,
            artifacts: [], // No artifacts yet - these come from the completed research
            followUpQuestions: [], // No follow-ups yet - these come from the completed research
            deepResearch: true,
            deepResearchJobId: deepResearchJobId,
            deepResearchStatus: DeepResearchStatus.PENDING,
          },
        ],
      };

      const queue = getDeepResearchQueue();
      if (!queue) {
        throw new Error('Deep research queue is not available');
      }

      await queue.add('deep-research', {
        jobId: deepResearchJobId,
        userId: ctx.userId,
        chatId: chatId,
        messageId: chatMsgId,
        modelId: chat.modelId,
        input: message,
        instructions: input.customInstructions || 'You are a helpful research assistant.',
        maxToolCalls: 50,
      }, {
        jobId: deepResearchJobId,
        delay: 1000, 
      });

      ctx.logger.info(`Deep research job queued: ${deepResearchJobId}`, { userId: ctx.userId });
    }

    const createdMessages = await createMessages(createMsgInput);

    return {
      chatId: chat.id,
      messages: createdMessages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        messagedAt: message.createdAt,
        citations: message.citations,
        artifacts: message.artifacts,
        followUps: message.followUps,
        deepResearch: message.deepResearch,
        deepResearchJobId: message.deepResearchJobId,
        deepResearchStatus: message.deepResearchStatus,
      })),
      failedKbs,
    };
  });
