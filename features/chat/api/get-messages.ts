import { trpc } from '@/libs';

/**
 * Fetches a chats messages by their chatId
 *
 * @param chatId
 * @param isCollaborative - If true, enables polling every 3 seconds for real-time sync
 */
export default function useGetMessages(chatId: string | null, isCollaborative: boolean = false) {
  return trpc.chat.getMessages.useQuery({ chatId: chatId || '' }, {
    enabled: !!chatId,
    refetchInterval: isCollaborative ? 3000 : false,
  });
}
