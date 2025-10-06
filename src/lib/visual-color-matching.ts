/**
 * Visual Color Swatch Matching System
 *
 * Compares user's hair against actual product color swatches
 * Uses GPT-4 Vision to match visual similarity rather than guessing color names
 */

import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { loadVisionAnalysis, calculateVisionBasedScore } from './vision-based-matching';

export interface ColorSwatchMatch {
  colorCode: string;
  colorName: string;
  visualSimilarity: number;
  isRooted: boolean;
  swatchImagePath?: string;
  hairStyle?: {
    length: string;
    texture: string;
    style: string;
  };
}

export interface ProductColorMapping {
  productId: string;
  productTitle: string;
  colorCode: string;
  colorName: string;
  swatchImage?: string;
  isBlonde: boolean;
  isBrunette: boolean;
  isRooted: boolean;
}

// Dynamic color mappings will be loaded from the catalog
const CHIQUEL_COLOR_MAPPINGS: Record<string, ProductColorMapping> = {};

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
 * Load color swatch images dynamically from catalog
 */
async function loadColorSwatches(): Promise<ProductColorMapping[]> {
  const swatches: ProductColorMapping[] = [];
  const uniqueColors = new Map<string, ProductColorMapping>();

  // Load from valid_image_catalog.json
  const catalogPath = path.join(process.cwd(), 'valid_image_catalog.json');
  if (fs.existsSync(catalogPath)) {
    try {
      const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
      const products = catalog.products || [];

      // Extract unique color swatches from products
      for (const product of products) {
        if (product.colorName) {
          const colorCode = extractColorCode(product.colorName);

          // Only add if we haven't seen this color code yet
          if (!uniqueColors.has(colorCode)) {
            const colorNameLower = product.colorName.toLowerCase();

            uniqueColors.set(colorCode, {
              productId: product.id,
              productTitle: product.title,
              colorCode: colorCode,
              colorName: product.colorName,
              swatchImage: product.image?.url,
              // Dynamically determine color family
              isBlonde: colorNameLower.includes('blonde') ||
                       colorNameLower.includes('honey') ||
                       colorNameLower.includes('golden') ||
                       colorNameLower.includes('wheat') ||
                       colorNameLower.includes('vanilla'),
              isBrunette: colorNameLower.includes('brown') ||
                         colorNameLower.includes('brunette') ||
                         colorNameLower.includes('chestnut') ||
                         colorNameLower.includes('chocolate') ||
                         colorNameLower.includes('mocha'),
              isRooted: colorNameLower.includes('root') ||
                       colorNameLower.includes('shaded') ||
                       colorNameLower.includes('shadow') ||
                       colorCode.includes('/')
            });
          }
        }
      }

      swatches.push(...uniqueColors.values());
    } catch (error) {
      console.warn('Could not load catalog:', error);
    }
  }

  // Try to load from color_chunks directory as fallback
  const colorChunksDir = './color_chunks';
  if (fs.existsSync(colorChunksDir) && swatches.length === 0) {
    const files = fs.readdirSync(colorChunksDir);

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = fs.readFileSync(path.join(colorChunksDir, file), 'utf-8');
          const data = JSON.parse(content);

          if (data.products && Array.isArray(data.products)) {
            for (const product of data.products) {
              const colorOption = product.selectedOptions?.find((opt: any) =>
                opt.name.toLowerCase().includes('color')
              );

              if (colorOption) {
                const colorValue = colorOption.value;
                const colorCode = extractColorCode(colorValue);
                const colorLower = colorValue.toLowerCase();

                swatches.push({
                  productId: product.id,
                  productTitle: product.title,
                  colorCode: colorCode,
                  colorName: colorValue,
                  swatchImage: product.swatchImage || product.image?.url,
                  isBlonde: colorLower.includes('blonde') || colorLower.includes('golden'),
                  isBrunette: colorLower.includes('brown') || colorLower.includes('brunette'),
                  isRooted: colorLower.includes('root') || colorLower.includes('shaded') || colorCode.includes('/')
                });
              }
            }
          }
        } catch (error) {
          console.warn(`Could not parse ${file}:`, error);
        }
      }
    }
  }

  console.log(`📊 Loaded ${swatches.length} unique color swatches for matching`);
  return swatches;
}

/**
 * Extract color code from color name (e.g., "22F16S8 Venice Blonde" -> "22F16S8")
 */
function extractColorCode(colorName: string): string {
  // Match patterns like "22F16S8", "R6/10", "FS26/31", etc.
  const match = colorName.match(/^([A-Z0-9]+(?:\/[A-Z0-9]+)?)/i);
  return match ? match[1].toUpperCase() : colorName;
}

/**
 * Compare user's hair with actual product color swatches using vision
 */
