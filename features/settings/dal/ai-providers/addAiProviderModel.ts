import logger from '@/server/logger';
import db from '@/server/db';
import { AvailableModel, Model } from '@/features/shared/types/model';

type AddAiProviderModelInput = Omit<Model, 'id'>;

export default async function addAiProviderModel(
  input: AddAiProviderModelInput,
): Promise<AvailableModel> {
  try {
    const result = await db.model.create({
      data: {
        name: input.name,
        externalId: input.externalId,
        costPerInputToken: input.costPerInputToken,
        costPerOutputToken: input.costPerOutputToken,
        aiProviderId: input.aiProviderId,
      },
      include: {
        aiProvider: {
          select: {
            label: true,
            aiProviderTypeId: true,
          },
        },
      },
    });
    logger.debug('db.model.create', { result });

    return {
      id: result.id,
      name: result.name,
      externalId: result.externalId,
      costPerInputToken: result.costPerInputToken,
      costPerOutputToken: result.costPerOutputToken,
      aiProviderId: result.aiProviderId,
      providerLabel: result.aiProvider.label,
      aiProviderTypeId: result.aiProvider.aiProviderTypeId,
    };
  } catch (error) {
    logger.error('Error creating AI provider model', error);
    throw new Error('Error creating AI provider model');
  }
}
