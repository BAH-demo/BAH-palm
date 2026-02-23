import deleteChat from './deleteChat';
import db from '@/server/db';
import logger from '@/server/logger';

jest.mock('@/server/db', () => ({
  chat: {
    delete: jest.fn(),
  },
}));

describe('deleteChat DAL', () => {
  const mockChatId = '7435b69e-3757-47a2-bacf-d4efdd85a32e';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes a chat by id', async () => {
    (db.chat.delete as jest.Mock).mockResolvedValue({});

    await deleteChat(mockChatId);

    expect(db.chat.delete).toHaveBeenCalledWith({
      where: {
        id: mockChatId,
      },
    });

    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs and throws a sanitized error when the database operation fails', async () => {
    const dbError = new Error('Foreign key constraint failed');
    (db.chat.delete as jest.Mock).mockRejectedValue(dbError);

    await expect(deleteChat(mockChatId)).rejects.toThrow('Error deleting chat');

    expect(logger.error).toHaveBeenCalledWith(
      `Error deleting chat from the database. Id: ${mockChatId}`,
      dbError
    );
  });

  it('does not expose internal error details in the thrown error', async () => {
    const internalError = new Error('relation "Chat" does not exist');
    (db.chat.delete as jest.Mock).mockRejectedValue(internalError);

    try {
      await deleteChat(mockChatId);
      fail('Expected deleteChat to throw');
    } catch (error) {
      expect((error as Error).message).toBe('Error deleting chat');
      expect((error as Error).message).not.toContain('relation');
    }
  });
});
