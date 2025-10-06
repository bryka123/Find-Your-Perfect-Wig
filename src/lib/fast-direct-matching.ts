import OpenAI from 'openai';
import * as fs from 'fs';

/**
 * Fast Direct GPT-4o Matching
 * 
 * Bypasses slow Assistants API and uses direct chat completions for speed
 * Fully dynamic for all hair colors with Position 1 photos
 */

export interface FastMatch {
  id: string;
  title: string;
  colorName: string;
  price: string;
  matchScore: number;
  reasons: string[];
  detectedHairColor: string;
  chunkSearched: string;
  image?: {
    url: string;
    altText: string;
  };
}

// Initialize OpenAI client
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  return new OpenAI({ apiKey });
}

/**
 * Fast hair color detection using GPT-4o
 */
async function detectHairColorFast(userImageData: string): Promise<{
  colorFamily: string;
  confidence: number;
}> {
  console.log('⚡ Fast hair color detection with GPT-4o...');
  
  const openai = getOpenAIClient();
  
  const prompt = `Analyze this hair image and detect the primary color family. Return ONLY a JSON object:

{
  "colorFamily": "blonde/brunette/black/red/gray/white",
  "confidence": 0.95
}

Focus on the dominant hair color family for wig matching.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Advanced model with vision
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { 
              type: "image_url", 
              image_url: { 
                url: userImageData,
                detail: "low" // Use low detail for speed
              } 
            }
          ]
        }
      ],
      max_tokens: 100,
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No detection response');
    }

    console.log('✅ Fast hair detection completed');
    
    let result;
    try {
      const cleanJson = content.replace(/```json\n?|\n?```/g, '').trim();
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      console.warn('⚠️ Detection parsing failed, using blonde fallback');
      result = { colorFamily: "blonde", confidence: 0.7 };
    }

    console.log(`🎨 Detected: ${result.colorFamily} (${Math.round(result.confidence * 100)}% confidence)`);
    return result;

  } catch (error) {
    console.error('❌ Fast detection error:', error);
    return { colorFamily: "blonde", confidence: 0.5 };
  }
}

/**
 * Load specific color chunk for matching
 */
function loadColorChunk(colorFamily: string): any[] {
  const chunkPath = `./dynamic_chunks/${colorFamily}_position1.json`;
  
  console.log(`📂 Loading ${colorFamily} Position 1 chunk...`);
  
  if (!fs.existsSync(chunkPath)) {
    console.warn(`⚠️ Chunk not found: ${chunkPath}`);
    return [];
  }
  
  try {
    const chunkData = JSON.parse(fs.readFileSync(chunkPath, 'utf-8'));
    const products = chunkData.products || [];
    console.log(`✅ Loaded ${products.length} ${colorFamily} Position 1 variants`);
    return products;
  } catch (error) {
    console.error(`❌ Failed to load ${colorFamily} chunk:`, error);
    return [];
  }
}

/**
 * Fast direct matching with GPT-4o
 */
export async function performFastDirectMatching(
  userImageData: string,
  maxResults: number = 6
): Promise<FastMatch[]> {
  console.log('⚡ Starting Fast Direct Matching with GPT-4o...');
  
  try {
    // Step 1: Fast hair color detection (low detail for speed)
    const detection = await detectHairColorFast(userImageData);
    
    // Step 2: Load appropriate color chunk
    const colorProducts = loadColorChunk(detection.colorFamily);
    
    if (colorProducts.length === 0) {
      throw new Error(`No products found for ${detection.colorFamily} color family`);
    }
    
    // Step 3: Select best candidates from chunk
    const candidates = colorProducts
      .filter(p => p.attrs?.availableForSale)
      .slice(0, maxResults * 2) // Get more candidates for selection
      .map(p => `ID: ${p.id}, Title: ${p.title}, Color: ${p.colorName}, Price: $${p.price}`)
      .join('\n');
    
    console.log(`📊 Selected ${Math.min(colorProducts.length, maxResults * 2)} candidates from ${detection.colorFamily} chunk`);
    
    // Step 4: Fast matching with GPT-4o
    const openai = getOpenAIClient();
    
    const matchingPrompt = `Find the best ${maxResults} wig matches for ${detection.colorFamily} hair from these Position 1 candidates:

${candidates}

Return ONLY a JSON array:
[
  {
    "id": "variant_id",
    "title": "product_title",
    "colorName": "color_name",
    "price": "price",
    "matchScore": 0.95,
    "reasons": ["visual match for ${detection.colorFamily} hair", "Position 1 front photo compatibility"]
  }
]

RULES:
- Only return ${detection.colorFamily} family wigs
- Score based on color similarity within ${detection.colorFamily} family
- All have Position 1 front-facing photos
- Return only JSON, no other text`;

    const matchingResponse = await openai.chat.completions.create({
      model: "gpt-4o", // Advanced model
      messages: [
        {
          role: "user",
          content: matchingPrompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    });

    const matchingContent = matchingResponse.choices[0]?.message?.content;
    if (!matchingContent) {
      throw new Error('No matching response');
    }

    console.log('✅ Fast matching analysis completed');

    // Parse matches
    let matches;
    try {
      const cleanJson = matchingContent.replace(/```json\n?|\n?```/g, '').trim();
      const jsonMatch = cleanJson.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        matches = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found');
      }
    } catch (parseError) {
      console.error('❌ Failed to parse matching response:', matchingContent);
      throw new Error('Matching response format error');
    }

    // Enhance matches with Position 1 image data
    const enhancedMatches: FastMatch[] = matches.map((match: any) => {
      const product = colorProducts.find(p => p.id === match.id);
      
      return {
        ...match,
        detectedHairColor: detection.colorFamily,
        chunkSearched: `${detection.colorFamily}_position1.json`,
        image: product?.image ? {
          url: product.image.url,
          altText: product.image.altText || match.title
        } : undefined
      };
    });

    console.log(`✅ Fast direct matching completed: ${enhancedMatches.length} ${detection.colorFamily} matches`);
    
    // Log results
    enhancedMatches.slice(0, 3).forEach((match, i) => {
      console.log(`  ${i + 1}. ${match.title} (${Math.round(match.matchScore * 100)}%)`);
      console.log(`     Color: ${match.colorName}`);
      console.log(`     Image: ${match.image?.url ? '✅ Position 1' : '❌'}`);
    });

    return enhancedMatches;

  } catch (error) {
    console.error('❌ Fast direct matching error:', error);
    throw error;
  }
}






