import { checkIfDocRelated, DOC_INDICATOR_PATTERNS, WELL_DOCUMENTED_TOPICS } from '@/src/automation/triage/doc-checker';
import { SupportTicket } from '@/src/automation/types';

function makeTicket(overrides: Partial<SupportTicket> = {}): SupportTicket {
  return {
    id: 'T-001',
    title: 'Test ticket',
    description: 'Test description',
    attachments: [],
    createdAt: new Date('2026-01-15T10:00:00Z'),
    ...overrides,
  };
}

describe('checkIfDocRelated', () => {
  it('flags "how do i reset password" as doc-related', () => {
    const ticket = makeTicket({
      title: 'How do I reset my password?',
      description: 'I forgot my password and need to reset password.',
    });
    const result = checkIfDocRelated(ticket);
    expect(result.isDocRelated).toBe(true);
    expect(result.matchedTopics).toContain('Password Reset');
    expect(result.docReferences.length).toBeGreaterThan(0);
  });

  it('flags "where can i find API key" as doc-related', () => {
    const ticket = makeTicket({
      title: 'Where can I find my API key?',
      description: 'I need to generate an API key for my integration.',
    });
    const result = checkIfDocRelated(ticket);
    expect(result.isDocRelated).toBe(true);
    expect(result.matchedTopics).toContain('API Key Generation');
  });

  it('flags SSO setup questions as doc-related', () => {
    const ticket = makeTicket({
      title: 'How to configure SSO?',
      description: 'We need help with SSO setup for our organization using SAML.',
    });
    const result = checkIfDocRelated(ticket);
    expect(result.isDocRelated).toBe(true);
    expect(result.matchedTopics).toContain('SSO Configuration');
  });

  it('does not flag genuine bugs as doc-related', () => {
    const ticket = makeTicket({
      title: 'Application crashes on submit',
      description: 'Stack trace shows null pointer exception in the payment module.',
    });
    const result = checkIfDocRelated(ticket);
    expect(result.isDocRelated).toBe(false);
  });

  it('does not flag infrastructure issues as doc-related', () => {
    const ticket = makeTicket({
      title: 'Server returning 503',
      description: 'Production servers are experiencing high latency.',
    });
    const result = checkIfDocRelated(ticket);
    expect(result.isDocRelated).toBe(false);
  });

  it('returns confidence score between 0 and 1', () => {
    const ticket = makeTicket({
      title: 'How do I reset password and configure SSO setup?',
      description: 'Help me understand how to create account and generate API key.',
    });
    const result = checkIfDocRelated(ticket);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('includes doc references for matched topics', () => {
    const ticket = makeTicket({
      title: 'How do I update billing and change plan?',
      description: 'I need help with cancel subscription.',
    });
    const result = checkIfDocRelated(ticket);
    expect(result.isDocRelated).toBe(true);
    expect(result.docReferences.some(d => d.service === 'billing')).toBe(true);
  });

  it('handles empty ticket gracefully', () => {
    const ticket = makeTicket({ title: '', description: '' });
    const result = checkIfDocRelated(ticket);
    expect(result.isDocRelated).toBe(false);
    expect(result.matchedTopics).toEqual([]);
  });
});

describe('constants', () => {
  it('has doc indicator patterns defined', () => {
    expect(DOC_INDICATOR_PATTERNS.length).toBeGreaterThan(0);
  });

  it('has well-documented topics defined', () => {
    expect(WELL_DOCUMENTED_TOPICS.length).toBeGreaterThan(0);
    for (const topic of WELL_DOCUMENTED_TOPICS) {
      expect(topic.topic).toBeTruthy();
      expect(topic.keywords.length).toBeGreaterThan(0);
      expect(topic.docRef.url).toBeTruthy();
    }
  });
});
