import { z } from 'zod';
import { procedure } from '@/server/trpc';
import { UserRole } from '@/features/shared/types/user';
import { TRPCError } from '@trpc/server';
import { ProviderRegistry } from '@/features/ai-provider/registry';
import getIsUserGroupLead from '@/features/shared/dal/getIsUserGroupLead';

const outputSchema = z.object({
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
  })),
});

type Output = z.infer<typeof outputSchema>;

export default procedure
  .output(outputSchema)
  .query(async ({ ctx }): Promise<Output> => {
    if (ctx.userRole !== UserRole.Admin) {
      const lead = await getIsUserGroupLead(ctx.userId);
      if (!lead) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource.',
        });
      }
    }

    return {
      options: ProviderRegistry.getAllAsSelectOptions(),
    };
  });
