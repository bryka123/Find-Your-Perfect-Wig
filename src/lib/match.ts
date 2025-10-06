import { Variant, WigAttributes, VectorSearchResult, MatchRequest } from './types';
import { OpenAIVectorStore, VectorMatcher, generateWigDescriptor } from './vectors';
import { ColorAnalyzer } from './color';
// No external deltaE library needed - implementing our own

// Types for matching system
export interface MatchCandidate extends VectorSearchResult {
  variant?: Variant; // Full variant data when available
  colorScore?: number;
  textureScore?: number;
  availabilityScore?: number;
  popularityScore?: number;
  capFeatureScore?: number;
  totalScore?: number;
  deltaE?: number;
  isAlternativeStyle?: boolean;
}

export interface MatchTarget {
  styleType?: string;
  lengthAnyOf?: string[];
  colorFamily?: string;
  texture?: string;
  priceRange?: { min: number; max: number };
  availableOnly?: boolean;
  colorLab?: [number, number, number]; // LAB color values for deltaE
}

export interface HardFilterOptions {
  styleType?: string;
  lengthAnyOf?: string[];
  availableOnly?: boolean;
  priceRange?: { min: number; max: number };
}

export interface ScoringWeights {
  color: number;      // 0.55
  texture: number;    // 0.20  
  availability: number; // 0.10
  popularity: number;   // 0.10
  capFeature: number;   // 0.05
}

// Default scoring weights
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  color: 0.55,
  texture: 0.20,
  availability: 0.10,
  popularity: 0.10,
  capFeature: 0.05
};

// Color family mappings for alternative style detection
export const COLOR_FAMILIES = {
  blonde: ['blonde', 'platinum', 'golden'],
  brunette: ['brunette', 'brown', 'chocolate', 'chestnut'],
  black: ['black', 'jet', 'raven', 'ebony'],
  red: ['red', 'auburn', 'copper', 'ginger', 'strawberry'],
  gray: ['gray', 'grey', 'silver', 'salt', 'pepper'],
  white: ['white', 'snow', 'platinum'],
  fantasy: ['fantasy', 'rainbow', 'blue', 'pink', 'purple', 'green']
};

/**
 * Hard filter candidates by style type and length
 * Removes candidates that don't meet basic requirements
 */
export function gateByStyleLength(
  candidates: MatchCandidate[], 
  options: HardFilterOptions
): MatchCandidate[] {
  console.log(`Applying hard filters to ${candidates.length} candidates`);
  
  let filtered = candidates;

  // Filter by style type if specified
  if (options.styleType) {
    const targetStyle = options.styleType.toLowerCase();
    filtered = filtered.filter(candidate => {
      const candidateStyle = candidate.attrs?.style?.toString().toLowerCase() || 
                            candidate.descriptor?.toLowerCase() || '';
      
      // Check both exact match and style family matching
      return candidateStyle.includes(targetStyle) || 
             isStyleCompatible(candidateStyle, targetStyle);
    });
    console.log(`After style filter (${options.styleType}): ${filtered.length} candidates`);
  }

  // Filter by length if specified
  if (options.lengthAnyOf && options.lengthAnyOf.length > 0) {
    const targetLengths = options.lengthAnyOf.map(l => l.toLowerCase());
    filtered = filtered.filter(candidate => {
      const candidateLength = candidate.attrs?.length?.toString().toLowerCase() || '';
      const candidateDescriptor = candidate.descriptor?.toLowerCase() || '';
      
      return targetLengths.some(length => 
        candidateLength === length || 
        candidateDescriptor.includes(length)
      );
    });
    console.log(`After length filter (${options.lengthAnyOf.join(', ')}): ${filtered.length} candidates`);
  }

  // Filter by availability if specified
  if (options.availableOnly) {
    filtered = filtered.filter(candidate => candidate.availableForSale !== false);
    console.log(`After availability filter: ${filtered.length} candidates`);
  }

  // Filter by price range if specified
  if (options.priceRange) {
    filtered = filtered.filter(candidate => {
      const price = parseFloat(candidate.price) || 0;
      return price >= options.priceRange!.min && price <= options.priceRange!.max;
    });
    console.log(`After price filter ($${options.priceRange.min}-$${options.priceRange.max}): ${filtered.length} candidates`);
  }

  return filtered;
}

/**
 * Check if two styles are compatible (e.g., "modern" works with "professional")
 */
