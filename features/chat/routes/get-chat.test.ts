import { ContextType } from '@/server/trpc-context';
import chatRouter from '@/features/chat/routes';
import { UserRole } from '@/features/shared/types/user';
import { Chat } from '@/features/chat/types/chat';
import getChat from '@/features/chat/dal/getChat';

jest.mock('@/features/chat/dal/getChat');

describe('get-chat route', () => {
  const mockUserId = 'ec4dd2cf-c867-4a81-b940-d22d98544a0c';
  const mockChatId = '7b91f044-da78-43d4-91aa-5fbeffcb3e75';
  const mockOtherUserId = 'ab12cd34-ef56-7890-abcd-ef1234567890';
  const mockModelId = 'd9776d52-42d2-4a5c-9db2-b422478a1f5c';

  const mockChat: Chat = {
    id: mockChatId,
    userId: mockUserId,
    modelId: mockModelId,
    promptId: null,
    summary: 'Test summary',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-02-01T00:00:00.000Z'),
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
  });

  it('returns the chat for the owner', async () => {
    const caller = chatRouter.createCaller(ctx);
    const result = await caller.getUserChat(mockInput);

    expect(result).toEqual({
      chat: {
        id: mockChat.id,
        modelId: mockChat.modelId,
        promptId: mockChat.promptId,
        summary: mockChat.summary,
        createdAt: mockChat.createdAt,
        updatedAt: mockChat.updatedAt,
      },
    });

    expect(getChat).toHaveBeenCalledWith(mockChatId);
  });

  it('allows an admin to view any chat', async () => {
    ctx.userRole = UserRole.Admin;
    const otherUserChat = { ...mockChat, userId: mockOtherUserId };
    (getChat as jest.Mock).mockResolvedValue(otherUserChat);

    const caller = chatRouter.createCaller(ctx);
    const result = await caller.getUserChat(mockInput);

    expect(result.chat.id).toBe(mockChatId);
    expect(getChat).toHaveBeenCalledWith(mockChatId);
  });

  it('does not allow a non-owner non-admin user to view a chat', async () => {
    const otherUserChat = { ...mockChat, userId: mockOtherUserId };
    (getChat as jest.Mock).mockResolvedValue(otherUserChat);

    const caller = chatRouter.createCaller(ctx);

    await expect(caller.getUserChat(mockInput)).rejects.toThrow(
      'You do not have permission to view this chat'
    );

    expect(getChat).toHaveBeenCalledWith(mockChatId);
  });

  it('propagates errors from getChat', async () => {
    const chatError = new Error('Chat not found');
    (getChat as jest.Mock).mockRejectedValue(chatError);

    const caller = chatRouter.createCaller(ctx);

    await expect(caller.getUserChat(mockInput)).rejects.toThrow(chatError.message);

    expect(getChat).toHaveBeenCalledWith(mockChatId);
  });

  it('returns a chat with null fields', async () => {
    const chatWithNulls = {
      ...mockChat,
      modelId: null,
      promptId: null,
      summary: null,
    };
    (getChat as jest.Mock).mockResolvedValue(chatWithNulls);

    const caller = chatRouter.createCaller(ctx);
    const result = await caller.getUserChat(mockInput);

    expect(result.chat.modelId).toBeNull();
    expect(result.chat.promptId).toBeNull();
    expect(result.chat.summary).toBeNull();
  });

  it('rejects invalid chatId input', async () => {
    const caller = chatRouter.createCaller(ctx);

    await expect(
      caller.getUserChat({ chatId: 'not-a-uuid' })
    ).rejects.toThrow();

    expect(getChat).not.toHaveBeenCalled();
  });
});
