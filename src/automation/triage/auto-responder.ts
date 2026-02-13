import { TicketCategory, Severity, DocumentationReference } from '../types';

const DOCUMENTATION_LINKS: DocumentationReference[] = [
  {
    title: 'Getting Started Guide',
    url: 'https://docs.example.com/getting-started',
    keywords: ['setup', 'install', 'getting started', 'quickstart', 'onboarding'],
    service: 'general',
  },
  {
    title: 'Authentication & SSO Guide',
    url: 'https://docs.example.com/auth/sso',
    keywords: ['login', 'sso', 'oauth', 'saml', 'authentication', 'password', 'mfa'],
    service: 'authentication',
  },
  {
    title: 'API Reference',
    url: 'https://docs.example.com/api/reference',
    keywords: ['api', 'endpoint', 'rest', 'graphql', 'api key', 'rate limit'],
    service: 'api',
  },
  {
    title: 'Troubleshooting Common Errors',
    url: 'https://docs.example.com/troubleshooting',
    keywords: ['error', 'fail', 'crash', 'not working', 'broken', 'issue'],
    service: 'general',
  },
  {
    title: 'Infrastructure & Deployment Guide',
    url: 'https://docs.example.com/infrastructure',
    keywords: ['deploy', 'kubernetes', 'docker', 'server', 'scaling', 'infrastructure'],
    service: 'infrastructure',
  },
  {
    title: 'Billing & Subscription FAQ',
    url: 'https://docs.example.com/billing/faq',
    keywords: ['billing', 'invoice', 'payment', 'subscription', 'plan', 'pricing'],
    service: 'billing',
  },
  {
    title: 'Dashboard User Guide',
    url: 'https://docs.example.com/dashboard',
    keywords: ['dashboard', 'ui', 'frontend', 'display', 'settings', 'profile'],
    service: 'ui',
  },
  {
    title: 'Database Configuration Guide',
    url: 'https://docs.example.com/database',
    keywords: ['database', 'sql', 'migration', 'query', 'schema', 'backup'],
    service: 'database',
  },
  {
    title: 'Notification Settings Guide',
    url: 'https://docs.example.com/notifications',
    keywords: ['email', 'notification', 'alert', 'sms', 'webhook'],
    service: 'notifications',
  },
  {
    title: 'Permission & Access Control',
    url: 'https://docs.example.com/access-control',
    keywords: ['permission', 'access denied', 'role', 'admin', 'rbac'],
    service: 'authentication',
  },
];

const TROUBLESHOOTING_STEPS: Record<TicketCategory, string[]> = {
  [TicketCategory.BUG]: [
    'Clear your browser cache and cookies, then retry the operation.',
    'Check our status page at status.example.com for any ongoing incidents.',
    'Try reproducing the issue in an incognito/private browser window.',
    'Ensure you are using a supported browser version (Chrome 90+, Firefox 88+, Safari 14+).',
  ],
  [TicketCategory.USER_ERROR]: [
    'Review our Getting Started guide for step-by-step setup instructions.',
    'Verify your account permissions with your organization administrator.',
    'Ensure your credentials are entered correctly (passwords are case-sensitive).',
    'Check that your account has the required role for this operation.',
  ],
  [TicketCategory.FEATURE_REQUEST]: [
    'Check our public roadmap to see if this feature is already planned.',
    'Review the changelog for recent additions that may address your needs.',
    'Consider using our API to build custom integrations in the meantime.',
  ],
  [TicketCategory.DOCUMENTATION_GAP]: [
    'Search our documentation portal at docs.example.com for related topics.',
    'Check the community forum for user-contributed guides and examples.',
    'Review the API reference for detailed endpoint documentation.',
  ],
  [TicketCategory.INFRASTRUCTURE]: [
    'Check our status page at status.example.com for ongoing incidents.',
    'Review your resource utilization in the admin dashboard.',
    'Verify network connectivity and DNS resolution from your environment.',
    'Check if any recent deployments or configuration changes were made.',
  ],
};

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function findRelevantDocs(
  title: string,
  description: string,
  service: string,
): DocumentationReference[] {
  const combinedText = normalizeText(`${title} ${description}`);
  const scored: { doc: DocumentationReference; score: number }[] = [];

  for (const doc of DOCUMENTATION_LINKS) {
    let score = 0;
    for (const keyword of doc.keywords) {
      if (combinedText.includes(keyword.toLowerCase())) {
        score++;
      }
    }
    if (doc.service === service) {
      score += 2;
    }
    if (score > 0) {
      scored.push({ doc, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map(s => s.doc);
}

export function generateAutoResponse(
  ticketId: string,
  category: TicketCategory,
  severity: Severity,
  title: string,
  description: string,
  service: string,
): { response: string; docReferences: DocumentationReference[] } {
  const relevantDocs = findRelevantDocs(title, description, service);
  const steps = TROUBLESHOOTING_STEPS[category] || [];

  const lines: string[] = [];

  lines.push(`Thank you for submitting ticket #${ticketId}.`);
  lines.push('');

  if (severity === Severity.CRITICAL || severity === Severity.HIGH) {
    lines.push('We have flagged this as a high-priority issue and our team will respond shortly.');
    lines.push('');
  }

  lines.push('In the meantime, here are some steps that may help resolve your issue:');
  lines.push('');
  for (const step of steps) {
    lines.push(`- ${step}`);
  }

  if (relevantDocs.length > 0) {
    lines.push('');
    lines.push('You may also find these documentation resources helpful:');
    lines.push('');
    for (const doc of relevantDocs) {
      lines.push(`- [${doc.title}](${doc.url})`);
    }
  }

  lines.push('');
  lines.push('If the above steps do not resolve your issue, a support engineer will follow up within our SLA timeframe.');

  return {
    response: lines.join('\n'),
    docReferences: relevantDocs,
  };
}

export { DOCUMENTATION_LINKS, TROUBLESHOOTING_STEPS };
