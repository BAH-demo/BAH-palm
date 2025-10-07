import db from '@/server/db';
import logger from '@/server/logger';
import { AiProviderType } from '@/features/shared/types';

export default async function getBedrockModelAccess(
  userId: string,
): Promise<boolean> {
  try {
    const result = await db.model.findFirst({
      where: {
        deletedAt: null,
        aiProvider: {
          aiProviderTypeId: AiProviderType.Bedrock,
          deletedAt: null,
          userGroups: {
            some: {
              userGroupMemberships: {
                some: {
                  userId,
                },
              },
            },
          },
        },
      },
    });

    return !!result;
  } catch (error) {
    logger.error('Error checking Bedrock model access', error);
    throw new Error('Error checking Bedrock model access');
  }
}