import db from '@/server/db';
import logger from '@/server/logger';
import createChat from './createChat';

jest.mock('@/server/db', () => ({
  chat: {
    create: jest.fn(),
  },
}));

describe('createChat', () => {
  const mockInput = {
    userId: 'user-1',
    modelId: 'model-1',
    promptId: 'prompt-1',
    systemMessage: 'You are a helpful assistant.',
    summary: 'Test chat',
  };

  const mockDbResult = {
    id: 'chat-1',
    summary: 'Test chat',
    userId: 'user-1',
    modelId: 'model-1',
    promptId: 'prompt-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a chat and returns mapped result', async () => {
    (db.chat.create as jest.Mock).mockResolvedValue(mockDbResult);

    const result = await createChat(mockInput);

    expect(result).toEqual({
      id: 'chat-1',
      summary: 'Test chat',
      userId: 'user-1',
      modelId: 'model-1',
      promptId: 'prompt-1',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-02'),
    });
    expect(db.chat.create).toHaveBeenCalledWith({
      data: {
        summary: 'Test chat',
        userId: 'user-1',
        modelId: 'model-1',
        promptId: 'prompt-1',
        messages: {
          create: {
            role: 'system',
            content: 'You are a helpful assistant.',
          },
        },
      },
    });
  });

  it('handles null promptId and summary', async () => {
    const inputWithNulls = {
      ...mockInput,
      promptId: null,
      summary: null,
    };
    const dbResultWithNulls = {
      ...mockDbResult,
      promptId: null,
      summary: null,
    };
    (db.chat.create as jest.Mock).mockResolvedValue(dbResultWithNulls);

    const result = await createChat(inputWithNulls);

    expect(result.promptId).toBeNull();
    expect(result.summary).toBeNull();
  });

  it('throws user-friendly error and logs on database failure', async () => {
    const dbError = new Error('DB failure');
    (db.chat.create as jest.Mock).mockRejectedValue(dbError);

    await expect(createChat(mockInput)).rejects.toThrow('Error creating chat');
    expect(logger.error).toHaveBeenCalledWith(
      `Error creating chat: UserId: ${mockInput.userId}`,
      dbError
    );
  });
});
