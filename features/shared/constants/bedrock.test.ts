import { BEDROCK_TITAN_EMBEDDING_MODEL } from './bedrock';

describe('bedrock constants', () => {
  it('exports the correct Titan embedding model identifier', () => {
    expect(BEDROCK_TITAN_EMBEDDING_MODEL).toBe('amazon.titan-embed-text-v1');
  });

  it('model identifier is a non-empty string', () => {
    expect(typeof BEDROCK_TITAN_EMBEDDING_MODEL).toBe('string');
    expect(BEDROCK_TITAN_EMBEDDING_MODEL.length).toBeGreaterThan(0);
  });
});
