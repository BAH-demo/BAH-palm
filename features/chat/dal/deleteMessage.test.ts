import db from '@/server/db';
import logger from '@/server/logger';
import deleteMessage from './deleteMessage';

jest.mock('@/server/db', () => ({
  chatMessage: {
    delete: jest.fn(),
  },
}));

describe('deleteMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes a message by id', async () => {
    (db.chatMessage.delete as jest.Mock).mockResolvedValue(undefined);

    await deleteMessage('msg-123');

    expect(db.chatMessage.delete).toHaveBeenCalledWith({
      where: { id: 'msg-123' },
    });
  });

  it('throws user-friendly error and logs on database failure', async () => {
    const dbError = new Error('DB failure');
    (db.chatMessage.delete as jest.Mock).mockImplementation(() => {
      throw dbError;
    });

    await expect(deleteMessage('msg-123')).rejects.toThrow('Error deleting message');
    expect(logger.error).toHaveBeenCalledWith(
      'Error deleting message from the database. Id: msg-123',
      dbError
    );
  });
});