function isStyleCompatible(candidateStyle: string, targetStyle: string): boolean {
  const styleCompatibility: { [key: string]: string[] } = {
    'professional': ['modern', 'classic', 'formal', 'business'],
    'casual': ['trendy', 'modern', 'relaxed', 'everyday'],
    'formal': ['professional', 'classic', 'elegant', 'sophisticated'],
    'trendy': ['modern', 'fashion', 'stylish', 'contemporary'],
    'classic': ['timeless', 'traditional', 'elegant', 'professional'],
    'modern': ['contemporary', 'trendy', 'professional', 'sleek']
  };

  const compatibleStyles = styleCompatibility[targetStyle] || [];
  return compatibleStyles.some(style => candidateStyle.includes(style));
}

/**
 * Simplified CIEDE2000-like color difference calculation
 * Lower values indicate more similar colors (0 = identical, 100 = completely different)
 * This is a simplified implementation for our matching purposes
 */
export function deltaE(labA: [number, number, number], labB: [number, number, number]): number {
  const [L1, a1, b1] = labA;
  const [L2, a2, b2] = labB;
  
  // Simple Euclidean distance in LAB space (simplified deltaE)
  const deltaL = L1 - L2;
  const deltaa = a1 - a2;
  const deltab = b1 - b2;
  
  // Calculate the Euclidean distance
  const distance = Math.sqrt(deltaL * deltaL + deltaa * deltaa + deltab * deltab);
  
  // Normalize to a 0-100 scale (approximate)
  // In real LAB space, max distance is around 200, so we scale accordingly
  return Math.min(100, distance * 0.5);
}

/**
 * Score a candidate against target criteria
 * Returns score from 0-1 (1 being perfect match)
 */
export function scoreCandidate(
  candidate: MatchCandidate, 
  target: MatchTarget,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): number {
  let colorScore = 0;
  let textureScore = 0;
  let availabilityScore = 0;
  let popularityScore = 0;
  let capFeatureScore = 0;

  // Color scoring (0.55 weight)
  if (target.colorLab && candidate.attrs?.color) {
    const candidateColorLab = getColorLab(candidate.attrs.color.toString());
    if (candidateColorLab) {
      const deltaEValue = deltaE(target.colorLab, candidateColorLab);
      // Convert deltaE to 0-1 score (deltaE < 5 is excellent, > 20 is poor)
      colorScore = Math.max(0, 1 - (deltaEValue / 20));
      candidate.deltaE = deltaEValue;
    }
  } else if (target.colorFamily && candidate.attrs?.color) {
    // Fallback to color family matching
    const candidateColor = candidate.attrs.color.toString().toLowerCase();
    const targetColors = COLOR_FAMILIES[target.colorFamily as keyof typeof COLOR_FAMILIES] || [target.colorFamily];
    colorScore = targetColors.some(color => candidateColor.includes(color)) ? 1.0 : 0.3;
  }

  // Texture scoring (0.20 weight)
  if (target.texture && candidate.attrs?.texture) {
    const candidateTexture = candidate.attrs.texture.toString().toLowerCase();
    const targetTexture = target.texture.toLowerCase();
    
    if (candidateTexture === targetTexture) {
      textureScore = 1.0;
    } else {
      // Partial matches for similar textures
      const textureCompatibility: { [key: string]: string[] } = {
        'straight': ['sleek', 'smooth'],
        'wavy': ['loose', 'beach', 'tousled'],
        'curly': ['spiral', 'coiled', 'bouncy'],
        'kinky': ['tight', 'coily', 'textured']
      };
      
      const compatible = textureCompatibility[targetTexture] || [];
      textureScore = compatible.some(tex => candidateTexture.includes(tex)) ? 0.7 : 0.2;
    }
  }

  // Availability scoring (0.10 weight)
  availabilityScore = candidate.availableForSale ? 1.0 : 0.0;

  // Popularity scoring (0.10 weight) - based on existing score or price as proxy
  if (candidate.score) {
    popularityScore = Math.min(1.0, candidate.score);
  } else {
    // Use inverse price as popularity proxy (cheaper = more popular)
    const price = parseFloat(candidate.price) || 100;
    popularityScore = Math.max(0.2, Math.min(1.0, 200 / price));
  }

  // Cap feature scoring (0.05 weight) - premium construction gets higher score
  if (candidate.attrs?.capConstruction) {
    const capType = candidate.attrs.capConstruction.toString().toLowerCase();
    const capScores: { [key: string]: number } = {
      'full_lace': 1.0,
      'lace_front': 0.9,
      'monofilament': 0.8,
      'hand_tied': 0.7,
      'basic': 0.3
    };
    capFeatureScore = capScores[capType] || 0.5;
  }

  // Calculate weighted total score
  const totalScore = 
    (colorScore * weights.color) +
    (textureScore * weights.texture) +
    (availabilityScore * weights.availability) +
    (popularityScore * weights.popularity) +
    (capFeatureScore * weights.capFeature);

  // Store individual scores for debugging
  candidate.colorScore = colorScore;
  candidate.textureScore = textureScore;
  candidate.availabilityScore = availabilityScore;
  candidate.popularityScore = popularityScore;
  candidate.capFeatureScore = capFeatureScore;
  candidate.totalScore = totalScore;

  return totalScore;
}

