/**
 * Vision-based product matching using pre-analyzed GPT-4 Vision data
 * This replaces title-based guessing with actual visual analysis
 */

import fs from 'fs';
import path from 'path';
import {
  calculateStyleCompatibility,
  detectProductStyleProfile,
  detectUserStyleProfile
} from './style-compatibility';

interface VisualAttributes {
  actualLength: 'pixie' | 'short' | 'bob' | 'shoulder' | 'medium' | 'long' | 'extra-long';
  lengthInches?: string;
  texture: 'straight' | 'wavy' | 'curly' | 'kinky' | 'mixed';
  style?: string;
  volume: 'thin' | 'medium' | 'thick' | 'very-thick';
  hasPart?: boolean;
  hasBangs: boolean;
  isLayered: boolean;
  coverage: 'full-wig' | 'topper' | 'hairpiece' | 'extension' | 'ponytail';
  faceShape?: string[];
  confidence: number;
  // Enhanced attributes (from version 2.0)
  silhouette?: 'sleek' | 'voluminous' | 'tousled' | 'spiky' | 'smooth' | 'natural' | 'edgy';
  overallStyle?: string;
  faceFraming?: 'side-swept' | 'center-parted' | 'off-center' | 'face-framing-layers' | 'none';
  partStyle?: 'center' | 'side' | 'zigzag' | 'no-part' | 'flexible';
  bangStyle?: 'side-swept' | 'straight-across' | 'wispy' | 'curtain' | 'none';
  formality?: 'casual' | 'versatile' | 'formal' | 'edgy' | 'classic';
  ageGroup?: 'youthful' | 'mature' | 'versatile';
  maintenanceLevel?: 'low' | 'medium' | 'high';
  heatFriendly?: boolean;
  hasHighlights?: boolean;
  isRooted?: boolean;
  occasions?: string[];
}

interface ProductAnalysis {
  id: string;
  title: string;
  imageUrl: string;
  colorName: string;
  visualAttributes: VisualAttributes;
  analyzedAt: string;
}

interface UserHairProfile {
  length: string;
  texture: string;
  style: string;
  hasBangs?: boolean;
  isLayered?: boolean;
}

/**
 * Load pre-analyzed vision data (with enhanced version if available)
 */
