import { NextRequest, NextResponse } from 'next/server';
import { performHybridMatching } from '@/lib/hybrid-fast-matching';
import { performExactVisualMatching } from '@/lib/exact-visual-matching';
import { performEnhancedColorMatching } from '@/lib/enhanced-color-analysis';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    if (!body.userImageData) {
      return NextResponse.json(
        { error: 'User image data is required' },
        { status: 400 }
      );
    }

    if (!body.userImageData.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid image data format. Expected base64 data URL' },
        { status: 400 }
      );
    }

    console.log('🤖 Processing GPT-4 Visual Matching request...');
    
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { 
          error: 'OpenAI API key not configured',
          suggestion: 'Please configure OPENAI_API_KEY environment variable'
        },
        { status: 503 }
      );
    }

    const maxResults = body.maxResults || 6;
    const userPreferences = body.userPreferences || '';

    try {
      // First, try exact visual matching for product images
      console.log('🎯 Checking for exact visual matches first...');
      
      const exactMatches = await performExactVisualMatching(
        body.userImageData,
        maxResults
      );
      
      // If we have high-confidence exact matches, use those
      if (exactMatches.length > 0 && exactMatches[0].visualIdentityScore >= 0.90) {
        console.log(`✅ Found exact visual match: ${exactMatches[0].productTitle} (${Math.round(exactMatches[0].visualIdentityScore * 100)}%)`);
        
        return NextResponse.json({
          success: true,
          matches: exactMatches.map(m => ({
            id: m.productId,
            title: m.productTitle,
            colorName: m.variantColor,
            price: m.price,
            matchScore: m.overallScore,
            visualIdentityScore: m.visualIdentityScore,
            matchType: m.matchType,
            reasons: [
              `Visual identity: ${Math.round(m.visualIdentityScore * 100)}%`,
              ...m.visualAnalysis.identicalFeatures.map(f => `Identical: ${f}`)
            ],
            image: m.image
          })),
          matchingMethod: 'exact_visual_matching',
          processingInfo: {
            model: 'gpt-4o-exact-matching',
            methodology: 'exact_product_image_recognition',
            performance: 'prioritizes identical products',
            exactMatchFound: true,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Use enhanced color matching for better color chip accuracy
      console.log('🎨 Using enhanced color matching for accurate color detection...');
      
      const matches = await performEnhancedColorMatching(
        body.userImageData,
        maxResults
      );
      
      // Convert to expected format
      const formattedMatches = matches.map(match => ({
        id: match.id,
        title: match.title,
        colorName: match.colorName,
        price: match.price,
        matchScore: match.overallScore,
        styleScore: match.styleScore,
        colorScore: match.colorScore,
        reasons: match.reasons,
        detectedHairColor: match.colorAnalysis?.primaryFamily,
        chunkSearched: `enhanced_${match.colorAnalysis?.primaryFamily}_matching`,
        image: match.image ? {
          url: match.image.url,
          altText: match.image.altText || match.title
        } : undefined,
        colorAnalysis: {
          primaryFamily: match.colorAnalysis?.primaryFamily,
          baseColor: match.colorAnalysis?.baseColor,
          isRooted: match.colorAnalysis?.isRooted,
          hasHighlights: match.colorAnalysis?.hasHighlights,
          undertone: match.colorAnalysis?.undertone
        }
      }));
      
      console.log(`✅ Enhanced color matching completed: ${formattedMatches.length} matches`);
      
      return NextResponse.json({
        success: true,
        matches: formattedMatches,
        matchingMethod: 'enhanced_color_matching',
        processingInfo: {
          model: 'gpt-4o-enhanced-color',
          methodology: 'detailed_color_analysis_with_visual_matching', 
          performance: 'accurate color chip matching',
          colorAnalysis: formattedMatches[0]?.colorAnalysis || {},
          features: [
            'Detailed hair color analysis',
            'Rooted and highlighted hair detection', 
            'Accurate color chip matching',
            'Undertone analysis',
            'Dimensional coloring recognition'
          ],
          timestamp: new Date().toISOString()
        }
      });

    } catch (matchingError) {
      console.error('❌ ChatGPT metafield matching failed:', matchingError);
      
      return NextResponse.json(
        {
          error: 'Visual matching failed',
          details: matchingError instanceof Error ? matchingError.message : 'Unknown matching error',
          suggestion: 'Please try with a clearer image or check OpenAI service status'
        },
        { status: 422 }
      );
    }

  } catch (error) {
    console.error('Visual matching API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'GPT-4 Vision Direct Matching API',
    description: 'Send user image and get visually-matched wig recommendations from ChatGPT',
    method: 'POST',
    requirements: {
      userImageData: 'Base64 data URL of user\'s hair image',
      maxResults: 'Number of matches to return (optional, default: 6)',
      userPreferences: 'Additional text preferences (optional)'
    },
    advantages: [
      'Direct visual comparison by GPT-4 Vision',
      'Bypasses database color classification errors', 
      'Compares actual visual appearance',
      'More accurate color matching',
      'Handles complex color names correctly'
    ]
  });
}
