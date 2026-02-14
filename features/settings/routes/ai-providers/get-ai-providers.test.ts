import { UserRole } from '@/features/shared/types/user';
import { ContextType } from '@/server/trpc-context';
import getAiProviders from '@/features/settings/dal/ai-providers/getAiProviders';
import getIsUserGroupLead from '@/features/shared/dal/getIsUserGroupLead';
import settingsRouter from '@/features/settings/routes/index';

jest.mock('@/features/settings/dal/ai-providers/getAiProviders');
jest.mock('@/features/shared/dal/getIsUserGroupLead');

describe('get-ai-providers route', () => {
  const mockUserId = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';

  const mockProviders = [
    {
      id: '2b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
      label: 'OpenAI',
      typeId: 1,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-02'),
    },
  ];

  let ctx: ContextType;

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = {
      userId: mockUserId,
      userRole: UserRole.Admin,
    } as unknown as ContextType;
    (getAiProviders as jest.Mock).mockResolvedValue(mockProviders);
  });

  it('returns providers for admin user', async () => {
    const caller = settingsRouter.createCaller(ctx);
    const result = await caller.getAiProviders({});

    expect(result.aiProviders).toHaveLength(1);
    expect(result.aiProviders[0].label).toBe('OpenAI');
  });

  it('returns providers for user group lead', async () => {
    ctx.userRole = UserRole.User;
    (getIsUserGroupLead as jest.Mock).mockResolvedValue(true);

    const caller = settingsRouter.createCaller(ctx);
    const result = await caller.getAiProviders({});

    expect(result.aiProviders).toHaveLength(1);
  });

  it('throws Forbidden for non-admin non-lead user', async () => {
    ctx.userRole = UserRole.User;
    (getIsUserGroupLead as jest.Mock).mockResolvedValue(false);

    const caller = settingsRouter.createCaller(ctx);
    await expect(caller.getAiProviders({})).rejects.toThrow(
      'You do not have permission to access this resource.'
    );
  });
});
