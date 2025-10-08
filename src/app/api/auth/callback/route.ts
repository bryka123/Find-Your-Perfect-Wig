import { NextRequest, NextResponse } from 'next/server';
import { validateAuth, storeSession } from '@/lib/shopify';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract OAuth callback parameters
    const callbackQuery = {
      code: searchParams.get('code'),
      hmac: searchParams.get('hmac'),
      shop: searchParams.get('shop'),
      state: searchParams.get('state'),
      timestamp: searchParams.get('timestamp')
    };

    console.log('Processing OAuth callback for shop:', callbackQuery.shop);

    if (!callbackQuery.code || !callbackQuery.shop) {
      return NextResponse.json(
        { error: 'Invalid OAuth callback parameters' },
        { status: 400 }
      );
    }

    // Validate the OAuth callback and get access token
    const session = await validateAuth(callbackQuery, '/api/auth/callback', false);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Failed to validate OAuth callback' },
        { status: 400 }
      );
    }

    // Store the session
    await storeSession(session);

    console.log(`OAuth successful for shop: ${session.shop}`);

    // Create installation record (in production, save to database)
    const installationData = {
      shop: session.shop,
      accessToken: session.accessToken,
      scope: session.scope,
      installedAt: new Date().toISOString()
    };

    // Set cookie to remember the session
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.cookies.set('shopify_session', session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });

    return response;

  } catch (error) {
    console.error('OAuth callback error:', error);
    
    // Redirect to error page with error details
    const errorUrl = new URL('/auth/error', request.url);
    errorUrl.searchParams.set('error', error instanceof Error ? error.message : 'Unknown error');
    
    return NextResponse.redirect(errorUrl);
  }
}










