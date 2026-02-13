import { detectBottlenecks, calculateTeamMetrics } from '@/src/automation/feedback/bottleneck-detector';
import { TicketResolution, TicketCategory } from '@/src/automation/types';

function makeResolution(overrides: Partial<TicketResolution> = {}): TicketResolution {
  return {
    ticketId: 'T-001',
    category: TicketCategory.BUG,
    team: 'engineering-team',
    resolvedAt: new Date('2026-01-15T14:00:00Z'),
    createdAt: new Date('2026-01-15T10:00:00Z'),
    resolutionTimeHours: 4,
    resolutionNotes: 'Fixed.',
    ...overrides,
  };
}

describe('detectBottlenecks', () => {
  it('detects team with high average resolution time', () => {
    const resolutions = [
      makeResolution({ team: 'slow-team', resolutionTimeHours: 30 }),
      makeResolution({ team: 'slow-team', resolutionTimeHours: 28 }),
      makeResolution({ team: 'fast-team', resolutionTimeHours: 2 }),
    ];
    const bottlenecks = detectBottlenecks(resolutions, [], 24);
    expect(bottlenecks.some(b => b.team === 'slow-team')).toBe(true);
    expect(bottlenecks.some(b => b.team === 'fast-team')).toBe(false);
  });

  it('detects team with many pending tickets', () => {
    const pending = Array.from({ length: 15 }, (_, i) => ({
      team: 'overloaded-team',
      ticketId: `T-${i}`,
      ageHours: 10,
    }));
    const bottlenecks = detectBottlenecks([], pending, 24);
    expect(bottlenecks.some(b => b.team === 'overloaded-team')).toBe(true);
    expect(bottlenecks[0].pendingTicketCount).toBe(15);
  });

  it('detects team with very old pending tickets', () => {
    const pending = [
      { team: 'stale-team', ticketId: 'T-001', ageHours: 72 },
    ];
    const bottlenecks = detectBottlenecks([], pending, 24);
    expect(bottlenecks.some(b => b.team === 'stale-team')).toBe(true);
  });

  it('returns empty array when no bottlenecks exist', () => {
    const resolutions = [
      makeResolution({ team: 'fast-team', resolutionTimeHours: 2 }),
    ];
    const bottlenecks = detectBottlenecks(resolutions, [], 24);
    expect(bottlenecks).toEqual([]);
  });

  it('sorts bottlenecks by pending ticket count descending', () => {
    const pending = [
      ...Array.from({ length: 15 }, (_, i) => ({ team: 'team-a', ticketId: `A-${i}`, ageHours: 5 })),
      ...Array.from({ length: 20 }, (_, i) => ({ team: 'team-b', ticketId: `B-${i}`, ageHours: 5 })),
    ];
    const bottlenecks = detectBottlenecks([], pending, 24);
    if (bottlenecks.length >= 2) {
      expect(bottlenecks[0].pendingTicketCount).toBeGreaterThanOrEqual(bottlenecks[1].pendingTicketCount);
    }
  });

  it('combines resolution and pending data for teams', () => {
    const resolutions = [
      makeResolution({ team: 'combined-team', resolutionTimeHours: 30 }),
    ];
    const pending = [
      { team: 'combined-team', ticketId: 'T-001', ageHours: 50 },
    ];
    const bottlenecks = detectBottlenecks(resolutions, pending, 24);
    const bn = bottlenecks.find(b => b.team === 'combined-team');
    expect(bn).toBeDefined();
    expect(bn!.avgResolutionTimeHours).toBe(30);
    expect(bn!.pendingTicketCount).toBe(1);
  });
});

describe('calculateTeamMetrics', () => {
  it('calculates average resolution time per team', () => {
    const resolutions = [
      makeResolution({ team: 'team-a', resolutionTimeHours: 4 }),
      makeResolution({ team: 'team-a', resolutionTimeHours: 6 }),
      makeResolution({ team: 'team-b', resolutionTimeHours: 2 }),
    ];
    const metrics = calculateTeamMetrics(resolutions);
    expect(metrics['team-a'].avgResolutionHours).toBe(5);
    expect(metrics['team-b'].avgResolutionHours).toBe(2);
  });

  it('calculates median resolution time', () => {
    const resolutions = [
      makeResolution({ team: 'team-a', resolutionTimeHours: 1 }),
      makeResolution({ team: 'team-a', resolutionTimeHours: 3 }),
      makeResolution({ team: 'team-a', resolutionTimeHours: 100 }),
    ];
    const metrics = calculateTeamMetrics(resolutions);
    expect(metrics['team-a'].medianResolutionHours).toBe(3);
  });

  it('calculates ticket count per team', () => {
    const resolutions = [
      makeResolution({ team: 'team-a' }),
      makeResolution({ team: 'team-a' }),
      makeResolution({ team: 'team-b' }),
    ];
    const metrics = calculateTeamMetrics(resolutions);
    expect(metrics['team-a'].ticketCount).toBe(2);
    expect(metrics['team-b'].ticketCount).toBe(1);
  });

  it('returns empty object for no resolutions', () => {
    const metrics = calculateTeamMetrics([]);
    expect(Object.keys(metrics)).toHaveLength(0);
  });
});
