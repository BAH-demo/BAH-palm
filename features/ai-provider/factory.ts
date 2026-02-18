import {
  AuditedSource,
  AiProviderUsageTracker,
} from './sources';

import buildProvider from '@/features/shared/dal/buildProvider';
import {
  AzureOpenAiConfig,
  Provider,
  AiProviderType,
  GenericConfig,
  providerIdFromTypeId,
  configToRecord,
} from '@/features/shared/types';
import db from '@/server/db';
import { Model } from '@/features/shared/types/model';
import logger from '@/server/logger';
import getSystemConfig from '@/features/shared/dal/getSystemConfig';
import { AiRepository } from './sources/types';
import { getConfig } from '@/server/config';
import { ProviderRegistry } from './registry';
import { UniversalAiSdkAdapter } from './sources/universal-adapter';
import { OpenAiDeepResearchAdapter } from './sources/extensions/openai-deep-research';

// Once the AIProvider model is in place, we may want to change this to:
//   type AiRepositoryConfig = Omit<AiProvider, 'id'>;
// Note: this type does not enforce required/optional fields- it's up to the
//       source to validate provided values before using them
export interface AiRepositoryConfig {
  type: AiProviderType;
  apiKey?: string | null;
  apiEndpoint?: string | null;
  deploymentId?: string | null;
  models?: string[];
}

type BuildResult = {
  source: AiRepository;
  provider: Provider;
  model: Model;
};

export type ProviderFunction = (
  sourceConfig: AiRepositoryConfig,
) => AiRepository;

export interface AIFactoryConfig {
  userId: string;
}

export class AIFactory {
  constructor(protected config: AIFactoryConfig) {
    if (!this.config.userId) {
      logger.error('Missing required configuration properties: config.userId');
      throw new Error('Missing required configuration properties');
    }
  }

  async buildSource(modelId: string): Promise<BuildResult> {
    // get the aiProvider and model information
    const result = await db.model.findUniqueOrThrow({
      where: { id: modelId, deletedAt: null },
      select: {
        aiProviderId: true,
        name: true,
        externalId: true,
        aiProvider: true,
        costPerInputToken: true,
        costPerOutputToken: true,
      },
    });

    let provider = await buildProvider(db, result.aiProvider);
    const resolvedPid = provider.providerId || providerIdFromTypeId(provider.typeId);
    if (resolvedPid === 'azure-openai') {
      if ((provider.config as GenericConfig).type === 'generic') {
        const cfg = provider.config as GenericConfig;
        if (!cfg['deploymentId']) {
          cfg['deploymentId'] = result.externalId;
        }
      } else {
        const azureConfig = provider.config as AzureOpenAiConfig;
        if (!azureConfig.deploymentId) {
          azureConfig.deploymentId = result.externalId;
        }
      }
    }

    return {
      source: this.buildClient(provider),
      provider,
      model: {
        id: modelId,
        name: result.name,
        aiProviderId: result.aiProviderId,
        externalId: result.externalId,
        costPerInputToken: result.costPerInputToken,
        costPerOutputToken: result.costPerOutputToken,
      },
    };
  }

  async buildUserSource(modelId: string): Promise<BuildResult> {
    const result = await this.buildSource(modelId);
    return {
      source: await this.wrapAiProviderUsageTracker(
        this.wrapAudit(result.source),
        modelId,
        false,
      ),
      provider: result.provider,
      model: result.model,
    };
  }

  async buildSystemSource(modelId?: string): Promise<BuildResult> {
    const systemConfigResult = await getSystemConfig();

    const selectedModelId =
      modelId ?? systemConfigResult.systemAiProviderModelId;

    if (!selectedModelId) {
      throw new Error('This system is not configured for use at this time');
    }

    const result = await this.buildSource(selectedModelId);

    return {
      source: await this.wrapAiProviderUsageTracker(
        this.wrapAudit(result.source),
        selectedModelId,
        true,
      ),
      provider: result.provider,
      model: result.model,
    };
  }

  private buildClient(provider: Provider): AiRepository {
    const resolvedProviderId = provider.providerId || providerIdFromTypeId(provider.typeId);
    const configRecord = configToRecord(provider.config);

    if (resolvedProviderId === 'bedrock' && (!configRecord['accessKeyId'] || !configRecord['secretAccessKey'])) {
      const envConfig = getConfig();
      configRecord['accessKeyId'] = envConfig.bedrock.accessKeyId;
      configRecord['secretAccessKey'] = envConfig.bedrock.secretAccessKey;
      if (envConfig.bedrock.sessionToken) {
        configRecord['sessionToken'] = envConfig.bedrock.sessionToken;
      }
      if (envConfig.bedrock.region) {
        configRecord['region'] = envConfig.bedrock.region;
      }
    }

    const definition = ProviderRegistry.get(resolvedProviderId);
    if (!definition) {
      logger.error(`Unsupported provider: ${resolvedProviderId}`);
      throw new Error('Unsupported provider type');
    }

    const sdkProvider = definition.sdkFactory(configRecord) as any;

    if (resolvedProviderId === 'openai' && configRecord['apiKey']) {
      return new OpenAiDeepResearchAdapter(sdkProvider, configRecord['apiKey']);
    }

    return new UniversalAiSdkAdapter(sdkProvider, resolvedProviderId);
  }

  protected async wrapAudit(
    source: AiRepository | Promise<AiRepository>,
  ): Promise<AiRepository> {
    return new AuditedSource(await source, this.config.userId, db);
  }

  protected async wrapAiProviderUsageTracker(
    source: AiRepository | Promise<AiRepository>,
    modelId: string,
    system: boolean,
  ): Promise<AiRepository> {
    return new AiProviderUsageTracker(
      await source,
      this.config.userId,
      modelId,
      system,
    );
  }
}
