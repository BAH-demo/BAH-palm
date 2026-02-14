import { UserRole } from '@/features/shared/types/user';
import { ContextType } from '@/server/trpc-context';
import getChats from '@/features/chat/dal/getChats';
import chatRouter from '@/features/chat/routes/index';

jest.mock('@/features/chat/dal/getChats');

describe('get-chats route', () => {
  const mockUserId = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';

  const mockChats = [
    {
      id: '2b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
      userId: mockUserId,
      modelId: 'model-1',
      promptId: null,
      summary: 'Chat 1',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-02'),
    },
    {
      id: '3b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
      userId: mockUserId,
      modelId: 'model-2',
      promptId: '4b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
      summary: null,
      createdAt: new Date('2025-02-01'),
      updatedAt: new Date('2025-02-02'),
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

  it('returns all chats for the user', async () => {
    const caller = chatRouter.createCaller(ctx);
    const result = await caller.getChats();

    expect(result.chats).toHaveLength(2);
    expect(result.chats[0].id).toBe('2b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed');
    expect(result.chats[1].summary).toBeNull();
    expect(getChats).toHaveBeenCalledWith(mockUserId);
  });

  it('returns empty array when user has no chats', async () => {
    (getChats as jest.Mock).mockResolvedValue([]);

    const caller = chatRouter.createCaller(ctx);
    const result = await caller.getChats();

    expect(result.chats).toEqual([]);
  });

  it('propagates error when getChats throws', async () => {
    (getChats as jest.Mock).mockRejectedValue(new Error('DB error'));

    const caller = chatRouter.createCaller(ctx);
    await expect(caller.getChats()).rejects.toThrow();
  });
});
