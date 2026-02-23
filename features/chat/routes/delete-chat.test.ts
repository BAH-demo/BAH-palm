import { ContextType } from '@/server/trpc-context';
import chatRouter from '@/features/chat/routes';
import { UserRole } from '@/features/shared/types/user';
import { Chat } from '@/features/chat/types/chat';
import getChat from '@/features/chat/dal/getChat';
import deleteChat from '@/features/chat/dal/deleteChat';
import { Forbidden } from '@/features/shared/errors/routeErrors';

jest.mock('@/features/chat/dal/getChat');
jest.mock('@/features/chat/dal/deleteChat');

describe('delete-chat route', () => {
  const mockUserId = 'ec4dd2cf-c867-4a81-b940-d22d98544a0c';
  const mockChatId = '7b91f044-da78-43d4-91aa-5fbeffcb3e75';
  const mockOtherUserId = 'ab12cd34-ef56-7890-abcd-ef1234567890';

  const mockChat: Chat = {
    id: mockChatId,
    userId: mockUserId,
    modelId: null,
    promptId: null,
    summary: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  const mockInput = {
    chatId: mockChatId,
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

  it('allows the chat owner to delete their chat', async () => {
    const caller = chatRouter.createCaller(ctx);
    const result = await caller.deleteChat(mockInput);

    expect(result).toEqual({ chatId: mockChatId });
    expect(getChat).toHaveBeenCalledWith(mockChatId);
    expect(deleteChat).toHaveBeenCalledWith(mockChatId);
  });

  it('allows an admin to delete any chat', async () => {
    ctx.userRole = UserRole.Admin;
    const otherUserChat = { ...mockChat, userId: mockOtherUserId };
    (getChat as jest.Mock).mockResolvedValue(otherUserChat);

    const caller = chatRouter.createCaller(ctx);
    const result = await caller.deleteChat(mockInput);

    expect(result).toEqual({ chatId: mockChatId });
    expect(getChat).toHaveBeenCalledWith(mockChatId);
    expect(deleteChat).toHaveBeenCalledWith(mockChatId);
  });

  it('does not allow a non-owner non-admin user to delete a chat', async () => {
    const otherUserChat = { ...mockChat, userId: mockOtherUserId };
    (getChat as jest.Mock).mockResolvedValue(otherUserChat);

    const caller = chatRouter.createCaller(ctx);

    await expect(caller.deleteChat(mockInput)).rejects.toThrow(
      'You do not have permission to delete this chat'
    );

    expect(getChat).toHaveBeenCalledWith(mockChatId);
    expect(deleteChat).not.toHaveBeenCalled();
  });

  it('propagates errors from getChat', async () => {
    const chatError = new Error('Chat not found');
    (getChat as jest.Mock).mockRejectedValue(chatError);

    const caller = chatRouter.createCaller(ctx);

    await expect(caller.deleteChat(mockInput)).rejects.toThrow(chatError.message);

    expect(getChat).toHaveBeenCalledWith(mockChatId);
    expect(deleteChat).not.toHaveBeenCalled();
  });

  it('propagates errors from deleteChat', async () => {
    const deleteError = new Error('Error deleting chat');
    (deleteChat as jest.Mock).mockRejectedValue(deleteError);

    const caller = chatRouter.createCaller(ctx);

    await expect(caller.deleteChat(mockInput)).rejects.toThrow(deleteError.message);

    expect(getChat).toHaveBeenCalledWith(mockChatId);
    expect(deleteChat).toHaveBeenCalledWith(mockChatId);
  });

  it('rejects invalid chatId input', async () => {
    const caller = chatRouter.createCaller(ctx);

    await expect(
      caller.deleteChat({ chatId: 'not-a-uuid' })
    ).rejects.toThrow();

    expect(getChat).not.toHaveBeenCalled();
    expect(deleteChat).not.toHaveBeenCalled();
  });
});
