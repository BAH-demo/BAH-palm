import {
  SupportTicket,
  TriageResult,
  RoutingConfig,
  TeamMember,
} from '../types';
import { findBestRule } from './rules-engine';
import { selectLeastLoaded } from './load-balancer';

export interface RoutingResult {
  assignedTeam: string;
  assignedMember: TeamMember | null;
  ruleName: string | null;
  escalationChain: string[];
  escalationTimeoutHours: number;
  reason: string;
}

export function routeTicket(
  ticket: SupportTicket,
  triageResult: TriageResult,
  config: RoutingConfig,
): RoutingResult {
  const bestRule = findBestRule(config.rules, ticket, triageResult);

  const targetTeam = bestRule
    ? bestRule.action.assignTo
    : config.defaultTeam;

  const member = selectLeastLoaded(config.teamMembers, targetTeam);

  const escalationChain = bestRule?.action.escalationChain || [];
  const escalationTimeoutHours = bestRule?.action.escalationTimeoutHours || 4;

  let reason: string;
  if (bestRule && member) {
    reason = `Matched rule "${bestRule.name}", assigned to ${member.assignee.name} on ${targetTeam}`;
  } else if (bestRule) {
    reason = `Matched rule "${bestRule.name}", no available member on ${targetTeam}`;
  } else if (member) {
    reason = `Default routing to ${targetTeam}, assigned to ${member.assignee.name}`;
  } else {
    reason = `Default routing to ${targetTeam}, no available member`;
  }

  return {
    assignedTeam: targetTeam,
    assignedMember: member?.assignee || null,
    ruleName: bestRule?.name || null,
    escalationChain,
    escalationTimeoutHours,
    reason,
  };
}

export {
  evaluateRules,
  findBestRule,
  parseRoutingConfigFromString,
} from './rules-engine';

export {
  checkEscalation,
  getEscalationStatus,
  buildEscalationChain,
} from './escalation';

export {
  selectLeastLoaded,
  getTeamCapacity,
  isTeamOverloaded,
} from './load-balancer';
