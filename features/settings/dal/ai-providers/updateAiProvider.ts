import logger from '@/server/logger';
import db from '@/server/db';
import { Prisma } from '@prisma/client';
import { AiProviderType, Provider, ProviderConfig, providerIdFromTypeId } from '@/features/shared/types';

type UpdateAiProviderInput = {
  id: string;
  label: string;
  costPerInputToken?: number;
  costPerOutputToken?: number;
  apiKey: string,
  accessKeyId: string,
  secretAccessKey: string,
  sessionToken: string,
  apiEndpoint: string,
  region: string,
}

export default async function updateAiProvider(input: UpdateAiProviderInput): Promise<Provider> {
  return db.$transaction(async (tx): Promise<Provider> => {

    let aiProvider;

    try {
      aiProvider = await tx.aiProvider.findUnique({
        where: {
          id: input.id,
          deletedAt: null,
        },
        select: {
          id: true,
          label: true,
          providerId: true,
          aiProviderTypeId: true,
          apiConfigId: true,
          deletedAt: true,
        },
      });

    } catch (error) {
      logger.error('There was an error retrieving the AI provider', error);
      throw new Error('There was an error retrieving the AI provider');
    }

    if (!aiProvider) {
      logger.warn(`AI Provider could not be found: ${input.id}`);
      throw new Error('AI Provider could not be found.');
    }

    if (aiProvider.deletedAt !== null) {
      logger.warn(`AI Provider is deleted and cannot be updated: ${input.id}`);
      throw new Error('AI Provider is deleted and cannot be updated.');
    }

    try {
      const updatedProvider = await tx.aiProvider.update({
        where: { id: aiProvider.id, deletedAt: null },
        data: {
          label: input.label,
          costPerInputToken: input.costPerInputToken,
          costPerOutputToken: input.costPerOutputToken,
        },
      });

      const existingConfig = await tx.apiConfig.findUnique({
        where: { id: aiProvider.apiConfigId, deletedAt: null },
      });

      let updatedConfig: ProviderConfig;

      if (existingConfig) {
        const currentConfigData = existingConfig.config as Record<string, string>;
        const updatedConfigData = { ...currentConfigData };

        const fieldsToUpdate: Record<string, string> = {
          apiKey: input.apiKey,
          accessKeyId: input.accessKeyId,
          secretAccessKey: input.secretAccessKey,
          sessionToken: input.sessionToken,
          apiEndpoint: input.apiEndpoint,
          region: input.region,
        };

        for (const [key, value] of Object.entries(fieldsToUpdate)) {
          if (value && value.trim().length > 0) {
            updatedConfigData[key] = value;
          }
        }

        const result = await tx.apiConfig.update({
          where: { id: existingConfig.id, deletedAt: null },
          data: { config: updatedConfigData },
        });

        updatedConfig = {
          id: result.id,
          type: 'generic' as const,
          providerId: result.providerId,
          ...(result.config as Record<string, string>),
        };
      } else {
        updatedConfig = await updateLegacyConfig(tx, aiProvider, input);
      }

      const resolvedProviderId = aiProvider.providerId || providerIdFromTypeId(aiProvider.aiProviderTypeId);

      return {
        id: updatedProvider.id,
        providerId: resolvedProviderId,
        typeId: updatedProvider.aiProviderTypeId,
        label: updatedProvider.label,
        configTypeId: updatedProvider.aiProviderTypeId,
        costPerInputToken: updatedProvider.costPerInputToken,
        costPerOutputToken: updatedProvider.costPerOutputToken,
        config: updatedConfig,
        createdAt: updatedProvider.createdAt,
        updatedAt: updatedProvider.updatedAt,
      };
    } catch (error) {
      logger.error('Error updating AI provider configuration', error);
      throw new Error('Error updating AI provider configuration');
    }
  });
}

async function updateLegacyConfig(
  tx: Prisma.TransactionClient,
  aiProvider: { id: string; aiProviderTypeId: AiProviderType; apiConfigId: string },
  input: UpdateAiProviderInput,
): Promise<ProviderConfig> {
  const newApiConfig: Record<string, string> = {};
  const secretFields = ['apiKey', 'accessKeyId', 'secretAccessKey', 'sessionToken'] as const;

  secretFields.forEach((field) => {
    const value = input[field];
    if (value && value.trim().length > 0) {
      newApiConfig[field] = value;
    }
  });

  switch (aiProvider.aiProviderTypeId) {
    case AiProviderType.OpenAi: {
      const result = await tx.apiConfigOpenAi.update({
        where: { id: aiProvider.apiConfigId, deletedAt: null },
        data: newApiConfig,
      });
      return { id: result.id, type: AiProviderType.OpenAi, apiKey: result.apiKey, orgKey: result.orgKey };
    }
    case AiProviderType.AzureOpenAi: {
      newApiConfig['apiEndpoint'] = input.apiEndpoint;
      const result = await tx.apiConfigAzureOpenAi.update({
        where: { id: aiProvider.apiConfigId, deletedAt: null },
        data: newApiConfig,
      });
      return { id: result.id, type: AiProviderType.AzureOpenAi, apiKey: result.apiKey, apiEndpoint: result.apiEndpoint, deploymentId: result.deploymentId };
    }
    case AiProviderType.Anthropic: {
      const result = await tx.apiConfigAnthropic.update({
        where: { id: aiProvider.apiConfigId, deletedAt: null },
        data: newApiConfig,
      });
      return { id: result.id, type: AiProviderType.Anthropic, apiKey: result.apiKey };
    }
    case AiProviderType.Gemini: {
      const result = await tx.apiConfigGemini.update({
        where: { id: aiProvider.apiConfigId, deletedAt: null },
        data: newApiConfig,
      });
      return { id: result.id, type: AiProviderType.Gemini, apiKey: result.apiKey };
    }
    case AiProviderType.Bedrock: {
      newApiConfig['region'] = input.region;
      const result = await tx.apiConfigBedrock.update({
        where: { id: aiProvider.apiConfigId, deletedAt: null },
        data: newApiConfig,
      });
      return { id: result.id, type: AiProviderType.Bedrock, accessKeyId: result.accessKeyId, secretAccessKey: result.secretAccessKey, sessionToken: result.sessionToken, region: result.region };
    }
    default:
      logger.warn(`Unsupported AI provider type: ${aiProvider.aiProviderTypeId}`);
      throw new Error('Unsupported AI provider');
  }
}
