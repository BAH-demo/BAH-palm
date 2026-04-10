import { trpc } from '@/libs';

/**
 * Adds a collaborator to a chat
 */
export default function useAddCollaborator() {
  const utils = trpc.useContext();

  return trpc.chat.addCollaborator.useMutation({
    onSuccess: (_result, input) => {
      void utils.chat.getCollaborators.invalidate({ chatId: input.chatId });
    },
  });
}
