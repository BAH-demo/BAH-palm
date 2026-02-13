import { TicketAssignment, EscalationConfig } from '../types';

export interface EscalationCheckResult {
  shouldEscalate: boolean;
  nextLevel: number;
  nextAssignee: string | null;
  hoursElapsed: number;
  reason: string;
}

export function checkEscalation(
  assignment: TicketAssignment,
  currentTime: Date,
): EscalationCheckResult {
  const hoursElapsed =
    (currentTime.getTime() - assignment.assignedAt.getTime()) / (1000 * 60 * 60);

  const timeoutThreshold =
    assignment.escalationTimeoutHours * (assignment.currentEscalationLevel + 1);

  if (hoursElapsed < timeoutThreshold) {
    return {
      shouldEscalate: false,
      nextLevel: assignment.currentEscalationLevel,
      nextAssignee: null,
      hoursElapsed: Math.round(hoursElapsed * 100) / 100,
      reason: `Within SLA: ${Math.round(hoursElapsed * 10) / 10}h elapsed, threshold is ${timeoutThreshold}h`,
    };
  }

  const nextLevel = assignment.currentEscalationLevel + 1;

  if (nextLevel >= assignment.escalationChain.length) {
    return {
      shouldEscalate: false,
      nextLevel: assignment.currentEscalationLevel,
      nextAssignee: null,
      hoursElapsed: Math.round(hoursElapsed * 100) / 100,
      reason: 'Maximum escalation level reached',
    };
  }

  return {
    shouldEscalate: true,
    nextLevel,
    nextAssignee: assignment.escalationChain[nextLevel],
    hoursElapsed: Math.round(hoursElapsed * 100) / 100,
    reason: `SLA breached: ${Math.round(hoursElapsed * 10) / 10}h elapsed, threshold was ${timeoutThreshold}h`,
  };
}

export function buildEscalationChain(
  config: EscalationConfig,
): { chain: string[]; timeoutHours: number } {
  return {
    chain: [...config.chain],
    timeoutHours: config.timeoutHours,
  };
}

export function getEscalationStatus(
  assignments: TicketAssignment[],
  currentTime: Date,
): { ticketId: string; result: EscalationCheckResult }[] {
  return assignments.map(assignment => ({
    ticketId: assignment.ticketId,
    result: checkEscalation(assignment, currentTime),
  }));
}
