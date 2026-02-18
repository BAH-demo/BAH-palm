import { z } from 'zod';
import { procedure } from '@/server/trpc';
import { UserRole } from '@/features/shared/types/user';
import { BadRequest, Unauthorized } from '@/features/shared/errors/routeErrors';
import {
  AiProviderType,
  hasApiEndpoint,
  isBedrockConfig,
  providerIdFromTypeId,
} from '@/features/shared/types';
import createProvider from '@/features/settings/dal/ai-providers/createProvider';
import { TOKEN_COST_RATE } from '@/features/shared/utils';
import { ProviderRegistry } from '@/features/ai-provider/registry';

const inputSchema = z.object({
  label: z.string(),
  type: z.nativeEnum(AiProviderType).optional(),
  providerId: z.string().optional(),
  apiKey: z.string().optional().default(''),
  apiEndpoint: z.string().optional().default(''),
  accessKeyId: z.string().optional().default(''),
  secretAccessKey: z.string().optional().default(''),
  sessionToken: z.string().optional().default(''),
  region: z.string().optional().default(''),
  baseURL: z.string().optional().default(''),
  orgKey: z.string().optional().default(''),
  inputCostPerMillionTokens: z.number().optional(),
  outputCostPerMillionTokens: z.number().optional(),
});

const outputSchema = z.object({
  provider: z.object({
    id: z.string(),
    providerId: z.string().optional(),
    typeId: z.nativeEnum(AiProviderType).optional(),
    label: z.string(),
    config: z.object({
      id: z.string(),
      apiEndpoint: z.string().nullable(),
      region: z.string().nullable(),
    }),
    inputCostPerMillionTokens: z.number(),
    outputCostPerMillionTokens: z.number(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
});

export default procedure
  .input(inputSchema)
  .output(outputSchema)
  .mutation(async ({ ctx, input }) => {
    if (ctx.userRole !== UserRole.Admin) {
      throw Unauthorized('You do not have permission to add an AI provider');
    }

    const resolvedProviderId = input.providerId || (input.type ? providerIdFromTypeId(input.type) : '');
    if (!resolvedProviderId) {
      throw BadRequest('Either providerId or type must be specified');
    }

    const configRecord: Record<string, string> = {};
    if (input.apiKey) {
      configRecord['apiKey'] = input.apiKey;
    }
    if (input.orgKey) {
      configRecord['orgKey'] = input.orgKey;
    }
    if (input.apiEndpoint) {
      configRecord['apiEndpoint'] = input.apiEndpoint;
    }
    if (input.baseURL) {
      configRecord['baseURL'] = input.baseURL;
    }
    if (input.accessKeyId) {
      configRecord['accessKeyId'] = input.accessKeyId;
    }
    if (input.secretAccessKey) {
      configRecord['secretAccessKey'] = input.secretAccessKey;
    }
    if (input.sessionToken) {
      configRecord['sessionToken'] = input.sessionToken;
    }
    if (input.region) {
      configRecord['region'] = input.region;
    }

    const def = ProviderRegistry.get(resolvedProviderId);
    if (!def) {
      throw BadRequest(`Unknown provider: ${resolvedProviderId}`);
    }

    const costPerInputToken = input.inputCostPerMillionTokens ? input.inputCostPerMillionTokens / TOKEN_COST_RATE : undefined;
    const costPerOutputToken = input.outputCostPerMillionTokens ? input.outputCostPerMillionTokens / TOKEN_COST_RATE : undefined;

    const provider = await createProvider({
      label: input.label,
      providerId: resolvedProviderId,
      config: configRecord,
      costPerInputToken,
      costPerOutputToken,
    });

    const output: z.infer<typeof outputSchema> = {
      provider: {
        id: provider.id,
        providerId: provider.providerId,
        typeId: provider.typeId,
        label: provider.label,
        config: {
          id: provider.config.id,
          apiEndpoint: hasApiEndpoint(provider.config) ? provider.config.apiEndpoint : null,
          region: isBedrockConfig(provider.config) ? provider.config.region : null,
        },
        inputCostPerMillionTokens: provider.costPerInputToken * TOKEN_COST_RATE,
        outputCostPerMillionTokens: provider.costPerOutputToken * TOKEN_COST_RATE,
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt,
      },
    };

    return output;
  });
