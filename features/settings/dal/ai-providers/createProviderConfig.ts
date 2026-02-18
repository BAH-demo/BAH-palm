import { ProviderConfig, providerIdFromTypeId, configToRecord } from '@/features/shared/types';
import db from '@/server/db';
import logger from '@/server/logger';
import { Prisma, PrismaClient } from '@prisma/client';
import TransactionClient = Prisma.TransactionClient;

export type CreateProviderConfigInput = {
  config: Exclude<ProviderConfig, 'id'>;
}

export type CreateUnifiedConfigInput = {
  providerId: string;
  config: Record<string, string>;
}

export default async function createProviderConfig(input: CreateProviderConfigInput): Promise<ProviderConfig> {
  return createProviderConfigWithDB(db, input.config);
}

export async function createUnifiedProviderConfig(
  dbClient: PrismaClient | TransactionClient,
  input: CreateUnifiedConfigInput,
): Promise<{ id: string; providerId: string; config: Record<string, string> }> {
  try {
    const result = await dbClient.apiConfig.create({
      data: {
        providerId: input.providerId,
        config: input.config,
      },
    });

    return {
      id: result.id,
      providerId: result.providerId,
      config: result.config as Record<string, string>,
    };
  } catch (error) {
    logger.error('Error creating unified provider config', error);
    throw new Error('Error creating provider config');
  }
}

export async function createProviderConfigWithDB(
  dbClient: PrismaClient | TransactionClient,
  config: Exclude<ProviderConfig, 'id'>,
): Promise<ProviderConfig> {
  try {
    const providerId =
      config.type === 'generic'
        ? config.providerId
        : providerIdFromTypeId(config.type);

    const configRecord: Record<string, string> =
      config.type === 'generic'
        ? ((): Record<string, string> => {
            const { type, providerId: _providerId, ...rest } = config;
            return rest as Record<string, string>;
          })()
        : configToRecord({
            id: '',
            ...(config as unknown as ProviderConfig),
          });

    const result = await createUnifiedProviderConfig(dbClient, {
      providerId,
      config: configRecord,
    });

    if (config.type === 'generic') {
      return {
        id: result.id,
        type: 'generic' as const,
        providerId: result.providerId,
        ...result.config,
      };
    }

    return {
      id: result.id,
      ...(config as unknown as ProviderConfig),
    };
  } catch (error) {
    logger.error('Error creating provider config', error);
    throw new Error('Error creating provider config');
  }
}