export async function compareWithColorSwatches(
  userImageData: string,
  swatches: ProductColorMapping[]
): Promise<ColorSwatchMatch[]> {
  const openai = getOpenAIClient();

  console.log('🎨 Comparing user image with actual color swatches...');

  // Build comparison prompt with swatch descriptions
  const swatchDescriptions = swatches.map((s, i) =>
    `${i + 1}. ${s.colorCode} - ${s.colorName} (${s.isBlonde ? 'Blonde' : s.isBrunette ? 'Brunette' : 'Other'}${s.isRooted ? ', Rooted' : ''})`
  ).join('\n');

  const prompt = `You are an expert hair color analyst. Your PRIMARY job is to identify the user's exact hair COLOR first, then assess hair LENGTH and STYLE.

AVAILABLE COLOR SWATCHES:
${swatchDescriptions}

CRITICAL ANALYSIS ORDER:
======================

STEP 1 - HAIR COLOR IDENTIFICATION (MOST IMPORTANT):
-----------------------------------------------------
⚠️ CRITICAL: Be VERY careful with color identification. Indoor lighting can make colors appear different than they are.

COLOR FAMILIES TO IDENTIFY:
- BLONDE SHADES: TRUE GOLDEN BLONDE, honey blonde, platinum, champagne, beach blonde
  → Match to codes: 22F16S8, FS26/31, SS14/88, RL14/22SS, etc.
  → MUST be clearly YELLOW/GOLDEN tones, not brown or gray

- BRUNETTE/BROWN SHADES: Light brown, medium brown, dark brown, chestnut, chocolate, ash brown
  → Match to codes: R6/10, R8/29S, R6/30H, 6F27, 8/25R, R10, GL10-12, etc.
  → Includes ASH BROWN and GRAY-BROWN tones
  → If you see ANY brown, gray, or ashy tones → This is BRUNETTE, NOT BLONDE

- GRAY/SILVER SHADES: Silver, gray, white, salt-and-pepper, gray-brown mix
  → Match to codes: R56/60, R51/59, etc.
  → Many older adults have brown hair mixed with gray → Match to GRAY or ASH BROWN

- RED/AUBURN SHADES: Copper, auburn, ginger, mahogany, red-brown
  → Match to codes with auburn/copper descriptors

- BLACK/DARK SHADES: Jet black, off-black, darkest brown
  → Match to codes: R2/6, 1B, 1, 2, etc.

COLOR ANALYSIS RULES:
1. ⚠️ MOST IMPORTANT: If the hair has ANY brown, gray, ashy, or dark tones → It is BRUNETTE or GRAY, NEVER blonde
2. BLONDE hair must be clearly GOLDEN/YELLOW tones - not brown, not gray, not ashy
3. Indoor/fluorescent lighting can make brown hair appear lighter → Still brown, not blonde
4. Gray hair mixed with brown → Match to GRAY or ASH BROWN categories
5. Look at the hair roots AND ends to determine natural color
6. For older adults with graying hair → Match to GRAY or GRAY-BROWN shades
7. Focus on the TRUE color, not what lighting makes it appear to be

STEP 2 - HAIR LENGTH MEASUREMENT:
----------------------------------
⚠️ BE EXTREMELY PRECISE. Measure where the LONGEST hair ends relative to facial/body landmarks:

LENGTH CATEGORIES (use these EXACT definitions):
- "short": Hair ends ABOVE the chin
  Examples: Pixie cuts, cropped bobs, ear-length cuts
  Visual cue: You can see the person's NECK clearly, hair does NOT touch chin
  Measurement: 2-8 inches

- "bob": Hair ends AT or BELOW chin, but ABOVE shoulders
  Examples: Chin-length bob, jaw-length bob, classic bob
  Visual cue: Hair touches chin/jaw area, but STOPS before reaching shoulders
  Measurement: 8-12 inches

- "shoulder": Hair ends AT or JUST BELOW the shoulder line
  Examples: Shoulder-grazing, collarbone-length
  Visual cue: Hair rests ON the shoulders or reaches collarbone
  Measurement: 12-16 inches

- "medium": Hair ends BELOW shoulders but ABOVE mid-back
  Examples: Between shoulder and mid-back
  Visual cue: Hair clearly extends past shoulders
  Measurement: 16-20 inches

- "long": Hair ends at MID-BACK or longer
  Examples: Mid-back, lower-back, waist-length
  Visual cue: Hair reaches or goes past the bra line
  Measurement: 20+ inches

⚠️ CRITICAL RULES:
1. If you can see the NECK clearly → "short"
2. If hair is at CHIN/JAW level → "bob"
3. If hair touches SHOULDERS → "shoulder"
4. If hair goes PAST shoulders → "medium" or "long"
5. DO NOT confuse a short bob with shoulder-length!

STEP 3 - STYLE & TEXTURE:
-------------------------
After identifying color and length, note:
- Texture: straight, wavy, or curly
- Style elements: layered, blunt cut, bangs/fringe, shaggy, sleek, etc.

RETURN FORMAT (MUST BE VALID JSON ONLY - NO EXTRA TEXT):
{
  "hairStyle": {
    "length": "bob", // REQUIRED: "short", "bob", "shoulder", "medium", or "long"
    "texture": "straight", // REQUIRED: "straight", "wavy", or "curly"
    "style": "blunt bob with side part" // Descriptive style details
  },
  "colorMatches": [
    {
      "colorCode": "R6/10",
      "visualSimilarity": 0.95,
      "reasoning": "Medium brown base color with subtle warmth, perfect match to this brunette shade"
    }
    // ... 3-5 more matches, ordered by similarity (MUST include at least 3)
  ]
}

⚠️ CRITICAL RULES:
1. Return ONLY valid JSON - no explanation text before or after
2. Color matching is MOST CRITICAL because not all products come in all colors
3. DO NOT include black ("1", "1B", "2", "1 jet") for brown/brunette/gray hair
4. DO NOT include blonde codes for brown/gray hair
5. Match the TRUE hair color you see, not lighting artifacts`;


  try {
    let modelToUse = "gpt-5";
    let content: string | null = null;

    // Try new GPT-5 API first with responses.create
    try {
      console.log('🚀 Attempting GPT-5 with new responses.create API...');

      // @ts-ignore - New API may not be in types yet
      const response = await openai.responses.create({
        model: "gpt-5",
        input: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: userImageData, detail: "high" } }
        ],
        reasoning: { effort: "medium" },
        text: { verbosity: "low" }
      });

      // @ts-ignore
      content = response.output_text || response.text;
      modelToUse = "gpt-5";
      console.log('✅ Using GPT-5 with new API format');
    } catch (gpt5Error: any) {
      console.log('⚠️ GPT-5 new API not available:', gpt5Error.message);

      // Fallback to chat.completions.create with model cascade
      console.log('🔄 Falling back to chat.completions API...');

      let response;

      try {
        modelToUse = "gpt-5";
        response = await openai.chat.completions.create({
          model: modelToUse,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: userImageData, detail: "high" } }
              ]
            }
          ],
          max_tokens: 1500,
          temperature: 0.05
        });
      } catch (error2) {
        console.log('⚠️ gpt-5 not available, trying gpt-5-turbo...');
        modelToUse = "gpt-5-turbo";

        try {
          response = await openai.chat.completions.create({
            model: modelToUse,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: userImageData, detail: "high" } }
                ]
              }
            ],
            max_tokens: 1500,
            temperature: 0.05
          });
        } catch (error3) {
          console.log('⚠️ gpt-5-turbo not available, falling back to gpt-4o');
          modelToUse = "gpt-4o";
          response = await openai.chat.completions.create({
            model: modelToUse,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: userImageData, detail: "high" } }
                ]
              }
            ],
            max_tokens: 1500,
            temperature: 0.05
          });
        }
      }

      content = response.choices[0]?.message?.content;
      console.log(`✅ Using model: ${modelToUse} (chat.completions API)`);
    }

    if (!content) throw new Error('No response from color matching');

    console.log('📋 GPT RAW RESPONSE:', content);

    // Parse response
    let parsedResponse: any;
    let matches: any[] = [];
    let hairStyle: any = null;

    try {
      // Extract JSON from markdown code blocks and any surrounding text
      let jsonStr = content;

      // Try to find JSON in markdown code blocks first
      const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        jsonStr = jsonBlockMatch[1];
      } else {
        // Try to find raw JSON object
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
      }

      parsedResponse = JSON.parse(jsonStr.trim());

      // Handle new format with hairStyle
      if (parsedResponse.hairStyle && parsedResponse.colorMatches) {
        hairStyle = parsedResponse.hairStyle;
        matches = parsedResponse.colorMatches;
      } else if (Array.isArray(parsedResponse)) {
        // Fallback to old format
        matches = parsedResponse;
      } else {
        matches = [parsedResponse];
      }
    } catch (parseError) {
      console.error('Failed to parse color matches:', content);
      // Fallback to extract color codes from text
      matches = extractColorCodesFromText(content, swatches);
    }

    // Store hair style info globally for product filtering
    if (hairStyle) {
      (global as any).detectedHairStyle = hairStyle;
      console.log('👩 DETECTED HAIR STYLE:', JSON.stringify(hairStyle, null, 2));
      console.log('   - Length:', hairStyle.length);
      console.log('   - Texture:', hairStyle.texture);
      console.log('   - Style:', hairStyle.style);
    }

    // Validate and enhance matches
    const enhancedMatches: ColorSwatchMatch[] = matches
      .filter(match => {
        // Filter out obviously wrong matches
        if (!match.colorCode) return false;

        // Log what we're getting
        console.log(`  Evaluating match: ${match.colorCode} - similarity: ${match.visualSimilarity}`);

        return true;
      })
      .map(match => {
        const swatchInfo = swatches.find(s => s.colorCode === match.colorCode) ||
                          CHIQUEL_COLOR_MAPPINGS[match.colorCode];

        return {
          colorCode: match.colorCode,
          colorName: swatchInfo?.colorName || match.colorCode,
          visualSimilarity: match.visualSimilarity || 0.8,
          isRooted: swatchInfo?.isRooted || false,
          swatchImagePath: swatchInfo?.swatchImage,
          hairStyle: hairStyle // Include hair style info
        };
      });

    console.log('✅ Color swatch matching complete:');
    enhancedMatches.slice(0, 3).forEach((match, i) => {
      console.log(`   ${i + 1}. ${match.colorCode} - ${match.colorName} (${Math.round(match.visualSimilarity * 100)}%)`);
    });

    return enhancedMatches;

  } catch (error) {
    console.error('❌ Color swatch matching error:', error);
    throw error;
  }
}

