import { Group } from '@mantine/core';

import ChatModelSelect from './ChatModelSelect';
import ChatDocumentLibraryFileSelect from './ChatDocumentLibraryFileSelect';
import ChatKnowledgeBasesSelect from './ChatKnowledgeBasesSelect';
import { useGetSystemConfig } from '@/features/shared/api/get-system-config';
import { useGetBedrockModelAccess } from '@/features/shared/api/get-bedrock-model-access';
import Loading from '@/features/shared/components/Loading';

export default function ChatHeader() {
  const {
    data: systemConfig,
    isPending: systemConfigIsLoading,
  } = useGetSystemConfig();

  const {
    data: bedrockModelAccess,
    isPending: bedrockModelAccessIsLoading,
  } = useGetBedrockModelAccess();

  if (systemConfigIsLoading || bedrockModelAccessIsLoading) {
    return <Loading />;
  }

  return (
    <Group position='left' p='lg' spacing='lg'>
      <ChatModelSelect />
      <ChatKnowledgeBasesSelect />
      {systemConfig?.documentLibraryDocumentUploadProviderId && bedrockModelAccess?.hasAccess && (
        <ChatDocumentLibraryFileSelect />
      )}
    </Group>
  );
}
