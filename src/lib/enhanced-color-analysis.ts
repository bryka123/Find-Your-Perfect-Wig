/**
 * Enhanced Color Analysis System
 * 
 * Provides detailed analysis of hair color including rooted, highlighted, and dimensional coloring
 * Ensures accurate color chip matching
 */

import OpenAI from 'openai';

export interface DetailedColorAnalysis {
  // Primary color characteristics
  primaryFamily: 'blonde' | 'brunette' | 'black' | 'red' | 'gray' | 'white';
  baseColor: string; // e.g., "medium blonde", "dark brown"
  
  // Dimensional coloring
  isRooted: boolean;
  hasHighlights: boolean;
  hasLowlights: boolean;
  isOmbre: boolean;
  isBalayage: boolean;
  
  // Detailed color breakdown
  rootColor?: string; // Color at the roots
  midColor?: string;  // Color at mid-lengths
  endColor?: string;  // Color at the ends
  
  // Undertones and characteristics
  undertone: 'warm' | 'cool' | 'neutral';
  lightness: number; // 1-10 scale (1=very dark, 10=very light)
  saturation: number; // 1-10 scale (1=muted, 10=vibrant)
  
  // Color matching guidance
  bestMatchColors: string[]; // Specific color names to search for
  avoidColors: string[]; // Colors to avoid
  
  // Confidence and notes
  confidence: number;
  analysisNotes: string;
}

/**
 * Initialize OpenAI client
 */
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  return new OpenAI({ apiKey });
}

/**
 * Perform detailed color analysis of hair image
 */
