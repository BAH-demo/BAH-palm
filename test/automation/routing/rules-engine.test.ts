import { evaluateRules, findBestRule, parseRoutingConfigFromString } from '@/src/automation/routing/rules-engine';
import { RoutingRule, SupportTicket, TriageResult, TicketCategory, Severity } from '@/src/automation/types';

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

function makeTriageResult(overrides: Partial<TriageResult> = {}): TriageResult {
  return {
    ticketId: 'T-001',
    category: TicketCategory.BUG,
    severity: Severity.MEDIUM,
    suggestedTeam: 'engineering-team',
    autoResponse: 'Auto response',
    isDocRelated: false,
    docReferences: [],
    confidence: 0.8,
    ...overrides,
  };
}

const sampleRules: RoutingRule[] = [
  {
    name: 'critical-bugs',
    priority: 100,
    conditions: [
      { field: 'category', operator: 'equals', value: 'bug' },
      { field: 'severity', operator: 'equals', value: 'critical' },
    ],
    action: { assignTo: 'senior-engineering', escalationChain: ['lead', 'director'], escalationTimeoutHours: 2 },
  },
  {
    name: 'login-issues',
    priority: 80,
    conditions: [
      { field: 'title', operator: 'contains', value: 'login' },
    ],
    action: { assignTo: 'identity-team', escalationChain: ['identity-lead'], escalationTimeoutHours: 4 },
  },
  {
    name: 'enterprise-tickets',
    priority: 90,
    conditions: [
      { field: 'customerTier', operator: 'equals', value: 'enterprise' },
      { field: 'severity', operator: 'equals', value: 'high' },
    ],
    action: { assignTo: 'enterprise-support', escalationChain: ['csm'], escalationTimeoutHours: 2 },
  },
  {
    name: 'api-issues',
    priority: 70,
    conditions: [
      { field: 'description', operator: 'contains', value: 'api' },
    ],
    action: { assignTo: 'platform-team', escalationChain: ['platform-lead'], escalationTimeoutHours: 6 },
  },
  {
    name: 'off-hours',
    priority: 85,
    conditions: [
      { field: 'hour', operator: 'greaterThan', value: 18 },
      { field: 'severity', operator: 'equals', value: 'critical' },
    ],
    action: { assignTo: 'oncall-team', escalationChain: ['oncall-secondary'], escalationTimeoutHours: 1 },
  },
];

describe('evaluateRules', () => {
  it('matches rules where all conditions are met', () => {
    const ticket = makeTicket({ title: 'Login button broken' });
    const triage = makeTriageResult();
    const matches = evaluateRules(sampleRules, ticket, triage);
    expect(matches.some(m => m.rule.name === 'login-issues')).toBe(true);
  });

  it('does not match rules where conditions are not met', () => {
    const ticket = makeTicket({ title: 'Something else' });
    const triage = makeTriageResult({ category: TicketCategory.FEATURE_REQUEST, severity: Severity.LOW });
    const matches = evaluateRules(sampleRules, ticket, triage);
    expect(matches.some(m => m.rule.name === 'critical-bugs')).toBe(false);
  });

  it('matches multiple rules when applicable', () => {
    const ticket = makeTicket({
      title: 'Login API error',
      description: 'The api for login is broken',
    });
    const triage = makeTriageResult();
    const matches = evaluateRules(sampleRules, ticket, triage);
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('returns rules sorted by priority (highest first)', () => {
    const ticket = makeTicket({
      title: 'Login critical issue',
      description: 'api is broken',
      createdAt: new Date('2026-01-15T20:00:00Z'),
    });
    const triage = makeTriageResult({ severity: Severity.CRITICAL });
    const matches = evaluateRules(sampleRules, ticket, triage);
    if (matches.length >= 2) {
      expect(matches[0].rule.priority).toBeGreaterThanOrEqual(matches[1].rule.priority);
    }
  });

  it('handles contains operator case-insensitively', () => {
    const ticket = makeTicket({ title: 'LOGIN page broken' });
    const triage = makeTriageResult();
    const matches = evaluateRules(sampleRules, ticket, triage);
    expect(matches.some(m => m.rule.name === 'login-issues')).toBe(true);
  });

  it('handles greaterThan operator for hour field', () => {
    const ticket = makeTicket({ createdAt: new Date('2026-01-15T20:00:00Z') });
    const triage = makeTriageResult({ severity: Severity.CRITICAL });
    const matches = evaluateRules(sampleRules, ticket, triage);
    expect(matches.some(m => m.rule.name === 'off-hours')).toBe(true);
  });
});

describe('findBestRule', () => {
  it('returns the highest priority matching rule', () => {
    const ticket = makeTicket({ title: 'Login is broken' });
    const triage = makeTriageResult({ category: TicketCategory.BUG, severity: Severity.CRITICAL });
    const best = findBestRule(sampleRules, ticket, triage);
    expect(best).not.toBeNull();
    expect(best!.name).toBe('critical-bugs');
  });

  it('returns null when no rules match', () => {
    const ticket = makeTicket({ title: 'xyz', description: 'abc' });
    const triage = makeTriageResult({ category: TicketCategory.FEATURE_REQUEST, severity: Severity.LOW });
    const best = findBestRule(sampleRules, ticket, triage);
    expect(best).toBeNull();
  });
});

describe('parseRoutingConfigFromString', () => {
  it('parses valid YAML config', () => {
    const yamlContent = `
defaultTeam: support-team
rules:
  - name: test-rule
    priority: 50
    conditions:
      - field: category
        operator: equals
        value: bug
    action:
      assignTo: engineering-team
escalationPolicies: {}
teamMembers: []
`;
    const config = parseRoutingConfigFromString(yamlContent);
    expect(config.defaultTeam).toBe('support-team');
    expect(config.rules).toHaveLength(1);
    expect(config.rules[0].name).toBe('test-rule');
  });

  it('throws for config missing rules', () => {
    const yamlContent = `
defaultTeam: support-team
`;
    expect(() => parseRoutingConfigFromString(yamlContent)).toThrow('missing rules array');
  });

  it('throws for config missing defaultTeam', () => {
    const yamlContent = `
rules:
  - name: test
    priority: 1
    conditions: []
    action:
      assignTo: team
`;
    expect(() => parseRoutingConfigFromString(yamlContent)).toThrow('missing defaultTeam');
  });
});
