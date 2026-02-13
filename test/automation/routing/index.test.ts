import { routeTicket } from '@/src/automation/routing';
import {
  SupportTicket,
  TriageResult,
  RoutingConfig,
  TicketCategory,
  Severity,
  TeamMember,
} from '@/src/automation/types';

function makeTicket(overrides: Partial<SupportTicket> = {}): SupportTicket {
  return {
    id: 'T-001',
    title: 'Test ticket',
    description: 'Test description',
    attachments: [],
    createdAt: new Date('2026-01-15T10:00:00Z'),
    ...overrides,
  };
}

function makeTriageResult(overrides: Partial<TriageResult> = {}): TriageResult {
  return {
    ticketId: 'T-001',
    category: TicketCategory.BUG,
    severity: Severity.MEDIUM,
    suggestedTeam: 'engineering-team',
    autoResponse: 'Auto response',
    isDocRelated: false,
    docReferences: [],
    confidence: 0.8,
    ...overrides,
  };
}

const teamMembers: TeamMember[] = [
  { id: '1', name: 'Alice', team: 'engineering-team', currentTicketCount: 3, maxTickets: 8, availability: true },
  { id: '2', name: 'Bob', team: 'engineering-team', currentTicketCount: 5, maxTickets: 8, availability: true },
  { id: '3', name: 'Carol', team: 'infra-team', currentTicketCount: 2, maxTickets: 6, availability: true },
  { id: '4', name: 'Dave', team: 'support-team', currentTicketCount: 1, maxTickets: 10, availability: true },
];

const sampleConfig: RoutingConfig = {
  defaultTeam: 'support-team',
  rules: [
    {
      name: 'critical-bugs',
      priority: 100,
      conditions: [
        { field: 'category', operator: 'equals', value: 'bug' },
        { field: 'severity', operator: 'equals', value: 'critical' },
      ],
      action: {
        assignTo: 'engineering-team',
        escalationChain: ['lead', 'director'],
        escalationTimeoutHours: 2,
      },
    },
    {
      name: 'infra-issues',
      priority: 90,
      conditions: [
        { field: 'category', operator: 'equals', value: 'infrastructure' },
      ],
      action: {
        assignTo: 'infra-team',
        escalationChain: ['infra-lead'],
        escalationTimeoutHours: 4,
      },
    },
  ],
  escalationPolicies: {},
  teamMembers,
};

describe('routeTicket', () => {
  it('routes a critical bug to engineering team', () => {
    const ticket = makeTicket();
    const triage = makeTriageResult({ severity: Severity.CRITICAL });
    const result = routeTicket(ticket, triage, sampleConfig);
    expect(result.assignedTeam).toBe('engineering-team');
    expect(result.ruleName).toBe('critical-bugs');
    expect(result.assignedMember).not.toBeNull();
    expect(result.assignedMember!.name).toBe('Alice');
    expect(result.escalationChain).toEqual(['lead', 'director']);
  });

  it('routes infrastructure issues to infra team', () => {
    const ticket = makeTicket();
    const triage = makeTriageResult({ category: TicketCategory.INFRASTRUCTURE });
    const result = routeTicket(ticket, triage, sampleConfig);
    expect(result.assignedTeam).toBe('infra-team');
    expect(result.assignedMember!.name).toBe('Carol');
  });

  it('falls back to default team when no rules match', () => {
    const ticket = makeTicket();
    const triage = makeTriageResult({ category: TicketCategory.FEATURE_REQUEST, severity: Severity.LOW });
    const result = routeTicket(ticket, triage, sampleConfig);
    expect(result.assignedTeam).toBe('support-team');
    expect(result.ruleName).toBeNull();
    expect(result.assignedMember!.name).toBe('Dave');
  });

  it('handles case when no member is available', () => {
    const config: RoutingConfig = {
      ...sampleConfig,
      teamMembers: [
        { id: '1', name: 'Full', team: 'engineering-team', currentTicketCount: 8, maxTickets: 8, availability: true },
      ],
    };
    const ticket = makeTicket();
    const triage = makeTriageResult({ severity: Severity.CRITICAL });
    const result = routeTicket(ticket, triage, config);
    expect(result.assignedTeam).toBe('engineering-team');
    expect(result.assignedMember).toBeNull();
    expect(result.reason).toContain('no available member');
  });

  it('includes reason in result', () => {
    const ticket = makeTicket();
    const triage = makeTriageResult({ severity: Severity.CRITICAL });
    const result = routeTicket(ticket, triage, sampleConfig);
    expect(result.reason).toBeTruthy();
    expect(result.reason).toContain('critical-bugs');
  });
});
