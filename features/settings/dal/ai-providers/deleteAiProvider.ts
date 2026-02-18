import logger from '@/server/logger';
import db from '@/server/db';
import { Prisma } from '@prisma/client';
import { AiProviderType } from '@/features/shared/types';

export default async function deleteAiProvider(providerId: string) {

  return await db.$transaction(async (prisma) => {

    let aiProvider = undefined;
    try {
      aiProvider = await prisma.aiProvider.findUnique({
        where: { id: providerId, deletedAt: null },
        select: { apiConfigId: true, aiProviderTypeId: true },
      });
    } catch (error) {
      logger.error('Error deleting the AI Provider', error);
      throw new Error('Error deleting the AI Provider');
    }

    if (!aiProvider) {
      logger.warn('Unable to find the requested AI provider');
      throw new Error('Unable to find the requested AI provider');
    }

    try {
      const now = new Date();

      const unifiedConfig = await prisma.apiConfig.findUnique({
        where: { id: aiProvider.apiConfigId, deletedAt: null },
      });

      if (unifiedConfig) {
        await prisma.apiConfig.update({
          where: { id: aiProvider.apiConfigId, deletedAt: null },
          data: { deletedAt: now },
        });
      } else {
        await softDeleteLegacyConfig(prisma, aiProvider.aiProviderTypeId, aiProvider.apiConfigId, now);
      }

      const affectedModels = await prisma.model.findMany({
        where: { aiProviderId: providerId, deletedAt: null },
        select: { id: true },
      });

      const affectedChatRecords = await prisma.chat.findMany({
        where: {
          modelId: { in: affectedModels.map(model => model.id) },
        },
        select: { id: true },
      });

      await prisma.chat.updateMany({
        where: {
          id: { in: affectedChatRecords.map(record => record.id) },
        },
        data: { modelId: null },
      });

      await prisma.model.updateMany({
        where: { aiProviderId: providerId, deletedAt: null },
        data: { deletedAt: now },
      });

      const deletedProvider = await prisma.aiProvider.update({
        where: { id: providerId, deletedAt: null },
        data: { deletedAt: now },
      });

      return { id: deletedProvider.id };

    } catch (error) {
      logger.error('Error deleting the AI Provider', error);
      throw new Error('Error deleting the AI Provider');
    }

  });
}

async function softDeleteLegacyConfig(
  prisma: Prisma.TransactionClient,
  typeId: AiProviderType,
  configId: string,
  now: Date,
): Promise<void> {
  switch (typeId) {
    case AiProviderType.OpenAi:
      await prisma.apiConfigOpenAi.update({
        where: { id: configId, deletedAt: null },
        data: { deletedAt: now },
      });
      return;
    case AiProviderType.AzureOpenAi:
      await prisma.apiConfigAzureOpenAi.update({
        where: { id: configId, deletedAt: null },
        data: { deletedAt: now },
      });
      return;
    case AiProviderType.Anthropic:
      await prisma.apiConfigAnthropic.update({
        where: { id: configId, deletedAt: null },
        data: { deletedAt: now },
      });
      return;
    case AiProviderType.Gemini:
      await prisma.apiConfigGemini.update({
        where: { id: configId, deletedAt: null },
        data: { deletedAt: now },
      });
      return;
    case AiProviderType.Bedrock:
      await prisma.apiConfigBedrock.update({
        where: { id: configId, deletedAt: null },
        data: { deletedAt: now },
      });
      return;
    default:
      logger.warn('AI Provider could not be retrieved');
      throw new Error('AI Provider could not be retrieved');
  }
}
