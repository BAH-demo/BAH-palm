import { waitFor } from '@testing-library/react';

import { ContextType } from '@/server/trpc-context';
import { UserRole } from '@/features/shared/types/user';
import { MessageRole } from '@/features/chat/types/message';
import logger from '@/server/logger';
import chatRouter from '@/features/chat/routes';
import getChat from '@/features/chat/dal/getChat';
import getMessages from '@/features/chat/dal/getMessages';
import createMessages from '@/features/chat/dal/createMessages';
import {
  extractArtifactsFromMessage,
  addChatMessageIdToArtifacts,
} from '@/features/chat/utils/artifactHelperFunctions';
import {
  extractFollowUpQuestionsFromMessage,
} from '@/features/chat/utils/followUpQuestionsHelpers';
import getContentFromKbs from '@/features/chat/knowledge-bases/getContentFromKbs';
import { embedContent } from '@/features/shared/dal/document-upload/embedContent';
import getEmbeddingsForDocuments from '@/features/chat/dal/getEmbeddingsForDocuments';
import { addSystemInstructions } from '@/features/chat/utils/chatHelperFunctions';
import getUserKnowledgeBases from '@/features/shared/dal/getUserKnowledgeBases';
import getSystemConfig from '@/features/shared/dal/getSystemConfig';
import getDocuments from '@/features/shared/dal/document-upload/getDocuments';
import getBedrockModelAccess from '@/features/shared/dal/getBedrockModelAccess';
import { getDeepResearchQueue } from '@/features/ai-provider/sources/deep-research/deepResearchQueue';
import { getChatAccess } from '@/features/chat/dal/getChatAccess';

jest.mock('@/features/chat/dal/createMessages');
jest.mock('@/features/chat/dal/getChat');
jest.mock('@/features/chat/dal/getChatAccess');
jest.mock('@/features/chat/dal/getMessages');
jest.mock('@/features/chat/dal/getEmbeddingsForDocuments');
jest.mock('@/features/chat/utils/artifactHelperFunctions');
jest.mock('@/features/chat/utils/followUpQuestionsHelpers');
jest.mock('@/features/chat/utils/chatHelperFunctions');
jest.mock('@/features/chat/knowledge-bases/getContentFromKbs');
jest.mock('@/features/shared/dal/document-upload/embedContent', () => ({
  embedContent: jest.fn(),
}));
jest.mock('@/features/shared/dal/getUserKnowledgeBases');
jest.mock('@/features/shared/dal/getSystemConfig');
jest.mock('@/features/shared/dal/document-upload/getDocuments');
jest.mock('@/features/shared/dal/getBedrockModelAccess');
jest.mock('@/libs/featureFlags');
jest.mock('@/features/ai-provider/sources/deep-research/deepResearchQueue');

const mockGetContentFromKbs = getContentFromKbs as jest.Mock;
const mockGetDeepResearchQueue = jest.fn();

