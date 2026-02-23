import { ContextType } from '@/server/trpc-context';
import chatRouter from '@/features/chat/routes';
import { UserRole } from '@/features/shared/types/user';
import { Chat } from '@/features/chat/types/chat';
import getChats from '@/features/chat/dal/getChats';

jest.mock('@/features/chat/dal/getChats');

describe('get-chats route', () => {
  const mockUserId = 'ec4dd2cf-c867-4a81-b940-d22d98544a0c';

  const mockChats: Chat[] = [
    {
      id: '7b91f044-da78-43d4-91aa-5fbeffcb3e75',
      userId: mockUserId,
      modelId: 'd9776d52-42d2-4a5c-9db2-b422478a1f5c',
      promptId: null,
      summary: 'First chat',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    },
    {
      id: '8b91f044-da78-43d4-91aa-5fbeffcb3e76',
      userId: mockUserId,
      modelId: null,
      promptId: 'e9776d52-42d2-4a5c-9db2-b422478a1f5d',
      summary: null,
      createdAt: new Date('2024-02-01T00:00:00.000Z'),
      updatedAt: new Date('2024-02-01T00:00:00.000Z'),
    },
  ];

  let ctx: ContextType;

  beforeEach(() => {
    jest.clearAllMocks();

    ctx = {
      userId: mockUserId,
      userRole: UserRole.User,
    } as unknown as ContextType;

    (getChats as jest.Mock).mockResolvedValue(mockChats);
  });

  it('returns chats for the current user', async () => {
    const caller = chatRouter.createCaller(ctx);
    const result = await caller.getChats();

    expect(result).toEqual({
      chats: mockChats.map((chat) => ({
        id: chat.id,
        userId: chat.userId,
        modelId: chat.modelId,
        promptId: chat.promptId,
        summary: chat.summary,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      })),
    });

    expect(getChats).toHaveBeenCalledWith(mockUserId);
  });

  it('returns an empty array when the user has no chats', async () => {
    (getChats as jest.Mock).mockResolvedValue([]);

    const caller = chatRouter.createCaller(ctx);
    const result = await caller.getChats();

    expect(result).toEqual({ chats: [] });
    expect(getChats).toHaveBeenCalledWith(mockUserId);
  });

  it('propagates errors from getChats DAL', async () => {
    const dalError = new Error('Error fetching chats');
    (getChats as jest.Mock).mockRejectedValue(dalError);

    const caller = chatRouter.createCaller(ctx);

    await expect(caller.getChats()).rejects.toThrow(dalError.message);

    expect(getChats).toHaveBeenCalledWith(mockUserId);
  });

  it('returns chats with nullable fields set to null', async () => {
    const chatsWithNulls: Chat[] = [
      {
        id: '7b91f044-da78-43d4-91aa-5fbeffcb3e75',
        userId: mockUserId,
        modelId: null,
        promptId: null,
        summary: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      },
    ];
    (getChats as jest.Mock).mockResolvedValue(chatsWithNulls);

    const caller = chatRouter.createCaller(ctx);
    const result = await caller.getChats();

    expect(result.chats[0].modelId).toBeNull();
    expect(result.chats[0].promptId).toBeNull();
    expect(result.chats[0].summary).toBeNull();
  });
});
