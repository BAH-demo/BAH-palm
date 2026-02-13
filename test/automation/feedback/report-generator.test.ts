import { generateWeeklySummary, formatSummaryAsText } from '@/src/automation/feedback/report-generator';
import { TicketResolution, TicketCategory, WeeklySummary } from '@/src/automation/types';

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

const weekStart = new Date('2026-01-13T00:00:00Z');
const weekEnd = new Date('2026-01-19T23:59:59Z');

describe('generateWeeklySummary', () => {
  it('generates summary with correct ticket count', () => {
    const resolutions = [
      makeResolution({ ticketId: 'T-001', resolvedAt: new Date('2026-01-15T14:00:00Z') }),
      makeResolution({ ticketId: 'T-002', resolvedAt: new Date('2026-01-16T14:00:00Z') }),
      makeResolution({ ticketId: 'T-003', resolvedAt: new Date('2026-01-17T14:00:00Z') }),
    ];
    const summary = generateWeeklySummary(resolutions, [], weekStart, weekEnd);
    expect(summary.totalTickets).toBe(3);
  });

  it('filters resolutions to the specified week', () => {
    const resolutions = [
      makeResolution({ ticketId: 'T-in', resolvedAt: new Date('2026-01-15T14:00:00Z') }),
      makeResolution({ ticketId: 'T-out', resolvedAt: new Date('2026-01-25T14:00:00Z') }),
    ];
    const summary = generateWeeklySummary(resolutions, [], weekStart, weekEnd);
    expect(summary.totalTickets).toBe(1);
  });

  it('calculates average resolution time', () => {
    const resolutions = [
      makeResolution({ resolutionTimeHours: 4, resolvedAt: new Date('2026-01-15T14:00:00Z') }),
      makeResolution({ resolutionTimeHours: 8, resolvedAt: new Date('2026-01-16T14:00:00Z') }),
    ];
    const summary = generateWeeklySummary(resolutions, [], weekStart, weekEnd);
    expect(summary.avgResolutionTimeHours).toBe(6);
  });

  it('calculates category distribution', () => {
    const resolutions = [
      makeResolution({ category: TicketCategory.BUG, resolvedAt: new Date('2026-01-15T14:00:00Z') }),
      makeResolution({ category: TicketCategory.BUG, resolvedAt: new Date('2026-01-15T15:00:00Z') }),
      makeResolution({ category: TicketCategory.USER_ERROR, resolvedAt: new Date('2026-01-16T14:00:00Z') }),
    ];
    const summary = generateWeeklySummary(resolutions, [], weekStart, weekEnd);
    expect(summary.categoryDistribution[TicketCategory.BUG]).toBe(2);
    expect(summary.categoryDistribution[TicketCategory.USER_ERROR]).toBe(1);
  });

  it('includes team performance data', () => {
    const resolutions = [
      makeResolution({ team: 'eng', resolutionTimeHours: 4, resolvedAt: new Date('2026-01-15T14:00:00Z') }),
      makeResolution({ team: 'eng', resolutionTimeHours: 6, resolvedAt: new Date('2026-01-16T14:00:00Z') }),
    ];
    const pending = [{ team: 'eng', ticketId: 'T-p1', ageHours: 10 }];
    const summary = generateWeeklySummary(resolutions, pending, weekStart, weekEnd);
    const engPerf = summary.teamPerformance.find(t => t.team === 'eng');
    expect(engPerf).toBeDefined();
    expect(engPerf!.ticketsResolved).toBe(2);
    expect(engPerf!.ticketsPending).toBe(1);
  });

  it('handles empty resolutions', () => {
    const summary = generateWeeklySummary([], [], weekStart, weekEnd);
    expect(summary.totalTickets).toBe(0);
    expect(summary.avgResolutionTimeHours).toBe(0);
  });

  it('includes week start and end dates', () => {
    const summary = generateWeeklySummary([], [], weekStart, weekEnd);
    expect(summary.weekStarting).toEqual(weekStart);
    expect(summary.weekEnding).toEqual(weekEnd);
  });
});

describe('formatSummaryAsText', () => {
  it('formats summary as readable text', () => {
    const summary: WeeklySummary = {
      weekStarting: weekStart,
      weekEnding: weekEnd,
      totalTickets: 10,
      avgResolutionTimeHours: 5.5,
      categoryDistribution: {
        [TicketCategory.BUG]: 5,
        [TicketCategory.USER_ERROR]: 3,
        [TicketCategory.FEATURE_REQUEST]: 2,
        [TicketCategory.DOCUMENTATION_GAP]: 0,
        [TicketCategory.INFRASTRUCTURE]: 0,
      },
      teamPerformance: [
        { team: 'eng', ticketsResolved: 5, avgResolutionTimeHours: 4, ticketsPending: 2 },
      ],
      recurringIssues: [
        {
          pattern: 'cache invalidation',
          occurrences: 5,
          category: TicketCategory.BUG,
          suggestedKBTitle: 'Troubleshooting: Cache Invalidation',
        },
      ],
      bottlenecks: [
        {
          team: 'slow-team',
          avgResolutionTimeHours: 30,
          pendingTicketCount: 15,
          oldestTicketAgeHours: 72,
        },
      ],
    };

    const text = formatSummaryAsText(summary);
    expect(text).toContain('Weekly Support Ticket Summary');
    expect(text).toContain('Total Tickets Resolved: 10');
    expect(text).toContain('Average Resolution Time: 5.5 hours');
    expect(text).toContain('bug: 5');
    expect(text).toContain('eng:');
    expect(text).toContain('Resolved: 5');
    expect(text).toContain('cache invalidation');
    expect(text).toContain('slow-team');
    expect(text).toContain('Bottlenecks Detected');
  });

  it('omits sections with no data', () => {
    const summary: WeeklySummary = {
      weekStarting: weekStart,
      weekEnding: weekEnd,
      totalTickets: 0,
      avgResolutionTimeHours: 0,
      categoryDistribution: {},
      teamPerformance: [],
      recurringIssues: [],
      bottlenecks: [],
    };

    const text = formatSummaryAsText(summary);
    expect(text).not.toContain('Recurring Issues');
    expect(text).not.toContain('Bottlenecks Detected');
  });
});
