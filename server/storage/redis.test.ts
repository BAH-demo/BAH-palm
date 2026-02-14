import { RedisDataStore } from './redis';

const mockRedisClient = {
  hset: jest.fn(),
  hgetall: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  quit: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock('@/server/storage/redisConnection', () => ({
  getRedisClient: () => mockRedisClient,
}));

describe('RedisDataStore', () => {
  let store: RedisDataStore;

  beforeEach(() => {
    jest.clearAllMocks();
    store = new RedisDataStore();
  });

  describe('hset', () => {
    it('calls redis hset with key and values', async () => {
      mockRedisClient.hset.mockResolvedValue(1);
      await store.hset('mykey', { field1: 'val1', field2: 'val2' });
      expect(mockRedisClient.hset).toHaveBeenCalledWith('mykey', { field1: 'val1', field2: 'val2' });
    });
  });

  describe('hgetall', () => {
    it('returns hash values from redis', async () => {
      const mockData = { field1: 'val1', field2: 'val2' };
      mockRedisClient.hgetall.mockResolvedValue(mockData);
      const result = await store.hgetall('mykey');
      expect(result).toEqual(mockData);
      expect(mockRedisClient.hgetall).toHaveBeenCalledWith('mykey');
    });
  });

  describe('get', () => {
    it('returns string value from redis', async () => {
      mockRedisClient.get.mockResolvedValue('stored-value');
      const result = await store.get('mykey');
      expect(result).toBe('stored-value');
    });

    it('returns null when key does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      const result = await store.get('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('sets a string value in redis', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      await store.set('mykey', 'myvalue');
      expect(mockRedisClient.set).toHaveBeenCalledWith('mykey', 'myvalue');
    });
  });

  describe('setex', () => {
    it('sets a value with expiration in redis', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');
      await store.setex('mykey', 60, 'myvalue');
      expect(mockRedisClient.setex).toHaveBeenCalledWith('mykey', 60, 'myvalue');
    });
  });

  describe('del', () => {
    it('deletes a key from redis', async () => {
      mockRedisClient.del.mockResolvedValue(1);
      await store.del('mykey');
      expect(mockRedisClient.del).toHaveBeenCalledWith('mykey');
    });
  });

  describe('close', () => {
    it('calls quit on the redis client', async () => {
      mockRedisClient.quit.mockResolvedValue('OK');
      await store.close();
      expect(mockRedisClient.quit).toHaveBeenCalled();
    });

    it('handles error during close gracefully', async () => {
      mockRedisClient.quit.mockRejectedValue(new Error('quit error'));
      await expect(store.close()).resolves.toBeUndefined();
    });
  });
});
