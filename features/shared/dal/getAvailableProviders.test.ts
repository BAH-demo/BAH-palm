import db from '@/server/db';
import logger from '@/server/logger';
import getAvailableProviders from './getAvailableProviders';

jest.mock('@/server/db', () => ({
  aiProvider: {
    findMany: jest.fn(),
  },
}));

describe('getAvailableProviders', () => {
  const mockDbResults = [
    {
      id: 'provider-1',
      aiProviderTypeId: 1,
      label: 'OpenAI',
      costPerInputToken: 0.001,
      costPerOutputToken: 0.002,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-02'),
    },
    {
      id: 'provider-2',
      aiProviderTypeId: 2,
      label: 'Bedrock',
      costPerInputToken: 0.0005,
      costPerOutputToken: 0.001,
      createdAt: new Date('2025-02-01'),
      updatedAt: new Date('2025-02-02'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns mapped available providers on success', async () => {
    (db.aiProvider.findMany as jest.Mock).mockResolvedValue(mockDbResults);

    const result = await getAvailableProviders();

    expect(result).toEqual([
      {
        id: 'provider-1',
        typeId: 1,
        label: 'OpenAI',
        costPerInputToken: 0.001,
        costPerOutputToken: 0.002,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
      },
      {
        id: 'provider-2',
        typeId: 2,
        label: 'Bedrock',
        costPerInputToken: 0.0005,
        costPerOutputToken: 0.001,
        createdAt: new Date('2025-02-01'),
        updatedAt: new Date('2025-02-02'),
      },
    ]);
    expect(db.aiProvider.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
    });
  });

  it('returns empty array when no providers exist', async () => {
    (db.aiProvider.findMany as jest.Mock).mockResolvedValue([]);

    const result = await getAvailableProviders();

    expect(result).toEqual([]);
  });

  it('throws user-friendly error and logs on database failure', async () => {
    const dbError = new Error('DB connection failed');
    (db.aiProvider.findMany as jest.Mock).mockRejectedValue(dbError);

    await expect(getAvailableProviders()).rejects.toThrow(
      'Error fetching available AI providers'
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Error fetching available AI providers',
      dbError
    );
  });
});
