/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { UserRole } from '@/features/shared/types/user';
import middleware from './middleware';

jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}));

jest.mock('@/server/config', () => ({
  getConfig: () => ({
    enableSecureCookies: false,
  }),
}));

describe('middleware', () => {
  function createMockRequest(pathname: string): NextRequest {
    return new NextRequest(new URL(pathname, 'http://localhost:3000'));
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to sign-in when no token is present', async () => {
    (getToken as jest.Mock).mockResolvedValue(null);
    const req = createMockRequest('/settings');

    const result = await middleware(req);

    expect(result).toBeDefined();
    expect(result!.headers.get('location')).toContain('/api/auth/signin');
  });

  it('does not redirect admin users accessing /analytics', async () => {
    (getToken as jest.Mock).mockResolvedValue({
      role: UserRole.Admin,
      isUserGroupLead: false,
    });
    const req = createMockRequest('/analytics');

    const result = await middleware(req);

    expect(result).toBeUndefined();
  });

  it('redirects non-admin user from /analytics to /404', async () => {
    (getToken as jest.Mock).mockResolvedValue({
      role: UserRole.User,
      isUserGroupLead: false,
    });
    const req = createMockRequest('/analytics');

    const result = await middleware(req);

    expect(result).toBeDefined();
    expect(result!.headers.get('location')).toContain('/404');
  });

  it('redirects non-admin non-lead user from /settings to /404', async () => {
    (getToken as jest.Mock).mockResolvedValue({
      role: UserRole.User,
      isUserGroupLead: false,
    });
    const req = createMockRequest('/settings');

    const result = await middleware(req);

    expect(result).toBeDefined();
    expect(result!.headers.get('location')).toContain('/404');
  });

  it('allows group lead to access /settings', async () => {
    (getToken as jest.Mock).mockResolvedValue({
      role: UserRole.User,
      isUserGroupLead: true,
    });
    const req = createMockRequest('/settings');

    const result = await middleware(req);

    expect(result).toBeUndefined();
  });

  it('redirects non-admin non-lead from /settings/sub-page', async () => {
    (getToken as jest.Mock).mockResolvedValue({
      role: UserRole.User,
      isUserGroupLead: false,
    });
    const req = createMockRequest('/settings/ai-agents/123');

    const result = await middleware(req);

    expect(result).toBeDefined();
    expect(result!.headers.get('location')).toContain('/404');
  });
});
