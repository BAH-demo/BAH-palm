import logger from '@/server/logger';
import db from '@/server/db';
import { AvailableModel, Model } from '@/features/shared/types/model';

type UpdateAiProviderModelInput = Omit<Model, 'aiProviderId'>;

export default async function updateAiProviderModel(
  input: UpdateAiProviderModelInput,
): Promise<AvailableModel> {
  try {
    const model = await db.model.findUnique({
      where: {
        id: input.id,
        deletedAt: null,
      },
    });

    if (!model) {
      logger.warn('AI Provider model could not be found.');
      throw new Error('AI Provider model could not be found.');
    }

    const updatedModel = await db.model.update({
      where: {
        id: input.id,
        deletedAt: null,
      },
      data: {
        name: input.name,
        externalId: input.externalId,
        costPerInputToken: input.costPerInputToken,
        costPerOutputToken: input.costPerOutputToken,
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

    return {
      id: updatedModel.id,
      name: updatedModel.name,
      externalId: updatedModel.externalId,
      costPerInputToken: updatedModel.costPerInputToken,
      costPerOutputToken: updatedModel.costPerOutputToken,
      aiProviderId: updatedModel.aiProviderId,
      providerLabel: updatedModel.aiProvider.label,
      aiProviderTypeId: updatedModel.aiProvider.aiProviderTypeId,
    };
  } catch (error) {
    logger.error('Error updating AI provider model', error);
    throw new Error('Error updating AI provider model');
  }
}
