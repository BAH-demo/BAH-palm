import { z } from 'zod';
import { procedure } from '@/server/trpc';
import { UserRole } from '@/features/shared/types/user';
import { BadRequest, Forbidden } from '@/features/shared/errors/routeErrors';
import { ProviderRegistry } from '@/features/ai-provider/registry';
import { UniversalAiSdkAdapter } from '@/features/ai-provider/sources/universal-adapter';

const inputSchema = z.object({
  providerId: z.string().min(1),
  model: z.string().min(1),
  config: z.record(z.string()),
});

const outputSchema = z.object({
  isValid: z.boolean(),
  aiResponse: z.string().optional(),
  errorMessage: z.string().optional(),
});

type Output = z.infer<typeof outputSchema>;

export default procedure
  .input(inputSchema)
  .output(outputSchema)
  .mutation(async ({ ctx, input }): Promise<Output> => {
    if (ctx.userRole !== UserRole.Admin) {
      throw Forbidden('You do not have permission to access this resource.');
    }

    const def = ProviderRegistry.get(input.providerId);
    if (!def) {
      throw BadRequest(`Unknown providerId: ${input.providerId}`);
    }

    try {
      const sdkProvider = def.sdkFactory(input.config) as any;
      const adapter = new UniversalAiSdkAdapter(sdkProvider, input.providerId);

      const result = await adapter.completion('This is a connection test.', {
        model: input.model,
        randomness: 0,
        repetitiveness: 0,
      });

      return {
        isValid: true,
        aiResponse: result.text,
      };
    } catch (error) {
      return {
        isValid: false,
        errorMessage: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  });
