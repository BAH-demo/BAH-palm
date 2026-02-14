import { UserRole } from '@/features/shared/types/user';
import { ContextType } from '@/server/trpc-context';
import libraryRouter from '@/features/library/routes/index';

describe('toggle-bookmark route', () => {
  const mockUserId = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';
  const mockPromptId = 'prompt-123';

  let ctx: ContextType;

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = {
      userId: mockUserId,
      userRole: UserRole.User,
      prisma: {
        promptBookmark: {
          findFirst: jest.fn(),
          delete: jest.fn(),
          create: jest.fn(),
        },
      },
    } as unknown as ContextType;
  });

  it('creates a bookmark when none exists', async () => {
    (ctx.prisma.promptBookmark.findFirst as jest.Mock).mockResolvedValue(null);
    (ctx.prisma.promptBookmark.create as jest.Mock).mockResolvedValue({});

    const caller = libraryRouter.createCaller(ctx);
    await caller.toggleBookmark({ promptId: mockPromptId });

    expect(ctx.prisma.promptBookmark.findFirst).toHaveBeenCalledWith({
      where: { userId: mockUserId, promptId: mockPromptId },
    });
    expect(ctx.prisma.promptBookmark.create).toHaveBeenCalledWith({
      data: { userId: mockUserId, promptId: mockPromptId },
    });
    expect(ctx.prisma.promptBookmark.delete).not.toHaveBeenCalled();
  });

  it('deletes the bookmark when one already exists', async () => {
    (ctx.prisma.promptBookmark.findFirst as jest.Mock).mockResolvedValue({
      userId: mockUserId,
      promptId: mockPromptId,
    });
    (ctx.prisma.promptBookmark.delete as jest.Mock).mockResolvedValue({});

    const caller = libraryRouter.createCaller(ctx);
    await caller.toggleBookmark({ promptId: mockPromptId });

    expect(ctx.prisma.promptBookmark.delete).toHaveBeenCalledWith({
      where: {
        userId_promptId: { userId: mockUserId, promptId: mockPromptId },
      },
    });
    expect(ctx.prisma.promptBookmark.create).not.toHaveBeenCalled();
  });

  it('throws error when database operation fails', async () => {
    (ctx.prisma.promptBookmark.findFirst as jest.Mock).mockRejectedValue(
      new Error('DB error')
    );

    const caller = libraryRouter.createCaller(ctx);
    await expect(
      caller.toggleBookmark({ promptId: mockPromptId })
    ).rejects.toThrow('Error toggling bookmark');
  });
});
