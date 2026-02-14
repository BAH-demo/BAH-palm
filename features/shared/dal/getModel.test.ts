import db from '@/server/db';
import logger from '@/server/logger';
import getModel from './getModel';

jest.mock('@/server/db', () => ({
  model: {
    findUnique: jest.fn(),
  },
}));

describe('getModel', () => {
  const mockModelResult = {
    id: 'model-1',
    aiProviderId: 'provider-1',
    name: 'gpt-4',
    externalId: 'gpt-4-turbo',
    costPerInputToken: 0.01,
    costPerOutputToken: 0.03,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns mapped model on success', async () => {
    (db.model.findUnique as jest.Mock).mockResolvedValue(mockModelResult);

    const result = await getModel('model-1');

    expect(result).toEqual({
      id: 'model-1',
      aiProviderId: 'provider-1',
      name: 'gpt-4',
      externalId: 'gpt-4-turbo',
      costPerInputToken: 0.01,
      costPerOutputToken: 0.03,
    });
    expect(db.model.findUnique).toHaveBeenCalledWith({
      where: { id: 'model-1', deletedAt: null },
    });
  });

  it('throws "Model not found" when result is null', async () => {
    (db.model.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(getModel('nonexistent')).rejects.toThrow('Model not found');
    expect(logger.warn).toHaveBeenCalledWith('Model not found');
  });

  it('throws user-friendly error and logs on database failure', async () => {
    const dbError = new Error('DB failure');
    (db.model.findUnique as jest.Mock).mockRejectedValue(dbError);

    await expect(getModel('model-1')).rejects.toThrow('Error fetching model');
    expect(logger.error).toHaveBeenCalledWith('Error fetching model', dbError);
  });
});
