import { UserRole } from '@/features/shared/types/user';
import { ContextType } from '@/server/trpc-context';
import updateAiProviderModel from '@/features/settings/dal/ai-providers/updateAiProviderModel';
import settingsRouter from '@/features/settings/routes/index';

jest.mock('@/features/settings/dal/ai-providers/updateAiProviderModel');

describe('update-ai-provider-model route', () => {
  const mockUserId = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';
  const mockModelId = '2b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';
  const mockProviderId = '3b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';

  const mockResult = {
    id: mockModelId,
    name: 'GPT-4 Updated',
    externalId: 'gpt-4-updated',
    costPerInputToken: 0.00001,
    costPerOutputToken: 0.00003,
    aiProviderId: mockProviderId,
    providerLabel: 'OpenAI',
    aiProviderTypeId: 1,
  };

  let ctx: ContextType;

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = {
      userId: mockUserId,
      userRole: UserRole.Admin,
    } as unknown as ContextType;
    (updateAiProviderModel as jest.Mock).mockResolvedValue(mockResult);
  });

  it('updates model for admin user', async () => {
    const caller = settingsRouter.createCaller(ctx);
    const result = await caller.updateAiProviderModel({
      id: mockModelId,
      name: 'GPT-4 Updated',
      externalId: 'gpt-4-updated',
      costPerMillionInputTokens: 10,
      costPerMillionOutputTokens: 30,
    });

    expect(result.id).toBe(mockModelId);
    expect(result.name).toBe('GPT-4 Updated');
    expect(result.aiProviderId).toBe(mockProviderId);
    expect(updateAiProviderModel).toHaveBeenCalled();
  });

  it('throws Forbidden for non-admin user', async () => {
    ctx.userRole = UserRole.User;

    const caller = settingsRouter.createCaller(ctx);
    await expect(
      caller.updateAiProviderModel({
        id: mockModelId,
        name: 'GPT-4',
        externalId: 'gpt-4',
        costPerMillionInputTokens: 10,
        costPerMillionOutputTokens: 30,
      })
    ).rejects.toThrow('You do not have permission to update a model');
    expect(updateAiProviderModel).not.toHaveBeenCalled();
  });
});