export async function analyzeHairColorDetailed(imageData: string): Promise<DetailedColorAnalysis> {
  console.log('🎨 Performing detailed hair color analysis...');
  
  const openai = getOpenAIClient();
  
  const colorAnalysisPrompt = `You are a professional hair colorist analyzing this hair image. Be extremely precise about color classification.

CRITICAL INSTRUCTIONS FOR WIG COLOR DETECTION:
1. Look at the MID-LENGTHS and ENDS to determine primary color family, NOT the roots
2. ROOTED BLONDE = Still classify as "blonde" (darker roots are intentional styling)
3. If 60%+ of the hair (mid to ends) is light/blonde → classify as "blonde"
4. If 60%+ of the hair (mid to ends) is brown → classify as "brunette"
5. Common rooted blonde patterns to recognize:
   - Dark brown/medium brown roots with blonde lengths = BLONDE
   - Shadow roots with light ends = BLONDE
   - Dimensional blonde with lowlights = BLONDE

Analyze this hair image and return ONLY a JSON object:

{
  "primaryFamily": "blonde/brunette/black/red/gray/white",
  "baseColor": "specific color description (e.g., 'medium blonde', 'light brown')",
  "isRooted": true/false,
  "hasHighlights": true/false, 
  "hasLowlights": true/false,
  "isOmbre": true/false,
  "isBalayage": true/false,
  "rootColor": "color at roots (if rooted)",
  "midColor": "color at mid-lengths", 
  "endColor": "color at ends",
  "undertone": "warm/cool/neutral",
  "lightness": 1-10,
  "saturation": 1-10,
  "bestMatchColors": ["list of 3-5 specific color names to search for"],
  "avoidColors": ["colors that would NOT match"],
  "confidence": 0.0-1.0,
  "analysisNotes": "detailed explanation of the coloring"
}

EXAMPLES OF CORRECT CLASSIFICATION:
- Rooted blonde (dark roots, blonde lengths) → "blonde" PRIMARY
- Venice blonde with shadow roots → "blonde" PRIMARY
- Light ends with brown roots → "blonde" PRIMARY
- All-over medium brown → "brunette" PRIMARY
- Brown with blonde highlights → "brunette" PRIMARY (brown is dominant)
- Platinum with dark roots → "blonde" PRIMARY

FOCUS ON DIMENSIONAL COLORING:
- Rooted: Darker color at roots (BUT STILL CLASSIFY BY END COLOR)
- Highlights: Lighter streaks throughout
- Balayage: Hand-painted lighter pieces
- Ombre: Gradual dark-to-light transition

REMEMBER: For wigs, the COLOR NAME reflects the ENDS, not the roots!
Example: "22F16S8 Venice Blonde" = BLONDE despite brown roots
"Rooted Blonde" = BLONDE category
"Shadow Blonde" = BLONDE category`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: colorAnalysisPrompt },
            { type: "image_url", image_url: { url: imageData, detail: "high" } }
          ]
        }
      ],
      max_tokens: 800,
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No color analysis response');
    }

    // Parse JSON response
    let analysis: DetailedColorAnalysis;
    try {
      const cleanJson = content.replace(/```json\n?|\n?```/g, '').trim();
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse color analysis:', content);
      console.log('Using intelligent fallback based on common hair patterns');
      
      // Intelligent fallback - analyze what we can from the response
      let primaryFamily = 'blonde'; // Default to blonde for rooted styles

      // Check for specific color mentions in order of priority
      const contentLower = content.toLowerCase();

      // Look for blonde indicators first (most common for rooted wigs)
      if (contentLower.includes('blonde') ||
          contentLower.includes('blond') ||
          contentLower.includes('light') && contentLower.includes('end') ||
          contentLower.includes('golden') ||
          contentLower.includes('platinum') ||
          contentLower.includes('venice')) {
        primaryFamily = 'blonde';
      } else if (contentLower.includes('brunette') ||
                 (contentLower.includes('brown') && !contentLower.includes('root'))) {
        primaryFamily = 'brunette';
      } else if (contentLower.includes('black') && !contentLower.includes('root')) {
        primaryFamily = 'black';
      } else if (contentLower.includes('red') || contentLower.includes('auburn')) {
        primaryFamily = 'red';
      }
      
      analysis = {
        primaryFamily: primaryFamily as any,
        baseColor: `medium ${primaryFamily}`,
        isRooted: content.toLowerCase().includes('root') || content.toLowerCase().includes('dimension'),
        hasHighlights: content.toLowerCase().includes('highlight'),
        hasLowlights: false,
        isOmbre: content.toLowerCase().includes('ombre'),
        isBalayage: content.toLowerCase().includes('balayage'),
        rootColor: primaryFamily === 'blonde' ? 'dark blonde' : 'dark brown',
        midColor: `medium ${primaryFamily}`,
        endColor: primaryFamily === 'blonde' ? 'light blonde' : 'medium brown',
        undertone: 'warm',
        lightness: primaryFamily === 'blonde' ? 7 : 4,
        saturation: 6,
        bestMatchColors: primaryFamily === 'blonde' 
          ? ['blonde', 'golden blonde', 'honey blonde', 'rooted blonde']
          : ['brown', 'brunette', 'chestnut', 'chocolate'],
        avoidColors: primaryFamily === 'blonde'
          ? ['brown', 'brunette', 'chestnut', 'chocolate']
          : ['blonde', 'golden', 'honey', 'platinum'],
        confidence: 0.7,
        analysisNotes: `Fallback analysis detected ${primaryFamily} hair with ${content.toLowerCase().includes('root') ? 'rooted' : 'uniform'} coloring`
      };
    }

    console.log('✅ Detailed color analysis complete:');
    console.log(`   Primary Family: ${analysis.primaryFamily}`);
    console.log(`   Base Color: ${analysis.baseColor}`);
    console.log(`   Rooted: ${analysis.isRooted ? 'Yes' : 'No'}`);
    console.log(`   Highlights: ${analysis.hasHighlights ? 'Yes' : 'No'}`);
    console.log(`   Lightness: ${analysis.lightness}/10`);
    console.log(`   Best Match Colors: ${analysis.bestMatchColors.join(', ')}`);

    return analysis;

  } catch (error) {
    console.error('❌ Color analysis error:', error);
    throw error;
  }
}

