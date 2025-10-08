import { NextRequest, NextResponse } from 'next/server';
import { beginAuth } from '@/lib/shopify';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop parameter is required' },
        { status: 400 }
      );
    }

    console.log(`Starting OAuth flow for shop: ${shop}`);

    // Begin OAuth process
    const authUrl = await beginAuth(shop, '/api/auth/callback', false);
    
    // Redirect to Shopify OAuth
    return NextResponse.redirect(authUrl);

  } catch (error) {
    console.error('Auth initiation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to initiate authentication',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}










