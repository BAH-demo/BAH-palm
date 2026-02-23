import { ContextType } from '@/server/trpc-context';
import chatRouter from '@/features/chat/routes';
import { UserRole } from '@/features/shared/types/user';
import { Chat } from '@/features/chat/types/chat';
import { Message, MessageRole } from '@/features/chat/types/message';
import getChat from '@/features/chat/dal/getChat';
import getMessage from '@/features/chat/dal/getMessage';
import deleteMessagesSince from '@/features/chat/dal/deleteMessagesSince';

jest.mock('@/features/chat/dal/getChat');
jest.mock('@/features/chat/dal/getMessage');
jest.mock('@/features/chat/dal/deleteMessagesSince');

describe('delete-message route', () => {
  const mockUserId = 'ec4dd2cf-c867-4a81-b940-d22d98544a0c';
  const mockChatId = '7b91f044-da78-43d4-91aa-5fbeffcb3e75';
  const mockMessageId = 'd7ad8ccf-ebfb-4acf-acd8-9d699dbc5d4d';
  const mockOtherUserId = 'ab12cd34-ef56-7890-abcd-ef1234567890';
  const mockCreatedAt = new Date('2024-06-15T12:00:00.000Z');

  const mockChat: Chat = {
    id: mockChatId,
    userId: mockUserId,
    modelId: null,
    promptId: null,
    summary: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  const mockMessage: Message = {
    id: mockMessageId,
    chatId: mockChatId,
    role: MessageRole.User,
    content: 'Test message',
    createdAt: mockCreatedAt,
    citations: [],
    artifacts: [],
    followUps: [],
    deepResearch: false,
  };

  const mockInput = {
    chatId: mockChatId,
    messageId: mockMessageId,
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

  it('allows the chat owner to delete a message', async () => {
    const caller = chatRouter.createCaller(ctx);
    const result = await caller.deleteMessage(mockInput);

    expect(result).toEqual({
      messageId: mockMessageId,
      messagedAt: mockCreatedAt,
    });

    expect(getChat).toHaveBeenCalledWith(mockChatId);
    expect(getMessage).toHaveBeenCalledWith(mockMessageId);
    expect(deleteMessagesSince).toHaveBeenCalledWith(mockChatId, mockCreatedAt);
  });

  it('allows an admin to delete a message in any chat', async () => {
    ctx.userRole = UserRole.Admin;
    const otherUserChat = { ...mockChat, userId: mockOtherUserId };
    (getChat as jest.Mock).mockResolvedValue(otherUserChat);

    const caller = chatRouter.createCaller(ctx);
    const result = await caller.deleteMessage(mockInput);

    expect(result).toEqual({
      messageId: mockMessageId,
      messagedAt: mockCreatedAt,
    });

    expect(deleteMessagesSince).toHaveBeenCalledWith(mockChatId, mockCreatedAt);
  });

  it('does not allow a non-owner non-admin user to delete a message', async () => {
    const otherUserChat = { ...mockChat, userId: mockOtherUserId };
    (getChat as jest.Mock).mockResolvedValue(otherUserChat);

    const caller = chatRouter.createCaller(ctx);

    await expect(caller.deleteMessage(mockInput)).rejects.toThrow(
      'You do not have permission to use this chat'
    );

    expect(getChat).toHaveBeenCalledWith(mockChatId);
    expect(getMessage).not.toHaveBeenCalled();
    expect(deleteMessagesSince).not.toHaveBeenCalled();
  });

  it('throws an error when the message does not belong to the chat', async () => {
    const wrongChatMessage = { ...mockMessage, chatId: 'ab12cd34-ef56-7890-abcd-ef1234567890' };
    (getMessage as jest.Mock).mockResolvedValue(wrongChatMessage);

    const caller = chatRouter.createCaller(ctx);

    await expect(caller.deleteMessage(mockInput)).rejects.toThrow(
      'Message does not belong to chat'
    );

    expect(getChat).toHaveBeenCalledWith(mockChatId);
    expect(getMessage).toHaveBeenCalledWith(mockMessageId);
    expect(deleteMessagesSince).not.toHaveBeenCalled();
  });

  it('propagates errors from getChat', async () => {
    const chatError = new Error('Chat not found');
    (getChat as jest.Mock).mockRejectedValue(chatError);

    const caller = chatRouter.createCaller(ctx);

    await expect(caller.deleteMessage(mockInput)).rejects.toThrow(chatError.message);

    expect(getMessage).not.toHaveBeenCalled();
    expect(deleteMessagesSince).not.toHaveBeenCalled();
  });

  it('propagates errors from getMessage', async () => {
    const messageError = new Error('Message not found');
    (getMessage as jest.Mock).mockRejectedValue(messageError);

    const caller = chatRouter.createCaller(ctx);

    await expect(caller.deleteMessage(mockInput)).rejects.toThrow(messageError.message);

    expect(getChat).toHaveBeenCalledWith(mockChatId);
    expect(getMessage).toHaveBeenCalledWith(mockMessageId);
    expect(deleteMessagesSince).not.toHaveBeenCalled();
  });

  it('propagates errors from deleteMessagesSince', async () => {
    const deleteError = new Error('Error deleting messages');
    (deleteMessagesSince as jest.Mock).mockRejectedValue(deleteError);

    const caller = chatRouter.createCaller(ctx);

    await expect(caller.deleteMessage(mockInput)).rejects.toThrow(deleteError.message);

    expect(deleteMessagesSince).toHaveBeenCalledWith(mockChatId, mockCreatedAt);
  });

  it('rejects invalid input', async () => {
    const caller = chatRouter.createCaller(ctx);

    await expect(
      caller.deleteMessage({ chatId: 'not-a-uuid', messageId: mockMessageId })
    ).rejects.toThrow();

    expect(getChat).not.toHaveBeenCalled();
  });
});
