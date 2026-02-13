import {
  TicketResolution,
  WeeklySummary,
  TeamPerformance,
  TicketCategory,
} from '../types';
import { findRecurringIssues } from './pattern-analyzer';
import { detectBottlenecks } from './bottleneck-detector';

interface PendingTicketInfo {
  team: string;
  ticketId: string;
  ageHours: number;
}

export function generateWeeklySummary(
  resolutions: TicketResolution[],
  pendingTickets: PendingTicketInfo[],
  weekStart: Date,
  weekEnd: Date,
): WeeklySummary {
  const weekResolutions = resolutions.filter(r => {
    const resolvedTime = r.resolvedAt.getTime();
    return resolvedTime >= weekStart.getTime() && resolvedTime <= weekEnd.getTime();
  });

  const categoryDistribution: Record<string, number> = {};
  for (const category of Object.values(TicketCategory)) {
    categoryDistribution[category] = 0;
  }
  for (const resolution of weekResolutions) {
    categoryDistribution[resolution.category] =
      (categoryDistribution[resolution.category] || 0) + 1;
  }

  const totalResolutionTime = weekResolutions.reduce(
    (sum, r) => sum + r.resolutionTimeHours, 0,
  );
  const avgResolutionTime = weekResolutions.length > 0
    ? Math.round((totalResolutionTime / weekResolutions.length) * 100) / 100
    : 0;

  const teamPerformance = calculateTeamPerformance(weekResolutions, pendingTickets);
  const recurringIssues = findRecurringIssues(weekResolutions, 2);
  const bottlenecks = detectBottlenecks(weekResolutions, pendingTickets);

  return {
    weekStarting: weekStart,
    weekEnding: weekEnd,
    totalTickets: weekResolutions.length,
    avgResolutionTimeHours: avgResolutionTime,
    categoryDistribution,
    teamPerformance,
    recurringIssues,
    bottlenecks,
  };
}

function calculateTeamPerformance(
  resolutions: TicketResolution[],
  pendingTickets: PendingTicketInfo[],
): TeamPerformance[] {
  const teamMap: Record<string, { resolved: number; totalTime: number; pending: number }> = {};

  for (const resolution of resolutions) {
    if (!teamMap[resolution.team]) {
      teamMap[resolution.team] = { resolved: 0, totalTime: 0, pending: 0 };
    }
    teamMap[resolution.team].resolved++;
    teamMap[resolution.team].totalTime += resolution.resolutionTimeHours;
  }

  for (const pending of pendingTickets) {
    if (!teamMap[pending.team]) {
      teamMap[pending.team] = { resolved: 0, totalTime: 0, pending: 0 };
    }
    teamMap[pending.team].pending++;
  }

  return Object.entries(teamMap).map(([team, stats]) => ({
    team,
    ticketsResolved: stats.resolved,
    avgResolutionTimeHours: stats.resolved > 0
      ? Math.round((stats.totalTime / stats.resolved) * 100) / 100
      : 0,
    ticketsPending: stats.pending,
  }));
}

export function formatSummaryAsText(summary: WeeklySummary): string {
  const lines: string[] = [];

  lines.push('=== Weekly Support Ticket Summary ===');
  lines.push(`Period: ${summary.weekStarting.toISOString().split('T')[0]} to ${summary.weekEnding.toISOString().split('T')[0]}`);
  lines.push('');
  lines.push(`Total Tickets Resolved: ${summary.totalTickets}`);
  lines.push(`Average Resolution Time: ${summary.avgResolutionTimeHours} hours`);
  lines.push('');

  lines.push('--- Category Distribution ---');
  for (const [category, count] of Object.entries(summary.categoryDistribution)) {
    if (count > 0) {
      lines.push(`  ${category}: ${count}`);
    }
  }
  lines.push('');

  lines.push('--- Team Performance ---');
  for (const team of summary.teamPerformance) {
    lines.push(`  ${team.team}:`);
    lines.push(`    Resolved: ${team.ticketsResolved}`);
    lines.push(`    Avg Resolution: ${team.avgResolutionTimeHours}h`);
    lines.push(`    Pending: ${team.ticketsPending}`);
  }
  lines.push('');

  if (summary.recurringIssues.length > 0) {
    lines.push('--- Recurring Issues (Suggested KB Articles) ---');
    for (const issue of summary.recurringIssues) {
      lines.push(`  "${issue.pattern}" - ${issue.occurrences} occurrences`);
      lines.push(`    Suggested Article: ${issue.suggestedKBTitle}`);
    }
    lines.push('');
  }

  if (summary.bottlenecks.length > 0) {
    lines.push('--- Bottlenecks Detected ---');
    for (const bn of summary.bottlenecks) {
      lines.push(`  ${bn.team}:`);
      lines.push(`    Avg Resolution: ${bn.avgResolutionTimeHours}h`);
      lines.push(`    Pending Tickets: ${bn.pendingTicketCount}`);
      lines.push(`    Oldest Ticket: ${bn.oldestTicketAgeHours}h`);
    }
  }

  return lines.join('\n');
}