/**
 * Get LAB color values for common wig colors
 * Returns approximate LAB values for color difference calculations
 */
function getColorLab(colorName: string): [number, number, number] | null {
  const colorLabMap: { [key: string]: [number, number, number] } = {
    // Blonde variations
    'blonde': [85, 5, 25],
    'platinum': [90, -2, 8],
    'golden': [80, 10, 35],
    'honey': [75, 15, 40],
    
    // Brunette variations  
    'brunette': [35, 10, 20],
    'brown': [40, 8, 18],
    'chocolate': [25, 8, 15],
    'chestnut': [30, 12, 22],
    
    // Black variations
    'black': [15, 0, 0],
    'jet': [10, 0, 0],
    'raven': [12, 2, 0],
    
    // Red variations
    'red': [45, 35, 25],
    'auburn': [40, 25, 20],
    'copper': [50, 30, 35],
    'ginger': [55, 25, 30],
    
    // Gray/White variations
    'gray': [60, 0, 0],
    'silver': [70, -2, 2],
    'white': [95, 0, 0],
    
    // Fantasy colors (approximated)
    'fantasy': [50, 25, 25], // Average colorful value
  };

  const normalizedColor = colorName.toLowerCase();
  
  // Direct match
  if (colorLabMap[normalizedColor]) {
    return colorLabMap[normalizedColor];
  }
  
  // Partial match
  for (const [color, lab] of Object.entries(colorLabMap)) {
    if (normalizedColor.includes(color) || color.includes(normalizedColor)) {
      return lab;
    }
  }
  
  return null;
}

/**
 * Curate top N results ensuring style diversity
 * Ensures at least one "Alternative Style" in same color family if available
 */
export function curateTopN(candidates: MatchCandidate[], n = 6): MatchCandidate[] {
  if (candidates.length === 0) return [];
  
  console.log(`Curating top ${n} from ${candidates.length} scored candidates`);
  
  // Sort by total score (descending)
  const sorted = [...candidates].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
  
  // Take initial top candidates
  const selected: MatchCandidate[] = [];
  const maxPrimary = Math.max(1, Math.floor(n * 0.75)); // Reserve 25% for alternatives
  
  // Add primary matches (top scorers)
  for (let i = 0; i < Math.min(maxPrimary, sorted.length); i++) {
    selected.push(sorted[i]);
  }
  
  // Identify color families represented in selected items
  const selectedColorFamilies = new Set<string>();
  for (const candidate of selected) {
    const colorFamily = getColorFamily(candidate.attrs?.color?.toString() || '');
    if (colorFamily) {
      selectedColorFamilies.add(colorFamily);
    }
  }
  
  // Find alternative styles in same color families
  const remaining = sorted.slice(maxPrimary);
  const alternatives: MatchCandidate[] = [];
  
  for (const candidate of remaining) {
    if (selected.length >= n) break;
    
    const candidateColorFamily = getColorFamily(candidate.attrs?.color?.toString() || '');
    const candidateStyle = candidate.attrs?.style?.toString().toLowerCase() || '';
    
    // Check if this is a different style in same color family
    if (candidateColorFamily && selectedColorFamilies.has(candidateColorFamily)) {
      const isDifferentStyle = !selected.some(selected => {
        const selectedStyle = selected.attrs?.style?.toString().toLowerCase() || '';
        return selectedStyle === candidateStyle;
      });
      
      if (isDifferentStyle) {
        candidate.isAlternativeStyle = true;
        alternatives.push(candidate);
      }
    }
  }
  
  // Add alternatives to fill remaining slots
  for (const alt of alternatives) {
    if (selected.length >= n) break;
    selected.push(alt);
  }
  
  // Fill any remaining slots with next best candidates
  for (const candidate of remaining) {
    if (selected.length >= n) break;
    if (!selected.includes(candidate)) {
      selected.push(candidate);
    }
  }
  
  console.log(`Curated ${selected.length} candidates: ${selected.filter(c => c.isAlternativeStyle).length} alternatives`);
  
  return selected.slice(0, n);
}

/**
 * Get color family for a color name
 */
function getColorFamily(colorName: string): string | null {
  const normalizedColor = colorName.toLowerCase();
  
  for (const [family, colors] of Object.entries(COLOR_FAMILIES)) {
    if (colors.some(color => normalizedColor.includes(color))) {
      return family;
    }
  }
  
  return null;
}

