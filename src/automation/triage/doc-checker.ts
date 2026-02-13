import { SupportTicket, DocumentationReference } from '../types';

const DOC_INDICATOR_PATTERNS = [
  'how do i',
  'how to',
  'where can i find',
  'where is the',
  'what is the',
  'can you tell me',
  'i don\'t know how',
  'help me understand',
  'i can\'t figure out',
  'what does this mean',
  'is there a way to',
  'how does this work',
  'where do i go',
  'i need help with',
  'can someone explain',
];

const WELL_DOCUMENTED_TOPICS: { topic: string; keywords: string[]; docRef: DocumentationReference }[] = [
  {
    topic: 'Account Setup',
    keywords: ['create account', 'sign up', 'register', 'new account', 'getting started'],
    docRef: {
      title: 'Account Setup Guide',
      url: 'https://docs.example.com/getting-started/account-setup',
      keywords: ['account', 'setup', 'register'],
      service: 'general',
    },
  },
  {
    topic: 'Password Reset',
    keywords: ['reset password', 'forgot password', 'change password', 'password reset'],
    docRef: {
      title: 'Password Reset Instructions',
      url: 'https://docs.example.com/auth/password-reset',
      keywords: ['password', 'reset'],
      service: 'authentication',
    },
  },
  {
    topic: 'API Key Generation',
    keywords: ['api key', 'generate key', 'create api key', 'get api key', 'where is my api key'],
    docRef: {
      title: 'API Key Management',
      url: 'https://docs.example.com/api/keys',
      keywords: ['api key', 'generate'],
      service: 'api',
    },
  },
  {
    topic: 'SSO Configuration',
    keywords: ['sso setup', 'configure sso', 'saml setup', 'oauth setup', 'single sign on'],
    docRef: {
      title: 'SSO Configuration Guide',
      url: 'https://docs.example.com/auth/sso-setup',
      keywords: ['sso', 'saml', 'oauth'],
      service: 'authentication',
    },
  },
  {
    topic: 'Webhook Setup',
    keywords: ['webhook', 'configure webhook', 'webhook url', 'webhook events'],
    docRef: {
      title: 'Webhook Integration Guide',
      url: 'https://docs.example.com/integrations/webhooks',
      keywords: ['webhook', 'integration'],
      service: 'api',
    },
  },
  {
    topic: 'User Permissions',
    keywords: ['permissions', 'access control', 'user role', 'admin access', 'rbac', 'role based'],
    docRef: {
      title: 'User Roles & Permissions',
      url: 'https://docs.example.com/admin/permissions',
      keywords: ['permissions', 'roles', 'access'],
      service: 'authentication',
    },
  },
  {
    topic: 'Billing Management',
    keywords: ['update billing', 'change plan', 'cancel subscription', 'upgrade plan', 'downgrade'],
    docRef: {
      title: 'Billing & Subscription Management',
      url: 'https://docs.example.com/billing/manage',
      keywords: ['billing', 'subscription', 'plan'],
      service: 'billing',
    },
  },
  {
    topic: 'Data Export',
    keywords: ['export data', 'download data', 'csv export', 'data backup', 'export report'],
    docRef: {
      title: 'Data Export Guide',
      url: 'https://docs.example.com/data/export',
      keywords: ['export', 'download', 'csv'],
      service: 'general',
    },
  },
];

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim();
}

export function checkIfDocRelated(ticket: SupportTicket): {
  isDocRelated: boolean;
  confidence: number;
  matchedTopics: string[];
  docReferences: DocumentationReference[];
} {
  const combinedText = normalizeText(`${ticket.title} ${ticket.description}`);
  const matchedTopics: string[] = [];
  const docReferences: DocumentationReference[] = [];

  let indicatorCount = 0;
  for (const pattern of DOC_INDICATOR_PATTERNS) {
    if (combinedText.includes(pattern)) {
      indicatorCount++;
    }
  }

  for (const topic of WELL_DOCUMENTED_TOPICS) {
    const keywordMatches = topic.keywords.filter(kw => combinedText.includes(kw.toLowerCase()));
    if (keywordMatches.length > 0) {
      matchedTopics.push(topic.topic);
      docReferences.push(topic.docRef);
    }
  }

  const isDocRelated = indicatorCount > 0 && matchedTopics.length > 0;
  const confidence = Math.min(1, (indicatorCount * 0.2) + (matchedTopics.length * 0.3));

  return {
    isDocRelated,
    confidence: Math.round(confidence * 100) / 100,
    matchedTopics,
    docReferences,
  };
}

export { DOC_INDICATOR_PATTERNS, WELL_DOCUMENTED_TOPICS };
