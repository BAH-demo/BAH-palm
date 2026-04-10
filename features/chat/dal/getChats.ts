import { Chat } from '@/features/chat/types/chat';
import logger from '@/server/logger';
import db from '@/server/db';

export type ChatWithRole = Chat & {
  isCollaborative: boolean;
  userRole: string;
};

export default async function getChats(userId: string): Promise<ChatWithRole[]> {

  let results = null;
  try {
    results = await db.chat.findMany({
      where: {
        OR: [
          { userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        members: {
          where: { userId },
          select: { role: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  } catch (error) {
    logger.error('Error fetching chat records from the database.', error);
    throw new Error('Error fetching chat records');
  }

  if (!results) {
    logger.error('No chat records found in the database.');
    throw new Error('No chat records found');
  }

  return results.map((chat): ChatWithRole => {
    const isOwner = chat.userId === userId;
    const memberRole = chat.members[0]?.role;
    return {
      id: chat.id,
      userId: chat.userId,
      modelId: chat.modelId,
      promptId: chat.promptId,
      summary: chat.summary,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      isCollaborative: chat.members.length > 0 || !isOwner,
      userRole: isOwner ? 'Owner' : (memberRole ?? 'Collaborator'),
    };
  });
}
