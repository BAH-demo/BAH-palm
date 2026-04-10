import { z } from 'zod';

import { procedure } from '@/server/trpc';
import { UserRole } from '@/features/shared/types/user';
import { Forbidden, BadRequest } from '@/features/shared/errors/routeErrors';
import { getChatAccess } from '@/features/chat/dal/getChatAccess';
import db from '@/server/db';

const inputSchema = z.object({
  chatId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['Collaborator', 'Viewer']),
});

const outputSchema = z.object({
  chatId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.string(),
});

export default procedure
  .input(inputSchema)
  .output(outputSchema)
  .mutation(async ({ input, ctx }) => {
    const { chatId, userId, role } = input;

    // Only Owner or Admin can add collaborators
    if (ctx.userRole !== UserRole.Admin) {
      const access = await getChatAccess(chatId, ctx.userId);
      if (access !== 'Owner') {
        throw Forbidden('Only the chat owner can add collaborators');
      }
    }

    // Validate that the target user exists
    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      throw BadRequest('Target user does not exist');
    }

    // Prevent adding the chat owner as a collaborator
    const chat = await db.chat.findUnique({ where: { id: chatId }, select: { userId: true } });
    if (chat?.userId === userId) {
      throw BadRequest('Cannot add the chat owner as a collaborator');
    }

    await db.chatMember.upsert({
      where: { chatId_userId: { chatId, userId } },
      update: { role },
      create: { chatId, userId, role },
    });

    return { chatId, userId, role };
  });
