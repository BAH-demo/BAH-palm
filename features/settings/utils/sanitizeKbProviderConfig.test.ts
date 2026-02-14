import { TRPCError } from '@trpc/server';
import sanitizeKbProviderConfig from './sanitizeKbProviderConfig';

describe('sanitizeKbProviderConfig', () => {
  it('returns only apiEndpoint when config has apiKey', () => {
    const config = {
      id: 'cfg-1',
      type: 'palm-kb-api' as const,
      apiKey: 'secret-key',
      apiEndpoint: 'https://api.example.com',
    };
    const result = sanitizeKbProviderConfig(config);
    expect(result).toEqual({ apiEndpoint: 'https://api.example.com' });
    expect(result).not.toHaveProperty('apiKey');
  });

  it('returns only region when config has accessKeyId (bedrock)', () => {
    const config = {
      id: 'cfg-2',
      type: 'bedrock' as const,
      accessKeyId: 'AKIA...',
      secretAccessKey: 'secret',
      region: 'us-east-1',
    };
    const result = sanitizeKbProviderConfig(config);
    expect(result).toEqual({ region: 'us-east-1' });
    expect(result).not.toHaveProperty('accessKeyId');
    expect(result).not.toHaveProperty('secretAccessKey');
  });

  it('throws BadRequest for config without apiKey or accessKeyId', () => {
    const config = { id: 'cfg-3', type: 'unknown' } as any;
    expect(() => sanitizeKbProviderConfig(config)).toThrow(TRPCError);
    try {
      sanitizeKbProviderConfig(config);
    } catch (e) {
      expect((e as TRPCError).code).toBe('BAD_REQUEST');
    }
  });
});
