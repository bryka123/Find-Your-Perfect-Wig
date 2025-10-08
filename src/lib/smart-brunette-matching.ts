import * as fs from 'fs';

/**
 * Smart Brunette Matching System
 * 
 * Finds appropriate brunette shades based on lightness and undertone analysis
 * Avoids dark chocolate/espresso for medium brown hair
 */

export interface BrunetteAnalysis {
  lightness: 'light' | 'medium' | 'dark';
  undertone: 'warm' | 'cool' | 'neutral';
  hasHighlights: boolean;
  labL: number; // Lightness value
}

export interface SmartBrunetteMatch {
  id: string;
  title: string;
  colorName: string;
  price: string;
  matchScore: number;
  reasons: string[];
  lightnessMatch: string;
  undertoneMatch: string;
  image?: {
    url: string;
    altText: string;
  };
}

/**
 * Analyze brunette hair characteristics for better matching
 */
export function analyzeBrunetteCharacteristics(analysis: any): BrunetteAnalysis {
  const labL = analysis.palette_lab?.[0]?.L || 50;
  const undertone = analysis.color?.undertone || 'neutral';
  const highlights = analysis.color?.highlights !== 'None';
  
  let lightness: 'light' | 'medium' | 'dark';
  if (labL > 70) lightness = 'light';
  else if (labL > 40) lightness = 'medium';  
  else lightness = 'dark';
  
  return {
    lightness,
    undertone: undertone.toLowerCase() as any,
    hasHighlights: highlights,
    labL
  };
}

/**
 * Find better brunette matches based on hair characteristics
 */
export function findSmartBrunetteMatches(
  userCharacteristics: BrunetteAnalysis,
  maxResults: number = 6
): SmartBrunetteMatch[] {
  console.log(`🎨 Finding smart brunette matches for ${userCharacteristics.lightness} ${userCharacteristics.undertone} hair (L=${userCharacteristics.labL})`);
  
  // Load brunette chunk
  const chunkPath = './dynamic_chunks/brunette_position1.json';
  
  if (!fs.existsSync(chunkPath)) {
    console.error('❌ Brunette chunk not found');
    return [];
  }
  
  const chunkData = JSON.parse(fs.readFileSync(chunkPath, 'utf-8'));
  const brunettes = chunkData.products || [];
  
  console.log(`📂 Analyzing ${brunettes.length} brunette options...`);
  
  // Filter and score brunettes based on compatibility
  const scoredMatches = brunettes
    .filter((product: any) => product.attrs?.availableForSale)
    .map((product: any) => {
      const colorName = product.colorName?.toLowerCase() || '';
      
      // Score based on lightness compatibility
      let lightnessScore = 0;
      if (userCharacteristics.lightness === 'medium') {
        // For medium brown hair, avoid very dark colors
        if (colorName.includes('dark') || colorName.includes('espresso') || colorName.includes('ebony')) {
          lightnessScore = 0.3; // Too dark
        } else if (colorName.includes('medium') || colorName.includes('caramel') || colorName.includes('honey')) {
          lightnessScore = 1.0; // Perfect
        } else if (colorName.includes('light') || colorName.includes('golden')) {
          lightnessScore = 0.8; // Good
        } else {
          lightnessScore = 0.6; // Neutral
        }
      }
      
      // Score based on undertone compatibility  
      let undertoneScore = 0.7; // Default
      if (userCharacteristics.undertone === 'warm') {
        if (colorName.includes('caramel') || colorName.includes('honey') || colorName.includes('golden') || colorName.includes('auburn')) {
          undertoneScore = 1.0; // Perfect warm match
        } else if (colorName.includes('ash') || colorName.includes('cool')) {
          undertoneScore = 0.4; // Poor warm match
        }
      }
      
      // Bonus for highlights compatibility
      let highlightScore = 0.7;
      if (userCharacteristics.hasHighlights) {
        if (colorName.includes('highlight') || colorName.includes('rooted') || colorName.includes('mix')) {
          highlightScore = 1.0;
        }
      }
      
      const totalScore = (lightnessScore * 0.5) + (undertoneScore * 0.3) + (highlightScore * 0.2);
      
      return {
        product,
        score: totalScore,
        lightnessScore,
        undertoneScore,
        highlightScore
      };
    })
    .sort((a, b) => b.score - a.score) // Sort by best matches first
    .slice(0, maxResults);
  
  // Convert to match format
  const smartMatches: SmartBrunetteMatch[] = scoredMatches.map((item, index) => {
    const product = item.product;
    
    return {
      id: product.id,
      title: product.title,
      colorName: product.colorName,
      price: product.price,
      matchScore: item.score,
      reasons: [
        `Smart brunette match: ${userCharacteristics.lightness} ${userCharacteristics.undertone} compatibility`,
        `${product.colorName} offers ideal tones for medium brown hair with highlights`,
        `Lightness compatibility: ${item.lightnessScore > 0.8 ? 'excellent' : item.lightnessScore > 0.6 ? 'good' : 'acceptable'}`,
        `Undertone harmony: ${item.undertoneScore > 0.8 ? 'excellent' : item.undertoneScore > 0.6 ? 'good' : 'acceptable'} for warm hair`
      ],
      lightnessMatch: item.lightnessScore > 0.8 ? 'excellent' : item.lightnessScore > 0.6 ? 'good' : 'needs improvement',
      undertoneMatch: item.undertoneScore > 0.8 ? 'excellent' : item.undertoneScore > 0.6 ? 'good' : 'needs improvement',
      image: product.image ? {
        url: product.image.url,
        altText: product.image.altText || `${product.title} - Position 1 Front View`
      } : undefined
    };
  });
  
  console.log('\n🎯 Smart Brunette Matching Results:');
  smartMatches.slice(0, 3).forEach((match, i) => {
    console.log(`  ${i + 1}. ${match.title} (${Math.round(match.matchScore * 100)}%)`);
    console.log(`     Color: ${match.colorName}`);
    console.log(`     Lightness: ${match.lightnessMatch}`);
    console.log(`     Undertone: ${match.undertoneMatch}`);
  });
  
  return smartMatches;
}









