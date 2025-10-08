// Basic authentication utilities for admin features
// In production, integrate with Shopify OAuth or proper auth system

export interface AdminSession {
  shop: string;
  accessToken: string;
  permissions: string[];
  expiresAt: Date;
}

// Simple session storage (replace with secure storage in production)
const adminSessions = new Map<string, AdminSession>();

export class AdminAuth {
  /**
   * Create admin session for authenticated shop
   */
  static createSession(shop: string, accessToken: string, permissions: string[] = ['admin']): string {
    const sessionId = `admin_${shop}_${Date.now()}`;
    const session: AdminSession = {
      shop,
      accessToken,
      permissions,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
    
    adminSessions.set(sessionId, session);
    return sessionId;
  }

  /**
   * Validate admin session
   */
  static validateSession(sessionId: string): AdminSession | null {
    const session = adminSessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    if (session.expiresAt < new Date()) {
      adminSessions.delete(sessionId);
      return null;
    }
    
    return session;
  }

  /**
   * Check if session has required permission
   */
  static hasPermission(sessionId: string, permission: string): boolean {
    const session = this.validateSession(sessionId);
    return session ? session.permissions.includes(permission) || session.permissions.includes('admin') : false;
  }

  /**
   * Get shop from session
   */
  static getShop(sessionId: string): string | null {
    const session = this.validateSession(sessionId);
    return session ? session.shop : null;
  }

  /**
   * Destroy session
   */
  static destroySession(sessionId: string): boolean {
    return adminSessions.delete(sessionId);
  }

  /**
   * Cleanup expired sessions
   */
  static cleanupExpiredSessions(): number {
    let cleaned = 0;
    const now = new Date();
    
    for (const [sessionId, session] of adminSessions.entries()) {
      if (session.expiresAt < now) {
        adminSessions.delete(sessionId);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}

// Middleware helper for protecting admin routes
export function requireAuth(sessionId?: string): { authorized: boolean; shop?: string; error?: string } {
  if (!sessionId) {
    return { authorized: false, error: 'No session provided' };
  }

  const session = AdminAuth.validateSession(sessionId);
  if (!session) {
    return { authorized: false, error: 'Invalid or expired session' };
  }

  return { authorized: true, shop: session.shop };
}

// Extract session ID from request headers or cookies
export function extractSessionId(request: Request): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try cookie
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const sessionCookie = cookieHeader
      .split(';')
      .find(c => c.trim().startsWith('admin_session='));
    
    if (sessionCookie) {
      return sessionCookie.split('=')[1];
    }
  }

  return null;
}

// Mock authentication for demo purposes
export function createDemoSession(): string {
  return AdminAuth.createSession(
    'demo-shop.myshopify.com',
    'demo-access-token',
    ['admin', 'sync', 'color_manager', 'weights']
  );
}










