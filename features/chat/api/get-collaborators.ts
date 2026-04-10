import { trpc } from '@/libs';

/**
 * Fetches collaborators for a chat
 *
 * @param chatId - The chat to get collaborators for
 */
export default function useGetCollaborators(chatId: string | null) {
  return trpc.chat.getCollaborators.useQuery({ chatId: chatId || '' }, {
    enabled: !!chatId,
  });
}
