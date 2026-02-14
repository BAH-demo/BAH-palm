import { maxResults, minScore } from './kbProvider';

describe('kbProvider constants', () => {
  it('exports maxResults as 20', () => {
    expect(maxResults).toBe(20);
  });

  it('exports minScore as 0.3', () => {
    expect(minScore).toBe(0.3);
  });

  it('maxResults is a positive integer', () => {
    expect(Number.isInteger(maxResults)).toBe(true);
    expect(maxResults).toBeGreaterThan(0);
  });

  it('minScore is between 0 and 1', () => {
    expect(minScore).toBeGreaterThanOrEqual(0);
    expect(minScore).toBeLessThanOrEqual(1);
  });
});
