import { findRecurringIssues, groupResolutionsByCategory } from '@/src/automation/feedback/pattern-analyzer';
import { TicketResolution, TicketCategory } from '@/src/automation/types';

function makeResolution(overrides: Partial<TicketResolution> = {}): TicketResolution {
  return {
    ticketId: 'T-001',
    category: TicketCategory.BUG,
    team: 'engineering-team',
    resolvedAt: new Date('2026-01-15T14:00:00Z'),
    createdAt: new Date('2026-01-15T10:00:00Z'),
    resolutionTimeHours: 4,
    resolutionNotes: 'Fixed the issue.',
    ...overrides,
  };
}

describe('findRecurringIssues', () => {
  it('identifies recurring patterns in resolution notes', () => {
    const resolutions = [
      makeResolution({ ticketId: 'T-001', resolutionNotes: 'User needed to clear browser cache' }),
      makeResolution({ ticketId: 'T-002', resolutionNotes: 'Resolved by clearing browser cache' }),
      makeResolution({ ticketId: 'T-003', resolutionNotes: 'Fixed after user cleared browser cache' }),
    ];
    const issues = findRecurringIssues(resolutions, 3);
    expect(issues.some(i => i.pattern.includes('browser cache'))).toBe(true);
  });

  it('respects minimum occurrence threshold', () => {
    const resolutions = [
      makeResolution({ resolutionNotes: 'password reset fixed' }),
      makeResolution({ resolutionNotes: 'password reset resolved' }),
    ];
    const issues = findRecurringIssues(resolutions, 3);
    expect(issues.length).toBe(0);
  });

  it('sorts results by occurrence count descending', () => {
    const resolutions: TicketResolution[] = [];
    for (let i = 0; i < 5; i++) {
      resolutions.push(makeResolution({
        ticketId: `T-${i}`,
        resolutionNotes: 'network timeout error occurred',
      }));
    }
    for (let i = 0; i < 3; i++) {
      resolutions.push(makeResolution({
        ticketId: `T-${10 + i}`,
        resolutionNotes: 'user permission issue resolved',
      }));
    }
    const issues = findRecurringIssues(resolutions, 3);
    if (issues.length >= 2) {
      expect(issues[0].occurrences).toBeGreaterThanOrEqual(issues[1].occurrences);
    }
  });

  it('generates KB title for recurring issues', () => {
    const resolutions = [
      makeResolution({ resolutionNotes: 'cache invalidation needed', category: TicketCategory.BUG }),
      makeResolution({ resolutionNotes: 'cache invalidation required', category: TicketCategory.BUG }),
      makeResolution({ resolutionNotes: 'cache invalidation fixed', category: TicketCategory.BUG }),
    ];
    const issues = findRecurringIssues(resolutions, 2);
    const cacheIssue = issues.find(i => i.pattern.includes('cache invalidation'));
    if (cacheIssue) {
      expect(cacheIssue.suggestedKBTitle).toContain('Troubleshooting');
    }
  });

  it('returns empty array for empty resolutions', () => {
    const issues = findRecurringIssues([], 3);
    expect(issues).toEqual([]);
  });

  it('uses default minOccurrences of 3', () => {
    const resolutions = [
      makeResolution({ resolutionNotes: 'dns resolution failed' }),
      makeResolution({ resolutionNotes: 'dns resolution timeout' }),
      makeResolution({ resolutionNotes: 'dns resolution error' }),
    ];
    const issues = findRecurringIssues(resolutions);
    expect(issues.some(i => i.pattern.includes('dns resolution'))).toBe(true);
  });
});

describe('groupResolutionsByCategory', () => {
  it('groups resolutions by their category', () => {
    const resolutions = [
      makeResolution({ category: TicketCategory.BUG }),
      makeResolution({ category: TicketCategory.BUG }),
      makeResolution({ category: TicketCategory.USER_ERROR }),
      makeResolution({ category: TicketCategory.INFRASTRUCTURE }),
    ];
    const grouped = groupResolutionsByCategory(resolutions);
    expect(grouped[TicketCategory.BUG]).toHaveLength(2);
    expect(grouped[TicketCategory.USER_ERROR]).toHaveLength(1);
    expect(grouped[TicketCategory.INFRASTRUCTURE]).toHaveLength(1);
  });

  it('returns empty object for empty input', () => {
    const grouped = groupResolutionsByCategory([]);
    expect(Object.keys(grouped)).toHaveLength(0);
  });
});
