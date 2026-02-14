import { UserRole } from '@/features/shared/types/user';
import { ContextType } from '@/server/trpc-context';
import getChat from '@/features/chat/dal/getChat';
import chatRouter from '@/features/chat/routes/index';

jest.mock('@/features/chat/dal/getChat');

describe('get-chat route', () => {
  const mockUserId = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';
  const mockChatId = '2b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';

  const mockChat = {
    id: mockChatId,
    userId: mockUserId,
    modelId: '3b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
    promptId: null,
    summary: 'Test chat',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
  };

  let ctx: ContextType;

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = {
      userId: mockUserId,
      userRole: UserRole.User,
    } as unknown as ContextType;
    (getChat as jest.Mock).mockResolvedValue(mockChat);
  });

  it('returns chat data for the owner', async () => {
    const caller = chatRouter.createCaller(ctx);
    const result = await caller.getUserChat({ chatId: mockChatId });

    expect(result.chat.id).toBe(mockChatId);
    expect(result.chat.summary).toBe('Test chat');
    expect(getChat).toHaveBeenCalledWith(mockChatId);
  });

  it('allows admin to view any chat', async () => {
    ctx.userRole = UserRole.Admin;
    const otherUserChat = { ...mockChat, userId: 'other-user-id' };
    (getChat as jest.Mock).mockResolvedValue(otherUserChat);

    const caller = chatRouter.createCaller(ctx);
    const result = await caller.getUserChat({ chatId: mockChatId });

    expect(result.chat.id).toBe(mockChatId);
  });

  it('throws error when non-admin tries to view another users chat', async () => {
    const otherUserChat = { ...mockChat, userId: 'other-user-id' };
    (getChat as jest.Mock).mockResolvedValue(otherUserChat);

    const caller = chatRouter.createCaller(ctx);
    await expect(caller.getUserChat({ chatId: mockChatId })).rejects.toThrow(
      'You do not have permission to view this chat'
    );
  });

  it('propagates error when getChat throws', async () => {
    (getChat as jest.Mock).mockRejectedValue(new Error('Chat not found'));

    const caller = chatRouter.createCaller(ctx);
    await expect(caller.getUserChat({ chatId: mockChatId })).rejects.toThrow();
  });
});
