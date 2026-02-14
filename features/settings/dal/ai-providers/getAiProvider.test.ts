import db from '@/server/db';
import logger from '@/server/logger';
import buildProvider from '@/features/shared/dal/buildProvider';
import getAiProvider from './getAiProvider';

jest.mock('@/server/db', () => ({
  aiProvider: {
    findUnique: jest.fn(),
  },
}));
jest.mock('@/features/shared/dal/buildProvider');

describe('getAiProvider', () => {
  const mockDbResult = {
    id: 'provider-1',
    aiProviderTypeId: 1,
    label: 'OpenAI',
    apiConfigType: 'openai',
    apiConfigId: 'cfg-1',
    costPerInputToken: 0.001,
    costPerOutputToken: 0.002,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
    deletedAt: null,
  };

  const mockBuiltProvider = {
    id: 'provider-1',
    typeId: 1,
    label: 'OpenAI',
    configTypeId: 'openai',
    config: { id: 'cfg-1', type: 'openai', apiEndpoint: 'https://api.openai.com' },
    costPerInputToken: 0.001,
    costPerOutputToken: 0.002,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns built provider on success', async () => {
    (db.aiProvider.findUnique as jest.Mock).mockResolvedValue(mockDbResult);
    (buildProvider as jest.Mock).mockResolvedValue(mockBuiltProvider);

    const result = await getAiProvider('provider-1');

    expect(result).toEqual(mockBuiltProvider);
    expect(db.aiProvider.findUnique).toHaveBeenCalledWith({
      where: { id: 'provider-1', deletedAt: null },
    });
    expect(buildProvider).toHaveBeenCalledWith(db, mockDbResult);
  });

  it('throws "Provider not found" when result is null', async () => {
    (db.aiProvider.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(getAiProvider('nonexistent')).rejects.toThrow('Provider not found');
    expect(logger.warn).toHaveBeenCalledWith('Provider not found');
    expect(buildProvider).not.toHaveBeenCalled();
  });

  it('throws user-friendly error on database failure', async () => {
    const dbError = new Error('Connection lost');
    (db.aiProvider.findUnique as jest.Mock).mockRejectedValue(dbError);

    await expect(getAiProvider('provider-1')).rejects.toThrow('Error fetching AI provider');
    expect(logger.error).toHaveBeenCalledWith('Error fetching AI provider', dbError);
  });
});
