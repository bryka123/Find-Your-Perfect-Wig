import { NextRequest, NextResponse } from 'next/server';
import {
  performAdvancedAnalysis,
  calculateAdvancedSimilarity,
  generateMatchExplanation,
  AdvancedHairAnalysis
} from '@/lib/advanced-ai-matching';
import { VectorMatcher } from '@/lib/vectors';

export async function POST(request: NextRequest) {
  try {
    const { imageData, additionalContext, filters, limit = 6 } = await request.json();

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    console.log('🚀 Starting advanced AI matching pipeline...');

    // Step 1: Perform comprehensive AI analysis
    const analysis = await performAdvancedAnalysis(imageData, additionalContext);

    console.log('✅ Advanced analysis complete:', {
      faceShape: analysis.faceFeatures.shape,
      primaryColor: analysis.hairFeatures.primaryColor,
      skinTone: analysis.faceFeatures.skinTone.category,
      confidence: analysis.metrics.confidence
    });

    // Step 2: Get product candidates from vector store
    const vectorMatcher = VectorMatcher.getInstance();
    const stats = vectorMatcher.getStats();

    if (stats.totalVariants === 0) {
      return NextResponse.json(
        { error: 'No products in catalog. Please sync the catalog first.' },
        { status: 503 }
      );
    }

    // Create enhanced search query based on analysis
    const searchQuery = buildEnhancedSearchQuery(analysis);

    const candidates = await vectorMatcher.findSimilar({
      type: 'query',
      query: searchQuery,
      filters: {
        ...filters,
        colors: analysis.colorHarmony.bestColors.map((c: { name: string; score: number }) => c.name.split(' ')[0].toLowerCase())
      },
      limit: limit * 3 // Get more candidates for advanced filtering
    });

    // Step 3: Apply advanced similarity scoring
    const scoredMatches = candidates.map(candidate => {
      const advancedScore = calculateAdvancedSimilarity(
        analysis,
        {
          color: candidate.variant.wigAttributes.color,
          texture: candidate.variant.wigAttributes.texture,
          style: candidate.variant.wigAttributes.style,
          length: candidate.variant.wigAttributes.length,
          capConstruction: candidate.variant.wigAttributes.capConstruction,
          parting: candidate.variant.selectedOptions.find((o: { name: string; value: string }) =>
            o.name.toLowerCase().includes('part'))?.value || 'center'
        }
      );

      const explanations = generateMatchExplanation(
        analysis,
        candidate.variant.wigAttributes,
        advancedScore
      );

      return {
        ...candidate,
        score: advancedScore,
        reasons: explanations
      };
    });

    // Step 4: Sort and limit results
    scoredMatches.sort((a, b) => b.score - a.score);
    const topMatches = scoredMatches.slice(0, limit);

    // Step 5: Prepare response with rich metadata
    const response = {
      matches: topMatches,
      analysis: {
        faceShape: analysis.faceFeatures.shape,
        skinTone: analysis.faceFeatures.skinTone,
        hairAnalysis: analysis.hairFeatures,
        styleRecommendations: analysis.styleRecommendations,
        colorHarmony: analysis.colorHarmony,
        confidence: analysis.metrics.confidence
      },
      matchingMetadata: {
        totalCandidates: candidates.length,
        scoringMethod: 'advanced_ai_v2',
        averageScore: topMatches.reduce((sum, m) => sum + m.score, 0) / topMatches.length,
        processingTime: Date.now() - startTime,
        modelVersion: 'gpt-4o'
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Advanced matching error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process advanced matching',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Build an enhanced search query based on AI analysis
 */
function buildEnhancedSearchQuery(analysis: AdvancedHairAnalysis): string {
  const parts = [];

  // Add primary hair features
  parts.push(`${analysis.hairFeatures.primaryColor} ${analysis.hairFeatures.texture} wig`);

  // Add recommended styles
  if (analysis.styleRecommendations.idealLengths.length > 0) {
    parts.push(analysis.styleRecommendations.idealLengths[0]);
  }

  // Add face shape optimized features
  parts.push(`for ${analysis.faceFeatures.shape} face`);

  // Add skin tone considerations
  parts.push(`${analysis.faceFeatures.skinTone.undertone} undertone`);

  // Add quality preferences based on current hair
  if (analysis.hairFeatures.shine === 'glossy') {
    parts.push('high quality human hair');
  }

  return parts.join(' ');
}

const startTime = Date.now();