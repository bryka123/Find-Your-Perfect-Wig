import { NextRequest, NextResponse } from 'next/server';
import { AdminAuth, createDemoSession } from '@/lib/auth';

// POST - Create admin session (login)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shop, accessToken, demo } = body;

    if (demo) {
      // Create demo session for development
      const sessionId = createDemoSession();
      
      const response = NextResponse.json({
        success: true,
        sessionId,
        shop: 'demo-shop.myshopify.com',
        permissions: ['admin']
      });

      // Set session cookie
      response.cookies.set('admin_session', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/'
      });

      return response;
    }

    if (!shop || !accessToken) {
      return NextResponse.json(
        { error: 'Shop and accessToken required' },
        { status: 400 }
      );
    }

    // In production, validate the shop and access token with Shopify
    // For now, create session for any provided shop
    const sessionId = AdminAuth.createSession(shop, accessToken);
    
    const response = NextResponse.json({
      success: true,
      sessionId,
      shop,
      permissions: ['admin']
    });

    // Set session cookie
    response.cookies.set('admin_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET - Validate current session
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('admin_session')?.value;
    
    if (!sessionId) {
      return NextResponse.json({ authorized: false, error: 'No session' }, { status: 401 });
    }

    const session = AdminAuth.validateSession(sessionId);
    
    if (!session) {
      return NextResponse.json({ authorized: false, error: 'Invalid session' }, { status: 401 });
    }

    return NextResponse.json({
      authorized: true,
      shop: session.shop,
      permissions: session.permissions,
      expiresAt: session.expiresAt
    });

  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json(
      { authorized: false, error: 'Validation failed' },
      { status: 500 }
    );
  }
}

// DELETE - Logout (destroy session)
export async function DELETE(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('admin_session')?.value;
    
    if (sessionId) {
      AdminAuth.destroySession(sessionId);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // Clear session cookie
    response.cookies.delete('admin_session');

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}










