import db from '@/server/db';
import logger from '@/server/logger';
import buildProvider from '@/features/shared/dal/buildProvider';
import getAiProviders from './getAiProviders';

jest.mock('@/server/db', () => ({
  aiProvider: {
    findMany: jest.fn(),
  },
}));
jest.mock('@/features/shared/dal/buildProvider');

describe('getAiProviders', () => {
  const mockDbResults = [
    {
      id: 'provider-1',
      aiProviderTypeId: 1,
      label: 'OpenAI',
      costPerInputToken: 0.001,
      costPerOutputToken: 0.002,
    },
    {
      id: 'provider-2',
      aiProviderTypeId: 2,
      label: 'Bedrock',
      costPerInputToken: 0.0005,
      costPerOutputToken: 0.001,
    },
  ];

  const mockBuiltProviders = [
    { id: 'provider-1', label: 'OpenAI', config: {} },
    { id: 'provider-2', label: 'Bedrock', config: {} },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns built providers on success', async () => {
    (db.aiProvider.findMany as jest.Mock).mockResolvedValue(mockDbResults);
    (buildProvider as jest.Mock)
      .mockResolvedValueOnce(mockBuiltProviders[0])
      .mockResolvedValueOnce(mockBuiltProviders[1]);

    const result = await getAiProviders();

    expect(result).toEqual(mockBuiltProviders);
    expect(db.aiProvider.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
    });
    expect(buildProvider).toHaveBeenCalledTimes(2);
  });

  it('returns empty array when no providers exist', async () => {
    (db.aiProvider.findMany as jest.Mock).mockResolvedValue([]);

    const result = await getAiProviders();

    expect(result).toEqual([]);
    expect(buildProvider).not.toHaveBeenCalled();
  });

  it('throws user-friendly error on database failure', async () => {
    const dbError = new Error('DB failure');
    (db.aiProvider.findMany as jest.Mock).mockRejectedValue(dbError);

    await expect(getAiProviders()).rejects.toThrow('Error fetching AI providers');
    expect(logger.error).toHaveBeenCalledWith('Error fetching AI providers', dbError);
  });
});
