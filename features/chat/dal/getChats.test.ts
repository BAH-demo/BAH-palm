import { Chat } from '@/features/chat/types/chat';
import getChats from './getChats';
import db from '@/server/db';
import logger from '@/server/logger';

jest.mock('@/server/db', () => ({
  __esModule: true,
  default: {
    chat: {
      findMany: jest.fn(),
    },
  },
}));

describe('getChats DAL', () => {

  const mockUserId = '7435b69e-3757-47a2-bacf-d4efdd85a32e';
  const mockDate1 = new Date();
  const mockDate2 = new Date();

  const mockDbResults = [
    {
      id: '6435b69e-3757-47a2-bacf-d4efdd85a32e',
      userId: mockUserId,
      modelId: null,
      promptId: null,
      summary: 'Chat 1 Summary',
      createdAt: mockDate1,
      updatedAt: mockDate1,
      members: [],
    },
    {
      id: '5435b69e-3757-47a2-bacf-d4efdd85a32e',
      userId: mockUserId,
      modelId: null,
      promptId: null,
      summary: 'Chat 2 Summary',
      createdAt: mockDate2,
      updatedAt: mockDate2,
      members: [],
    },
  ];

  const expectedChats = [
    {
      id: '6435b69e-3757-47a2-bacf-d4efdd85a32e',
      userId: mockUserId,
      modelId: null,
      promptId: null,
      summary: 'Chat 1 Summary',
      createdAt: mockDate1,
      updatedAt: mockDate1,
      isCollaborative: false,
      userRole: 'Owner',
    },
    {
      id: '5435b69e-3757-47a2-bacf-d4efdd85a32e',
      userId: mockUserId,
      modelId: null,
      promptId: null,
      summary: 'Chat 2 Summary',
      createdAt: mockDate2,
      updatedAt: mockDate2,
      isCollaborative: false,
      userRole: 'Owner',
    },
  ];

  const mockError = new Error('Error fetching chat records');
  const mockErrorLog = 'Error fetching chat records from the database.';
  const mockNotFoundError = new Error('No chat records found');
  const mockNotFoundLog = 'No chat records found in the database.';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches all chats of a user by userId', async () => {
    (db.chat.findMany as jest.Mock).mockResolvedValue(mockDbResults);

    const response = await getChats(mockUserId);
    expect(response).toEqual(expectedChats);

    expect(db.chat.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { userId: mockUserId },
          { members: { some: { userId: mockUserId } } },
        ],
      },
      include: {
        members: {
          where: { userId: mockUserId },
          select: { role: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs and throws an error if no chat records are found', async () => {
    (db.chat.findMany as jest.Mock).mockResolvedValue(undefined);

    await expect(getChats(mockUserId)).rejects.toThrow(mockNotFoundError);

    expect(logger.error).toHaveBeenCalledWith(mockNotFoundLog);
  });

  it('logs and throws an error if the operation fails', async () => {
    const rejectError = new Error('Operation failed');
    (db.chat.findMany as jest.Mock).mockRejectedValue(rejectError);

    await expect(getChats(mockUserId)).rejects.toThrow(mockError);

    expect(logger.error).toHaveBeenCalledWith(mockErrorLog, rejectError);
  });
});
