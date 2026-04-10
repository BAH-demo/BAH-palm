import { z } from 'zod';

import { procedure } from '@/server/trpc';
import getChats from '@/features/chat/dal/getChats';

const outputSchema = z.object({
  chats: z.array(
    z.object({
      id: z.string().uuid(),
      userId: z.string().uuid(),
      modelId: z.string().nullable(),
      promptId: z.string().nullable(),
      summary: z.string().nullable(),
      createdAt: z.date(),
      updatedAt: z.date(),
      isCollaborative: z.boolean(),
      userRole: z.string(),
    })
  ),
});

export default procedure.output(outputSchema).query(async ({ ctx }) => {
  const chats = await getChats(ctx.userId);

  const output: z.infer<typeof outputSchema> = {
    chats: chats.map((chat) => ({
      id: chat.id,
      userId: chat.userId,
      modelId: chat.modelId,
      promptId: chat.promptId,
      summary: chat.summary,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      isCollaborative: chat.isCollaborative,
      userRole: chat.userRole,
    })),
  };

  return output;
});
