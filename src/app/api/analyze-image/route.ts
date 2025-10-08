import { NextRequest, NextResponse } from 'next/server';
import { analyzeHairImage, enhanceAnalysisWithColorRecommendations } from '@/lib/image-analysis';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    if (!body.imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    if (!body.imageData.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid image data format. Expected base64 data URL' },
        { status: 400 }
      );
    }

    console.log('🔍 Processing image analysis request...');
    
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

    try {
      // Analyze the image using OpenAI Vision API
      const analysis = await analyzeHairImage(body.imageData);
      
      // Enhance with color recommendations
      const enhancedAnalysis = enhanceAnalysisWithColorRecommendations(analysis);
      
      console.log('✅ Image analysis completed successfully');
      
      return NextResponse.json({
        success: true,
        analysis: enhancedAnalysis,
        processingInfo: {
          model: 'gpt-4o-vision',
          confidence: analysis.overall_confidence,
          timestamp: new Date().toISOString()
        }
      });

    } catch (analysisError) {
      console.error('❌ Image analysis failed:', analysisError);
      
      return NextResponse.json(
        {
          error: 'Image analysis failed',
          details: analysisError instanceof Error ? analysisError.message : 'Unknown analysis error',
          suggestion: 'Please try with a clearer image showing hair clearly'
        },
        { status: 422 }
      );
    }

  } catch (error) {
    console.error('Image analysis API error:', error);
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
    message: 'Hair Image Analysis API',
    description: 'POST base64 image data to analyze hair color and style',
    requirements: {
      imageData: 'Base64 data URL (data:image/jpeg;base64,... or data:image/png;base64,...)',
      openaiApiKey: 'Required in environment variables'
    },
    example: {
      imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...'
    }
  });
}









