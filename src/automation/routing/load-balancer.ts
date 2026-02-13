import { TeamMember } from '../types';

export interface LoadBalanceResult {
  assignee: TeamMember;
  reason: string;
}

export function selectLeastLoaded(
  members: TeamMember[],
  team: string,
): LoadBalanceResult | null {
  const availableMembers = members.filter(
    m => m.team === team && m.availability && m.currentTicketCount < m.maxTickets,
  );

  if (availableMembers.length === 0) {
    return null;
  }

  availableMembers.sort((a, b) => {
    const aUtilization = a.currentTicketCount / a.maxTickets;
    const bUtilization = b.currentTicketCount / b.maxTickets;
    return aUtilization - bUtilization;
  });

  const selected = availableMembers[0];
  return {
    assignee: selected,
    reason: `Least loaded member: ${selected.name} (${selected.currentTicketCount}/${selected.maxTickets} tickets)`,
  };
}

export function getTeamCapacity(
  members: TeamMember[],
  team: string,
): { totalCapacity: number; currentLoad: number; availableSlots: number; utilization: number } {
  const teamMembers = members.filter(m => m.team === team && m.availability);
  const totalCapacity = teamMembers.reduce((sum, m) => sum + m.maxTickets, 0);
  const currentLoad = teamMembers.reduce((sum, m) => sum + m.currentTicketCount, 0);
  const availableSlots = totalCapacity - currentLoad;
  const utilization = totalCapacity > 0 ? Math.round((currentLoad / totalCapacity) * 100) / 100 : 0;

  return { totalCapacity, currentLoad, availableSlots, utilization };
}

export function isTeamOverloaded(
  members: TeamMember[],
  team: string,
  threshold: number = 0.8,
): boolean {
  const capacity = getTeamCapacity(members, team);
  return capacity.utilization >= threshold;
}
