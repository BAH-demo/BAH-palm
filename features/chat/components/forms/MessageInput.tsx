import React, { useState } from 'react';
import { ActionIcon, Center, Flex, Textarea, Box, Loader } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { IconArrowNarrowRight } from '@tabler/icons-react';

import { ChatFormValues } from '@/features/chat/components/forms/ChatForm';
import { InputTooltip } from '@/features/shared/components/forms/InputTooltip';
import useGetAvailableModels from '@/features/shared/api/get-available-models';
import { useChat } from '@/features/chat/providers/ChatProvider';
import SelectedTextComponent from '@/features/chat/components/entries/elements/SelectedText';
import ChatDeepResearchButton from '@/features/chat/components/ChatDeepResearchButton';
import { trpc } from '@/libs';
import { DeepResearchStatus } from '@/features/chat/types/message';
import useCancelDeepResearch from '@/features/chat/api/cancel-deep-research';
import CancelDeepResearchModal from '@/features/chat/components/modals/CancelDeepResearchModal';

type MessageInputProps = Readonly<{
  form: UseFormReturnType<ChatFormValues>;
  isDisabled: boolean;
  isPending: boolean;
  handleSubmit: () => void;
}>;

export default function MessageInput({
  form,
  isDisabled,
  isPending,
  handleSubmit,
}: MessageInputProps) {
  const { data: models, isPending: modelsIsPending } = useGetAvailableModels();
  const { modelId, chatId, selectedArtifact, selectedText, setSelectedText, isLastMessageRetry, deepResearchEnabled } = useChat();
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  const cancelDeepResearch = useCancelDeepResearch(chatId || undefined);
  
  // Get latest messages to check for running deep research
  const { data: messagesData } = trpc.chat.getMessages.useQuery(
    { chatId: chatId || '' },
    { enabled: !!chatId }
  );
  
  // Find the latest deep research message that's still processing (only PENDING, ACTIVE, or null/undefined status)
  const runningDeepResearchMessage = messagesData?.messages?.find(
    msg => {
      if (!msg.deepResearch) {
        return false;
      }

      const status = msg.deepResearchStatus;
      // Only show stop button for actively processing jobs
      return status === DeepResearchStatus.PENDING || 
             status === null || 
             status === undefined;
    }
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isSubmitDisabled && !runningDeepResearchMessage) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCancelResearch = () => {
    setShowCancelModal(true);
  };

  const confirmCancelResearch = async () => {
    if (runningDeepResearchMessage?.deepResearchJobId) {
      try {
        await cancelDeepResearch.mutateAsync({ jobId: runningDeepResearchMessage.deepResearchJobId });
        setShowCancelModal(false);
      } catch (error) {
        setShowCancelModal(false);
      }
    } else {
      setShowCancelModal(false);
    }
  };

  let isModelSelected = !!modelId;
  let tooltipMessage = '';

  // Determine the tooltip message based on the current state of the chat
  if (isLastMessageRetry) {
    tooltipMessage = 'An unexpected error occurred. Please retry the last message to continue.';
  } else if (chatId === null) {
    if (models?.availableModels.length === 0) {
      tooltipMessage =
        'There are currently no large language models available to chat with.';
      isModelSelected = false;
    } else if (!modelId) {
      tooltipMessage = 'Please select a model to start a new chat.';
      isModelSelected = false;
    }
  } else if (!modelId || !models?.availableModels.find((m) => m.id === modelId)) {
    tooltipMessage =
      'The model used for this chat is no longer available. Please begin a new chat.';
    isModelSelected = false;
  }

  const isSubmitDisabled =
    isDisabled || !isModelSelected || form.values.message === '';
  const isTooltipDisabled =
    (!isDisabled && isModelSelected) || tooltipMessage === '';
  const isInputDisabled = modelsIsPending || !models?.availableModels.length || isLastMessageRetry;

  return (
    <Box
      py='md'
      px={selectedArtifact ? 'md' : 'lg'}
      w='100%'
      bg='dark.5'
      style={{
        ...(selectedArtifact && {
          borderBottomLeftRadius: '12px',
          borderBottomRightRadius: '12px',
        }),
      }}
    >
      {selectedText && (
        <Box>
          <SelectedTextComponent
            selectedText={selectedText}
            onRemove={() => setSelectedText(null)}
          />
        </Box>
      )}
      <Flex
        justify='center'
        align='end'
        gap='sm'
      >
        <Center w='100%'>
          <ChatDeepResearchButton />
          <InputTooltip
            message={tooltipMessage}
            disabled={isTooltipDisabled}
          >
            <Textarea
              aria-label='Write message here'
              data-testid='chat-input-textarea'
              placeholder='Type something here...'
              mb='0'
              p='md'
              pl={0}
              w='100%'
              radius='md'
              {...form.getInputProps('message')}
              onKeyDown={onKeyDown}
              autosize
              minRows={1}
              maxRows={8}
              styles={(theme) => ({
                input: {
                  border: `1px solid ${theme.colors.dark[1]}`,
                  padding: `${theme.spacing.md}!important`,
                },
              })}
              disabled={isInputDisabled}
            />
          </InputTooltip>
          <InputTooltip
            message={runningDeepResearchMessage ? 'Cancel Deep Research' : tooltipMessage}
            disabled={runningDeepResearchMessage ? false : isTooltipDisabled}
          >
            <ActionIcon
              aria-label={runningDeepResearchMessage ? 'Cancel research' : 'Send message'}
              variant='filled'
              radius='md'
              size={50}
              color={runningDeepResearchMessage ? 'gray.9' : 'blue.6'}
              disabled={runningDeepResearchMessage ? false : isSubmitDisabled}
              onClick={runningDeepResearchMessage ? handleCancelResearch : handleSubmit}
              style={{
                transition: 'all 0.2s ease-in-out',
              }}
            >
              {runningDeepResearchMessage ? (
                !cancelDeepResearch.isPending && (
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader size='md' color='white' />
                    <div 
                      style={{
                        position: 'absolute',
                        width: 10,
                        height: 10,
                        backgroundColor: '#C6CAD2', // gray.6
                        borderRadius: 1,
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  </div>
                )
              ) : (
                isPending && !deepResearchEnabled ? (
                  <Loader size='md' color='white' />
                ) : (
                  <IconArrowNarrowRight color='#2E2F34' size={50} stroke={1} />
                )
              )}
            </ActionIcon>
          </InputTooltip>
        </Center>
      </Flex>
      
      <CancelDeepResearchModal
        opened={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={confirmCancelResearch}
      />
    </Box>
  );
}
