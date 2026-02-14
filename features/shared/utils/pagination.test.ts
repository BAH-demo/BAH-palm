import { ITEMS_PER_PAGE } from './pagination';

describe('pagination constants', () => {
  it('exports ITEMS_PER_PAGE as 10', () => {
    expect(ITEMS_PER_PAGE).toBe(10);
  });

  it('ITEMS_PER_PAGE is a positive integer', () => {
    expect(Number.isInteger(ITEMS_PER_PAGE)).toBe(true);
    expect(ITEMS_PER_PAGE).toBeGreaterThan(0);
  });
});
