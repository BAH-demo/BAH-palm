import { trpc } from '@/libs';
import { DocumentUploadStatus } from '@/features/shared/types/document';

export default function useGetChatDocuments({ documentUploadProviderId }: { documentUploadProviderId: string }) {
  const query = trpc.shared.getDocuments.useQuery(
    { documentUploadProviderId },
    {
      enabled: !!documentUploadProviderId,
      select: (data) => ({
        ...data,
        documents: data?.documents?.filter(
          (document) => document.uploadStatus === DocumentUploadStatus.Completed
        ) || [],
      }),
    }
  );
  return query;
}
