import { Box, Select, Tooltip } from '@mantine/core';
import { useEffect, useMemo, useRef } from 'react';
import { useChat } from '@/features/chat/providers/ChatProvider';
import useGetAvailableModels from '@/features/shared/api/get-available-models';

export default function ChatModelSelect() {
  const { chatId, modelId, setModelId } = useChat();

  const {
    data: modelData,
    isError: modelsIsError,
    error: modelsError,
  } = useGetAvailableModels();

  const selectRef = useRef<HTMLInputElement>(null);

  const modelOptions = useMemo(() => {
    if (!modelData) {
      return [];
    }

    return modelData.availableModels.map((model) => ({
      value: model.id,
      label: model.name,
      group: model.providerLabel,
    }));
  }, [modelData]);

  const isChatModelAvailable = useMemo(() => {
    if (!modelId || !modelOptions.length) {
      return false;
    }
    return modelOptions.some(option => option.value === modelId);
  }, [modelId, modelOptions]);

  useEffect(() => {
    if (modelOptions.length && selectRef.current) {
      selectRef.current.focus();
    }
  }, [modelOptions.length]);

  // Users may only select a model for new chats
  const canSelectModel = chatId === null;

  let selectPlaceholder = 'Select a model';
  let tooltipPlaceholder = 'Unable to change model selection once conversation has begun';
  if (!chatId && !modelOptions.length) {
    selectPlaceholder = 'No models available';
  } else if (chatId && !isChatModelAvailable) {
    selectPlaceholder = 'Model unavailable';
    tooltipPlaceholder = 'The model associated with this chat has been deleted. Please start a new chat.';
  }

  if (modelsIsError) {
    return <Box>{modelsError.message}</Box>;
  }

  const handleModelChange = (value: string) => {
    setModelId(value);
  };

  return (
    <Tooltip
      label={tooltipPlaceholder}
      disabled={canSelectModel}
      // Explicitly set events to prevent tooltip from showing whenever disabled prop changes value
      events={{ 'hover': true, 'focus': true, 'touch': true }}
    >
      <div>
        <Select
          aria-label={selectPlaceholder}
          ref={selectRef}
          data={modelOptions}
          mb={0}
          value={modelId}
          placeholder={selectPlaceholder}
          onChange={handleModelChange}
          data-testid='model-select'
          disabled={!modelOptions.length || !canSelectModel}
          initiallyOpened={canSelectModel}
        />
      </div>
    </Tooltip>
  );
};
