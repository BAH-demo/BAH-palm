import { Chat } from '@/features/chat/types/chat';
import createChat from './createChat';
import db from '@/server/db';
import logger from '@/server/logger';

jest.mock('@/server/db', () => ({
  chat: {
    create: jest.fn(),
  },
}));

describe('createChat DAL', () => {
  const mockUserId = '6435b69e-3757-47a2-bacf-d4efdd85a32e';
  const mockModelId = '8435b69e-3757-47a2-bacf-d4efdd85a32e';
  const mockPromptId = '9435b69e-3757-47a2-bacf-d4efdd85a32e';
  const mockChatId = '7435b69e-3757-47a2-bacf-d4efdd85a32e';

  const mockInput = {
    userId: mockUserId,
    modelId: mockModelId,
    promptId: mockPromptId,
    systemMessage: 'You are a helpful assistant',
    summary: null as string | null,
  };

  const mockDbResult = {
    id: mockChatId,
    summary: null,
    userId: mockUserId,
    modelId: mockModelId,
    promptId: mockPromptId,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  const expectedChat: Chat = {
    id: mockChatId,
    summary: null,
    userId: mockUserId,
    modelId: mockModelId,
    promptId: mockPromptId,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a chat and returns the result', async () => {
    (db.chat.create as jest.Mock).mockResolvedValue(mockDbResult);

    const result = await createChat(mockInput);

    expect(result).toEqual(expectedChat);
    expect(db.chat.create).toHaveBeenCalledWith({
      data: {
        summary: mockInput.summary,
        userId: mockInput.userId,
        modelId: mockInput.modelId,
        promptId: mockInput.promptId,
        messages: {
          create: {
            role: 'system',
            content: mockInput.systemMessage,
          },
        },
      },
    });
  });

  it('creates a chat with a summary', async () => {
    const inputWithSummary = { ...mockInput, summary: 'Test summary' };
    const dbResultWithSummary = { ...mockDbResult, summary: 'Test summary' };
    (db.chat.create as jest.Mock).mockResolvedValue(dbResultWithSummary);

    const result = await createChat(inputWithSummary);

    expect(result.summary).toBe('Test summary');
    expect(db.chat.create).toHaveBeenCalledWith({
      data: {
        summary: 'Test summary',
        userId: inputWithSummary.userId,
        modelId: inputWithSummary.modelId,
        promptId: inputWithSummary.promptId,
        messages: {
          create: {
            role: 'system',
            content: inputWithSummary.systemMessage,
          },
        },
      },
    });
  });

  it('creates a chat with null promptId', async () => {
    const inputNoPrompt = { ...mockInput, promptId: null };
    const dbResultNoPrompt = { ...mockDbResult, promptId: null };
    (db.chat.create as jest.Mock).mockResolvedValue(dbResultNoPrompt);

    const result = await createChat(inputNoPrompt);

    expect(result.promptId).toBeNull();
  });

  it('logs and throws a sanitized error when the database operation fails', async () => {
    const dbError = new Error('Connection refused');
    (db.chat.create as jest.Mock).mockRejectedValue(dbError);

    await expect(createChat(mockInput)).rejects.toThrow('Error creating chat');

    expect(logger.error).toHaveBeenCalledWith(
      `Error creating chat: UserId: ${mockUserId}`,
      dbError
    );
  });

  it('does not expose internal error details in the thrown error', async () => {
    const internalError = new Error('FATAL: password authentication failed for user "postgres"');
    (db.chat.create as jest.Mock).mockRejectedValue(internalError);

    try {
      await createChat(mockInput);
      fail('Expected createChat to throw');
    } catch (error) {
      expect((error as Error).message).toBe('Error creating chat');
      expect((error as Error).message).not.toContain('password');
      expect((error as Error).message).not.toContain('postgres');
    }
  });
});
