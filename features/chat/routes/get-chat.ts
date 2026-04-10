import { z } from 'zod';

import { procedure } from '@/server/trpc';
import { UserRole } from '@/features/shared/types/user';
import { Forbidden } from '@/features/shared/errors/routeErrors';
import logger from '@/server/logger';
import getChat from '@/features/chat/dal/getChat';
import { getChatAccess } from '@/features/chat/dal/getChatAccess';

const inputSchema = z.object({
  chatId: z.string().uuid(),
});

const outputSchema = z.object({
  chat: z.object({
    id: z.string().uuid(),
    modelId: z.string().nullable(),
    promptId: z.string().nullable(),
    summary: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
});

export default procedure
  .input(inputSchema)
  .output(outputSchema)
  .query(async ({ input, ctx }) => {
    const { chatId } = input;

    const chat = await getChat(chatId);

    // perform an access check with the user's id
    if (ctx.userRole !== UserRole.Admin) {
      const access = await getChatAccess(chatId, ctx.userId);
      if (!access) {
        logger.error(`You do not have permission to view this chat: userId: ${ctx.userId}, chatId: ${chat.id}`);
        throw Forbidden('You do not have permission to view this chat');
      }
    }

    return {
      chat: {
        id: chat.id,
        userId: chat.userId,
        modelId: chat.modelId,
        promptId: chat.promptId,
        summary: chat.summary,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      },
    };
  });
