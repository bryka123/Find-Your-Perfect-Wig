import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  console.log('🧪 Testing GPT-4 Vision with hardcoded example...');

  try {
    const { userImage } = await req.json();

    // Example product images for testing
    const testProducts = [
      {
        title: "27 Straight Cinch Pony",
        score: 90,
        imageUrl: "https://cdn.shopify.com/s/files/1/0755/1906/3869/products/27-straight-cinch-pony.jpg", // You'll need actual URLs
        description: "Very long ponytail extension"
      },
      {
        title: "Vale",
        score: 95,
        imageUrl: "https://cdn.shopify.com/s/files/1/0755/1906/3869/products/vale.jpg", // You'll need actual URLs
        description: "Short pixie cut"
      },
      {
        title: "Flirty Fringe Bob",
        score: 85,
        imageUrl: "https://cdn.shopify.com/s/files/1/0755/1906/3869/products/flirty-fringe-bob.jpg", // You'll need actual URLs
        description: "Short bob with fringe"
      }
    ];

    // Call the GPT-4 Vision endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/gpt-vision-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData: userImage,
        productImages: testProducts,
        userPrompt: `The user has uploaded a photo showing medium-length layered hair with bangs.

Please analyze why these product matches might be incorrect:
1. "27 Straight Cinch Pony" (90% match) - A very long ponytail extension
2. "Vale" (95% match) - A short pixie cut style
3. "Flirty Fringe Bob" (85% match) - A short bob

Explain what's wrong with these matches and what types of products would be better matches for medium-length layered hair with bangs.`
      })
    });

    const result = await response.json();

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Test error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}