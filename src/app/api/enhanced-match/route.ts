import { NextRequest, NextResponse } from 'next/server';
import { performEnhancedVariantMatching } from '@/lib/enhanced-variant-matching';

/**
 * Enhanced Matching API
 * 
 * Provides comprehensive style and color matching for all product variants
 * Uses GPT-4 Vision for intelligent analysis
 */

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
        { error: 'Invalid image format. Expected base64 data URL' },
        { status: 400 }
      );
    }

    // Check OpenAI configuration
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { 
          error: 'OpenAI API key not configured',
          suggestion: 'Please configure OPENAI_API_KEY in environment variables'
        },
        { status: 503 }
      );
    }

    console.log('🎯 Processing enhanced variant matching request...');
    
    const maxResults = body.maxResults || 10;
    const startTime = Date.now();

    try {
      // Perform enhanced matching with full variant support
      const matches = await performEnhancedVariantMatching(
        body.userImageData,
        maxResults
      );
      
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Enhanced matching completed in ${processingTime}ms`);
      console.log(`📊 Returning ${matches.length} variant matches`);
      
      // Calculate statistics
      const stats = {
        totalMatches: matches.length,
        avgStyleScore: matches.reduce((sum, m) => sum + m.styleMatch, 0) / matches.length,
        avgColorScore: matches.reduce((sum, m) => sum + m.colorMatch, 0) / matches.length,
        avgOverallScore: matches.reduce((sum, m) => sum + m.overallScore, 0) / matches.length,
        colorFamilies: [...new Set(matches.map(m => m.colorFamily))],
        priceRange: {
          min: Math.min(...matches.map(m => parseFloat(m.price))),
          max: Math.max(...matches.map(m => parseFloat(m.price)))
        }
      };
      
      return NextResponse.json({
        success: true,
        matches,
        statistics: stats,
        metadata: {
          method: 'enhanced_variant_matching',
          model: 'gpt-4o-vision',
          features: [
            'Comprehensive style analysis',
            'Precise color matching',
            'All product variants evaluated',
            'No hardcoded values',
            'Dynamic and adaptive'
          ],
          processingTime: `${processingTime}ms`,
          timestamp: new Date().toISOString()
        }
      });

    } catch (matchingError: any) {
      console.error('❌ Enhanced matching failed:', matchingError);
      
      return NextResponse.json(
        {
          error: 'Matching process failed',
          details: matchingError.message || 'Unknown error',
          suggestion: 'Please try with a clearer image or check service status'
        },
        { status: 422 }
      );
    }

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for API information
export async function GET() {
  return NextResponse.json({
    api: 'Enhanced Variant Matching API',
    version: '2.0',
    description: 'Advanced wig matching with comprehensive variant support',
    endpoints: {
      POST: {
        description: 'Match user photo to product variants',
        body: {
          userImageData: 'Base64 data URL of user image (required)',
          maxResults: 'Number of matches to return (optional, default: 10)'
        },
        response: {
          matches: 'Array of variant matches with scores',
          statistics: 'Matching statistics and insights',
          metadata: 'Processing information'
        }
      }
    },
    capabilities: [
      'Style analysis (length, texture, volume, layers)',
      'Color analysis (family, shade, undertone, dimension)',
      'Up to 35 color variants per product',
      'Intelligent scoring and ranking',
      'No hardcoded values - fully dynamic'
    ],
    requirements: [
      'OPENAI_API_KEY environment variable',
      'Product catalog (chiquel_catalog.json)',
      'Valid image in base64 format'
    ]
  });
}