/**
 * Main matching pipeline: vector search → hard filters → scoring → curation
 */
export async function executeMatchingPipeline(
  request: MatchRequest,
  vectorStoreId?: string
): Promise<MatchCandidate[]> {
  console.log('Starting enhanced matching pipeline');
  
  // Step 1: Vector search to get initial candidates
  let initialCandidates: MatchCandidate[] = [];
  
  try {
    if (vectorStoreId && request.query) {
      const vectorStore = OpenAIVectorStore.getInstance();
      const vectorResults = await vectorStore.search(vectorStoreId, request.query, 50);
      initialCandidates = vectorResults.map(result => ({ ...result }));
      console.log(`Vector search found ${initialCandidates.length} initial candidates`);
    }
  } catch (error) {
    console.warn('Vector search failed, using local fallback:', error);
  }
  
  // Fallback to local VectorMatcher if OpenAI returns no results
  if (initialCandidates.length === 0) {
    console.log('Using local VectorMatcher as fallback');
    const localMatcher = VectorMatcher.getInstance();
    const localStats = localMatcher.getStats();
    console.log('Local matcher stats:', localStats);
    
    if (localStats.totalVariants > 0) {
      try {
        const localResults = await localMatcher.findSimilar(request);
        initialCandidates = localResults.map(match => ({
          id: match.variant.id,
          title: match.variant.title,
          descriptor: generateWigDescriptor(match.variant),
          attrs: {
            ...match.variant.wigAttributes,
            price: match.variant.price,
            availableForSale: match.variant.availableForSale,
            selectedOptions: match.variant.selectedOptions
          },
          score: match.score,
          price: match.variant.price,
          availableForSale: match.variant.availableForSale,
          image: match.variant.image
        }));
        console.log(`Local search found ${initialCandidates.length} candidates`);
      } catch (localError) {
        console.error('Local search also failed:', localError);
      }
    }
  }
  
  if (initialCandidates.length === 0) {
    console.log('No candidates from either vector search or local fallback');
    return [];
  }
  
  // Step 2: Apply hard filters
  const hardFilterOptions: HardFilterOptions = {
    availableOnly: request.filters?.availableOnly,
    priceRange: request.filters?.priceRange,
    // Can extend with more filter options
  };
  
  const filteredCandidates = gateByStyleLength(initialCandidates, hardFilterOptions);
  
  if (filteredCandidates.length === 0) {
    console.log('No candidates passed hard filters');
    return [];
  }
  
  // Step 3: Score candidates
  const colorAnalyzer = new ColorAnalyzer();
  let target: MatchTarget = {};
  
  // Build target from request
  if (request.selfieAttrs) {
    // Use AI analysis if available, otherwise fallback to color analyzer
    let colorAnalysis;
    if (request.aiAnalysis && request.aiAnalysis.recommendedColors) {
      console.log('🤖 Using AI analysis in matching pipeline:', request.aiAnalysis);
      colorAnalysis = request.aiAnalysis;
    } else {
      console.log('⚠️ No AI analysis in pipeline, using ColorAnalyzer fallback');
      colorAnalysis = colorAnalyzer.analyzeSelfieColors(request.selfieAttrs);
    }
    
    target.colorFamily = colorAnalysis.recommendedColors[0];
    target.colorLab = getColorLab(target.colorFamily || 'blonde');
  } else if (request.query) {
    // Extract color/texture preferences from query
    const queryLower = request.query.toLowerCase();
    
    // Extract color
    for (const [family, colors] of Object.entries(COLOR_FAMILIES)) {
      if (colors.some(color => queryLower.includes(color))) {
        target.colorFamily = family;
        target.colorLab = getColorLab(family);
        break;
      }
    }
    
    // Extract texture
    const textures = ['straight', 'wavy', 'curly', 'kinky'];
    for (const texture of textures) {
      if (queryLower.includes(texture)) {
        target.texture = texture;
        break;
      }
    }
    
    // Extract style  
    const styles = ['professional', 'casual', 'formal', 'trendy', 'classic', 'modern'];
    for (const style of styles) {
      if (queryLower.includes(style)) {
        target.styleType = style;
        break;
      }
    }
  }
  
  // Score all filtered candidates
  for (const candidate of filteredCandidates) {
    scoreCandidate(candidate, target);
  }
  
  // Step 4: Curate top results
  const limit = request.limit || 6;
  const curated = curateTopN(filteredCandidates, limit);
  
  console.log(`Matching pipeline complete: ${curated.length} final candidates`);
  return curated;
}