describe('retry-message', () => {
  const mockUserId = '570e3594-0ff3-475d-9ee0-4be261e6b8db';
  const mockChatId = 'fcc14cff-37ba-42bb-8d83-c5618d25acd3';
  const mockModelId = '552079c8-53aa-4614-92fb-8eb5780eea4e';
  const mockModelExternalId = 'gpt-4o';

  const mockEmbeddedQuery = {
    embeddings: [{ embedding: [0.23432, -0.123894] }],
  };

  const mockRetrievedEmbeddings = [
    {
      id: '28927a2e-1356-4a75-a860-7f921176695e',
      content: 'These are embeddings retrieved from getEmbeddingsForDocuments',
      score: 0.52,
      citation: {
        documentLabel: 'test-document.pdf',
        documentId: '7212c3ef-b1dc-4eef-b031-8bfe3ef81432',
      },
    },
  ];

  const mockGetChatResolvedValue = {
    id: mockChatId,
    userId: mockUserId,
    modelId: mockModelId,
    promptId: null,
    summary: 'Chat summary',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAiResponse = {
    text: 'This is the AI response',
  };

  const mockArtifactContent = 'This is the AI response\n````artifact(".txt","artifact label")\nartifact content\n````';

  const mockAiResponseWithArtifact = {
    text: mockArtifactContent,
  };

  const testDate = new Date();

  const mockExtractedArtifacts = [
    {
      id: 'd3b07384-d9f3-4f2e-8f3d-9e1e4bda7f72',
      label: 'artifact label',
      content: 'artifact content',
      fileExtension: '.txt',
      createdAt: testDate,
    },
  ];

  const mockGetMessagesResolvedValue = [
    {
      id: 'b96e13a2-08fb-4d9f-bdf7-4419ca5d42b5',
      chatId: mockChatId,
      role: MessageRole.User,
      content: 'What is the best color?',
      createdAt: new Date(),
      deepResearch: false,
      citations: [],
      artifacts: [
        {
          id: 'artifact-1',
          chatMessageId: 'b96e13a2-08fb-4d9f-bdf7-4419ca5d42b5',
          label: 'Image of a color wheel',
          content: 'base64encodedstring',
          fileExtension: '.png',
          createdAt: new Date(),
        },
      ],
    },
    {
      id: '70a17cbc-7eab-40d0-9e1e-ed1b72e9eb35',
      chatId: mockChatId,
      role: MessageRole.Assistant,
      content: mockAiResponse.text,
      createdAt: new Date(),
      deepResearch: false,
      citations: [],
      artifacts: [],
    },
  ];

  const mockCreateMessagesResolvedValueWithArtifacts = [
    {
      id: '5ffc25fe-0f6f-4022-ae18-15679a76e2a1',
      chatId: mockChatId,
      role: MessageRole.Assistant,
      content: 'This is the AI response',
      createdAt: testDate,
      deepResearch: false,
      citations: [],
      artifacts: [
        {
          id: 'd3b07384-d9f3-4f2e-8f3d-9e1e4bda7f72',
          chatMessageId: '5ffc25fe-0f6f-4022-ae18-15679a76e2a1',
          label: 'artifact label',
          content: 'artifact content',
          fileExtension: '.txt',
          createdAt: testDate,
        },
      ],
      followUps: [],
    },
  ];

  const mockCreateMessagesResolvedValueWithoutArtifacts = [
    {
      id: '5ffc25fe-0f6f-4022-ae18-15679a76e2a1',
      chatId: mockChatId,
      role: MessageRole.Assistant,
      content: 'This is the AI response',
      createdAt: testDate,
      deepResearch: false,
      citations: [],
      artifacts: [],
      followUps: [],
    },
  ];

  const mockInput = {
    chatId: mockChatId,
    knowledgeBaseIds: [],
    documentIds: [],
  };

  const mockKbResults = {
    content: 'queried knowledge base',
    citations: [{
      knowledgeBaseId: '4ac37e8d-63e4-49a1-8f8e-6855b087904a',
      citation: 'Citation 1',
    }],
    failedKbs: ['4ac37e8d-63e4-49a1-8f8e-6855b087904a'],
  };

  const mockUserKnowledgeBases = [
    {
      id: 'kb-1',
      name: 'Test KB 1',
      userId: mockUserId,
    },
    {
      id: 'kb-2',
      name: 'Test KB 2',
      userId: mockUserId,
    },
  ];

  const mockSystemConfig = {
    documentLibraryDocumentUploadProviderId: 'test-provider-id',
  };

  const mockUserDocuments = [
    {
      id: 'doc-1',
      name: 'Test Document 1',
      userId: mockUserId,
    },
    {
      id: 'doc-2',
      name: 'Test Document 2',
      userId: mockUserId,
    },
  ];

  const chatCompletion = jest.fn();
  const buildUserSource = jest.fn();

  let ctx: ContextType;

  beforeEach(() => {
    jest.clearAllMocks();

    (getChat as jest.Mock).mockResolvedValue(mockGetChatResolvedValue);
    (getMessages as jest.Mock).mockResolvedValue(mockGetMessagesResolvedValue);
    (getChatAccess as jest.Mock).mockResolvedValue('Owner');

    (addSystemInstructions as jest.Mock).mockReturnValue('Message with custom instructions');
    (extractArtifactsFromMessage as jest.Mock).mockReturnValue({
      artifacts: mockExtractedArtifacts,
      cleanedText: 'This is the AI response',
    });
    (extractFollowUpQuestionsFromMessage as jest.Mock).mockReturnValue({
      followUpQuestions: [],
      cleanedText: 'This is the AI response',
    });
    (addChatMessageIdToArtifacts as jest.Mock).mockImplementation();
    (embedContent as jest.Mock).mockReturnValue(mockEmbeddedQuery);
    (getEmbeddingsForDocuments as jest.Mock).mockReturnValue(mockRetrievedEmbeddings);
    (getUserKnowledgeBases as jest.Mock).mockResolvedValue(mockUserKnowledgeBases);
    (getSystemConfig as jest.Mock).mockResolvedValue(mockSystemConfig);
    (getDocuments as jest.Mock).mockResolvedValue(mockUserDocuments);
    (getBedrockModelAccess as jest.Mock).mockResolvedValue(true);
    (getDeepResearchQueue as jest.Mock).mockReturnValue({
      add: jest.fn().mockResolvedValue({}),
    });

    chatCompletion.mockResolvedValue(mockAiResponse);

    buildUserSource.mockResolvedValue({
      source: {
        chatCompletion,
      },
      model: {
        externalId: mockModelExternalId,
      },
    });

    ctx = {
      userId: mockUserId,
      userRole: UserRole.User,
      ai: {
        buildUserSource,
      },
      logger: logger,
    } as unknown as ContextType;

    mockGetContentFromKbs.mockResolvedValue(mockKbResults);
  });

  it('returns assistant message that contains artifacts', async () => {
    chatCompletion.mockResolvedValue(mockAiResponseWithArtifact);

    (createMessages as jest.Mock).mockResolvedValue(mockCreateMessagesResolvedValueWithArtifacts);

    const caller = chatRouter.createCaller(ctx);
    const result = await caller.retryMessage(mockInput);

    expect(result.messages[0].artifacts).toHaveLength(1);
    expect(result.messages[0].artifacts[0]).toMatchObject({
      chatMessageId: '5ffc25fe-0f6f-4022-ae18-15679a76e2a1',
      label: 'artifact label',
      content: 'artifact content',
      fileExtension: '.txt',
    });

    expect(addSystemInstructions).toHaveBeenCalled();
    expect(extractArtifactsFromMessage).toHaveBeenCalledWith(mockArtifactContent);
    expect(addChatMessageIdToArtifacts).toHaveBeenCalled();
  });

  it('returns assistant message that does not contain artifacts', async () => {
    chatCompletion.mockResolvedValue(mockAiResponse);

    (createMessages as jest.Mock).mockResolvedValue(mockCreateMessagesResolvedValueWithoutArtifacts);

    const caller = chatRouter.createCaller(ctx);
    const result = await caller.retryMessage(mockInput);

    expect(result.messages[0].artifacts).toHaveLength(0);

    expect(addSystemInstructions).toHaveBeenCalled();
    expect(extractArtifactsFromMessage).toHaveBeenCalledWith(mockAiResponse.text);
    expect(addChatMessageIdToArtifacts).toHaveBeenCalled();
  });

  it('appends user instructions if available', async () => {
    const caller = chatRouter.createCaller(ctx);

    const customInstructions = 'This is a custom prompt';

    await caller.retryMessage({ ...mockInput, customInstructions });

    expect(chatCompletion).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining(customInstructions),
        }),
      ]),
      expect.objectContaining({
        model: mockModelExternalId,
      }),
    );
  });

  it('throws error if user does not own chat and is not an admin', async () => {
    ctx.userId = '76073cf6-ce35-4146-a4b2-ed0132e5b7ae';
    (getChatAccess as jest.Mock).mockResolvedValue(null);

    const caller = chatRouter.createCaller(ctx);

    await expect(caller.retryMessage(mockInput)).rejects.toThrow('You do not have permission to use this chat');

    await waitFor(() => {
      expect(ctx.logger.error).toHaveBeenCalled();
    });
  });

  it('does not throw an error if user does not own chat but is an admin', async () => {
    ctx.userId = '76073cf6-ce35-4146-a4b2-ed0132e5b7ae';
    ctx.userRole = UserRole.Admin;

    const caller = chatRouter.createCaller(ctx);

    await expect(caller.retryMessage(mockInput)).resolves.not.toThrow();
  });

  it('throws error if the modelId is not set', async () => {
    (getChat as jest.Mock).mockResolvedValue({
      ...mockGetChatResolvedValue,
      modelId: '',
    });

    const caller = chatRouter.createCaller(ctx);

    await expect(caller.retryMessage(mockInput)).rejects.toThrow('Model for chat has not been set');

    await waitFor(() => {
      expect(ctx.logger.error).toHaveBeenCalled();
    });
  });

  it('returns empty messages if AI response fails', async () => {
    chatCompletion.mockRejectedValue(new Error('AI error'));

    const caller = chatRouter.createCaller(ctx);

    const result = {
      chatId: mockChatId,
      messages: [],
    };

    await expect(
      caller.retryMessage(mockInput)
    ).resolves.toEqual(result);
  });

  it('queries knowledge base if available', async () => {
    const caller = chatRouter.createCaller(ctx);

    const mockKnowledgeBaseIds = ['4ac37e8d-63e4-49a1-8f8e-6855b087904a'];

    await caller.retryMessage({ ...mockInput, knowledgeBaseIds: mockKnowledgeBaseIds });

    expect(getContentFromKbs).toHaveBeenCalledWith(ctx, expect.objectContaining({
      knowledgeBaseIds: mockKnowledgeBaseIds,
    }));
  });

  describe('Document Library Enabled', () => {
      it('should create user embeddings', async () => {
        const lastMessage = mockGetMessagesResolvedValue[
          mockGetMessagesResolvedValue.length - 1
        ];
        const caller = chatRouter.createCaller(ctx);

        await caller.retryMessage({ ...mockInput, documentIds: ['550e8400-e29b-41d4-a716-446655440000'] });

        expect(embedContent).toHaveBeenCalledWith(
          lastMessage.content,
          ctx.userId,
        );
      });

      it('should not create user embeddings if document library is not enabled', async () => {
        const caller = chatRouter.createCaller(ctx);

        await caller.retryMessage({ ...mockInput });

        expect(embedContent).not.toHaveBeenCalled();
      });

      it('should throw if embedding fails', async () => {
        (embedContent as jest.Mock).mockReturnValue({ embeddings: undefined });

        const caller = chatRouter.createCaller(ctx);

        await expect(caller.retryMessage({ ...mockInput, documentIds: ['550e8400-e29b-41d4-a716-446655440000'] })).rejects.toThrow(
          /wrong embedding your message/i
        );
      });

      it('should call getEmbeddingsForDocuments with embedded query when documentIds provided', async () => {
        const caller = chatRouter.createCaller(ctx);
        const documentIds = ['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'];

        await caller.retryMessage({ ...mockInput, documentIds });

        expect(getEmbeddingsForDocuments).toHaveBeenCalledWith({
          userId: ctx.userId,
          embeddedQuery: mockEmbeddedQuery.embeddings[0].embedding,
          documentIds,
        });
      });
    });

  it('creates deep research job when deepResearch is true', async () => {
    const mockQueue = {
      add: jest.fn().mockResolvedValue({}),
    };
    
    (getDeepResearchQueue as jest.Mock).mockReturnValue(mockQueue);

    const caller = chatRouter.createCaller(ctx);
    
    await caller.retryMessage({ ...mockInput, deepResearchEnabled: true });

    expect(mockQueue.add).toHaveBeenCalledWith(
      'deep-research',
      expect.objectContaining({
        userId: ctx.userId,
        chatId: mockInput.chatId,
        modelId: mockModelId,
        maxToolCalls: 50,
      }),
      expect.objectContaining({
        delay: 1000,
      })
    );
  });
});
