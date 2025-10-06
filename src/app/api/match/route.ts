import { NextRequest, NextResponse } from 'next/server';
import { VectorMatcher } from '@/lib/vectors';
import { ColorAnalyzer } from '@/lib/color';
import { executeMatchingPipeline, MatchCandidate } from '@/lib/match';
import { MatchRequest, MatchResponse, VariantMatch } from '@/lib/types';
import { analyzeHairImage, analysisToSelfieAttributes, enhanceAnalysisWithColorRecommendations } from '@/lib/image-analysis';

export async function POST(request: NextRequest) {
  try {
    const body: MatchRequest = await request.json();
    
    // Validate request
    if (!body.type || (body.type !== 'query' && body.type !== 'selfie')) {
      return NextResponse.json(
        { error: 'Invalid request type. Must be "query" or "selfie"' },
        { status: 400 }
      );
    }

    if (body.type === 'query' && !body.query) {
      return NextResponse.json(
        { error: 'Query is required for query-based matching' },
        { status: 400 }
      );
    }

    if (body.type === 'selfie' && !body.selfieAttrs) {
      return NextResponse.json(
        { error: 'Selfie attributes are required for selfie-based matching' },
        { status: 400 }
      );
    }

    const vectorMatcher = VectorMatcher.getInstance();
    const colorAnalyzer = new ColorAnalyzer();
    
    // Check if we have any variants in the index
    const stats = vectorMatcher.getStats();
    console.log('Vector matcher stats:', stats);
    
    if (stats.totalVariants === 0) {
      return NextResponse.json(
        { 
          error: 'No products in catalog. Please sync the catalog first.',
          suggestion: 'Load data using: POST /api/ingest with your JSONL file',
          currentStats: stats
        },
        { status: 503 }
      );
    }

    let enhancedRequest = { ...body };
    let colorAnalysis: any = null;

    // If selfie-based matching, use AI analysis if available, otherwise fallback to color analyzer
    if (body.type === 'selfie' && body.selfieAttrs) {
      // Check if we already have AI analysis results (from frontend)
      if (body.aiAnalysis) {
        console.log('🤖 Using AI analysis from frontend:', body.aiAnalysis);
        colorAnalysis = body.aiAnalysis;
      } else {
        console.log('⚠️ No AI analysis found, using fallback ColorAnalyzer');
        colorAnalysis = colorAnalyzer.analyzeSelfieColors(body.selfieAttrs);
      }
      
      // Enhance filters with color recommendations
      if (!enhancedRequest.filters) {
        enhancedRequest.filters = {};
      }
      
      // Add recommended colors to filters if not already specified
      if (!enhancedRequest.filters.colors && colorAnalysis.recommendedColors && colorAnalysis.recommendedColors.length > 0) {
        enhancedRequest.filters.colors = colorAnalysis.recommendedColors;
        console.log('🎨 Using color recommendations:', colorAnalysis.recommendedColors);
      }
    }

    // If query-based, extract color preferences from query
    if (body.type === 'query' && body.query) {
      const queryColors = colorAnalyzer.getColorRecommendations(body.query);
      if (queryColors.length > 0 && !enhancedRequest.filters?.colors) {
        if (!enhancedRequest.filters) enhancedRequest.filters = {};
        enhancedRequest.filters.colors = queryColors;
      }
    }

    // Set default limit
    const limit = body.limit || 6;
    enhancedRequest.limit = limit;

    console.log('Processing enhanced match request:', {
      type: body.type,
      query: body.query,
      selfieAttrs: body.selfieAttrs ? 'provided' : 'none',
      filters: enhancedRequest.filters,
      limit
    });

    // Use enhanced matching pipeline with vector search → filters → scoring → curation
    const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;
    let enhancedMatches: MatchCandidate[] = [];
    
    if (vectorStoreId) {
      console.log('Using enhanced matching pipeline with OpenAI Vector Store');
      try {
        enhancedMatches = await executeMatchingPipeline(enhancedRequest, vectorStoreId);
      } catch (pipelineError) {
        console.warn('Enhanced pipeline failed, falling back to legacy matching:', pipelineError);
        // Fall back to legacy matching
        const legacyMatches = await vectorMatcher.findSimilar(enhancedRequest);
        enhancedMatches = legacyMatches.map(match => ({
          ...match.variant,
          score: match.score,
          reasons: match.reasons,
          totalScore: match.score
        }));
      }
    } else {
      console.log('No vector store configured, using legacy matching');
      // Fall back to legacy matching
      const legacyMatches = await vectorMatcher.findSimilar(enhancedRequest);
      enhancedMatches = legacyMatches.map(match => ({
        ...match.variant,
        score: match.score,
        reasons: match.reasons,
        totalScore: match.score
      }));
    }

    // Convert enhanced matches to legacy format
    const matches: VariantMatch[] = enhancedMatches.map(candidate => ({
      variant: {
        id: candidate.id,
        productId: candidate.attrs?.productId?.toString() || candidate.id,
        title: candidate.title,
        price: candidate.price,
        compareAtPrice: candidate.compareAtPrice,
        availableForSale: candidate.availableForSale,
        image: candidate.image,
        selectedOptions: candidate.attrs?.selectedOptions as any[] || [],
        wigAttributes: {
          length: candidate.attrs?.length?.toString() as any || 'medium',
          texture: candidate.attrs?.texture?.toString() as any || 'straight',
          color: candidate.attrs?.color?.toString() as any || 'brunette',
          capSize: candidate.attrs?.capSize?.toString() as any || 'average',
          capConstruction: candidate.attrs?.capConstruction?.toString() as any || 'basic',
          density: candidate.attrs?.density?.toString() as any || 'medium',
          hairType: candidate.attrs?.hairType?.toString() as any || 'synthetic',
          style: candidate.attrs?.style?.toString() as any || 'classic'
        }
      },
      score: candidate.totalScore || candidate.score || 0,
      reasons: generateEnhancedReasons(candidate)
    }));
    
    // Prepare response
    const response: MatchResponse = {
      matches,
      query: body.type === 'query' ? body.query! : 'Selfie-based matching',
      filters: enhancedRequest.filters,
      total: matches.length
    };

    // Add color analysis data if it was performed
    if (colorAnalysis) {
      (response as any).colorAnalysis = {
        season: colorAnalysis.season,
        confidence: colorAnalysis.confidence,
        recommendedColors: colorAnalysis.recommendedColors,
        reasons: colorAnalysis.reasons
      };
    }

    console.log(`Enhanced matching returned ${matches.length} matches`);

    // Add enhanced matching metadata to response
    const enhancedResponse = {
      ...response,
      enhancedMatching: {
        enabled: !!vectorStoreId,
        pipeline: vectorStoreId ? 'vector_search_enhanced' : 'legacy_matching',
        alternativeStyles: matches.filter((_, i) => enhancedMatches[i]?.isAlternativeStyle).length,
        avgScore: matches.length > 0 ? matches.reduce((sum, m) => sum + m.score, 0) / matches.length : 0,
        scoringBreakdown: enhancedMatches.length > 0 ? {
          colorWeight: 0.55,
          textureWeight: 0.20,
          availabilityWeight: 0.10,
          popularityWeight: 0.10,
          capFeatureWeight: 0.05
        } : undefined
      }
    };

    return NextResponse.json(enhancedResponse);

  } catch (error) {
    console.error('Match request error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing - returns some sample matches
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || 'blonde curly wig';
    const limit = parseInt(searchParams.get('limit') || '6');

    const matchRequest: MatchRequest = {
      type: 'query',
      query,
      limit
    };

    // Reuse the POST logic
    const response = await POST(new NextRequest(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(matchRequest)
    }));

    return response;

  } catch (error) {
    console.error('GET match request error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Additional endpoint for advanced filtering
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { matchIds, additionalFilters } = body;

    if (!matchIds || !Array.isArray(matchIds)) {
      return NextResponse.json(
        { error: 'Match IDs array is required' },
        { status: 400 }
      );
    }

    const vectorMatcher = VectorMatcher.getInstance();
    
    // Get the specific variants and apply additional filtering
    const filteredMatches = [];
    
    for (const matchId of matchIds) {
      // In a real implementation, you'd have stored match results
      // For now, this is a placeholder for additional filtering logic
      console.log(`Applying additional filters to match ${matchId}:`, additionalFilters);
    }

    return NextResponse.json({
      success: true,
      filteredMatches,
      appliedFilters: additionalFilters
    });

  } catch (error) {
    console.error('Filter request error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Generate enhanced reasons based on scoring breakdown
 */
function generateEnhancedReasons(candidate: MatchCandidate): string[] {
  const reasons: string[] = [];
  
  // Color matching reasons
  if (candidate.colorScore !== undefined) {
    if (candidate.colorScore > 0.8) {
      if (candidate.deltaE !== undefined && candidate.deltaE < 5) {
        reasons.push(`Excellent color match (ΔE: ${candidate.deltaE.toFixed(1)})`);
      } else {
        reasons.push('Great color match for your preferences');
      }
    } else if (candidate.colorScore > 0.5) {
      reasons.push('Good color compatibility');
    }
  }
  
  // Texture matching reasons
  if (candidate.textureScore !== undefined && candidate.textureScore > 0.7) {
    reasons.push('Perfect texture match');
  }
  
  // Availability reasons
  if (candidate.availabilityScore === 1.0) {
    reasons.push('Currently available');
  }
  
  // Cap feature reasons
  if (candidate.capFeatureScore !== undefined && candidate.capFeatureScore > 0.7) {
    const capType = candidate.attrs?.capConstruction?.toString() || '';
    if (capType.includes('lace')) {
      reasons.push('Premium lace construction for natural appearance');
    } else if (capType.includes('monofilament')) {
      reasons.push('Monofilament cap for realistic scalp appearance');
    } else if (capType.includes('hand_tied')) {
      reasons.push('Hand-tied construction for ultimate comfort');
    }
  }
  
  // Alternative style indication
  if (candidate.isAlternativeStyle) {
    reasons.push('Alternative style option in your preferred color');
  }
  
  // Overall score indication
  if (candidate.totalScore !== undefined && candidate.totalScore > 0.8) {
    reasons.push('Top-rated match based on your preferences');
  }
  
  // Fallback if no specific reasons
  if (reasons.length === 0) {
    reasons.push('Good overall match for your requirements');
  }
  
  return reasons;
}
