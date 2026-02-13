import { Severity, SupportTicket, TicketCategory } from '../types';

interface SeverityResult {
  severity: Severity;
  factors: string[];
}

const CRITICAL_KEYWORDS = [
  'outage', 'down', 'production down', 'data loss', 'security breach',
  'all users affected', 'complete failure', 'critical', 'urgent',
  'blocker', 'p0', 'sev0', 'emergency',
];

const HIGH_KEYWORDS = [
  'major', 'significant', 'many users', 'workaround needed',
  'high priority', 'p1', 'sev1', 'important', 'blocking',
  'regression', 'data corruption', 'performance degradation',
];

const MEDIUM_KEYWORDS = [
  'moderate', 'some users', 'intermittent', 'inconsistent',
  'p2', 'sev2', 'degraded', 'slow', 'occasional',
];

const LOW_KEYWORDS = [
  'minor', 'cosmetic', 'typo', 'nice to have', 'low priority',
  'p3', 'p4', 'sev3', 'sev4', 'when possible', 'no rush',
];

const CUSTOMER_TIER_BOOST: Record<string, number> = {
  enterprise: 2,
  business: 1,
  standard: 0,
};

const CATEGORY_SEVERITY_DEFAULTS: Record<TicketCategory, Severity> = {
  [TicketCategory.BUG]: Severity.MEDIUM,
  [TicketCategory.USER_ERROR]: Severity.LOW,
  [TicketCategory.FEATURE_REQUEST]: Severity.LOW,
  [TicketCategory.DOCUMENTATION_GAP]: Severity.LOW,
  [TicketCategory.INFRASTRUCTURE]: Severity.HIGH,
};

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function hasKeywords(text: string, keywords: string[]): string[] {
  const normalized = normalizeText(text);
  return keywords.filter(kw => normalized.includes(kw.toLowerCase()));
}

const SEVERITY_ORDER: Severity[] = [Severity.LOW, Severity.MEDIUM, Severity.HIGH, Severity.CRITICAL];

function adjustSeverity(base: Severity, levels: number): Severity {
  const currentIndex = SEVERITY_ORDER.indexOf(base);
  const newIndex = Math.max(0, Math.min(SEVERITY_ORDER.length - 1, currentIndex + levels));
  return SEVERITY_ORDER[newIndex];
}

export function analyzeSeverity(
  ticket: SupportTicket,
  category: TicketCategory,
): SeverityResult {
  const combinedText = `${ticket.title} ${ticket.description}`;
  const factors: string[] = [];

  const criticalMatches = hasKeywords(combinedText, CRITICAL_KEYWORDS);
  const highMatches = hasKeywords(combinedText, HIGH_KEYWORDS);
  const mediumMatches = hasKeywords(combinedText, MEDIUM_KEYWORDS);
  const lowMatches = hasKeywords(combinedText, LOW_KEYWORDS);

  let severity: Severity;

  if (criticalMatches.length > 0) {
    severity = Severity.CRITICAL;
    factors.push(`Critical keywords detected: ${criticalMatches.join(', ')}`);
  } else if (highMatches.length > 0) {
    severity = Severity.HIGH;
    factors.push(`High-priority keywords detected: ${highMatches.join(', ')}`);
  } else if (mediumMatches.length > 0) {
    severity = Severity.MEDIUM;
    factors.push(`Medium-priority keywords detected: ${mediumMatches.join(', ')}`);
  } else if (lowMatches.length > 0) {
    severity = Severity.LOW;
    factors.push(`Low-priority keywords detected: ${lowMatches.join(', ')}`);
  } else {
    severity = CATEGORY_SEVERITY_DEFAULTS[category];
    factors.push(`Default severity for category: ${category}`);
  }

  if (ticket.customerTier) {
    const boost = CUSTOMER_TIER_BOOST[ticket.customerTier] || 0;
    if (boost > 0) {
      severity = adjustSeverity(severity, boost);
      factors.push(`Customer tier boost: ${ticket.customerTier} (+${boost})`);
    }
  }

  if (ticket.attachments.length > 3) {
    severity = adjustSeverity(severity, 1);
    factors.push(`Multiple attachments suggest complex issue (${ticket.attachments.length} files)`);
  }

  return { severity, factors };
}
