import { z } from 'zod';
import { procedure } from '@/server/trpc';
import { UserRole } from '@/features/shared/types/user';
import { BadRequest, Forbidden } from '@/features/shared/errors/routeErrors';
import { ProviderRegistry } from '@/features/ai-provider/registry';

const inputSchema = z.object({
  providerId: z.string().min(1),
  config: z.record(z.string()),
});

const outputSchema = z.object({
  models: z.array(z.string()),
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

    if (def.category === 'anthropic-compatible') {
      return {
        models: [
          'claude-3-5-sonnet-latest',
          'claude-3-5-haiku-latest',
          'claude-3-opus-latest',
        ],
      };
    }

    if (def.category === 'openai-compatible') {
      const apiKey = input.config.apiKey;
      if (!apiKey) {
        throw BadRequest('apiKey is required to discover models');
      }

      const baseURL =
        input.config.baseURL ||
        input.config.apiEndpoint ||
        (input.providerId === 'openai' ? 'https://api.openai.com' : '');

      if (!baseURL) {
        throw BadRequest('baseURL (or apiEndpoint) is required to discover models');
      }

      const url = buildOpenAiModelsUrl(baseURL);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Model discovery failed with status ${response.status}`);
      }

      const json = (await response.json()) as { data?: Array<{ id?: string }> };
      const models = (json.data ?? [])
        .map((m) => m.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);

      return { models };
    }

    return { models: [] };
  });

function buildOpenAiModelsUrl(baseURL: string): string {
  const trimmed = baseURL.replace(/\/+$/, '');
  if (trimmed.endsWith('/v1')) {
    return `${trimmed}/models`;
  }
  return `${trimmed}/v1/models`;
}
