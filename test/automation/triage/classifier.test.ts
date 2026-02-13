import { classifyTicket, CATEGORY_KEYWORDS } from '@/src/automation/triage/classifier';
import { TicketCategory, SupportTicket } from '@/src/automation/types';

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

describe('classifyTicket', () => {
  it('classifies a bug ticket based on keywords in title', () => {
    const ticket = makeTicket({
      title: 'Application crash when submitting form',
      description: 'The app throws an error and crashes',
    });
    const result = classifyTicket(ticket);
    expect(result.category).toBe(TicketCategory.BUG);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.matchedKeywords.length).toBeGreaterThan(0);
  });

  it('classifies a user-error ticket', () => {
    const ticket = makeTicket({
      title: 'How do I reset my password?',
      description: 'I can\'t find where to change my password. Help me please.',
    });
    const result = classifyTicket(ticket);
    expect(result.category).toBe(TicketCategory.USER_ERROR);
  });

  it('classifies a feature request', () => {
    const ticket = makeTicket({
      title: 'Feature request: dark mode',
      description: 'Would be nice to have a dark mode. Please add this enhancement.',
    });
    const result = classifyTicket(ticket);
    expect(result.category).toBe(TicketCategory.FEATURE_REQUEST);
  });

  it('classifies a documentation gap', () => {
    const ticket = makeTicket({
      title: 'Documentation is unclear about API endpoints',
      description: 'The docs are missing examples for the REST API reference.',
    });
    const result = classifyTicket(ticket);
    expect(result.category).toBe(TicketCategory.DOCUMENTATION_GAP);
  });

  it('classifies an infrastructure issue', () => {
    const ticket = makeTicket({
      title: 'Server down - production outage',
      description: 'The kubernetes deployment is experiencing high latency and memory leak.',
    });
    const result = classifyTicket(ticket);
    expect(result.category).toBe(TicketCategory.INFRASTRUCTURE);
  });

  it('defaults to BUG with low confidence when no keywords match', () => {
    const ticket = makeTicket({
      title: 'Random topic',
      description: 'Nothing specific here.',
    });
    const result = classifyTicket(ticket);
    expect(result.category).toBe(TicketCategory.BUG);
    expect(result.confidence).toBe(0.1);
    expect(result.matchedKeywords).toEqual([]);
  });

  it('gives title keywords a boost in scoring', () => {
    const ticket = makeTicket({
      title: 'Error in login page',
      description: 'Some general text about the application.',
    });
    const result = classifyTicket(ticket);
    expect(result.category).toBe(TicketCategory.BUG);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('handles empty strings gracefully', () => {
    const ticket = makeTicket({ title: '', description: '' });
    const result = classifyTicket(ticket);
    expect(result.category).toBe(TicketCategory.BUG);
    expect(result.confidence).toBe(0.1);
  });
});

describe('CATEGORY_KEYWORDS', () => {
  it('has entries for all ticket categories', () => {
    for (const category of Object.values(TicketCategory)) {
      expect(CATEGORY_KEYWORDS[category]).toBeDefined();
      expect(CATEGORY_KEYWORDS[category].length).toBeGreaterThan(0);
    }
  });
});
