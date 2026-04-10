import db from '@/server/db';
import logger from '@/server/logger';

export type ChatAccessRole = 'Owner' | 'Collaborator' | 'Viewer' | null;

export async function getChatAccess(chatId: string, userId: string): Promise<ChatAccessRole> {
  try {
    const chat = await db.chat.findUnique({ where: { id: chatId }, select: { userId: true } });
    if (chat?.userId === userId) {
      return 'Owner';
    }

    const member = await db.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });
    return (member?.role as ChatAccessRole) ?? null;
  } catch (error) {
    logger.error(`Error checking chat access: chatId: ${chatId}, userId: ${userId}`, error);
    throw new Error('Error checking chat access');
  }
}
