import db from '@/server/db';
import logger from '@/server/logger';
import { AiProviderType } from '@/features/shared/types';
import getFirstAvailableBedrockModel from './getFirstAvailableBedrockModel';

jest.mock('@/server/db', () => ({
  model: {
    findFirst: jest.fn(),
  },
}));

describe('getFirstAvailableBedrockModel', () => {
  const mockModelResult = {
    id: 'model-bedrock-1',
    aiProviderId: 'provider-bedrock',
    name: 'Claude 3',
    externalId: 'anthropic.claude-3',
    costPerInputToken: 0.003,
    costPerOutputToken: 0.015,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns first available bedrock model', async () => {
    (db.model.findFirst as jest.Mock).mockResolvedValue(mockModelResult);

    const result = await getFirstAvailableBedrockModel();

    expect(result).toEqual({
      id: 'model-bedrock-1',
      aiProviderId: 'provider-bedrock',
      name: 'Claude 3',
      externalId: 'anthropic.claude-3',
      costPerInputToken: 0.003,
      costPerOutputToken: 0.015,
    });
    expect(db.model.findFirst).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        aiProvider: {
          aiProviderTypeId: AiProviderType.Bedrock,
          deletedAt: null,
        },
      },
    });
  });

  it('returns null when no bedrock model exists', async () => {
    (db.model.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await getFirstAvailableBedrockModel();

    expect(result).toBeNull();
  });

  it('returns null and logs error on database failure', async () => {
    const dbError = new Error('DB failure');
    (db.model.findFirst as jest.Mock).mockRejectedValue(dbError);

    const result = await getFirstAvailableBedrockModel();

    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalledWith('Error fetching Bedrock model', dbError);
  });
});
