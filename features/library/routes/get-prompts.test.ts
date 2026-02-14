import { UserRole } from '@/features/shared/types/user';
import { ContextType } from '@/server/trpc-context';
import libraryRouter from '@/features/library/routes/index';

describe('get-prompts route', () => {
  const mockUserId = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';

  const mockDbPrompts = [
    {
      id: '2b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
      title: 'Prompt 1',
      slug: 'prompt-1',
      summary: 'Summary 1',
      description: 'Description 1',
      instructions: 'Instructions 1',
      example: 'Example 1',
      creatorId: mockUserId,
      model: 'gpt-4',
      randomness: 0.7,
      repetitiveness: 0.5,
      bestOf: null,
      tags: [{ tag: 'tag1' }],
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-02'),
    },
  ];

  let ctx: ContextType;

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = {
      userId: mockUserId,
      userRole: UserRole.User,
      prisma: {
        prompt: {
          findMany: jest.fn().mockResolvedValue(mockDbPrompts),
        },
      },
    } as unknown as ContextType;
  });

  it('returns all prompts', async () => {
    const caller = libraryRouter.createCaller(ctx);
    const result = await caller.getPrompts({});

    expect(result.prompts).toHaveLength(1);
    expect(result.prompts[0].id).toBe('2b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed');
    expect(result.prompts[0].title).toBe('Prompt 1');
    expect(result.prompts[0].config.model).toBe('gpt-4');
  });

  it('passes tabFilter owned to prisma query', async () => {
    const caller = libraryRouter.createCaller(ctx);
    await caller.getPrompts({ tabFilter: 'owned' });

    expect(ctx.prisma.prompt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          creatorId: mockUserId,
        }),
      })
    );
  });

  it('passes tabFilter bookmarked to prisma query', async () => {
    const caller = libraryRouter.createCaller(ctx);
    await caller.getPrompts({ tabFilter: 'bookmarked' });

    expect(ctx.prisma.prompt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          bookmarks: { some: { userId: mockUserId } },
        }),
      })
    );
  });

  it('passes search term to prisma query', async () => {
    const caller = libraryRouter.createCaller(ctx);
    await caller.getPrompts({ search: 'hello' });

    expect(ctx.prisma.prompt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              title: expect.objectContaining({ contains: 'hello' }),
            }),
          ]),
        }),
      })
    );
  });

  it('passes tags filter to prisma query', async () => {
    const caller = libraryRouter.createCaller(ctx);
    await caller.getPrompts({ tags: ['tag1', 'tag2'] });

    expect(ctx.prisma.prompt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { tags: { some: { tag: 'tag1' } } },
            { tags: { some: { tag: 'tag2' } } },
          ]),
        }),
      })
    );
  });

  it('returns empty array when no prompts exist', async () => {
    (ctx.prisma.prompt.findMany as jest.Mock).mockResolvedValue([]);

    const caller = libraryRouter.createCaller(ctx);
    const result = await caller.getPrompts({});

    expect(result.prompts).toEqual([]);
  });

  it('throws error when database query fails', async () => {
    (ctx.prisma.prompt.findMany as jest.Mock).mockRejectedValue(
      new Error('DB error')
    );

    const caller = libraryRouter.createCaller(ctx);
    await expect(caller.getPrompts({})).rejects.toThrow('Error fetching prompts');
  });
});
