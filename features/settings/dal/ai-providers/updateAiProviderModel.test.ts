import db from '@/server/db';
import logger from '@/server/logger';
import updateAiProviderModel from './updateAiProviderModel';

jest.mock('@/server/db', () => ({
  model: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}));

describe('updateAiProviderModel', () => {
  const mockInput = {
    id: 'model-1',
    name: 'GPT-4 Updated',
    externalId: 'gpt-4-updated',
    costPerInputToken: 0.02,
    costPerOutputToken: 0.06,
  };

  const mockExistingModel = {
    id: 'model-1',
    aiProviderId: 'provider-1',
    name: 'GPT-4',
    externalId: 'gpt-4',
  };

  const mockUpdatedModel = {
    id: 'model-1',
    name: 'GPT-4 Updated',
    externalId: 'gpt-4-updated',
    costPerInputToken: 0.02,
    costPerOutputToken: 0.06,
    aiProviderId: 'provider-1',
    aiProvider: {
      label: 'OpenAI',
      aiProviderTypeId: 1,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates model and returns mapped result', async () => {
    (db.model.findUnique as jest.Mock).mockResolvedValue(mockExistingModel);
    (db.model.update as jest.Mock).mockResolvedValue(mockUpdatedModel);

    const result = await updateAiProviderModel(mockInput);

    expect(result).toEqual({
      id: 'model-1',
      name: 'GPT-4 Updated',
      externalId: 'gpt-4-updated',
      costPerInputToken: 0.02,
      costPerOutputToken: 0.06,
      aiProviderId: 'provider-1',
      providerLabel: 'OpenAI',
      aiProviderTypeId: 1,
    });
    expect(db.model.findUnique).toHaveBeenCalledWith({
      where: { id: 'model-1', deletedAt: null },
    });
  });

  it('throws error when model is not found', async () => {
    (db.model.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(updateAiProviderModel(mockInput)).rejects.toThrow(
      'Error updating AI provider model'
    );
    expect(logger.warn).toHaveBeenCalledWith('AI Provider model could not be found.');
    expect(db.model.update).not.toHaveBeenCalled();
  });

  it('throws user-friendly error on database failure', async () => {
    const dbError = new Error('DB failure');
    (db.model.findUnique as jest.Mock).mockRejectedValue(dbError);

    await expect(updateAiProviderModel(mockInput)).rejects.toThrow(
      'Error updating AI provider model'
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Error updating AI provider model',
      dbError
    );
  });
});
