import { triageTicket } from '@/src/automation/triage';
import { TicketCategory, Severity, SupportTicket } from '@/src/automation/types';

function makeTicket(overrides: Partial<SupportTicket> = {}): SupportTicket {
  return {
    id: 'T-100',
    title: 'Test ticket',
    description: 'Test description',
    attachments: [],
    createdAt: new Date('2026-01-15T10:00:00Z'),
    ...overrides,
  };
}

describe('triageTicket (integration)', () => {
  it('fully triages a bug ticket', () => {
    const ticket = makeTicket({
      id: 'T-101',
      title: 'Application crash on login page',
      description: 'The app throws an error when clicking the login button. Stack trace attached.',
      attachments: [
        { filename: 'stacktrace.txt', mimeType: 'text/plain', size: 5000 },
      ],
    });
    const result = triageTicket(ticket);
    expect(result.ticketId).toBe('T-101');
    expect(result.category).toBe(TicketCategory.BUG);
    expect(result.severity).toBeDefined();
    expect(result.suggestedTeam).toBeTruthy();
    expect(result.autoResponse).toContain('T-101');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('triages a user-error ticket and flags doc references', () => {
    const ticket = makeTicket({
      id: 'T-102',
      title: 'How do I reset my password?',
      description: 'I forgot password and need to reset password. Help me please.',
    });
    const result = triageTicket(ticket);
    expect(result.category).toBe(TicketCategory.USER_ERROR);
    expect(result.isDocRelated).toBe(true);
    expect(result.docReferences.length).toBeGreaterThan(0);
  });

  it('triages an infrastructure ticket with critical severity', () => {
    const ticket = makeTicket({
      id: 'T-103',
      title: 'Production outage - server down',
      description: 'All servers are experiencing complete failure. Critical emergency.',
      customerTier: 'enterprise',
    });
    const result = triageTicket(ticket);
    expect(result.category).toBe(TicketCategory.INFRASTRUCTURE);
    expect(result.severity).toBe(Severity.CRITICAL);
    expect(result.autoResponse).toContain('high-priority');
  });

  it('triages a feature request with low severity', () => {
    const ticket = makeTicket({
      id: 'T-104',
      title: 'Feature request: dark mode support',
      description: 'Would be nice to have dark mode. This is an enhancement suggestion.',
    });
    const result = triageTicket(ticket);
    expect(result.category).toBe(TicketCategory.FEATURE_REQUEST);
    expect(result.severity).toBe(Severity.LOW);
  });

  it('deduplicates doc references', () => {
    const ticket = makeTicket({
      id: 'T-105',
      title: 'How do I configure SSO for my organization?',
      description: 'I need to configure SSO setup with SAML for single sign on. Help me understand the authentication process.',
    });
    const result = triageTicket(ticket);
    const uniqueRefs = new Set(result.docReferences);
    expect(uniqueRefs.size).toBe(result.docReferences.length);
  });
});
