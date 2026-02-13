import { analyzeSeverity } from '@/src/automation/triage/severity-analyzer';
import { Severity, TicketCategory, SupportTicket } from '@/src/automation/types';

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

describe('analyzeSeverity', () => {
  it('assigns critical severity for outage keywords', () => {
    const ticket = makeTicket({
      title: 'Production outage - all users affected',
      description: 'Complete failure of the service.',
    });
    const result = analyzeSeverity(ticket, TicketCategory.INFRASTRUCTURE);
    expect(result.severity).toBe(Severity.CRITICAL);
    expect(result.factors.length).toBeGreaterThan(0);
  });

  it('assigns high severity for major keywords', () => {
    const ticket = makeTicket({
      title: 'Major regression in API',
      description: 'Significant performance degradation affecting many users.',
    });
    const result = analyzeSeverity(ticket, TicketCategory.BUG);
    expect(result.severity).toBe(Severity.HIGH);
  });

  it('assigns medium severity for moderate keywords', () => {
    const ticket = makeTicket({
      title: 'Intermittent slowness',
      description: 'Some users are experiencing occasional degraded performance.',
    });
    const result = analyzeSeverity(ticket, TicketCategory.BUG);
    expect(result.severity).toBe(Severity.MEDIUM);
  });

  it('assigns low severity for minor keywords', () => {
    const ticket = makeTicket({
      title: 'Minor cosmetic issue',
      description: 'Small typo on the settings page. No rush.',
    });
    const result = analyzeSeverity(ticket, TicketCategory.BUG);
    expect(result.severity).toBe(Severity.LOW);
  });

  it('uses category default when no keywords match', () => {
    const ticket = makeTicket({
      title: 'General question',
      description: 'I have a question about the system.',
    });
    const result = analyzeSeverity(ticket, TicketCategory.USER_ERROR);
    expect(result.severity).toBe(Severity.LOW);
    expect(result.factors).toContain('Default severity for category: user-error');
  });

  it('boosts severity for enterprise customers', () => {
    const ticket = makeTicket({
      title: 'General question',
      description: 'Something happened.',
      customerTier: 'enterprise',
    });
    const result = analyzeSeverity(ticket, TicketCategory.USER_ERROR);
    expect([Severity.MEDIUM, Severity.HIGH]).toContain(result.severity);
    expect(result.factors.some(f => f.includes('Customer tier boost'))).toBe(true);
  });

  it('boosts severity for business customers', () => {
    const ticket = makeTicket({
      title: 'General question',
      description: 'Something happened.',
      customerTier: 'business',
    });
    const result = analyzeSeverity(ticket, TicketCategory.USER_ERROR);
    expect(result.factors.some(f => f.includes('Customer tier boost'))).toBe(true);
  });

  it('does not boost severity for standard customers', () => {
    const ticket = makeTicket({
      title: 'General question',
      description: 'Something happened.',
      customerTier: 'standard',
    });
    const result = analyzeSeverity(ticket, TicketCategory.USER_ERROR);
    expect(result.factors.every(f => !f.includes('Customer tier boost'))).toBe(true);
  });

  it('boosts severity for many attachments', () => {
    const ticket = makeTicket({
      attachments: [
        { filename: 'log1.txt', mimeType: 'text/plain', size: 1000 },
        { filename: 'log2.txt', mimeType: 'text/plain', size: 1000 },
        { filename: 'screenshot1.png', mimeType: 'image/png', size: 50000 },
        { filename: 'screenshot2.png', mimeType: 'image/png', size: 50000 },
      ],
    });
    const result = analyzeSeverity(ticket, TicketCategory.BUG);
    expect(result.factors.some(f => f.includes('Multiple attachments'))).toBe(true);
  });

  it('does not cap severity above critical', () => {
    const ticket = makeTicket({
      title: 'Production outage critical emergency',
      description: 'All users affected, complete failure, data loss',
      customerTier: 'enterprise',
      attachments: [
        { filename: 'a.txt', mimeType: 'text/plain', size: 100 },
        { filename: 'b.txt', mimeType: 'text/plain', size: 100 },
        { filename: 'c.txt', mimeType: 'text/plain', size: 100 },
        { filename: 'd.txt', mimeType: 'text/plain', size: 100 },
      ],
    });
    const result = analyzeSeverity(ticket, TicketCategory.INFRASTRUCTURE);
    expect(result.severity).toBe(Severity.CRITICAL);
  });
});
