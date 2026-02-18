import { Dispatch, SetStateAction, useState } from 'react';
import { Button, Group, NumberInput, PasswordInput, Select, TextInput } from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { newProviderFormSchema, NewProviderFormValues } from '@/features/shared/types';
import useAddAiProvider from '@/features/settings/api/ai-providers/add-ai-provider';
import useGetProviderOptions from '@/features/settings/api/ai-providers/get-provider-options';
import { notifications } from '@mantine/notifications';
import { IconX } from '@tabler/icons-react';
import { formatCurrencyNumber, parseNumber } from '@/features/shared/utils';

export type AddAiProviderFormProps = Readonly<{ setFormCompleted: Dispatch<SetStateAction<boolean>>; }>;

export default function AddAiProviderForm({ setFormCompleted }: AddAiProviderFormProps) {
  const { mutateAsync: addAiProvider, isPending: addAiProviderIsPending, error: addAiProviderError } = useAddAiProvider();
  const { data: providerOptionsData } = useGetProviderOptions();
  const providerSelectData = providerOptionsData?.options ?? [];

  const [selectedProvider, setSelectedProvider] = useState<string>('');

  const addAiProviderForm = useForm<NewProviderFormValues>({
    initialValues: {
      providerId: '',
      label: '',
      apiKey: '',
      orgKey: '',
      apiEndpoint: '',
      deploymentId: '',
      accessKeyId: '',
      secretAccessKey: '',
      sessionToken: '',
      region: '',
      baseURL: '',
      inputCostPerMillionTokens: undefined,
      outputCostPerMillionTokens: undefined,
    },
    validate: zodResolver(newProviderFormSchema),
  });

  const displayApiKey = ['openai', 'azure-openai', 'anthropic', 'gemini', 'openai-compatible'].includes(selectedProvider);
  const displayApiEndpoint = selectedProvider === 'azure-openai';
  const displayBaseURL = selectedProvider === 'openai-compatible';
  const displayAwsFields = selectedProvider === 'bedrock';

  const handleSubmit = async (values: NewProviderFormValues) => {
    try {
      await addAiProvider({
        label: values.label,
        providerId: values.providerId,
        apiKey: values.apiKey,
        apiEndpoint: values.apiEndpoint,
        baseURL: values.baseURL,
        orgKey: values.orgKey,
        accessKeyId: values.accessKeyId,
        secretAccessKey: values.secretAccessKey,
        sessionToken: values.sessionToken,
        region: values.region,
        inputCostPerMillionTokens: values.inputCostPerMillionTokens,
        outputCostPerMillionTokens: values.outputCostPerMillionTokens,
      });
      handleFormCompletion();
    } catch (error) {
      notifications.show({
        title: 'Add AI Provider Failed',
        message: addAiProviderError?.message ?? 'There was a problem adding the AI provider',
        icon: <IconX />,
        autoClose: false,
        withCloseButton: true,
        variant: 'failed_operation',
      });
    }
  };

  function handleFormCompletion() {
    addAiProviderForm.reset();
    setFormCompleted(true);
  }

  return (
    <form onSubmit={addAiProviderForm.onSubmit(handleSubmit)}>
      <Select
        data={providerSelectData}
        placeholder='Select AI Provider'
        data-testid='AI Provider'
        label='AI Provider'
        withinPortal={true}
        {...addAiProviderForm.getInputProps('providerId')}
        onChange={(val) => {
          addAiProviderForm.setFieldValue('providerId', val ?? '');
          setSelectedProvider(val ?? '');
        }}
      />
      <TextInput
        label='Label'
        placeholder='Label your new AI provider'
        data-testid='Label'
        {...addAiProviderForm.getInputProps('label')}
      />
      {/* AI provider configurations */}
      {displayApiEndpoint && (
        <TextInput
          label='API Endpoint'
          placeholder='API Endpoint here'
          data-testid='API Endpoint'
          {...addAiProviderForm.getInputProps('apiEndpoint')}
        />
      )}
      {displayBaseURL && (
        <TextInput
          label='Base URL'
          placeholder='https://api.example.com/v1'
          data-testid='Base URL'
          {...addAiProviderForm.getInputProps('baseURL')}
        />
      )}
      {displayApiKey && (
        <PasswordInput
          label='API Key'
          placeholder={'API Key here'}
          data-testid='API Key'
          {...addAiProviderForm.getInputProps('apiKey')}
        />
      )}

      {displayAwsFields && (
        <>
          <PasswordInput
            label='Access Key ID'
            placeholder='Access Key ID here'
            {...addAiProviderForm.getInputProps('accessKeyId')}
          />

          <PasswordInput
            label='Secret Access Key'
            placeholder='Secret Access Key here'
            {...addAiProviderForm.getInputProps('secretAccessKey')}
          />

          <PasswordInput
            label='Session Token'
            placeholder='Session Token here'
            {...addAiProviderForm.getInputProps('sessionToken')}
          />

          <TextInput
            label='Region'
            placeholder='Region here'
            {...addAiProviderForm.getInputProps('region')}
          />
        </>
      )}

      <NumberInput
        label='Input Token Cost ($/1M tokens)'
        placeholder='0.00'
        description='Leave blank if you do not want to track input tokens cost.'
        precision={2}
        icon='$'
        parser={(value) => parseNumber(value)}
        formatter={(value) => formatCurrencyNumber(value)}
        hideControls
        {...addAiProviderForm.getInputProps('inputCostPerMillionTokens')}
      />
      <NumberInput
        label='Output Token Cost ($/1M tokens)'
        description='Leave blank if you do not want to track output tokens cost.'
        placeholder='0.00'
        precision={2}
        icon='$'
        parser={(value) => parseNumber(value)}
        formatter={(value) => formatCurrencyNumber(value)}
        hideControls
        {...addAiProviderForm.getInputProps('outputCostPerMillionTokens')}
      />
      <Group spacing='lg' grow>
        <Button variant='outline' onClick={handleFormCompletion}>
          Cancel
        </Button>
        <Button
          type='submit'
          data-testid='submit'
          loading={addAiProviderIsPending}>
          {addAiProviderIsPending ? 'Adding AI Provider' : 'Add AI Provider'}
        </Button>
      </Group>
    </form>
  );
}
