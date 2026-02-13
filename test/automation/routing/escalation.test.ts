import { checkEscalation, getEscalationStatus, buildEscalationChain } from '@/src/automation/routing/escalation';
import { TicketAssignment, EscalationConfig } from '@/src/automation/types';

function makeAssignment(overrides: Partial<TicketAssignment> = {}): TicketAssignment {
  return {
    ticketId: 'T-001',
    assignedTo: 'engineer-1',
    team: 'engineering-team',
    assignedAt: new Date('2026-01-15T10:00:00Z'),
    escalationChain: ['engineer-1', 'lead', 'director'],
    escalationTimeoutHours: 4,
    currentEscalationLevel: 0,
    ...overrides,
  };
}

describe('checkEscalation', () => {
  it('does not escalate when within SLA', () => {
    const assignment = makeAssignment();
    const currentTime = new Date('2026-01-15T12:00:00Z');
    const result = checkEscalation(assignment, currentTime);
    expect(result.shouldEscalate).toBe(false);
    expect(result.reason).toContain('Within SLA');
  });

  it('escalates when SLA is breached', () => {
    const assignment = makeAssignment();
    const currentTime = new Date('2026-01-15T15:00:00Z');
    const result = checkEscalation(assignment, currentTime);
    expect(result.shouldEscalate).toBe(true);
    expect(result.nextLevel).toBe(1);
    expect(result.nextAssignee).toBe('lead');
    expect(result.reason).toContain('SLA breached');
  });

  it('calculates hours elapsed correctly', () => {
    const assignment = makeAssignment();
    const currentTime = new Date('2026-01-15T16:30:00Z');
    const result = checkEscalation(assignment, currentTime);
    expect(result.hoursElapsed).toBe(6.5);
  });

  it('does not escalate beyond maximum level', () => {
    const assignment = makeAssignment({ currentEscalationLevel: 2 });
    const currentTime = new Date('2026-01-16T10:00:00Z');
    const result = checkEscalation(assignment, currentTime);
    expect(result.shouldEscalate).toBe(false);
    expect(result.reason).toContain('Maximum escalation level reached');
  });

  it('uses escalation level to calculate timeout threshold', () => {
    const assignment = makeAssignment({ currentEscalationLevel: 1 });
    const currentTime = new Date('2026-01-15T17:00:00Z');
    const result = checkEscalation(assignment, currentTime);
    expect(result.hoursElapsed).toBe(7);
  });

  it('handles zero timeout gracefully', () => {
    const assignment = makeAssignment({ escalationTimeoutHours: 0 });
    const currentTime = new Date('2026-01-15T10:00:01Z');
    const result = checkEscalation(assignment, currentTime);
    expect(result.shouldEscalate).toBe(true);
  });
});

describe('getEscalationStatus', () => {
  it('checks escalation for multiple assignments', () => {
    const assignments = [
      makeAssignment({ ticketId: 'T-001' }),
      makeAssignment({ ticketId: 'T-002', assignedAt: new Date('2026-01-14T10:00:00Z') }),
    ];
    const currentTime = new Date('2026-01-15T15:00:00Z');
    const results = getEscalationStatus(assignments, currentTime);
    expect(results).toHaveLength(2);
    expect(results[0].ticketId).toBe('T-001');
    expect(results[1].ticketId).toBe('T-002');
    expect(results[1].result.shouldEscalate).toBe(true);
  });

  it('returns empty array for no assignments', () => {
    const results = getEscalationStatus([], new Date());
    expect(results).toEqual([]);
  });
});

describe('buildEscalationChain', () => {
  it('builds chain from config', () => {
    const config: EscalationConfig = {
      chain: ['tier1', 'tier2', 'tier3'],
      timeoutHours: 4,
      notifyOnEscalation: true,
    };
    const result = buildEscalationChain(config);
    expect(result.chain).toEqual(['tier1', 'tier2', 'tier3']);
    expect(result.timeoutHours).toBe(4);
  });

  it('returns a copy of the chain (not reference)', () => {
    const config: EscalationConfig = {
      chain: ['a', 'b'],
      timeoutHours: 2,
      notifyOnEscalation: false,
    };
    const result = buildEscalationChain(config);
    result.chain.push('c');
    expect(config.chain).toEqual(['a', 'b']);
  });
});