export function loadVisionAnalysis(): Record<string, ProductAnalysis> | null {
  try {
    // First try to load enhanced analysis (version 2.0)
    const enhancedPath = path.join(process.cwd(), 'product-vision-enhanced.json');
    if (fs.existsSync(enhancedPath)) {
      const enhancedData = fs.readFileSync(enhancedPath, 'utf-8');
      const enhancedParsed = JSON.parse(enhancedData);
      const enhancedProducts = enhancedParsed.products || {};

      // Also load basic analysis to fill in gaps
      const analysisPath = path.join(process.cwd(), 'product-vision-analysis.json');
      if (fs.existsSync(analysisPath)) {
        const basicData = fs.readFileSync(analysisPath, 'utf-8');
        const basicParsed = JSON.parse(basicData);
        const basicProducts = basicParsed.products || {};

        // Merge: enhanced takes priority, fall back to basic
        const merged: Record<string, ProductAnalysis> = {};

        // Add all basic products
        Object.keys(basicProducts).forEach(id => {
          merged[id] = basicProducts[id];
        });

        // Override with enhanced products (version 2.0)
        Object.keys(enhancedProducts).forEach(id => {
          merged[id] = enhancedProducts[id];
        });

        console.log(`📊 Loaded ${Object.keys(enhancedProducts).length} enhanced + ${Object.keys(basicProducts).length - Object.keys(enhancedProducts).length} basic analyses`);
        return merged;
      }

      return enhancedProducts;
    }

    // Fall back to basic analysis only
    const analysisPath = path.join(process.cwd(), 'product-vision-analysis.json');
    if (!fs.existsSync(analysisPath)) {
      console.log('⚠️ No vision analysis file found. Run analyze-products-with-vision.ts first.');
      return null;
    }

    const data = fs.readFileSync(analysisPath, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.products || {};
  } catch (error) {
    console.error('Error loading vision analysis:', error);
    return null;
  }
}

/**
 * Calculate style match score using actual visual attributes
 */
export function calculateVisionBasedScore(
  productAnalysis: ProductAnalysis,
  userProfile: UserHairProfile
): number {
  const attrs = productAnalysis.visualAttributes;
  let score = 0;

  // Debug logging for problematic products
  const isProblematic = productAnalysis.title.toLowerCase().includes('tango') ||
                       productAnalysis.title.toLowerCase().includes('salsa');

  if (isProblematic) {
    console.log(`\n🔍 DEBUGGING ${productAnalysis.title}:`);
    console.log(`   User: ${userProfile.length} ${userProfile.texture}`);
    console.log(`   Product: ${attrs.actualLength} ${attrs.texture} ${attrs.coverage}`);
  }

  // 1. COVERAGE TYPE (20% weight) - Reduced to prioritize length
  const coverageScore = calculateCoverageScore(attrs.coverage, userProfile.length);
  score = coverageScore * 0.20;

  // Early exit for non-wigs with very low scores
  if (coverageScore <= 0.1) {
    return coverageScore; // Don't bother calculating other factors for extensions/ponytails
  }

  // 2. LENGTH MATCHING (50% weight) - MASSIVELY INCREASED - Most critical factor
  const lengthScore = calculateLengthScore(attrs.actualLength, userProfile.length);
  score += lengthScore * 0.50;

  // Early exit if length is severely mismatched
  if (lengthScore <= 0.05) {
    return score; // Don't bother with other factors if length is way off
  }

  // 3. TEXTURE MATCHING (15% weight) - Reduced
  const textureScore = calculateTextureScore(attrs.texture, userProfile.texture);
  score += textureScore * 0.15;

  // 4. STYLE COMPATIBILITY (15% weight) - Use enhanced attributes if available
  let styleCompatScore = 0.5; // Default if no enhanced attributes

  if (attrs.silhouette && attrs.formality) {
    // Use enhanced attributes directly
    const userStyleProfile = detectUserStyleProfile(userProfile);
    const productStyleProfile = {
      silhouette: attrs.silhouette,
      formality: attrs.formality,
      maintenance: attrs.maintenanceLevel || 'medium' as any,
      ageGroup: attrs.ageGroup || 'versatile'
    };
    styleCompatScore = calculateStyleCompatibility(userStyleProfile, productStyleProfile);
  } else {
    // Fall back to detection from basic attributes
    const userStyleProfile = detectUserStyleProfile(userProfile);
    const productStyleProfile = detectProductStyleProfile(attrs);
    styleCompatScore = calculateStyleCompatibility(userStyleProfile, productStyleProfile);
  }

  score += styleCompatScore * 0.15;

  // 5. DETAIL FEATURES (5% weight) - Reduced - Bangs, layers, etc.
  let detailScore = 0.5;

  // Bangs matching
  if (userProfile.hasBangs !== undefined && attrs.hasBangs !== undefined) {
    if (userProfile.hasBangs === attrs.hasBangs) {
      detailScore += 0.3;
    } else if (userProfile.hasBangs && !attrs.hasBangs) {
      detailScore -= 0.2; // Penalty if user has bangs but wig doesn't
    }
  }

  // Layers matching
  if (userProfile.isLayered !== undefined && attrs.isLayered !== undefined) {
    if (userProfile.isLayered === attrs.isLayered) {
      detailScore += 0.2;
    }
  }

  score += Math.max(0, Math.min(1, detailScore)) * 0.05;

  // Apply confidence factor from vision analysis (less aggressive scaling)
  score *= (0.85 + attrs.confidence * 0.15); // Scale by confidence (85-100%)

  // Special penalties for extreme style mismatches
  const userStyle = userProfile.style?.toLowerCase() || '';
  const productStyle = attrs.overallStyle?.toLowerCase() || attrs.style?.toLowerCase() || '';

  // Enhanced silhouette-based penalties (if available)
  if (attrs.silhouette) {
    // Severe penalty for spiky/edgy silhouettes on smooth/sleek hair
    if ((userStyle.includes('smooth') || userStyle.includes('sleek') || userStyle.includes('straight')) &&
        (attrs.silhouette === 'spiky' || attrs.silhouette === 'edgy')) {
      score *= 0.2; // 80% penalty for extreme mismatch
      console.log('⚠️ Severe style mismatch: smooth user vs', attrs.silhouette, 'product');
    }

    // Penalty for voluminous styles on sleek hair users
    if ((userStyle.includes('sleek') || userStyle.includes('flat')) &&
        attrs.silhouette === 'voluminous') {
      score *= 0.5; // 50% penalty
    }
  } else {
    // Fall back to text-based detection
    if ((userStyle.includes('smooth') || userStyle.includes('sleek') || userStyle.includes('straight')) &&
        (productStyle.includes('spiky') || productStyle.includes('punk') || productStyle.includes('edgy'))) {
      score *= 0.3; // 70% penalty
      console.log('⚠️ Style mismatch penalty: smooth user vs spiky product');
    }
  }

  // Formality-based penalties (if enhanced attributes available)
  if (attrs.formality) {
    if ((userStyle.includes('casual') || userStyle.includes('beach')) &&
        attrs.formality === 'formal') {
      score *= 0.5; // 50% penalty
    }
    if ((userStyle.includes('professional') || userStyle.includes('business')) &&
        attrs.formality === 'edgy') {
      score *= 0.4; // 60% penalty
    }
  } else {
    // Fall back to text-based detection
    if ((userStyle.includes('casual') || userStyle.includes('beach')) &&
        (productStyle.includes('elegant') || productStyle.includes('formal'))) {
      score *= 0.6; // 40% penalty
    }
  }

  const finalScore = Math.max(0.05, Math.min(1.0, score));

  if (isProblematic) {
    console.log(`   ✅ FINAL Score: ${(finalScore * 100).toFixed(1)}%`);
    console.log(`   Components: Length=${(lengthScore * 100).toFixed(0)}%, Style=${(styleCompatScore * 100).toFixed(0)}%, Texture=${(textureScore * 100).toFixed(0)}%`);
  }

  return finalScore;
}

/**
 * Calculate length match score with proper penalties
 */
function calculateLengthScore(productLength: string, userLength: string): number {
  const lengthMap: Record<string, number> = {
    'pixie': 1,
    'short': 2,
    'bob': 3,
    'shoulder': 4,
    'medium': 5,
    'long': 6,
    'extra-long': 7
  };

  const userLengthNorm = userLength.toLowerCase().replace('-', '');
  const userValue = lengthMap[userLengthNorm] || lengthMap['medium'];
  const productValue = lengthMap[productLength] || lengthMap['medium'];

  const difference = Math.abs(userValue - productValue);

  console.log(`   🔢 LENGTH CALC: User="${userLength}"(${userValue}) vs Product="${productLength}"(${productValue}) = diff ${difference}`);

  // EXTREMELY STRICT penalties for length mismatches
  let score: number;
  switch (difference) {
    case 0: score = 1.0; break;     // Perfect match only
    case 1: score = 0.05; break;    // One level off - ELIMINATED (bob vs shoulder is WRONG)
    case 2: score = 0.02; break;    // Two levels off - effectively eliminated
    case 3: score = 0.01; break;    // Three levels off - effectively zero
    default: score = 0.001; break;  // Completely eliminated
  }

  console.log(`   ➡️ LENGTH SCORE: ${(score * 100).toFixed(1)}%`);
  return score;
}

/**
 * Calculate texture match score
 */
function calculateTextureScore(productTexture: string, userTexture: string): number {
  const userTextureNorm = userTexture.toLowerCase();
  const productTextureNorm = productTexture.toLowerCase();

  // Exact match
  if (productTextureNorm === userTextureNorm) return 1.0;

  // Compatible textures
  const compatibility: Record<string, Record<string, number>> = {
    'straight': { 'straight': 1.0, 'wavy': 0.3, 'curly': 0.1, 'kinky': 0.05, 'mixed': 0.5 },
    'wavy': { 'straight': 0.4, 'wavy': 1.0, 'curly': 0.6, 'kinky': 0.3, 'mixed': 0.7 },
    'curly': { 'straight': 0.1, 'wavy': 0.6, 'curly': 1.0, 'kinky': 0.7, 'mixed': 0.7 },
    'kinky': { 'straight': 0.05, 'wavy': 0.3, 'curly': 0.7, 'kinky': 1.0, 'mixed': 0.6 }
  };

  return compatibility[userTextureNorm]?.[productTextureNorm] || 0.3;
}

/**
 * Calculate coverage score - heavily penalize non-wigs for full wig searches
 */
function calculateCoverageScore(coverage: string, userLength: string): number {
  const coverageLower = coverage?.toLowerCase() || '';

  // For users looking for full coverage (based on their hair length)
  if (coverageLower === 'full-wig' || coverageLower === 'wig') {
    return 1.0; // Perfect for all users
  }

  if (coverageLower === 'topper' || coverageLower === 'hairpiece' ||
      coverageLower.includes('top')) {
    // Only good for users with thinning hair, not full replacement
    // Very low score for users with defined hair length
    return 0.08; // Even lower than before
  }

  if (coverageLower === 'extension' || coverageLower === 'ponytail' ||
      coverageLower.includes('pony') || coverageLower.includes('clip')) {
    // Extensions/ponytails are add-ons, not replacements
    // Extremely low score for users looking for wigs
    return 0.03; // Even more severe penalty
  }

  // Unknown coverage type
  return 0.3; // Lower default
}

/**
 * Get products with vision-based matching
 */
export async function getProductsWithVisionMatching(
  userProfile: UserHairProfile,
  colorMatches: any[]
): Promise<any[]> {
  console.log('🎯 Using Vision-Based Matching');

  // Load vision analysis data
  const visionData = loadVisionAnalysis();

  if (!visionData) {
    console.log('⚠️ Vision analysis not available, falling back to title-based matching');
    return [];
  }

  // Load product catalog
  const catalogPath = path.join(process.cwd(), 'valid_image_catalog.json');
  const catalogData = fs.readFileSync(catalogPath, 'utf-8');
  const catalog = JSON.parse(catalogData);
  const allProducts = catalog.products || [];

  console.log(`📊 Found ${Object.keys(visionData).length} products with vision analysis`);

  // Score all products that have vision analysis
  const scoredProducts = allProducts
    .filter((product: any) => visionData[product.id])
    .map((product: any) => {
      const analysis = visionData[product.id];
      const visionScore = calculateVisionBasedScore(analysis, userProfile);

      // Check color availability
      let colorAvailable = false;
      let matchedColor = null;

      for (const colorMatch of colorMatches) {
        if (product.colorName) {
          const productColorName = product.colorName.toLowerCase();
          const matchColorCode = colorMatch.colorCode.toLowerCase();

          if (productColorName.includes(matchColorCode) ||
              productColorName.includes(colorMatch.colorName.toLowerCase())) {
            colorAvailable = true;
            matchedColor = colorMatch;
            break;
          }
        }
      }

      return {
        ...product,
        visionScore,
        visualAttributes: analysis.visualAttributes,
        colorAvailable,
        matchedColorCode: matchedColor?.colorCode || '',
        matchedColorName: matchedColor?.colorName || '',
        colorMatchScore: matchedColor?.visualSimilarity || 0
      };
    });

  // Sort by vision score
  scoredProducts.sort((a, b) => b.visionScore - a.visionScore);

  console.log('\n📊 TOP PRODUCTS BY VISION ANALYSIS:');
  scoredProducts.slice(0, 10).forEach((p, i) => {
    const attrs = p.visualAttributes;
    const silhouetteInfo = attrs.silhouette ? ` | Silhouette: ${attrs.silhouette}` : '';
    const formalityInfo = attrs.formality ? ` | Formality: ${attrs.formality}` : '';
    console.log(`   ${i+1}. ${p.title}`);
    console.log(`      Vision: ${(p.visionScore * 100).toFixed(0)}% | Length: ${attrs.actualLength} | Texture: ${attrs.texture} | Type: ${attrs.coverage}${silhouetteInfo}${formalityInfo}`);
    console.log(`      Color available: ${p.colorAvailable ? 'Yes' : 'No'}`);
  });

  // Filter to products available in user's color
  const availableProducts = scoredProducts.filter(p => p.colorAvailable);

  console.log(`\n✅ Found ${availableProducts.length} products available in user's color`);

  return availableProducts;
}