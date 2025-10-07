import { SimpleGrid, Stack, Text, Title } from '@mantine/core';
import router from 'next/router';

import PromptGenerator from '@/features/prompt-generator/components/PromptGenerator';
import { useGetSystemConfig } from '@/features/shared/api/get-system-config';
import { PromptGeneratorProvider } from '@/features/prompt-generator/providers';
import CenteredLoader from '@/features/shared/components/CenteredLoader';

export default function GeneratePrompt() {

  const { data: systemConfig, isPending: systemConfigPending } = useGetSystemConfig();

  if (systemConfigPending) {
    return <CenteredLoader />;
  }

  const isFeatureEnabled = systemConfig?.featureManagementPromptGenerator;

  if (!isFeatureEnabled) {
    router.push('/chat');
    return null;
  }

  return (
    <>
      <SimpleGrid cols={2} p='xl'>
        <Stack spacing='xxs'>
          <Title fz='xxl' order={1} c='gray.1'>
            Prompt Generator
          </Title>
          <Text c='gray.6' fz='md'>
            Develop powerful prompts with the help of AI
          </Text>
        </Stack>
        <Text c='gray.6' fz='sm'>
          This page allows you to generate powerful prompts using AI.
          With a simplified three-step process, you can easily create, customize, and categorize prompts for various use cases.
        </Text>
      </SimpleGrid>
      <PromptGeneratorProvider>
        <PromptGenerator />
      </PromptGeneratorProvider>
    </>
  );
}
