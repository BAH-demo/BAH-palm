import db from '@/server/db';
import logger from '@/server/logger';
import deleteChat from './deleteChat';

jest.mock('@/server/db', () => ({
  chat: {
    delete: jest.fn(),
  },
}));

describe('deleteChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes a chat by id', async () => {
    (db.chat.delete as jest.Mock).mockResolvedValue(undefined);

    await deleteChat('chat-123');

    expect(db.chat.delete).toHaveBeenCalledWith({
      where: { id: 'chat-123' },
    });
  });

  it('throws user-friendly error and logs on database failure', async () => {
    const dbError = new Error('DB failure');
    (db.chat.delete as jest.Mock).mockRejectedValue(dbError);

    await expect(deleteChat('chat-123')).rejects.toThrow('Error deleting chat');
    expect(logger.error).toHaveBeenCalledWith(
      'Error deleting chat from the database. Id: chat-123',
      dbError
    );
  });
});
