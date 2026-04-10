import { z } from 'zod';

import { procedure } from '@/server/trpc';
import { UserRole } from '@/features/shared/types/user';
import { Forbidden } from '@/features/shared/errors/routeErrors';
import { getChatAccess } from '@/features/chat/dal/getChatAccess';
import db from '@/server/db';

const inputSchema = z.object({
  chatId: z.string().uuid(),
});

const outputSchema = z.object({
  owner: z.object({
    userId: z.string().uuid(),
    email: z.string().nullable(),
    name: z.string(),
  }),
  collaborators: z.array(
    z.object({
      userId: z.string().uuid(),
      role: z.string(),
      email: z.string().nullable(),
      name: z.string(),
      joinedAt: z.date(),
    })
  ),
});

export default procedure
  .input(inputSchema)
  .output(outputSchema)
  .query(async ({ input, ctx }) => {
    const { chatId } = input;

    // Owner, Collaborator, and Viewer can view collaborators
    if (ctx.userRole !== UserRole.Admin) {
      const access = await getChatAccess(chatId, ctx.userId);
      if (!access) {
        throw Forbidden('You do not have permission to view this chat');
      }
    }

    const chat = await db.chat.findUnique({
      where: { id: chatId },
      select: {
        userId: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });

    const members = await db.chatMember.findMany({
      where: { chatId },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return {
      owner: {
        userId: chat!.user.id,
        email: chat!.user.email,
        name: chat!.user.name,
      },
      collaborators: members.map((m) => ({
        userId: m.userId,
        role: m.role,
        email: m.user.email,
        name: m.user.name,
        joinedAt: m.joinedAt,
      })),
    };
  });
