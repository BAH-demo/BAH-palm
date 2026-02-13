import { TicketCategory, SupportTicket } from '../types';

interface ServiceTeamMapping {
  service: string;
  keywords: string[];
  team: string;
}

const SERVICE_TEAM_MAP: ServiceTeamMapping[] = [
  {
    service: 'authentication',
    keywords: ['login', 'auth', 'sso', 'oauth', 'saml', 'password', 'mfa', '2fa', 'token', 'session'],
    team: 'identity-team',
  },
  {
    service: 'api',
    keywords: ['api', 'endpoint', 'rest', 'graphql', 'webhook', 'rate limit', 'api key'],
    team: 'platform-team',
  },
  {
    service: 'ui',
    keywords: ['ui', 'frontend', 'dashboard', 'display', 'layout', 'css', 'button', 'form', 'page'],
    team: 'frontend-team',
  },
  {
    service: 'database',
    keywords: ['database', 'query', 'sql', 'migration', 'schema', 'data', 'backup', 'replication'],
    team: 'data-team',
  },
  {
    service: 'infrastructure',
    keywords: ['server', 'deploy', 'kubernetes', 'docker', 'aws', 'cloud', 'cdn', 'dns', 'ssl', 'load balancer'],
    team: 'infra-team',
  },
  {
    service: 'billing',
    keywords: ['billing', 'invoice', 'payment', 'subscription', 'plan', 'pricing', 'charge'],
    team: 'billing-team',
  },
  {
    service: 'notifications',
    keywords: ['email', 'notification', 'alert', 'sms', 'push notification', 'webhook'],
    team: 'notifications-team',
  },
];

const CATEGORY_DEFAULT_TEAMS: Record<TicketCategory, string> = {
  [TicketCategory.BUG]: 'engineering-team',
  [TicketCategory.USER_ERROR]: 'support-team',
  [TicketCategory.FEATURE_REQUEST]: 'product-team',
  [TicketCategory.DOCUMENTATION_GAP]: 'docs-team',
  [TicketCategory.INFRASTRUCTURE]: 'infra-team',
};

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function suggestTeam(
  ticket: SupportTicket,
  category: TicketCategory,
): { team: string; service: string; confidence: number } {
  const combinedText = normalizeText(`${ticket.title} ${ticket.description}`);

  if (ticket.affectedService) {
    const mapping = SERVICE_TEAM_MAP.find(
      m => m.service === ticket.affectedService,
    );
    if (mapping) {
      return { team: mapping.team, service: mapping.service, confidence: 0.95 };
    }
  }

  let bestMatch: { team: string; service: string; score: number } | null = null;

  for (const mapping of SERVICE_TEAM_MAP) {
    let score = 0;
    for (const keyword of mapping.keywords) {
      if (combinedText.includes(keyword)) {
        score++;
      }
    }
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { team: mapping.team, service: mapping.service, score };
    }
  }

  if (bestMatch && bestMatch.score >= 2) {
    return {
      team: bestMatch.team,
      service: bestMatch.service,
      confidence: Math.min(0.9, 0.5 + bestMatch.score * 0.1),
    };
  }

  if (bestMatch) {
    return {
      team: bestMatch.team,
      service: bestMatch.service,
      confidence: 0.4,
    };
  }

  return {
    team: CATEGORY_DEFAULT_TEAMS[category],
    service: 'general',
    confidence: 0.3,
  };
}

export { SERVICE_TEAM_MAP, CATEGORY_DEFAULT_TEAMS };
