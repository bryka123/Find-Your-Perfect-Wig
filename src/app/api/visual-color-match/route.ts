import { NextRequest, NextResponse } from 'next/server';
import {
  performVisualColorMatching,
  getProductsByColorSwatches
} from '@/lib/visual-color-matching';

export async function POST(request: NextRequest) {
  try {
    const { imageData, maxResults = 6 } = await request.json();

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    console.log('🎨 Visual Color Swatch Matching API called... [v3.0 - STYLE-ONLY RANKING]');
    console.log('📸 Image data length:', imageData?.length || 0);
    console.log('🔍 RANKING: Products ranked by STYLE match only (color determines variant, not rank)');

    // Step 1: Match user's hair against actual color swatches
    const { bestMatch, allMatches } = await performVisualColorMatching(imageData);

    console.log(`✅ Best color match: ${bestMatch.colorCode} - ${bestMatch.colorName} (${Math.round(bestMatch.visualSimilarity * 100)}%)`);
    console.log('🎯 All matches:', allMatches.slice(0, 5).map(m => `${m.colorCode} (${Math.round(m.visualSimilarity * 100)}%)`).join(', '));

    // Step 2: Get products with these exact colors
    const matchingProducts = await getProductsByColorSwatches(allMatches.slice(0, 5));
    console.log(`📦 Found ${matchingProducts.length} matching products`);

    // Step 3: Format results
    const formattedMatches = matchingProducts.slice(0, maxResults).map((product, index) => {
      const finalColorCode = product.matchedColorCode || product.colorName;
      const finalColorName = product.matchedColorName || product.colorName;

      // Debug logging for specific products
      if (product.title.includes('16 On Key') || product.title.includes('Love Wave')) {
        console.log(`\n🎨 API FORMATTING "${product.title}":`);
        console.log(`   product.colorName: "${product.colorName}"`);
        console.log(`   product.matchedColorCode: "${product.matchedColorCode}"`);
        console.log(`   product.matchedColorName: "${product.matchedColorName}"`);
        console.log(`   finalColorCode: "${finalColorCode}"`);
        console.log(`   finalColorName: "${finalColorName}"`);
      }

      return {
        id: product.id,
        title: product.title,
        handle: product.handle,
        vendor: product.vendor,
        colorCode: finalColorCode,
        colorName: finalColorName,
        price: product.price || product.priceAmount?.amount || '0',
        matchScore: product.styleMatchScore || product.combinedScore,
        visualIdentity: Math.round((product.styleMatchScore || product.combinedScore) * 100),
        reasons: [
          `Style match: ${Math.round((product.styleMatchScore || product.combinedScore) * 100)}%`,
          `Available in your color: ${finalColorName}`,
          `Color variant match: ${Math.round(product.colorMatchScore * 100)}%`,
          index === 0 ? 'BEST STYLE MATCH - Highest style compatibility' : 'Alternative style option'
        ],
        image: product.image || product.featuredImage,
        detectedHairColor: bestMatch.colorName,
        actualColorFamily: product.colorFamily || (bestMatch.colorCode.includes('F16') || bestMatch.colorCode.includes('FS') ? 'blonde' : 'brunette')
      };
    });

    // Step 4: Return comprehensive response
    return NextResponse.json({
      success: true,
      matches: formattedMatches,
      colorAnalysis: {
        bestMatch: {
          code: bestMatch.colorCode,
          name: bestMatch.colorName,
          similarity: bestMatch.visualSimilarity,
          isRooted: bestMatch.isRooted
        },
        topMatches: allMatches.slice(0, 5).map(m => ({
          code: m.colorCode,
          name: m.colorName,
          similarity: m.visualSimilarity
        }))
      },
      metadata: {
        method: 'visual_color_swatch_matching',
        message: 'Matched against actual product color swatches',
        confidence: bestMatch.visualSimilarity,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Visual color matching error:', error);
    return NextResponse.json(
      {
        error: 'Failed to perform visual color matching',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}