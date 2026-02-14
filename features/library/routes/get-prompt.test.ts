import { UserRole } from '@/features/shared/types/user';
import { ContextType } from '@/server/trpc-context';
import libraryRouter from '@/features/library/routes/index';

describe('get-prompt route', () => {
  const mockUserId = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';
  const mockPromptId = '2b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';

  const mockDbPrompt = {
    id: mockPromptId,
    title: 'Test Prompt',
    slug: 'test-prompt',
    summary: 'A test prompt summary',
    description: 'Detailed description here',
    instructions: 'Do something useful',
    example: 'Example usage here',
    creatorId: mockUserId,
    model: 'gpt-4',
    randomness: 0.7,
    repetitiveness: 0.5,
    bestOf: null,
    tags: [{ tag: 'test' }],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
  };


  let ctx: ContextType;

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = {
      userId: mockUserId,
      userRole: UserRole.User,
      prisma: {
        prompt: {
          findUnique: jest.fn().mockResolvedValue(mockDbPrompt),
        },
      },
    } as unknown as ContextType;
  });

  it('returns a prompt by id', async () => {
    const caller = libraryRouter.createCaller(ctx);
    const result = await caller.getPrompt({ promptId: mockPromptId });

    expect(result.prompt.id).toBe(mockPromptId);
    expect(result.prompt.title).toBe('Test Prompt');
    expect(result.prompt.config.model).toBe('gpt-4');
    expect(ctx.prisma.prompt.findUnique).toHaveBeenCalledWith({
      where: { id: mockPromptId },
      include: { tags: true },
    });
  });

  it('throws error when prompt is not found', async () => {
    (ctx.prisma.prompt.findUnique as jest.Mock).mockResolvedValue(null);

    const caller = libraryRouter.createCaller(ctx);
    await expect(caller.getPrompt({ promptId: mockPromptId })).rejects.toThrow();
  });

  it('throws error when database query fails', async () => {
    (ctx.prisma.prompt.findUnique as jest.Mock).mockRejectedValue(
      new Error('DB error')
    );

    const caller = libraryRouter.createCaller(ctx);
    await expect(caller.getPrompt({ promptId: mockPromptId })).rejects.toThrow();
  });
});
