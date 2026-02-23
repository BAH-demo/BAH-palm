import deleteMessage from './deleteMessage';
import db from '@/server/db';
import logger from '@/server/logger';

jest.mock('@/server/db', () => ({
  chatMessage: {
    delete: jest.fn(),
  },
}));

describe('deleteMessage DAL', () => {
  const mockMessageId = '7435b69e-3757-47a2-bacf-d4efdd85a32e';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes a message by id', async () => {
    (db.chatMessage.delete as jest.Mock).mockResolvedValue({});

    await deleteMessage(mockMessageId);

    expect(db.chatMessage.delete).toHaveBeenCalledWith({
      where: {
        id: mockMessageId,
      },
    });

    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs and throws a sanitized error when the database operation fails', async () => {
    const dbError = new Error('Record not found');
    (db.chatMessage.delete as jest.Mock).mockImplementation(() => {
      throw dbError;
    });

    await expect(deleteMessage(mockMessageId)).rejects.toThrow('Error deleting message');

    expect(logger.error).toHaveBeenCalledWith(
      `Error deleting message from the database. Id: ${mockMessageId}`,
      dbError
    );
  });

  it('does not expose internal error details in the thrown error', async () => {
    const internalError = new Error('An operation failed because it depends on one or more records');
    (db.chatMessage.delete as jest.Mock).mockImplementation(() => {
      throw internalError;
    });

    try {
      await deleteMessage(mockMessageId);
      fail('Expected deleteMessage to throw');
    } catch (error) {
      expect((error as Error).message).toBe('Error deleting message');
      expect((error as Error).message).not.toContain('depends on');
    }
  });
});
