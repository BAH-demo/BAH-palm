import OpenAI from 'openai';
import logger from '@/server/logger';
import { logDeepResearchJobStarted } from '../deep-research/utils';
import { getRedisClient } from '@/server/storage/redisConnection';
import { UniversalAiSdkAdapter } from '../universal-adapter';

type SdkProvider = ConstructorParameters<typeof UniversalAiSdkAdapter>[0];

export class OpenAiDeepResearchAdapter extends UniversalAiSdkAdapter {
  private readonly openaiClient: OpenAI;

  constructor(sdkProvider: SdkProvider, apiKey: string) {
    super(sdkProvider, 'openai');
    this.openaiClient = new OpenAI({ apiKey });
  }

  async deepResearch(
    input: string,
    instructions: string,
    maxToolCalls?: number,
    cancellationJobId?: string,
  ): Promise<string> {
    const responses = (this.openaiClient as any).responses;
    if (!responses) {
      throw new Error('OpenAI responses API not available');
    }

    const response = await responses.create({
      model: 'o4-mini-deep-research',
      background: true,
      input: input,
      instructions: instructions,
      tools: [{ type: 'web_search' }],
      ...(maxToolCalls && { max_tool_calls: maxToolCalls }),
    });

    logDeepResearchJobStarted('OpenAI', response.id);

    let pollCount = 0;
    const maxPolls = 200;

    while (pollCount < maxPolls) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      if (cancellationJobId) {
        try {
          const redis = getRedisClient();
          const cancellationKey = `deep-research:cancel:${cancellationJobId}`;
          const isCancelled = await redis.get(cancellationKey);

          if (isCancelled) {
            throw new Error('Job was cancelled');
          }
        } catch (redisError) {
          if (
            redisError instanceof Error &&
            redisError.message === 'Job was cancelled'
          ) {
            throw redisError;
          }
          logger.warn(
            `Failed to check cancellation flag for job ${cancellationJobId}:`,
            redisError,
          );
        }
      }

      try {
        const statusResponse = await responses.retrieve(response.id);

        if (statusResponse.status === 'completed') {
          let content = '';

          if (statusResponse.output && Array.isArray(statusResponse.output)) {
            const messageItem = statusResponse.output.find(
              (item: any) => item?.type === 'message',
            );

            if (messageItem?.content?.[0]?.text) {
              content = messageItem.content[0].text;
            }
          }

          if (!content) {
            throw new Error('No content found in deep research response');
          }

          return content;
        } else if (statusResponse.status === 'failed') {
          logger.error('OpenAI deep research job failed', {
            jobId: response.id,
            status: statusResponse.status,
          });
          throw new Error('Deep research job failed');
        }

        pollCount++;
      } catch (pollError) {
        logger.error('Error polling OpenAI deep research status', {
          jobId: response.id,
          pollCount: pollCount + 1,
          error:
            pollError instanceof Error
              ? pollError.message
              : String(pollError),
        });

        if (
          pollError instanceof Error &&
          pollError.message.includes('not found')
        ) {
          throw pollError;
        }

        pollCount++;
      }
    }

    throw new Error('Deep research job timed out after 10 minutes');
  }
}
