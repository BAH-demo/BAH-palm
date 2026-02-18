import { z } from 'zod';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import logger from '@/server/logger';

export type ProviderCategory = 'openai-compatible' | 'anthropic-compatible' | 'google-compatible' | 'bedrock';

export interface ProviderDefinition {
  id: string;
  label: string;
  category: ProviderCategory;
  sdkFactory: (config: Record<string, string>) => unknown;
  configSchema: z.ZodType;
  supportsEmbeddings: boolean;
}

const openAiConfigSchema = z.object({
  apiKey: z.string().min(1),
  orgKey: z.string().optional(),
  baseURL: z.string().optional(),
});

const anthropicConfigSchema = z.object({
  apiKey: z.string().min(1),
});

const geminiConfigSchema = z.object({
  apiKey: z.string().min(1),
});

const azureOpenAiConfigSchema = z.object({
  apiKey: z.string().min(1),
  apiEndpoint: z.string().min(1),
  deploymentId: z.string().optional(),
});

const bedrockConfigSchema = z.object({
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  sessionToken: z.string().optional(),
  region: z.string().min(1),
});

const customOpenAiCompatibleConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseURL: z.string().min(1),
});

const builtInProviders: Map<string, ProviderDefinition> = new Map();

function registerBuiltIn(def: ProviderDefinition) {
  builtInProviders.set(def.id, def);
}

registerBuiltIn({
  id: 'openai',
  label: 'OpenAI',
  category: 'openai-compatible',
  configSchema: openAiConfigSchema,
  supportsEmbeddings: true,
  sdkFactory: (config) => {
    const parsed = openAiConfigSchema.parse(config);
    return createOpenAI({
      apiKey: parsed.apiKey,
      organization: parsed.orgKey,
      ...(parsed.baseURL ? { baseURL: parsed.baseURL } : {}),
    });
  },
});

registerBuiltIn({
  id: 'azure-openai',
  label: 'Azure OpenAI',
  category: 'openai-compatible',
  configSchema: azureOpenAiConfigSchema,
  supportsEmbeddings: true,
  sdkFactory: (config) => {
    const parsed = azureOpenAiConfigSchema.parse(config);
    return createOpenAI({
      apiKey: parsed.apiKey,
      baseURL: parsed.apiEndpoint,
      compatibility: 'compatible',
    });
  },
});

registerBuiltIn({
  id: 'openai-compatible',
  label: 'OpenAI Compatible',
  category: 'openai-compatible',
  configSchema: customOpenAiCompatibleConfigSchema,
  supportsEmbeddings: true,
  sdkFactory: (config) => {
    const parsed = customOpenAiCompatibleConfigSchema.parse(config);
    return createOpenAI({
      apiKey: parsed.apiKey,
      baseURL: parsed.baseURL,
      compatibility: 'compatible',
    });
  },
});

registerBuiltIn({
  id: 'anthropic',
  label: 'Anthropic',
  category: 'anthropic-compatible',
  configSchema: anthropicConfigSchema,
  supportsEmbeddings: false,
  sdkFactory: (config) => {
    const parsed = anthropicConfigSchema.parse(config);
    return createAnthropic({
      apiKey: parsed.apiKey,
    });
  },
});

registerBuiltIn({
  id: 'gemini',
  label: 'Gemini',
  category: 'google-compatible',
  configSchema: geminiConfigSchema,
  supportsEmbeddings: false,
  sdkFactory: (config) => {
    const parsed = geminiConfigSchema.parse(config);
    return createGoogleGenerativeAI({
      apiKey: parsed.apiKey,
    });
  },
});

registerBuiltIn({
  id: 'bedrock',
  label: 'Amazon Bedrock',
  category: 'bedrock',
  configSchema: bedrockConfigSchema,
  supportsEmbeddings: true,
  sdkFactory: (config) => {
    const parsed = bedrockConfigSchema.parse(config);
    return createAmazonBedrock({
      region: parsed.region,
      accessKeyId: parsed.accessKeyId,
      secretAccessKey: parsed.secretAccessKey,
      ...(parsed.sessionToken ? { sessionToken: parsed.sessionToken } : {}),
    });
  },
});

export class ProviderRegistry {
  static get(id: string): ProviderDefinition | undefined {
    return builtInProviders.get(id);
  }

  static getAll(): ProviderDefinition[] {
    return Array.from(builtInProviders.values());
  }

  static getAllAsSelectOptions(): { value: string; label: string }[] {
    return ProviderRegistry.getAll().map((p) => ({
      value: p.id,
      label: p.label,
    }));
  }

  static register(def: ProviderDefinition): void {
    if (builtInProviders.has(def.id)) {
      logger.warn(`Provider ${def.id} already registered, overwriting`);
    }
    builtInProviders.set(def.id, def);
  }

  static createCustomOpenAiCompatible(
    id: string,
    label: string,
    config: Record<string, string>,
  ): ProviderDefinition {
    const parsed = customOpenAiCompatibleConfigSchema.parse(config);
    return {
      id,
      label,
      category: 'openai-compatible',
      configSchema: customOpenAiCompatibleConfigSchema,
      supportsEmbeddings: true,
      sdkFactory: () =>
        createOpenAI({
          apiKey: parsed.apiKey,
          baseURL: parsed.baseURL,
          compatibility: 'compatible',
        }),
    };
  }
}

export { openAiConfigSchema, anthropicConfigSchema, geminiConfigSchema, azureOpenAiConfigSchema, bedrockConfigSchema };
