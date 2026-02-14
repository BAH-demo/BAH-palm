import { UserRole } from '@/features/shared/types/user';
import { ContextType } from '@/server/trpc-context';
import getChat from '@/features/chat/dal/getChat';
import getMessage from '@/features/chat/dal/getMessage';
import deleteMessagesSince from '@/features/chat/dal/deleteMessagesSince';
import chatRouter from '@/features/chat/routes/index';

jest.mock('@/features/chat/dal/getChat');
jest.mock('@/features/chat/dal/getMessage');
jest.mock('@/features/chat/dal/deleteMessagesSince');

describe('delete-message route', () => {
  const mockUserId = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';
  const mockChatId = '2b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';
  const mockMessageId = '3b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';
  const mockCreatedAt = new Date('2025-06-15T10:00:00Z');

  const mockChat = {
    id: mockChatId,
    userId: mockUserId,
    modelId: 'model-1',
    promptId: null,
    summary: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMessage = {
    id: mockMessageId,
    chatId: mockChatId,
    role: 'user',
    content: 'Hello',
    createdAt: mockCreatedAt,
    citations: [],
    artifacts: [],
    followUps: [],
  };

  let ctx: ContextType;

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = {
      userId: mockUserId,
      userRole: UserRole.User,
    } as unknown as ContextType;
    (getChat as jest.Mock).mockResolvedValue(mockChat);
    (getMessage as jest.Mock).mockResolvedValue(mockMessage);
    (deleteMessagesSince as jest.Mock).mockResolvedValue(undefined);
  });

  it('deletes messages since the target message', async () => {
    const caller = chatRouter.createCaller(ctx);
    const result = await caller.deleteMessage({
      chatId: mockChatId,
      messageId: mockMessageId,
    });

    expect(result).toEqual({
      messageId: mockMessageId,
      messagedAt: mockCreatedAt,
    });
    expect(deleteMessagesSince).toHaveBeenCalledWith(mockChatId, mockCreatedAt);
  });

  it('throws Forbidden when non-admin tries to delete from another users chat', async () => {
    const otherChat = { ...mockChat, userId: 'other-user' };
    (getChat as jest.Mock).mockResolvedValue(otherChat);

    const caller = chatRouter.createCaller(ctx);
    await expect(
      caller.deleteMessage({ chatId: mockChatId, messageId: mockMessageId })
    ).rejects.toThrow('You do not have permission to use this chat');
    expect(deleteMessagesSince).not.toHaveBeenCalled();
  });

  it('allows admin to delete from any chat', async () => {
    ctx.userRole = UserRole.Admin;
    const otherChat = { ...mockChat, userId: 'other-user' };
    (getChat as jest.Mock).mockResolvedValue(otherChat);

    const caller = chatRouter.createCaller(ctx);
    const result = await caller.deleteMessage({
      chatId: mockChatId,
      messageId: mockMessageId,
    });
    expect(result.messageId).toBe(mockMessageId);
  });

  it('throws BadRequest when message does not belong to chat', async () => {
    const wrongChatMessage = { ...mockMessage, chatId: 'wrong-chat-id' };
    (getMessage as jest.Mock).mockResolvedValue(wrongChatMessage);

    const caller = chatRouter.createCaller(ctx);
    await expect(
      caller.deleteMessage({ chatId: mockChatId, messageId: mockMessageId })
    ).rejects.toThrow('Message does not belong to chat');
    expect(deleteMessagesSince).not.toHaveBeenCalled();
  });
});