/**
 * Get products matching the detailed color analysis
 */
export async function getColorMatchedProducts(
  analysis: DetailedColorAnalysis,
  allProducts: any[],
  maxResults: number = 50
): Promise<any[]> {
  console.log('🔍 Finding products matching detailed color analysis...');
  console.log('  Primary family detected:', analysis.primaryFamily);
  console.log('  Is rooted?:', analysis.isRooted);

  // Filter products by primary color family first
  // For blonde detection, be more inclusive
  let candidates = allProducts.filter(p => {
    const colorName = p.colorName?.toLowerCase() || '';
    const title = p.title?.toLowerCase() || '';

    // For blonde family, include various blonde variations
    if (analysis.primaryFamily === 'blonde') {
      return p.colorFamily === 'blonde' ||
             colorName.includes('blonde') ||
             colorName.includes('blond') ||
             colorName.includes('venice') ||
             colorName.includes('wheat') ||
             colorName.includes('honey') ||
             colorName.includes('golden') ||
             colorName.includes('platinum') ||
             colorName.includes('champagne') ||
             colorName.includes('butterscotch') ||
             colorName.includes('caramel') ||
             colorName.includes('22f16') || // Venice Blonde code
             colorName.includes('fs26') ||  // Other blonde codes
             colorName.includes('fs24') ||
             title.includes('blonde') ||
             title.includes('blond');
    }

    // Default behavior for other colors
    return p.colorFamily === analysis.primaryFamily ||
           colorName.includes(analysis.primaryFamily);
  });
  
  console.log(`   Found ${candidates.length} ${analysis.primaryFamily} products`);
  
  // Score products based on color match
  const scoredProducts = candidates.map(product => {
    const colorName = product.colorName?.toLowerCase() || '';
    let score = 0;
    
    // Check for best match colors
    for (const matchColor of analysis.bestMatchColors) {
      if (colorName.includes(matchColor.toLowerCase())) {
        score += 20;
      }
    }
    
    // Check for avoid colors (negative score)
    for (const avoidColor of analysis.avoidColors) {
      if (colorName.includes(avoidColor.toLowerCase())) {
        score -= 30;
      }
    }
    
    // Bonus for rooted colors if user has rooted hair
    if (analysis.isRooted) {
      if (colorName.includes('rooted') ||
          colorName.includes('root') ||
          colorName.includes('shaded') ||
          colorName.includes('shadow') ||
          colorName.includes('venice') || // Venice blonde is rooted
          colorName.includes('22f16') ||  // Venice blonde code
          colorName.includes('ss') ||      // Shaded codes often have 'ss'
          colorName.includes('/')) {       // Color codes with / often indicate rooted
        score += 25; // Higher bonus for rooted match
      }
    }
    
    // Bonus for highlighted colors if user has highlights
    if (analysis.hasHighlights && (colorName.includes('highlight') || colorName.includes('dimension'))) {
      score += 10;
    }
    
    // Undertone matching
    if (analysis.undertone === 'warm' && (
      colorName.includes('golden') || colorName.includes('honey') || colorName.includes('warm')
    )) {
      score += 10;
    } else if (analysis.undertone === 'cool' && (
      colorName.includes('ash') || colorName.includes('cool') || colorName.includes('platinum')
    )) {
      score += 10;
    }
    
    return {
      ...product,
      colorMatchScore: Math.max(0, score)
    };
  });
  
  // Sort by color match score and return top results
  scoredProducts.sort((a, b) => b.colorMatchScore - a.colorMatchScore);
  
  const topMatches = scoredProducts.slice(0, maxResults);
  
  console.log('🎨 Top color matches:');
  topMatches.slice(0, 5).forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.title} - ${p.colorName} (score: ${p.colorMatchScore})`);
  });
  
  return topMatches;
}

/**
 * Enhanced visual matching with better color analysis
 */
export async function performEnhancedColorMatching(
  userImageData: string,
  maxResults: number = 10
) {
  console.log('🎨 Starting Enhanced Color Matching...');
  
  try {
    // Step 1: Detailed color analysis
    const colorAnalysis = await analyzeHairColorDetailed(userImageData);
    
    // Step 2: Load products
    let allProducts: any[] = [];
    if (require('fs').existsSync('./valid_image_catalog.json')) {
      const catalog = JSON.parse(require('fs').readFileSync('./valid_image_catalog.json', 'utf-8'));
      allProducts = catalog.products || [];
    }
    
    // Step 3: Get color-matched products
    const colorMatched = await getColorMatchedProducts(colorAnalysis, allProducts, 100);
    
    // Step 4: Visual comparison of top color matches
    const openai = getOpenAIClient();
    
    const finalMatches = [];
    const batchSize = 10;
    
    for (let i = 0; i < Math.min(colorMatched.length, 50); i += batchSize) {
      const batch = colorMatched.slice(i, i + batchSize);
      
      const comparisonPrompt = `Compare the user's hair image with these ${colorAnalysis.primaryFamily} wig products. 
      
