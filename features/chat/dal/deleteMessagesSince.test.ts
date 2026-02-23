import deleteMessagesSince from './deleteMessagesSince';
import db from '@/server/db';
import logger from '@/server/logger';

jest.mock('@/server/db', () => ({
  chatMessage: {
    deleteMany: jest.fn(),
  },
}));

describe('deleteMessagesSince DAL', () => {
  const mockChatId = '7435b69e-3757-47a2-bacf-d4efdd85a32e';
  const mockSince = new Date('2024-06-15T12:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes all messages since the given date for a chat', async () => {
    (db.chatMessage.deleteMany as jest.Mock).mockResolvedValue({ count: 3 });

    await deleteMessagesSince(mockChatId, mockSince);

    expect(db.chatMessage.deleteMany).toHaveBeenCalledWith({
      where: {
        chatId: mockChatId,
        createdAt: {
          gte: mockSince,
        },
      },
    });

    expect(logger.error).not.toHaveBeenCalled();
  });

  it('handles the case where no messages match the criteria', async () => {
    (db.chatMessage.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

    await deleteMessagesSince(mockChatId, mockSince);

    expect(db.chatMessage.deleteMany).toHaveBeenCalledWith({
      where: {
        chatId: mockChatId,
        createdAt: {
          gte: mockSince,
        },
      },
    });

    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs and throws a sanitized error when the database operation fails', async () => {
    const dbError = new Error('Database connection lost');
    (db.chatMessage.deleteMany as jest.Mock).mockRejectedValue(dbError);

    await expect(deleteMessagesSince(mockChatId, mockSince)).rejects.toThrow(
      'Error deleting messages'
    );

    expect(logger.error).toHaveBeenCalledWith(
      `Error deleting messages from the database. ChatId: ${mockChatId}`,
      dbError
    );
  });

  it('does not expose internal error details in the thrown error', async () => {
    const internalError = new Error('deadlock detected');
    (db.chatMessage.deleteMany as jest.Mock).mockRejectedValue(internalError);

    try {
      await deleteMessagesSince(mockChatId, mockSince);
      fail('Expected deleteMessagesSince to throw');
    } catch (error) {
      expect((error as Error).message).toBe('Error deleting messages');
      expect((error as Error).message).not.toContain('deadlock');
    }
  });
});