/**
 * Fallback: Extract color codes from text response
 */
function extractColorCodesFromText(text: string, swatches: ProductColorMapping[]): any[] {
  const matches: any[] = [];

  // Look for color codes in the text
  for (const swatch of swatches) {
    if (text.includes(swatch.colorCode)) {
      matches.push({
        colorCode: swatch.colorCode,
        visualSimilarity: 0.7, // Default similarity
        reasoning: 'Extracted from response'
      });
    }
  }

  // If no matches found, default to blonde options for light hair
  if (matches.length === 0) {
    if (text.toLowerCase().includes('blonde') || text.toLowerCase().includes('light')) {
      matches.push(
        { colorCode: '22F16S8', visualSimilarity: 0.8, reasoning: 'Default blonde match' },
        { colorCode: 'FS26/31', visualSimilarity: 0.7, reasoning: 'Alternative blonde' }
      );
    } else {
      matches.push(
        { colorCode: 'R6/10', visualSimilarity: 0.7, reasoning: 'Default brown match' }
      );
    }
  }

  return matches;
}

/**
 * Main function: Perform visual color matching
 */
export async function performVisualColorMatching(
  userImageData: string
): Promise<{ bestMatch: ColorSwatchMatch, allMatches: ColorSwatchMatch[] }> {
  console.log('🚀 Starting Visual Color Swatch Matching...');

  // Load available color swatches
  const swatches = await loadColorSwatches();

  // Compare with user image
  let matches = await compareWithColorSwatches(userImageData, swatches);

  // Sort by similarity
  matches.sort((a, b) => b.visualSimilarity - a.visualSimilarity);

  // Sanity check: If the top match is silver/gray but we have brown matches with good scores,
  // it's likely an AI error - reorder to prioritize more likely matches
  if (matches.length > 0) {
    const topMatch = matches[0];
    const topMatchLower = topMatch.colorName.toLowerCase();
    const topCode = topMatch.colorCode.toUpperCase();

    // Check if top match is silver/gray (which is unlikely for most people)
    if (topMatchLower.includes('silver') || topMatchLower.includes('gray') ||
        topMatchLower.includes('mist') || topCode === 'R56/60' || topCode.includes('56')) {

      // Check if we have brown matches with reasonable scores
      const brownMatches = matches.filter(m => {
        const nameLower = m.colorName.toLowerCase();
        const code = m.colorCode.toUpperCase();
        return (nameLower.includes('brown') || nameLower.includes('chestnut') ||
                nameLower.includes('chocolate') || nameLower.includes('hazelnut') ||
                nameLower.includes('copper') || nameLower.includes('auburn') ||
                code.includes('R6') || code.includes('R8') || code.includes('R10') ||
                code.includes('R4') || code.includes('R3') || code.includes('R30')) &&
                m.visualSimilarity > 0.6;  // Only consider if similarity is reasonable
      });

      if (brownMatches.length > 0) {
        console.log('⚠️ Detected unlikely silver/gray as top match, prioritizing brown shades...');
        console.log(`   Original top: ${topMatch.colorCode} - ${topMatch.colorName}`);
        console.log(`   New top: ${brownMatches[0].colorCode} - ${brownMatches[0].colorName}`);

        // Boost brown match scores and re-sort
        brownMatches.forEach(m => m.visualSimilarity = Math.min(0.95, m.visualSimilarity + 0.15));

        // Rebuild matches array with brown priority
        matches = [...brownMatches, ...matches.filter(m => !brownMatches.includes(m))];
      }
    }
  }

  return {
    bestMatch: matches[0],
    allMatches: matches
  };
}

