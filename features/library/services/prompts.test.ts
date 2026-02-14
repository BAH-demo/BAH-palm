import { PromptService } from './prompts';
import { AIFactory } from '@/features/ai-provider';

const mockGetPromptById = jest.fn();
const mockInsertRequestValuesIntoPrompt = jest.fn();

jest.mock('@/features/ai-provider');
jest.mock('@/features/shared/utils', () => ({
  getPromptById: (...args: any[]) => mockGetPromptById(...args),
  insertRequestValuesIntoPrompt: (...args: any[]) => mockInsertRequestValuesIntoPrompt(...args),
  TOKEN_COST_RATE: 1_000_000,
  DefaultSystemMessage: 'Persona: You are a helpful assistant.',
  tokenBuffer: 1,
  passwordInputPlaceholder: '**********',
  ITEMS_PER_PAGE: 10,
}));
jest.mock('../data', () => ({
  prompts: [{ id: 'generate-prompt', instructions: 'template {{prompt}}', config: { randomness: 0.5, model: 'sys', repetitiveness: 0.5 } }],
}));

describe('PromptService', () => {
  let service: PromptService;
  let mockAiFactory: jest.Mocked<AIFactory>;
  const mockCompletionFn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAiFactory = {
      buildUserSource: jest.fn(),
      buildSystemSource: jest.fn(),
    } as unknown as jest.Mocked<AIFactory>;

    service = new PromptService(mockAiFactory);
  });

  describe('runPrompt', () => {
    it('builds user source and calls completion with merged config', async () => {
      const mockResponse = { response: 'AI output', inputTokens: 10, outputTokens: 20 };
      mockCompletionFn.mockResolvedValue(mockResponse);
      mockAiFactory.buildUserSource.mockResolvedValue({
        source: { completion: mockCompletionFn },
        model: { externalId: 'gpt-4-ext' },
      } as any);

      const result = await service.runPrompt({
        instructions: 'Hello world',
        config: { temperature: 0.7, topP: 1, maxTokens: 100, model: 'model-1' },
      });

      expect(mockAiFactory.buildUserSource).toHaveBeenCalledWith('model-1');
      expect(mockCompletionFn).toHaveBeenCalledWith('Hello world', {
        temperature: 0.7,
        topP: 1,
        maxTokens: 100,
        model: 'gpt-4-ext',
      });
      expect(result).toEqual(mockResponse);
    });

    it('propagates error from AI source', async () => {
      mockAiFactory.buildUserSource.mockRejectedValue(new Error('AI error'));

      await expect(
        service.runPrompt({
          instructions: 'test',
          config: { temperature: 0.5, topP: 1, maxTokens: 50, model: 'model-1' },
        })
      ).rejects.toThrow('AI error');
    });
  });

  describe('generatePrompt', () => {
    it('calls handleSystemPrompt with the generate-prompt template', async () => {
      const mockTemplate = {
        id: 'generate-prompt',
        instructions: 'Generate: {{prompt}}',
        config: { temperature: 0.5 },
      };
      mockGetPromptById.mockReturnValue(mockTemplate);
      mockInsertRequestValuesIntoPrompt.mockReturnValue('processed prompt');

      const mockResponse = { response: 'Generated prompt', inputTokens: 5, outputTokens: 10 };
      mockCompletionFn.mockResolvedValue(mockResponse);
      mockAiFactory.buildSystemSource.mockResolvedValue({
        source: { completion: mockCompletionFn },
        model: { externalId: 'system-model' },
      } as any);

      const result = await service.generatePrompt('my input');

      expect(mockGetPromptById).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
  });

  describe('handleSystemPrompt', () => {
    it('processes template, builds system source, and calls completion', async () => {
      mockInsertRequestValuesIntoPrompt.mockReturnValue('filled template');
      const mockResponse = { response: 'output', inputTokens: 3, outputTokens: 5 };
      mockCompletionFn.mockResolvedValue(mockResponse);
      mockAiFactory.buildSystemSource.mockResolvedValue({
        source: { completion: mockCompletionFn },
        model: { externalId: 'sys-ext' },
      } as any);

      const template = {
        instructions: 'Do {{prompt}}',
        config: { temperature: 0.3, topP: 0.9, maxTokens: 200, model: 'sys' },
      } as any;

      const result = await service.handleSystemPrompt('user input', template);

      expect(mockInsertRequestValuesIntoPrompt).toHaveBeenCalledWith(
        { prompt: 'user input' },
        'Do {{prompt}}'
      );
      expect(mockCompletionFn).toHaveBeenCalledWith('filled template', {
        temperature: 0.3,
        topP: 0.9,
        maxTokens: 200,
        model: 'sys-ext',
      });
      expect(result).toEqual(mockResponse);
    });
  });
});
