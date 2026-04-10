import { trpc } from '@/libs';

/**
 * Removes a collaborator from a chat
 */
export default function useRemoveCollaborator() {
  const utils = trpc.useContext();

  return trpc.chat.removeCollaborator.useMutation({
    onSuccess: (_result, input) => {
      void utils.chat.getCollaborators.invalidate({ chatId: input.chatId });
    },
  });
}
