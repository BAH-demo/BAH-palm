import { selectLeastLoaded, getTeamCapacity, isTeamOverloaded } from '@/src/automation/routing/load-balancer';
import { TeamMember } from '@/src/automation/types';

const sampleMembers: TeamMember[] = [
  { id: '1', name: 'Alice', team: 'eng', currentTicketCount: 3, maxTickets: 8, availability: true },
  { id: '2', name: 'Bob', team: 'eng', currentTicketCount: 5, maxTickets: 8, availability: true },
  { id: '3', name: 'Carol', team: 'eng', currentTicketCount: 7, maxTickets: 8, availability: true },
  { id: '4', name: 'Dave', team: 'support', currentTicketCount: 2, maxTickets: 10, availability: true },
  { id: '5', name: 'Eve', team: 'support', currentTicketCount: 9, maxTickets: 10, availability: true },
  { id: '6', name: 'Frank', team: 'eng', currentTicketCount: 0, maxTickets: 8, availability: false },
];

describe('selectLeastLoaded', () => {
  it('selects the member with lowest utilization', () => {
    const result = selectLeastLoaded(sampleMembers, 'eng');
    expect(result).not.toBeNull();
    expect(result!.assignee.name).toBe('Alice');
    expect(result!.reason).toContain('Least loaded');
  });

  it('does not select unavailable members', () => {
    const result = selectLeastLoaded(sampleMembers, 'eng');
    expect(result!.assignee.name).not.toBe('Frank');
  });

  it('does not select members at max capacity', () => {
    const members: TeamMember[] = [
      { id: '1', name: 'Full', team: 'test', currentTicketCount: 5, maxTickets: 5, availability: true },
    ];
    const result = selectLeastLoaded(members, 'test');
    expect(result).toBeNull();
  });

  it('returns null when no members belong to team', () => {
    const result = selectLeastLoaded(sampleMembers, 'nonexistent-team');
    expect(result).toBeNull();
  });

  it('returns null when all members are unavailable', () => {
    const members: TeamMember[] = [
      { id: '1', name: 'Off', team: 'test', currentTicketCount: 0, maxTickets: 10, availability: false },
    ];
    const result = selectLeastLoaded(members, 'test');
    expect(result).toBeNull();
  });

  it('selects from correct team only', () => {
    const result = selectLeastLoaded(sampleMembers, 'support');
    expect(result!.assignee.team).toBe('support');
    expect(result!.assignee.name).toBe('Dave');
  });
});

describe('getTeamCapacity', () => {
  it('calculates total capacity for a team', () => {
    const result = getTeamCapacity(sampleMembers, 'eng');
    expect(result.totalCapacity).toBe(24);
    expect(result.currentLoad).toBe(15);
    expect(result.availableSlots).toBe(9);
  });

  it('calculates utilization correctly', () => {
    const result = getTeamCapacity(sampleMembers, 'eng');
    expect(result.utilization).toBe(0.63);
  });

  it('excludes unavailable members from capacity', () => {
    const result = getTeamCapacity(sampleMembers, 'eng');
    expect(result.totalCapacity).toBe(24);
  });

  it('returns zero for nonexistent team', () => {
    const result = getTeamCapacity(sampleMembers, 'nonexistent');
    expect(result.totalCapacity).toBe(0);
    expect(result.utilization).toBe(0);
  });
});

describe('isTeamOverloaded', () => {
  it('returns false when team is below threshold', () => {
    expect(isTeamOverloaded(sampleMembers, 'eng', 0.8)).toBe(false);
  });

  it('returns true when team exceeds threshold', () => {
    const overloaded: TeamMember[] = [
      { id: '1', name: 'A', team: 'test', currentTicketCount: 9, maxTickets: 10, availability: true },
    ];
    expect(isTeamOverloaded(overloaded, 'test', 0.8)).toBe(true);
  });

  it('uses default threshold of 0.8', () => {
    const members: TeamMember[] = [
      { id: '1', name: 'A', team: 'test', currentTicketCount: 7, maxTickets: 10, availability: true },
    ];
    expect(isTeamOverloaded(members, 'test')).toBe(false);
    const members2: TeamMember[] = [
      { id: '1', name: 'A', team: 'test', currentTicketCount: 9, maxTickets: 10, availability: true },
    ];
    expect(isTeamOverloaded(members2, 'test')).toBe(true);
  });
});
