import { TicketResolution, QueueBottleneck } from '../types';

interface PendingTicketInfo {
  team: string;
  ticketId: string;
  ageHours: number;
}

export function detectBottlenecks(
  resolutions: TicketResolution[],
  pendingTickets: PendingTicketInfo[],
  thresholdHours: number = 24,
): QueueBottleneck[] {
  const teamStats: Record<string, {
    totalResolutionTime: number;
    resolvedCount: number;
    pendingCount: number;
    oldestPendingAge: number;
  }> = {};

  for (const resolution of resolutions) {
    if (!teamStats[resolution.team]) {
      teamStats[resolution.team] = {
        totalResolutionTime: 0,
        resolvedCount: 0,
        pendingCount: 0,
        oldestPendingAge: 0,
      };
    }
    teamStats[resolution.team].totalResolutionTime += resolution.resolutionTimeHours;
    teamStats[resolution.team].resolvedCount++;
  }

  for (const pending of pendingTickets) {
    if (!teamStats[pending.team]) {
      teamStats[pending.team] = {
        totalResolutionTime: 0,
        resolvedCount: 0,
        pendingCount: 0,
        oldestPendingAge: 0,
      };
    }
    teamStats[pending.team].pendingCount++;
    teamStats[pending.team].oldestPendingAge = Math.max(
      teamStats[pending.team].oldestPendingAge,
      pending.ageHours,
    );
  }

  const bottlenecks: QueueBottleneck[] = [];

  for (const [team, stats] of Object.entries(teamStats)) {
    const avgResolutionTime = stats.resolvedCount > 0
      ? Math.round((stats.totalResolutionTime / stats.resolvedCount) * 100) / 100
      : 0;

    const isBottleneck =
      avgResolutionTime > thresholdHours ||
      stats.pendingCount > 10 ||
      stats.oldestPendingAge > thresholdHours * 2;

    if (isBottleneck) {
      bottlenecks.push({
        team,
        avgResolutionTimeHours: avgResolutionTime,
        pendingTicketCount: stats.pendingCount,
        oldestTicketAgeHours: Math.round(stats.oldestPendingAge * 100) / 100,
      });
    }
  }

  bottlenecks.sort((a, b) => b.pendingTicketCount - a.pendingTicketCount);

  return bottlenecks;
}

export function calculateTeamMetrics(
  resolutions: TicketResolution[],
): Record<string, { avgResolutionHours: number; ticketCount: number; medianResolutionHours: number }> {
  const teamResolutions: Record<string, number[]> = {};

  for (const resolution of resolutions) {
    if (!teamResolutions[resolution.team]) {
      teamResolutions[resolution.team] = [];
    }
    teamResolutions[resolution.team].push(resolution.resolutionTimeHours);
  }

  const metrics: Record<string, { avgResolutionHours: number; ticketCount: number; medianResolutionHours: number }> = {};

  for (const [team, times] of Object.entries(teamResolutions)) {
    const sorted = [...times].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    metrics[team] = {
      avgResolutionHours: Math.round((times.reduce((s, t) => s + t, 0) / times.length) * 100) / 100,
      ticketCount: times.length,
      medianResolutionHours: Math.round(median * 100) / 100,
    };
  }

  return metrics;
}
