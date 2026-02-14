import { UserRole } from '@/features/shared/types/user';
import { ContextType } from '@/server/trpc-context';
import libraryRouter from '@/features/library/routes/index';

describe('get-bookmarks route', () => {
  const mockUserId = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';

  const mockBookmarks = [
    { promptId: 'prompt-1', userId: mockUserId },
    { promptId: 'prompt-2', userId: mockUserId },
  ];

  let ctx: ContextType;

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = {
      userId: mockUserId,
      userRole: UserRole.User,
      prisma: {
        promptBookmark: {
          findMany: jest.fn().mockResolvedValue(mockBookmarks),
        },
      },
    } as unknown as ContextType;
  });

  it('returns bookmark prompt ids for the user', async () => {
    const caller = libraryRouter.createCaller(ctx);
    const result = await caller.getBookmarks();

    expect(result).toEqual({ bookmarkIds: ['prompt-1', 'prompt-2'] });
    expect(ctx.prisma.promptBookmark.findMany).toHaveBeenCalledWith({
      where: { userId: mockUserId },
    });
  });

  it('returns empty array when user has no bookmarks', async () => {
    (ctx.prisma.promptBookmark.findMany as jest.Mock).mockResolvedValue([]);

    const caller = libraryRouter.createCaller(ctx);
    const result = await caller.getBookmarks();

    expect(result).toEqual({ bookmarkIds: [] });
  });

  it('throws error when database query fails', async () => {
    (ctx.prisma.promptBookmark.findMany as jest.Mock).mockRejectedValue(
      new Error('DB error')
    );

    const caller = libraryRouter.createCaller(ctx);
    await expect(caller.getBookmarks()).rejects.toThrow('Error fetching bookmarks');
  });
});
