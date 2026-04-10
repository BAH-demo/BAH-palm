import { z } from 'zod';

import { procedure } from '@/server/trpc';
import { UserRole } from '@/features/shared/types/user';
import { Forbidden } from '@/features/shared/errors/routeErrors';
import { getChatAccess } from '@/features/chat/dal/getChatAccess';
import db from '@/server/db';

const inputSchema = z.object({
  chatId: z.string().uuid(),
  userId: z.string().uuid(),
});

const outputSchema = z.object({
  chatId: z.string().uuid(),
  userId: z.string().uuid(),
});

export default procedure
  .input(inputSchema)
  .output(outputSchema)
  .mutation(async ({ input, ctx }) => {
    const { chatId, userId } = input;

    // Only Owner or Admin can remove collaborators
    if (ctx.userRole !== UserRole.Admin) {
      const access = await getChatAccess(chatId, ctx.userId);
      if (access !== 'Owner') {
        throw Forbidden('Only the chat owner can remove collaborators');
      }
    }

    await db.chatMember.deleteMany({
      where: { chatId, userId },
    });

    return { chatId, userId };
  });