/**
 * Get products that match the identified color swatches AND hair style
 * UPDATED: Search ALL products first, rank by style, then check color availability
 */
export async function getProductsByColorSwatches(
  colorMatches: ColorSwatchMatch[]
): Promise<any[]> {
  const products: any[] = [];
  const catalogPath = path.join(process.cwd(), 'valid_image_catalog.json');

  // Get detected hair style (if available)
  const detectedStyle = (global as any).detectedHairStyle || colorMatches[0]?.hairStyle;

  console.log('🔍 Loading product catalog from:', catalogPath);
  if (detectedStyle) {
    console.log('👩 Using detected hair style:', detectedStyle);
  }

  // Load product catalog
  if (!fs.existsSync(catalogPath)) {
    console.error('❌ Catalog file not found at:', catalogPath);
    return products;
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  const allProducts = catalog.products || [];

  console.log(`📊 Loaded ${allProducts.length} total products from catalog`);
  console.log('🎨 User hair colors detected:', colorMatches.map(m => `${m.colorCode} (${m.colorName})`).join(', '));
  console.log('🔥 NEW APPROACH: Filter by COLOR FIRST (most critical), THEN rank by LENGTH + STYLE');

  // Load vision analysis data if available
  const visionData = loadVisionAnalysis();
  const hasVisionData = visionData && Object.keys(visionData).length > 0;

  if (hasVisionData) {
    console.log(`🎯 Using Vision-Based Analysis for ${Object.keys(visionData).length} products`);
  }

  // STEP 1: Filter products by COLOR AVAILABILITY first (most critical factor)
  let productsWithColor = allProducts.filter((product: any) => {
    // Check if this product is available in any of the user's matched colors
    for (const colorMatch of colorMatches) {
      if (product.colorName) {
        const productColorName = product.colorName.toLowerCase();
        const matchColorCode = colorMatch.colorCode.toLowerCase();

        const isColorMatch = productColorName.includes(matchColorCode) ||
                        // Venice Blonde
                        (matchColorCode === '22f16s8' && (productColorName.includes('22f16s8') || productColorName.includes('venice'))) ||
                        // R6/10 Medium Brown
                        (matchColorCode === 'r6/10' && (productColorName.includes('r6/10') || productColorName.includes('r6 ') || productColorName === 'r6')) ||
                        // Caramel Syrup
                        (matchColorCode === 'fs26/31' && (productColorName.includes('fs26') || productColorName.includes('caramel'))) ||
                        // Shaded Wheat
                        (matchColorCode === 'ss14/88' && (productColorName.includes('ss14') || productColorName.includes('wheat')));

        if (isColorMatch) {
          return true; // Product has the user's color
        }
      }
    }
    return false; // Color not available
  });

  console.log(`\n✅ STEP 1: ${productsWithColor.length} products available in exact user colors`);

  // FALLBACK: If too few products, expand to color family matching
  const MIN_PRODUCTS = 50; // Increased to ensure we have good variety of lengths
  if (productsWithColor.length < MIN_PRODUCTS) {
    console.log(`⚠️ Only ${productsWithColor.length} products found. Expanding to COLOR FAMILY matching...`);

    // Determine color family from best match
    const bestColorName = colorMatches[0]?.colorName.toLowerCase() || '';
    let colorFamily = '';

    if (bestColorName.includes('blonde') || bestColorName.includes('honey') ||
        bestColorName.includes('wheat') || bestColorName.includes('vanilla') ||
        bestColorName.includes('champagne') || bestColorName.includes('platinum')) {
      colorFamily = 'blonde';
    } else if (bestColorName.includes('brown') || bestColorName.includes('brunette') ||
               bestColorName.includes('chestnut') || bestColorName.includes('chocolate') ||
               bestColorName.includes('mocha') || bestColorName.includes('hazelnut')) {
      colorFamily = 'brunette';
    } else if (bestColorName.includes('red') || bestColorName.includes('auburn') ||
               bestColorName.includes('copper') || bestColorName.includes('ginger')) {
      colorFamily = 'red';
    } else if (bestColorName.includes('black') || bestColorName.includes('darkest')) {
      colorFamily = 'black';
    } else if (bestColorName.includes('gray') || bestColorName.includes('grey') ||
               bestColorName.includes('silver') || bestColorName.includes('white')) {
      colorFamily = 'gray';
    }

    console.log(`🎨 Detected color family: ${colorFamily}`);

    // Expand to color family
    const familyProducts = allProducts.filter((product: any) => {
      if (!product.colorName) return false;
      const colorName = product.colorName.toLowerCase();

      switch (colorFamily) {
        case 'blonde':
          return colorName.includes('blonde') || colorName.includes('honey') ||
                 colorName.includes('wheat') || colorName.includes('vanilla') ||
                 colorName.includes('champagne') || colorName.includes('platinum') ||
                 colorName.includes('golden') || colorName.includes('butter');

        case 'brunette':
          return colorName.includes('brown') || colorName.includes('brunette') ||
                 colorName.includes('chestnut') || colorName.includes('chocolate') ||
                 colorName.includes('mocha') || colorName.includes('hazelnut') ||
                 colorName.includes('cocoa') || colorName.includes('espresso') ||
                 colorName.includes('mahogany') || colorName.includes('walnut');

        case 'red':
          return colorName.includes('red') || colorName.includes('auburn') ||
                 colorName.includes('copper') || colorName.includes('ginger') ||
                 colorName.includes('rust') || colorName.includes('burgundy');

        case 'black':
          return colorName.includes('black') || colorName.includes('darkest') ||
                 colorName.includes('ebony') || colorName.includes('jet');

        case 'gray':
          return colorName.includes('gray') || colorName.includes('grey') ||
                 colorName.includes('silver') || colorName.includes('white') ||
                 colorName.includes('salt') || colorName.includes('pepper');

        default:
          return false;
      }
    });

    productsWithColor = familyProducts;
    console.log(`✅ Expanded to ${productsWithColor.length} products in ${colorFamily} family`);
  }

  // STEP 2: Score the color-available products by STYLE/LENGTH match
  const scoredProducts = productsWithColor.map((product: any, index: number) => {
    let styleScore = 0.5; // Default neutral score
    let matchedColorCode = '';
    let matchedColorName = '';
    let colorMatchScore = 0;

    // Only log for first few products to avoid spamming console
    const shouldLog = index < 5 || product.title.includes('16 On Key') || product.title.includes('Love Wave');
    if (shouldLog) {
      console.log(`\n🔍 SCORING: "${product.title}" - Product colorName: "${product.colorName}"`);
    }

    // Find which color matched
    for (const colorMatch of colorMatches) {
      if (product.colorName) {
        const productColorName = product.colorName.toLowerCase();
        const matchColorCode = colorMatch.colorCode.toLowerCase();

        const isColorMatch = productColorName.includes(matchColorCode) ||
                        (matchColorCode === '22f16s8' && (productColorName.includes('22f16s8') || productColorName.includes('venice'))) ||
                        (matchColorCode === 'r6/10' && (productColorName.includes('r6/10') || productColorName.includes('r6 ') || productColorName === 'r6')) ||
                        (matchColorCode === 'r10' && (productColorName.includes('r10') || productColorName.includes('chestnut'))) || // Added R10 support
                        (matchColorCode === 'gl10-12' && productColorName.includes('gl10')) || // Added GL10 support
                        (matchColorCode === 'fs26/31' && (productColorName.includes('fs26') || productColorName.includes('caramel'))) ||
                        (matchColorCode === 'ss14/88' && (productColorName.includes('ss14') || productColorName.includes('wheat')));

        if (isColorMatch) {
          matchedColorCode = colorMatch.colorCode;
          matchedColorName = colorMatch.colorName;
          colorMatchScore = colorMatch.visualSimilarity;
          if (shouldLog) {
            console.log(`   ✅ MATCHED to: "${matchedColorCode}" (${matchedColorName})`);
          }
          break;
        }
      }
    }

    // If no exact match found via colorMatches, use product's own color for family-matched products
    if (!matchedColorCode && product.colorName) {
      matchedColorCode = product.colorName;
      matchedColorName = product.colorName;
      colorMatchScore = 0.7; // Good match via color family
      if (shouldLog) {
        console.log(`   ⚠️ No exact match - using product color: "${product.colorName}"`);
      }
    }

    // Try vision-based scoring first if available
    if (hasVisionData && visionData[product.id]) {
      const userProfile = {
        length: detectedStyle?.length || 'medium',
        texture: detectedStyle?.texture || 'straight',
        style: detectedStyle?.style || '',
        hasBangs: detectedStyle?.style?.toLowerCase().includes('bang'),
        isLayered: detectedStyle?.style?.toLowerCase().includes('layer')
      };

      styleScore = calculateVisionBasedScore(visionData[product.id], userProfile);

      if (shouldLog) {
        const attrs = visionData[product.id].visualAttributes;
        console.log(`   📷 VISION DATA: ${attrs.actualLength} ${attrs.texture} ${attrs.coverage}`);
        console.log(`   👤 USER PROFILE: ${userProfile.length} ${userProfile.texture}`);
        console.log(`   🎯 Vision Score: ${(styleScore * 100).toFixed(1)}%`);
      }
    }
    // Fall back to title-based scoring for products without vision analysis
    else if (detectedStyle && product.title) {
      const productTitle = product.title.toLowerCase();
      const detectedLength = detectedStyle.length?.toLowerCase();

      // Length matching logic (same as before)
      if (detectedLength === 'long') {
        if (productTitle.includes('long') || productTitle.includes('luxe') || productTitle.includes('24"') || productTitle.includes('26"')) {
          styleScore = 1.0;
        } else if (productTitle.includes('medium') || productTitle.includes('shoulder') ||
                  productTitle.includes('18"') || productTitle.includes('16"')) {
          styleScore = 0.7;
        } else if (productTitle.includes('short') || productTitle.includes('bob') ||
                  productTitle.includes('pixie') || productTitle.includes('lyric') ||
                  productTitle.includes('12"') || productTitle.includes('10"')) {
          styleScore = 0.1; // STRONG penalty for short styles when user has long hair
        } else {
          styleScore = 0.6; // Default for undefined length
        }
      } else if (detectedLength === 'medium' || detectedLength === 'shoulder') {
        // Medium hair length matching (shoulder to mid-back length)

        // FIRST: Check for hairpieces/toppers that are NOT full wigs
        if (productTitle.includes('top it off') || productTitle.includes('topper') ||
            productTitle.includes('hairpiece') || productTitle.includes('add-on') ||
            productTitle.includes('enhancer') || productTitle.includes('filler')) {
          styleScore = 0.05; // SEVERE penalty - these are for thinning hair, not full coverage
          if (shouldLog) console.log(`   ⚠️ HAIRPIECE/TOPPER DETECTED - severe penalty applied`);
        } else if (productTitle.includes('pony') || productTitle.includes('ponytail') ||
            productTitle.includes('extension') || productTitle.includes('cinch') ||
            productTitle.includes('clip-in')) {
          styleScore = 0.1; // STRONG penalty for ponytails/extensions on medium hair
        } else if (productTitle.includes('medium') || productTitle.includes('shoulder') ||
                  productTitle.includes('14"') || productTitle.includes('16"') ||
                  (productTitle.includes('layered') && !productTitle.includes('top')) ||
                  productTitle.includes('shag') || productTitle.includes('jacky') ||
                  productTitle.includes('sevyn') || productTitle.includes('lumi') ||
                  productTitle.includes('kennedy') || productTitle.includes('meritt') ||
                  productTitle.includes('jamison') || productTitle.includes('ember')) {
          styleScore = 1.0; // Perfect match for medium length
        } else if (productTitle.includes('bob') &&
                  (productTitle.includes('long') || productTitle.includes('lob'))) {
          styleScore = 0.7; // Long bobs can work for shorter medium hair
        } else if (productTitle.includes('bob') &&
                  (productTitle.includes('sleek') || productTitle.includes('fringe'))) {
          styleScore = 0.4; // Short bobs are too short for medium hair
        } else if (productTitle.includes('bob')) {
          styleScore = 0.5; // Generic bobs are usually too short
        } else if (productTitle.includes('pixie') || productTitle.includes('vale')) {
          styleScore = 0.2; // Strong penalty for very short pixie cuts
        } else if (productTitle.includes('long') || productTitle.includes('24"') ||
                  productTitle.includes('extra')) {
          styleScore = 0.3; // Penalty for very long styles
        } else if (productTitle.includes('muse') || productTitle.includes('brighton') ||
                  productTitle.includes('lyric') || productTitle.includes('sutton') ||
                  productTitle.includes('heidi') || productTitle.includes('codi')) {
          // These are known short bob/pixie styles without explicit length markers
          styleScore = 0.3; // Penalty for known short styles
          if (shouldLog) console.log(`   ⚠️ Known short style detected: ${productTitle}`);
        } else {
          // For products without clear length indicators, check for other hints
          if (productTitle.includes('petite') || productTitle.includes('mini')) {
            styleScore = 0.3; // These are usually shorter styles
          } else {
            styleScore = 0.5; // Default neutral score
          }
        }
      } else if (detectedLength === 'short') {
        // Short hair length matching
        if (productTitle.includes('pony') || productTitle.includes('ponytail') ||
            productTitle.includes('extension') || productTitle.includes('cinch')) {
          styleScore = 0.05; // EXTREME penalty for ponytails on short hair
        } else if (productTitle.includes('short') || productTitle.includes('bob') ||
                  productTitle.includes('pixie') || productTitle.includes('lyric') ||
                  productTitle.includes('10"') || productTitle.includes('12"')) {
          styleScore = 1.0;
        } else if (productTitle.includes('medium') || productTitle.includes('14"')) {
          styleScore = 0.6;
        } else if (productTitle.includes('long') || productTitle.includes('luxe') ||
                  productTitle.includes('24"') || productTitle.includes('26"')) {
          styleScore = 0.1; // STRONG penalty for long styles when user has short hair
        } else {
          styleScore = 0.4;
        }
      }

      // Texture matching bonus/penalty
      if (detectedStyle.texture) {
        const detectedTexture = detectedStyle.texture.toLowerCase();

        // Apply texture match bonus or mismatch penalty
        if (detectedTexture === 'straight') {
          if (productTitle.includes('straight') || productTitle.includes('sleek')) {
            styleScore += 0.2; // Bonus for matching straight texture
          } else if (productTitle.includes('curl') || productTitle.includes('wavy') || productTitle.includes('wave')) {
            styleScore -= 0.3; // PENALTY for curly/wavy wigs on straight hair
            if (shouldLog) console.log(`   ⚠️ Texture mismatch: curly/wavy wig for straight hair`);
          }
        } else if (detectedTexture === 'wavy') {
          if (productTitle.includes('wav') || productTitle.includes('wave')) {
            styleScore += 0.2; // Bonus for matching wavy texture
          } else if (productTitle.includes('curl')) {
            styleScore += 0.1; // Small bonus for curly (close to wavy)
          } else if (productTitle.includes('straight') && !productTitle.includes('wave')) {
            styleScore -= 0.2; // Penalty for straight wigs on wavy hair
          }
        } else if (detectedTexture === 'curly') {
          if (productTitle.includes('curl')) {
            styleScore += 0.2; // Bonus for matching curly texture
          } else if (productTitle.includes('wav') || productTitle.includes('wave')) {
            styleScore += 0.1; // Small bonus for wavy (close to curly)
          } else if (productTitle.includes('straight') || productTitle.includes('sleek')) {
            styleScore -= 0.3; // Penalty for straight wigs on curly hair
            if (shouldLog) console.log(`   ⚠️ Texture mismatch: straight wig for curly hair`);
          }
        }
      }

      // Style-specific bonus (layered, bangs, etc.)
      if (detectedStyle.style) {
        const userStyle = detectedStyle.style.toLowerCase();

        // Check if this is a hairpiece/topper - if so, NO style bonuses should apply
        const isHairpiece = productTitle.includes('top it off') || productTitle.includes('topper') ||
                          productTitle.includes('hairpiece') || productTitle.includes('add-on');

        if (!isHairpiece) {
          // Check for bangs
          if (userStyle.includes('bangs') || userStyle.includes('fringe')) {
            if (productTitle.includes('bang') || productTitle.includes('fringe')) {
              styleScore += 0.15; // Bonus for matching bangs
            }
          }

          // Check for layered styles
          if (userStyle.includes('layered') || userStyle.includes('layers')) {
            if (productTitle.includes('layer')) {
              styleScore += 0.15; // Bonus for matching layers
            }
            // Penalize bob styles more when user has layered hair
            if (productTitle.includes('bob') && !productTitle.includes('layered')) {
              styleScore -= 0.2; // Extra penalty for non-layered bobs
            }
          }
        } else {
          if (shouldLog) console.log(`   ⚠️ Hairpiece detected - no style bonuses applied`);
        }
      }

      // Ensure score stays within bounds
      styleScore = Math.min(1.0, Math.max(0.05, styleScore));
    }

    if (shouldLog) {
      console.log(`   Style score: ${styleScore.toFixed(2)}`);
      console.log(`   Color: ${matchedColorCode} (already filtered)`);
      console.log(`   ✨ FINAL STYLE SCORE: ${styleScore.toFixed(2)}`);
    }

    return {
      ...product,
      handle: product.handle || product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      productUrl: `https://chiquel.com/products/${product.handle || product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      styleMatchScore: styleScore,
      combinedScore: styleScore, // Pure style score for ranking
      colorAvailable: true, // All products in this list have color available
      matchedColorCode,
      matchedColorName,
      colorMatchScore
    };
  });

  // STEP 3: Sort products by style/length match score
  scoredProducts.sort((a, b) => b.styleMatchScore - a.styleMatchScore);

  console.log('\n📊 TOP PRODUCTS BY STYLE/LENGTH MATCH (already color-filtered):');
  scoredProducts.slice(0, 10).forEach((p, i) => {
    console.log(`   ${i+1}. ${p.title} - Style: ${(p.styleMatchScore * 100).toFixed(0)}%, Color: ${p.matchedColorCode}`);
  });

  // Remove duplicates based on title + color (keep highest scoring)
  const uniqueProducts = new Map<string, any>();
  scoredProducts.forEach(product => {
    const key = `${product.title}_${product.matchedColorCode}`.toLowerCase();
    if (!uniqueProducts.has(key) || uniqueProducts.get(key).styleMatchScore < product.styleMatchScore) {
      uniqueProducts.set(key, product);
    }
  });
  const dedupedProducts = Array.from(uniqueProducts.values())
    .sort((a, b) => b.styleMatchScore - a.styleMatchScore);

  console.log(`\n✅ Found ${dedupedProducts.length} unique products matching user's color`);
  console.log('📦 FINAL TOP PRODUCTS (Color → Length → Style):');
  dedupedProducts.slice(0, 10).forEach((p, i) => {
    console.log(`   ${i+1}. ${p.title} - Style: ${(p.styleMatchScore * 100).toFixed(0)}%, Color: ${p.matchedColorCode}`);
  });

  // If no products with exact color match, return empty (don't show wrong colors)
  if (dedupedProducts.length === 0) {
    console.log('⚠️ No products available in user\'s exact color matches');
    return [];
  }

  return dedupedProducts;
}