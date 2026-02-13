import {
  generateAutoResponse,
  findRelevantDocs,
  DOCUMENTATION_LINKS,
  TROUBLESHOOTING_STEPS,
} from '@/src/automation/triage/auto-responder';
import { TicketCategory, Severity } from '@/src/automation/types';

describe('findRelevantDocs', () => {
  it('finds auth-related docs for login issues', () => {
    const docs = findRelevantDocs('Login failure', 'Cannot authenticate via SSO', 'authentication');
    expect(docs.length).toBeGreaterThan(0);
    expect(docs.some(d => d.service === 'authentication')).toBe(true);
  });

  it('finds API docs for API issues', () => {
    const docs = findRelevantDocs('API error', 'The REST endpoint returns 500', 'api');
    expect(docs.length).toBeGreaterThan(0);
    expect(docs.some(d => d.service === 'api')).toBe(true);
  });

  it('returns empty array when no docs match', () => {
    const docs = findRelevantDocs('xyz', 'abc', 'nonexistent');
    expect(docs).toEqual([]);
  });

  it('returns at most 3 docs', () => {
    const docs = findRelevantDocs(
      'login error api dashboard',
      'Everything is broken including email notification billing database',
      'general',
    );
    expect(docs.length).toBeLessThanOrEqual(3);
  });

  it('prioritizes service-matched docs', () => {
    const docs = findRelevantDocs('billing issue', 'Need help with payment', 'billing');
    if (docs.length > 0) {
      expect(docs[0].service).toBe('billing');
    }
  });
});

describe('generateAutoResponse', () => {
  it('generates a response for a bug ticket', () => {
    const { response, docReferences } = generateAutoResponse(
      'T-001', TicketCategory.BUG, Severity.MEDIUM,
      'Application error', 'The app crashes on submit', 'general',
    );
    expect(response).toContain('T-001');
    expect(response).toContain('steps that may help');
    expect(response).toContain('support engineer will follow up');
  });

  it('adds high-priority note for critical tickets', () => {
    const { response } = generateAutoResponse(
      'T-002', TicketCategory.BUG, Severity.CRITICAL,
      'Critical outage', 'Production is down', 'infrastructure',
    );
    expect(response).toContain('high-priority issue');
  });

  it('adds high-priority note for high severity tickets', () => {
    const { response } = generateAutoResponse(
      'T-003', TicketCategory.INFRASTRUCTURE, Severity.HIGH,
      'Server issues', 'High latency on servers', 'infrastructure',
    );
    expect(response).toContain('high-priority issue');
  });

  it('includes relevant documentation links', () => {
    const { response, docReferences } = generateAutoResponse(
      'T-004', TicketCategory.USER_ERROR, Severity.LOW,
      'How to login', 'I need help with SSO authentication', 'authentication',
    );
    expect(docReferences.length).toBeGreaterThan(0);
    expect(response).toContain('documentation resources helpful');
  });

  it('includes troubleshooting steps for user errors', () => {
    const { response } = generateAutoResponse(
      'T-005', TicketCategory.USER_ERROR, Severity.LOW,
      'Account help', 'I need help', 'general',
    );
    for (const step of TROUBLESHOOTING_STEPS[TicketCategory.USER_ERROR]) {
      expect(response).toContain(step);
    }
  });

  it('generates response for feature requests', () => {
    const { response } = generateAutoResponse(
      'T-006', TicketCategory.FEATURE_REQUEST, Severity.LOW,
      'Add dark mode', 'Please add dark mode', 'ui',
    );
    expect(response).toContain('T-006');
  });
});

describe('constants', () => {
  it('has documentation links defined', () => {
    expect(DOCUMENTATION_LINKS.length).toBeGreaterThan(0);
  });

  it('has troubleshooting steps for all categories', () => {
    for (const category of Object.values(TicketCategory)) {
      expect(TROUBLESHOOTING_STEPS[category]).toBeDefined();
      expect(TROUBLESHOOTING_STEPS[category].length).toBeGreaterThan(0);
    }
  });
});
