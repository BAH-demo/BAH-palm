import db from '@/server/db';
import { createProviderConfigWithDB } from '@/features/settings/dal/ai-providers/createProviderConfig';
import createProvider from './createProvider';

jest.mock('@/server/db', () => ({
  $transaction: jest.fn(),
}));
jest.mock('@/features/settings/dal/ai-providers/createProviderConfig');

describe('createProvider', () => {
  const mockInput = {
    label: 'New Provider',
    type: 1 as any,
    config: { type: 'openai' as any, apiKey: 'key', apiEndpoint: 'https://api.example.com' },
    costPerInputToken: 0.001,
    costPerOutputToken: 0.002,
  };

  const mockProviderConfig = {
    id: 'cfg-1',
    type: 'openai',
  };

  const mockCreatedProvider = {
    id: 'provider-1',
    aiProviderTypeId: 1,
    label: 'New Provider',
    costPerInputToken: 0.001,
    costPerOutputToken: 0.002,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a provider within a transaction', async () => {
    (db.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
      const tx = {
        aiProvider: {
          create: jest.fn().mockResolvedValue(mockCreatedProvider),
        },
      };
      (createProviderConfigWithDB as jest.Mock).mockResolvedValue(mockProviderConfig);
      return callback(tx);
    });

    const result = await createProvider(mockInput);

    expect(result).toEqual({
      id: 'provider-1',
      typeId: 1,
      label: 'New Provider',
      configTypeId: 'openai',
      config: mockProviderConfig,
      costPerInputToken: 0.001,
      costPerOutputToken: 0.002,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-02'),
    });
  });

  it('throws error on transaction failure', async () => {
    (db.$transaction as jest.Mock).mockRejectedValue(new Error('Transaction failed'));

    await expect(createProvider(mockInput)).rejects.toThrow();
  });
});
