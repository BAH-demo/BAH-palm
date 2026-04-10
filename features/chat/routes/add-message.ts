import { z } from 'zod';
import { v4 } from 'uuid';

import { procedure } from '@/server/trpc';
import { UserRole } from '@/features/shared/types/user';
import { ChatCompletionMessage } from '@/features/ai-provider/sources/types';
import { MessageRole, ContextType, Citation, DeepResearchStatus } from '@/features/chat/types/message';
import { Forbidden, InternalServerError } from '@/features/shared/errors/routeErrors';
import { getChatAccess } from '@/features/chat/dal/getChatAccess';
import getChat from '@/features/chat/dal/getChat';
import getMessages from '@/features/chat/dal/getMessages';
import createMessages, {
  CreateMessagesInput,
} from '@/features/chat/dal/createMessages';
import getContentFromKbs, {
  KbResults,
} from '@/features/chat/knowledge-bases/getContentFromKbs';
import {
  extractArtifactsFromMessage,
  addChatMessageIdToArtifacts,
} from '@/features/chat/utils/artifactHelperFunctions';
import {
  extractFollowUpQuestionsFromMessage,
} from '@/features/chat/utils/followUpQuestionsHelpers';
import { embedContent } from '@/features/shared/dal/document-upload/embedContent';
import getEmbeddingsForDocuments from '@/features/chat/dal/getEmbeddingsForDocuments';
import addContextToMessage from '@/features/chat/knowledge-bases/addContextToMessage';
import { addSystemInstructions } from '@/features/chat/utils/chatHelperFunctions';
import { getDeepResearchQueue } from '@/features/ai-provider/sources/deep-research/deepResearchQueue';
import { tryGetRedisClient } from '@/server/storage/redisConnection';
import getUserKnowledgeBases from '@/features/shared/dal/getUserKnowledgeBases';
import getSystemConfig from '@/features/shared/dal/getSystemConfig';
import getDocuments from '@/features/shared/dal/document-upload/getDocuments';
import getBedrockModelAccess from '@/features/shared/dal/getBedrockModelAccess';

// This is the maximum number of messages that will be used to generate the completion
const maxExistingMessages = -24;

const inputSchema = z.object({
  chatId: z.string().uuid(),
  message: z.string(),
  knowledgeBaseIds: z.array(z.string().uuid()),
  documentIds: z.array(z.string().uuid()),
  deepResearchEnabled: z.boolean().optional().default(false),
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
  isDeepResearch: z.boolean().optional(),
  deepResearchJobId: z.string().optional(),
});

export default procedure
  .input(inputSchema)
  .output(outputSchema)
  .mutation(async ({ input, ctx }) => {
    const { chatId, deepResearchEnabled, knowledgeBaseIds, documentIds } = input;

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
        ctx.logger.error(
          `You do not have permission to use this chat: userId: ${ctx.userId}, chatId: ${chat.id}`
        );
        throw Forbidden('You do not have permission to use this chat');
      }
    }

    // Redis-based concurrency lock for collaborative chats
    const redis = await tryGetRedisClient();
    const lockKey = `chat-lock:${chatId}`;
    let lockAcquired = false;
    if (redis) {
      const acquired = await redis.set(lockKey, ctx.userId, 'EX', 120, 'NX');
      if (!acquired) {
        throw Forbidden('Another collaborator is currently sending a message. Please wait.');
      }
      lockAcquired = true;
    }

    // check if the modelId is set
    if (!chat.modelId) {
      ctx.logger.error(`Model for chat has not been set: ${chat.id}`);
      throw new Error('Model for chat has not been set');
    }

    try {
    // This will be used for the message from the user.
    const now = new Date();

    const msgs = await getMessages(chat.id);

    // trim the existing messages to the maximum number of messages and map them to the ChatCompletionMessage type
    // TODO: the max messages should be configurable
    const messages: ChatCompletionMessage[] = msgs
      .slice(maxExistingMessages)
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
        artifacts: msg.artifacts,
      }));

    let message = input.message;

    // START: Manage additional context (document library files, knowledge bases) citations
    let documentLibraryCitations: Citation[] = [];
    if (documentIds.length) {
      ctx.logger.info('Document library enabled, retrieving embeddings for query');
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
    // END: Manage additional context (document library, knowledge bases) citations

    messages.push({
      role: MessageRole.User,
      content: message,
    });

    let deepResearchJobId: string | undefined;

    const createMsgInput: CreateMessagesInput = {
      chatId: chat.id,
      senderId: ctx.userId,
      messages: [
        {
          id: v4(),
          role: MessageRole.User,
          content: input.message, // Store unmodified user input in database so we don't persist added context in chat thread
          createdAt: now,
          citations: [], // No citations on user's messages
          artifacts: [], // No artifacts on user's messages
          followUpQuestions: [], // No follow up questions on user's messages
          deepResearch: false, 
        },
      ],
    };

    // Regular chat submission uses source.chatCompletion 
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

        const assistantMessage = await ai.source.chatCompletion(messages, {
          model: ai.model.externalId,
          randomness: 0.2,
          repetitiveness: 0.5,
        });

        const { artifacts, cleanedText } = extractArtifactsFromMessage(assistantMessage.text);
        const { followUpQuestions, cleanedText: finalCleanedText } = extractFollowUpQuestionsFromMessage(cleanedText);

        const chatMsgId = v4();
        addChatMessageIdToArtifacts(artifacts, chatMsgId);
        
        createMsgInput.messages.push({
          id: chatMsgId,
          role: MessageRole.Assistant,
          content: finalCleanedText,
          createdAt: new Date(),
          citations: citations,
          artifacts: artifacts,
          followUpQuestions: followUpQuestions,
          deepResearch: false,
        });
      } catch (error) {
        ctx.logger.error('Error building user source:', error);
      }

    // Deep Research chat submission uses source.deepResearch
    } else {
      
      try {
        ctx.logger.info(`Starting deep research for user ${ctx.userId}`);
        
        let messageWithContext = message;
        messageWithContext += (citations.length ? `\nRelevant Context:\n${citations.map(citation => `${citation.sourceLabel}: ${citation.citation}`).join('\n')}` : '');
        messageWithContext += addSystemInstructions(
          messageWithContext,
          ctx.userRole === UserRole.Admin,
          userKnowledgeBases,
          selectedKnowledgeBases,
          hasDocumentLibrary,
          userDocuments,
          selectedDocuments
        );

        ctx.logger.info(`Research input includes - Documents: ${documentLibraryCitations.length} citations, KB: ${knowledgeBaseCitations.length} citations, Total length: ${messageWithContext.length}`);
        
        deepResearchJobId = v4();
        const chatMsgId = v4();
        
        ctx.logger.info(`Deep research job queued: ${deepResearchJobId}`);
        
        // Create placeholder message for deep research
        createMsgInput.messages.push({
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
        });

        // Add new job to deep research queue
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
          input: messageWithContext,
          instructions: 'You are a helpful research assistant.', // NOTE: how does this get used? 
          maxToolCalls: 50,
        }, {
          delay: 1000, // 1 second delay to ensure database transaction completes
        });
      } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error';
        
        ctx.logger.error('Deep research failed:', {
          error: errorMessage,
          errorType: error?.constructor?.name,
          stack: error?.stack,
        });
      }
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
      isDeepResearch: deepResearchEnabled,
      deepResearchJobId,
    };
    } finally {
      // Release Redis lock if acquired
      if (lockAcquired && redis) {
        await redis.del(lockKey);
      }
    }
  });
