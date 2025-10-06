import { NextRequest, NextResponse } from 'next/server';
import { performVisualToVisualMatching } from '@/lib/visual-to-visual-matching';

/**
 * Visual-to-Visual Style Matching API
 * 
 * Compares actual product images with user image for better style matching
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

    console.log('🎯 Processing visual-to-visual style matching request...');
    
    const maxResults = body.maxResults || 10;
    const startTime = Date.now();

    try {
      // Perform visual-to-visual matching
      const matches = await performVisualToVisualMatching(
        body.userImageData,
        maxResults
      );
      
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Visual matching completed in ${processingTime}ms`);
      console.log(`📊 Returning ${matches.length} visual matches`);
      
      // Calculate statistics
      const stats = {
        totalMatches: matches.length,
        avgVisualStyleScore: matches.reduce((sum, m) => sum + m.visualStyleScore, 0) / matches.length,
        avgVisualColorScore: matches.reduce((sum, m) => sum + m.visualColorScore, 0) / matches.length,
        avgOverallScore: matches.reduce((sum, m) => sum + m.overallVisualScore, 0) / matches.length,
        highConfidenceMatches: matches.filter(m => m.matchConfidence === 'high').length,
        mediumConfidenceMatches: matches.filter(m => m.matchConfidence === 'medium').length,
        lowConfidenceMatches: matches.filter(m => m.matchConfidence === 'low').length
      };
      
      return NextResponse.json({
        success: true,
        matches,
        statistics: stats,
        metadata: {
          method: 'visual_to_visual_matching',
          model: 'gpt-4o-vision',
          features: [
            'Actual product image analysis',
            'Visual style comparison',
            'True image-to-image matching',
            'No reliance on text metadata',
            'Direct visual similarity scoring'
          ],
          processingTime: `${processingTime}ms`,
          timestamp: new Date().toISOString()
        }
      });

    } catch (matchingError: any) {
      console.error('❌ Visual matching failed:', matchingError);
      
      return NextResponse.json(
        {
          error: 'Visual matching process failed',
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
    api: 'Visual-to-Visual Style Matching API',
    version: '1.0',
    description: 'Advanced wig matching using actual product image comparison',
    endpoints: {
      POST: {
        description: 'Match user photo to products using visual comparison',
        body: {
          userImageData: 'Base64 data URL of user image (required)',
          maxResults: 'Number of matches to return (optional, default: 10)'
        },
        response: {
          matches: 'Array of visual matches with detailed analysis',
          statistics: 'Matching statistics and confidence levels',
          metadata: 'Processing information'
        }
      }
    },
    capabilities: [
      'Direct image-to-image comparison',
      'Visual style analysis (cut, layers, movement)',
      'Actual product photo evaluation',
      'No dependency on text metadata',
      'Confidence scoring for each match'
    ],
    advantages: [
      'More accurate style matching',
      'Sees actual product appearance',
      'Compares visual characteristics directly',
      'Better for complex styles and cuts',
      'Reduces metadata errors'
    ],
    requirements: [
      'OPENAI_API_KEY environment variable',
      'Product catalog with image URLs',
      'Valid image in base64 format'
    ]
  });
}






