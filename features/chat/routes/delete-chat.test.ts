import { UserRole } from '@/features/shared/types/user';
import { ContextType } from '@/server/trpc-context';
import getChat from '@/features/chat/dal/getChat';
import deleteChat from '@/features/chat/dal/deleteChat';
import chatRouter from '@/features/chat/routes/index';

jest.mock('@/features/chat/dal/getChat');
jest.mock('@/features/chat/dal/deleteChat');

describe('delete-chat route', () => {
  const mockUserId = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';
  const mockChatId = '2b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';

  const mockChat = {
    id: mockChatId,
    userId: mockUserId,
    modelId: 'model-1',
    promptId: null,
    summary: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let ctx: ContextType;

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = {
      userId: mockUserId,
      userRole: UserRole.User,
    } as unknown as ContextType;
    (getChat as jest.Mock).mockResolvedValue(mockChat);
    (deleteChat as jest.Mock).mockResolvedValue(undefined);
  });

  it('deletes a chat owned by the user', async () => {
    const caller = chatRouter.createCaller(ctx);
    const result = await caller.deleteChat({ chatId: mockChatId });

    expect(result).toEqual({ chatId: mockChatId });
    expect(getChat).toHaveBeenCalledWith(mockChatId);
    expect(deleteChat).toHaveBeenCalledWith(mockChatId);
  });

  it('allows admin to delete any chat', async () => {
    ctx.userRole = UserRole.Admin;
    const otherUserChat = { ...mockChat, userId: 'other-user-id' };
    (getChat as jest.Mock).mockResolvedValue(otherUserChat);

    const caller = chatRouter.createCaller(ctx);
    const result = await caller.deleteChat({ chatId: mockChatId });

    expect(result).toEqual({ chatId: mockChatId });
  });

  it('throws Forbidden when non-admin tries to delete another users chat', async () => {
    const otherUserChat = { ...mockChat, userId: 'other-user-id' };
    (getChat as jest.Mock).mockResolvedValue(otherUserChat);

    const caller = chatRouter.createCaller(ctx);
    await expect(caller.deleteChat({ chatId: mockChatId })).rejects.toThrow(
      'You do not have permission to delete this chat'
    );
    expect(deleteChat).not.toHaveBeenCalled();
  });

  it('propagates error when getChat throws', async () => {
    (getChat as jest.Mock).mockRejectedValue(new Error('Chat not found'));

    const caller = chatRouter.createCaller(ctx);
    await expect(caller.deleteChat({ chatId: mockChatId })).rejects.toThrow();
  });
});
