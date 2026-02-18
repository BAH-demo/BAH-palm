import { generateText, embedMany } from 'ai';
import { AiSettings } from '@/types';
import logger from '@/server/logger';
import {
  AiRepository,
  AiResponse,
  ChatCompletionMessage,
  completionResponseError,
  emptyCompletionResponseError,
} from './types';
import {
  AuthenticationError,
  ModelNotFoundError,
  RateLimitExceededError,
} from './errors';

type SdkProvider = {
  languageModel(modelId: string): Parameters<typeof generateText>[0]['model'];
  textEmbeddingModel?(modelId: string): Parameters<typeof embedMany>[0]['model'];
};

export class UniversalAiSdkAdapter implements AiRepository {
  constructor(
    protected sdkProvider: SdkProvider,
    protected providerId: string,
  ) {}

  async completion(prompt: string, config: AiSettings): Promise<AiResponse> {
    try {
      const model = this.sdkProvider.languageModel(config.model);

      const result = await generateText({
        model,
        prompt,
        temperature: config.randomness ?? 0.5,
        frequencyPenalty: config.frequencyPenalty ?? undefined,
        presencePenalty: config.presencePenalty ?? undefined,
      });

      if (!result.text) {
        throw new Error(emptyCompletionResponseError);
      }

      return {
        text: result.text,
        inputTokensUsed: result.usage?.promptTokens ?? 0,
        outputTokensUsed: result.usage?.completionTokens ?? 0,
      };
    } catch (cause) {
      return this.handleError('completion', cause);
    }
  }

  async chatCompletion(
    chatMessages: ChatCompletionMessage[],
    config: AiSettings,
  ): Promise<AiResponse> {
    try {
      const model = this.sdkProvider.languageModel(config.model);

      const systemMessage = chatMessages.find((m) => m.role === 'system');
      const nonSystemMessages = chatMessages.filter((m) => m.role !== 'system');

      const messages = nonSystemMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const result = await generateText({
        model,
        system: systemMessage?.content,
        messages,
        temperature: config.randomness ?? 0.5,
        frequencyPenalty: config.frequencyPenalty ?? undefined,
        presencePenalty: config.presencePenalty ?? undefined,
      });

      if (!result.text && result.text !== '') {
        throw new Error(completionResponseError);
      }

      if (result.text.length === 0) {
        throw new Error(emptyCompletionResponseError);
      }

      return {
        text: result.text,
        inputTokensUsed: result.usage?.promptTokens ?? 0,
        outputTokensUsed: result.usage?.completionTokens ?? 0,
      };
    } catch (cause) {
      return this.handleError('chatCompletion', cause);
    }
  }

  async createEmbeddings(
    input: string[],
    config: AiSettings,
  ): Promise<AiResponse> {
    try {
      if (!this.sdkProvider.textEmbeddingModel) {
        throw new Error(
          `Embeddings are not supported by provider ${this.providerId}`,
        );
      }

      const embeddingModel = this.sdkProvider.textEmbeddingModel(
        config.model || 'text-embedding-3-small',
      );

      const result = await embedMany({
        model: embeddingModel,
        values: input,
      });

      return {
        text: '',
        inputTokensUsed: result.usage?.tokens ?? 0,
        outputTokensUsed: 0,
        embeddings: result.embeddings.map((embedding) => ({ embedding })),
      };
    } catch (cause) {
      return this.handleError('createEmbeddings', cause);
    }
  }

  private handleError(method: string, cause: unknown): never {
    logger.error(
      `UniversalAiSdkAdapter.${method} failed for provider ${this.providerId}`,
      cause,
    );

    if (
      cause instanceof AuthenticationError ||
      cause instanceof ModelNotFoundError ||
      cause instanceof RateLimitExceededError
    ) {
      throw cause;
    }

    const errorMessage =
      cause instanceof Error ? cause.message.toLowerCase() : '';

    if (
      errorMessage.includes('401') ||
      errorMessage.includes('403') ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('unauthorized')
    ) {
      throw new AuthenticationError(
        `Invalid API key provided for ${this.providerId}`,
      );
    }

    if (
      errorMessage.includes('404') ||
      errorMessage.includes('model') ||
      errorMessage.includes('not found')
    ) {
      throw new ModelNotFoundError(
        `Invalid model specified for ${this.providerId}`,
      );
    }

    if (
      errorMessage.includes('429') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('too many')
    ) {
      throw new RateLimitExceededError(
        `Rate limit exceeded for ${this.providerId}`,
      );
    }

    throw new Error('An unknown error occurred, please try again later');
  }

  toString() {
    return `Universal AI SDK Adapter (${this.providerId})`;
  }
}