USER'S HAIR: ${colorAnalysis.analysisNotes}
- Primary family: ${colorAnalysis.primaryFamily}
- Base color: ${colorAnalysis.baseColor}
- Rooted: ${colorAnalysis.isRooted}
- Highlights: ${colorAnalysis.hasHighlights}

Rate each product 0-100 for:
1. STYLE match (cut, length, texture)  
2. COLOR match (how well the color matches the user's hair)

Products:
${batch.map((p, idx) => `${idx + 1}. ${p.title} - ${p.colorName}`).join('\n')}

Return JSON array:
[{"index": 0, "styleScore": 85, "colorScore": 90, "overallScore": 88, "reasons": ["why it matches"]}]`;

      try {
        const messageContent: any[] = [
          { type: "text", text: comparisonPrompt },
          { type: "text", text: "USER'S HAIR:" },
          { type: "image_url", image_url: { url: userImageData, detail: "high" } },
          { type: "text", text: "PRODUCT IMAGES:" }
        ];

        // Add product images
        batch.forEach((product, idx) => {
          messageContent.push(
            { type: "text", text: `${idx + 1}. ${product.title}:` },
            { type: "image_url", image_url: { url: product.image.url, detail: "high" } }
          );
        });

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: messageContent }],
          max_tokens: 1500,
          temperature: 0.1
        });

        const content = response.choices[0]?.message?.content || '';
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
          const comparisons = JSON.parse(jsonMatch[0]);
          
          comparisons.forEach((comp: any) => {
            const product = batch[comp.index];
            finalMatches.push({
              ...product,
              styleScore: comp.styleScore / 100,
              colorScore: comp.colorScore / 100, 
              overallScore: comp.overallScore / 100,
              reasons: comp.reasons || [],
              colorAnalysis
            });
          });
        }
        
      } catch (error) {
        console.warn('Batch comparison error, using fallback scoring');
        batch.forEach(product => {
        finalMatches.push({
          ...product,
          styleScore: 0.7,
          colorScore: Math.min(product.colorMatchScore / 30, 1.0),
          overallScore: Math.min((0.7 + product.colorMatchScore / 30) / 2, 1.0),
          reasons: [`Color family match: ${colorAnalysis.primaryFamily}`],
          colorAnalysis
        });
        });
      }
    }
    
    // Sort by overall score
    finalMatches.sort((a, b) => b.overallScore - a.overallScore);
    
    return finalMatches.slice(0, maxResults);
    
  } catch (error) {
    console.error('❌ Enhanced color matching error:', error);
    throw error;
  }
}

export default {
  analyzeHairColorDetailed,
  getColorMatchedProducts,
  performEnhancedColorMatching
};
