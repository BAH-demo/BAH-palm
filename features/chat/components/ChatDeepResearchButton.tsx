import { Button, Tooltip } from '@mantine/core';
import { IconListSearch } from '@tabler/icons-react';

import { useChat } from '@/features/chat/providers/ChatProvider';
import { AiProviderType } from '@/features/shared/types/ai-provider';
import useGetAvailableModels from '@/features/shared/api/get-available-models';

export default function ChatDeepResearchButton() {
  const {
    data: modelData,
    isPending: modelDataIsPending,
  } = useGetAvailableModels();

  const { deepResearchEnabled, setDeepResearchEnabled, modelId } = useChat();

  const selectedModel = modelData?.availableModels?.find(model => model.id === modelId);
  const modelSelectedIsOpenAiProvider = selectedModel?.aiProviderTypeId === AiProviderType.OpenAi;

  if (modelDataIsPending) {
    return <></>;
  }

  if (!modelSelectedIsOpenAiProvider) {
    return <></>;
  }

  return (
    <Tooltip
      label='Use deep research to search the web and enhance your response'
      withArrow
      multiline
      w={250}
      events={{ 'hover': true, 'focus': true, 'touch': true }}
    >
      <Button
        mr='md' 
        data-testid='chat-deep-research-button'
        leftIcon={<IconListSearch stroke={2} />}
        variant={deepResearchEnabled ? 'filled' : 'outline'}
        size='sm'
        onClick={() => setDeepResearchEnabled(!deepResearchEnabled)}
      >
        Research
      </Button>
    </Tooltip>
  );
}
