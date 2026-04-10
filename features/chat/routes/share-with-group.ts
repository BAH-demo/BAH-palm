import { z } from 'zod';

import { procedure } from '@/server/trpc';
import { UserRole } from '@/features/shared/types/user';
import { Forbidden, BadRequest } from '@/features/shared/errors/routeErrors';
import { getChatAccess } from '@/features/chat/dal/getChatAccess';
import db from '@/server/db';

const inputSchema = z.object({
  chatId: z.string().uuid(),
  userGroupId: z.string().uuid(),
  role: z.enum(['Collaborator', 'Viewer']),
});

const outputSchema = z.object({
  chatId: z.string().uuid(),
  addedCount: z.number(),
});

export default procedure
  .input(inputSchema)
  .output(outputSchema)
  .mutation(async ({ input, ctx }) => {
    const { chatId, userGroupId, role } = input;

    // Only Owner or Admin can share with groups
    if (ctx.userRole !== UserRole.Admin) {
      const access = await getChatAccess(chatId, ctx.userId);
      if (access !== 'Owner') {
        throw Forbidden('Only the chat owner can share with groups');
      }
    }

    // Validate that the user group exists
    const group = await db.userGroup.findUnique({ where: { id: userGroupId } });
    if (!group) {
      throw BadRequest('User group does not exist');
    }

    // Get all members of the group
    const memberships = await db.userGroupMembership.findMany({
      where: { userGroupId },
      select: { userId: true },
    });

    // Get the chat owner to exclude them
    const chat = await db.chat.findUnique({ where: { id: chatId }, select: { userId: true } });
    const ownerUserId = chat?.userId;

    // Filter out the chat owner from the group members
    const userIds = memberships
      .map((m) => m.userId)
      .filter((uid) => uid !== ownerUserId);

    let addedCount = 0;
    for (const userId of userIds) {
      await db.chatMember.upsert({
        where: { chatId_userId: { chatId, userId } },
        update: { role },
        create: { chatId, userId, role },
      });
      addedCount++;
    }

    return { chatId, addedCount };
  });
