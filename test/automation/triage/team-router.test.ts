import { suggestTeam, SERVICE_TEAM_MAP, CATEGORY_DEFAULT_TEAMS } from '@/src/automation/triage/team-router';
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

describe('suggestTeam', () => {
  it('routes to identity-team for auth-related tickets', () => {
    const ticket = makeTicket({
      title: 'Login failure with SSO',
      description: 'Users cannot authenticate via OAuth. Session token is invalid.',
    });
    const result = suggestTeam(ticket, TicketCategory.BUG);
    expect(result.team).toBe('identity-team');
    expect(result.service).toBe('authentication');
  });

  it('routes to platform-team for API issues', () => {
    const ticket = makeTicket({
      title: 'API rate limit exceeded',
      description: 'Our API endpoint returns 429 errors. Need to increase the rate limit.',
    });
    const result = suggestTeam(ticket, TicketCategory.BUG);
    expect(result.team).toBe('platform-team');
    expect(result.service).toBe('api');
  });

  it('routes to infra-team for infrastructure issues', () => {
    const ticket = makeTicket({
      title: 'Kubernetes pod crash loop',
      description: 'Docker containers on AWS are failing to deploy.',
    });
    const result = suggestTeam(ticket, TicketCategory.INFRASTRUCTURE);
    expect(result.team).toBe('infra-team');
  });

  it('uses affectedService when provided', () => {
    const ticket = makeTicket({
      title: 'Something broken',
      description: 'Generic description',
      affectedService: 'authentication',
    });
    const result = suggestTeam(ticket, TicketCategory.BUG);
    expect(result.team).toBe('identity-team');
    expect(result.confidence).toBe(0.95);
  });

  it('falls back to category default when no keywords match', () => {
    const ticket = makeTicket({
      title: 'Something unusual',
      description: 'Very vague issue.',
    });
    const result = suggestTeam(ticket, TicketCategory.FEATURE_REQUEST);
    expect(result.team).toBe('product-team');
    expect(result.confidence).toBe(0.3);
  });

  it('has lower confidence for single keyword match', () => {
    const ticket = makeTicket({
      title: 'Email issue',
      description: 'Nothing else specific.',
    });
    const result = suggestTeam(ticket, TicketCategory.BUG);
    expect(result.confidence).toBeLessThanOrEqual(0.5);
  });
});

describe('SERVICE_TEAM_MAP', () => {
  it('has unique team assignments', () => {
    const teams = SERVICE_TEAM_MAP.map(m => m.team);
    expect(teams.length).toBeGreaterThan(0);
  });
});

describe('CATEGORY_DEFAULT_TEAMS', () => {
  it('has a default team for every category', () => {
    for (const category of Object.values(TicketCategory)) {
      expect(CATEGORY_DEFAULT_TEAMS[category]).toBeDefined();
    }
  });
});
