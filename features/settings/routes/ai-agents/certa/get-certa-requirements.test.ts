import { UserRole } from '@/features/shared/types/user';
import settingsRouter from '@/features/settings/routes';
import { ContextType } from '@/server/trpc-context';
import logger from '@/server/logger';
import getFirstAvailableBedrockModel from '@/features/settings/dal/ai-providers/getFirstAvailableBedrockModel';
import { tryGetRedisClient } from '@/server/storage/redisConnection';
import { RequirementNames } from '@/features/settings/types/system-requirements';

jest.mock('@/features/settings/dal/ai-providers/getFirstAvailableBedrockModel');
jest.mock('@/server/storage/redisConnection');

describe('getCertaRequirements route', () => {
  let mockCtx: ContextType;

  beforeEach(() => {
    jest.clearAllMocks();

    (getFirstAvailableBedrockModel as jest.Mock).mockResolvedValue({
      id: 'aws-claude-3.7',
      name: 'aws-claude-3.7',
    });

    (tryGetRedisClient as jest.Mock).mockResolvedValue({
      ping: jest.fn().mockResolvedValue('PONG'),
    });

    mockCtx = {
      logger: logger,
      userRole: UserRole.Admin,
    } as unknown as ContextType;
  });

  it('should return configured: true when all systems are available', async () => {
    const caller = settingsRouter.createCaller(mockCtx);
    const result = await caller.getCertaRequirements();

    expect(result).toEqual({
      configured: true,
      requirements: [
        {
          name: RequirementNames.BEDROCK_AI_PROVIDER,
          available: true,
        },
        {
          name: RequirementNames.REDIS_INSTANCE,
          available: true,
        },
      ],
    });
    expect(getFirstAvailableBedrockModel).toHaveBeenCalled();
    expect(tryGetRedisClient).toHaveBeenCalled();
  });

  it('should throw an error if user is not Admin', async () => {
    mockCtx.userRole = UserRole.User;

    const caller = settingsRouter.createCaller(mockCtx);

    await expect(caller.getCertaRequirements()).rejects.toThrow();

    expect(getFirstAvailableBedrockModel).not.toHaveBeenCalled();
    expect(tryGetRedisClient).not.toHaveBeenCalled();
  });

  it('should return configured: false with AWS Bedrock requirement available: false when AWS Bedrock is unavailable', async () => {
    (getFirstAvailableBedrockModel as jest.Mock).mockResolvedValue(null);

    const caller = settingsRouter.createCaller(mockCtx);
    const result = await caller.getCertaRequirements();

    expect(result).toEqual({
      configured: false,
      requirements: [
        {
          name: RequirementNames.BEDROCK_AI_PROVIDER,
          available: false,
        },
        {
          name: RequirementNames.REDIS_INSTANCE,
          available: true,
        },
      ],
    });

    expect(getFirstAvailableBedrockModel).toHaveBeenCalled();
    expect(tryGetRedisClient).toHaveBeenCalled();
  });

  it('should return configured: false with Redis requirement available: false when Redis is unavailable', async () => {
    (tryGetRedisClient as jest.Mock).mockResolvedValue(null);

    const caller = settingsRouter.createCaller(mockCtx);
    const result = await caller.getCertaRequirements();

    expect(result).toEqual({
      configured: false,
      requirements: [
        {
          name: RequirementNames.BEDROCK_AI_PROVIDER,
          available: true,
        },
        {
          name: RequirementNames.REDIS_INSTANCE,
          available: false,
        },
      ],
    });

    expect(getFirstAvailableBedrockModel).toHaveBeenCalled();
    expect(tryGetRedisClient).toHaveBeenCalled();
  });

  it('should return configured: false with multiple unavailable requirements when more than one requirement is unavailable', async () => {
    (getFirstAvailableBedrockModel as jest.Mock).mockResolvedValue(null);
    (tryGetRedisClient as jest.Mock).mockResolvedValue(null);

    const caller = settingsRouter.createCaller(mockCtx);
    const result = await caller.getCertaRequirements();

    expect(result).toEqual({
      configured: false,
      requirements: [
        {
          name: RequirementNames.BEDROCK_AI_PROVIDER,
          available: false,
        },
        {
          name: RequirementNames.REDIS_INSTANCE,
          available: false,
        },
      ],
    });

    expect(getFirstAvailableBedrockModel).toHaveBeenCalled();
    expect(tryGetRedisClient).toHaveBeenCalled();
  });
});
