import db from '@/server/db';
import logger from '@/server/logger';
import deleteMessagesSince from './deleteMessagesSince';

jest.mock('@/server/db', () => ({
  chatMessage: {
    deleteMany: jest.fn(),
  },
}));

describe('deleteMessagesSince', () => {
  const chatId = 'chat-123';
  const since = new Date('2025-06-01T00:00:00Z');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes all messages since the given date for a chat', async () => {
    (db.chatMessage.deleteMany as jest.Mock).mockResolvedValue({ count: 3 });

    await deleteMessagesSince(chatId, since);

    expect(db.chatMessage.deleteMany).toHaveBeenCalledWith({
      where: {
        chatId,
        createdAt: { gte: since },
      },
    });
  });

  it('throws user-friendly error and logs on database failure', async () => {
    const dbError = new Error('DB failure');
    (db.chatMessage.deleteMany as jest.Mock).mockRejectedValue(dbError);

    await expect(deleteMessagesSince(chatId, since)).rejects.toThrow(
      'Error deleting messages'
    );
    expect(logger.error).toHaveBeenCalledWith(
      `Error deleting messages from the database. ChatId: ${chatId}`,
      dbError
    );
  });
});
