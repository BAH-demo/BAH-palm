import { UserRole } from '@/features/shared/types/user';
import { ContextType } from '@/server/trpc-context';
import getProvider from '@/features/settings/dal/ai-providers/getAiProvider';
import settingsRouter from '@/features/settings/routes/index';

jest.mock('@/features/settings/dal/ai-providers/getAiProvider');

describe('get-ai-provider route', () => {
  const mockUserId = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';

  const mockProvider = {
    id: 'provider-1',
    typeId: 1,
    label: 'OpenAI',
    config: {
      id: 'cfg-1',
      type: 'openai',
      apiEndpoint: 'https://api.openai.com',
    },
    costPerInputToken: 0.00001,
    costPerOutputToken: 0.00003,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
  };

  let ctx: ContextType;

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = {
      userId: mockUserId,
      userRole: UserRole.Admin,
    } as unknown as ContextType;
    (getProvider as jest.Mock).mockResolvedValue(mockProvider);
  });

  it('returns provider details for admin user', async () => {
    const caller = settingsRouter.createCaller(ctx);
    const result = await caller.getAiProvider({ id: 'provider-1' });

    expect(result.provider.id).toBe('provider-1');
    expect(result.provider.label).toBe('OpenAI');
    expect(getProvider).toHaveBeenCalledWith('provider-1');
  });

  it('throws Forbidden for non-admin user', async () => {
    ctx.userRole = UserRole.User;

    const caller = settingsRouter.createCaller(ctx);
    await expect(caller.getAiProvider({ id: 'provider-1' })).rejects.toThrow(
      'You do not have permission to access this resource'
    );
    expect(getProvider).not.toHaveBeenCalled();
  });
});
