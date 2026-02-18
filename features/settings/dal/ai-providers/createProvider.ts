import { Provider, AiProviderType } from '@/features/shared/types';
import db from '@/server/db';
import { createUnifiedProviderConfig } from '@/features/settings/dal/ai-providers/createProviderConfig';
import logger from '@/server/logger';

type CreateProviderInput = {
  label: string;
  providerId: string;
  config: Record<string, string>;
  costPerInputToken?: number;
  costPerOutputToken?: number;
};

export default async function createProvider(input: CreateProviderInput): Promise<Provider> {
  try {
    return db.$transaction(async (tx) => {
      const providerConfig = await createUnifiedProviderConfig(tx, {
        providerId: input.providerId,
        config: input.config,
      });

      const legacyTypeId = legacyTypeFromProviderId(input.providerId);

      const provider = await tx.aiProvider.create({
        data: {
          label: input.label,
          providerId: input.providerId,
          aiProviderTypeId: legacyTypeId,
          apiConfigType: legacyTypeId,
          apiConfigId: providerConfig.id,
          costPerInputToken: input.costPerInputToken,
          costPerOutputToken: input.costPerOutputToken,
        },
      });

      return {
        id: provider.id,
        providerId: provider.providerId,
        typeId: provider.aiProviderTypeId as AiProviderType,
        label: provider.label,
        configTypeId: provider.apiConfigType as AiProviderType,
        config: {
          id: providerConfig.id,
          type: 'generic' as const,
          providerId: providerConfig.providerId,
          ...providerConfig.config,
        },
        costPerInputToken: provider.costPerInputToken,
        costPerOutputToken: provider.costPerOutputToken,
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt,
      };
    });
  } catch (error) {
    logger.error('Error creating provider', error);
    throw new Error('Error creating provider');
  }
}

function legacyTypeFromProviderId(providerId: string): number {
  const map: Record<string, number> = {
    'openai': AiProviderType.OpenAi,
    'azure-openai': AiProviderType.AzureOpenAi,
    'bedrock': AiProviderType.Bedrock,
    'anthropic': AiProviderType.Anthropic,
    'gemini': AiProviderType.Gemini,
  };
  return map[providerId] ?? AiProviderType.OpenAi;
}
