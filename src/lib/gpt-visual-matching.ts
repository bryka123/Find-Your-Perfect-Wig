import OpenAI from 'openai';
import * as fs from 'fs';

/**
 * GPT-4 Vision Direct Matching System
 * 
 * Uses ChatGPT to visually compare user's hair image with product images
 * and make matching decisions based on actual visual similarity
 */

export interface VisualMatch {
  id: string;
  title: string;
  colorName: string;
  price: string;
  matchScore: number; // 0-1 from GPT analysis
  reasons: string[];
  image?: {
    url: string;
    altText: string;
  };
}

export interface VisualMatchingRequest {
  userImageData: string; // Base64 data URL
  candidateProducts: Array<{
    id: string;
    title: string;
    colorName: string;
    price: string;
    imageUrl?: string;
    colorChipUrl?: string;
  }>;
  maxResults?: number;
  userPreferences?: string; // Additional text description
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
 * Use GPT-4 Vision to visually match user's hair with product options
 */
export async function performVisualMatching(request: VisualMatchingRequest): Promise<VisualMatch[]> {
  console.log('🤖 Starting GPT-4 Vision direct matching...');
  
  const openai = getOpenAIClient();
  const maxResults = request.maxResults || 6;
  
  // Prepare the prompt with all candidate products
  const productList = request.candidateProducts.map((product, index) => 
    `${index + 1}. ID: ${product.id}
   Title: ${product.title}
   Color: ${product.colorName}
   Price: $${product.price}
   Image: ${product.imageUrl || 'No image'}
   Color Chip: ${product.colorChipUrl || 'No color chip'}`
  ).join('\n\n');

  // Step 1: Analyze the user's hair image first
  console.log('🔍 Step 1: Analyzing user\'s hair...');
  
  const analysisPrompt = `Analyze this hair image and describe the hair characteristics. Return ONLY a JSON object:

{
  "color": {
    "family": "blonde/brunette/black/red/gray/white",
    "shade": "specific shade description",
    "undertone": "warm/cool/neutral",
    "lightness": "light/medium/dark",
    "hex_estimate": "#RRGGBB"
  },
  "style": {
    "length": "short/medium/long",
    "texture": "straight/wavy/curly", 
    "styling": "description"
  },
  "matching_criteria": "Brief description of what wig colors would match this hair"
}

Focus on accurate color analysis for wig matching.`;

  const analysisResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: analysisPrompt },
          { 
            type: "image_url", 
            image_url: { 
              url: request.userImageData,
              detail: "high"
            } 
          }
        ]
      }
    ],
    max_tokens: 800,
    temperature: 0.1
  });

  const analysisContent = analysisResponse.choices[0]?.message?.content;
  if (!analysisContent) {
    throw new Error('Failed to analyze user hair image');
  }

  console.log('✅ User hair analysis completed');
  
  let hairAnalysis;
  try {
    const cleanAnalysisJson = analysisContent.replace(/```json\n?|\n?```/g, '').trim();
    hairAnalysis = JSON.parse(cleanAnalysisJson);
  } catch (parseError) {
    console.error('Failed to parse hair analysis:', analysisContent);
    throw new Error('Failed to parse hair analysis');
  }

  console.log(`🎨 Detected: ${hairAnalysis.color.family} (${hairAnalysis.color.shade})`);

  // Step 2: Find matches based on hair analysis
  console.log('🔍 Step 2: Finding matches based on hair characteristics...');
  
  const matchingPrompt = `Based on this hair analysis, find the best wig matches from the product catalog.

USER'S HAIR ANALYSIS:
${JSON.stringify(hairAnalysis, null, 2)}

PRODUCT CATALOG:
${productList}

Return ONLY a JSON array of the top ${maxResults} matches:

[
  {
    "id": "product_id",
    "title": "product_title", 
    "colorName": "actual_color_name",
    "price": "price",
    "matchScore": 0.95,
    "reasons": ["why this matches the user's ${hairAnalysis.color.family} ${hairAnalysis.color.shade} hair", "specific matching reason"]
  }
]

MATCHING RULES:
1. Focus on color family matching first (${hairAnalysis.color.family} hair needs ${hairAnalysis.color.family} wigs)
2. Consider undertones (${hairAnalysis.color.undertone}) 
3. Avoid colors that are clearly different families (no red wigs for blonde hair, no brown wigs for blonde hair)
4. Score based on color similarity, then style
5. Return only JSON, no other text

Be strict about color family matching - don't match red with blonde or brown with blonde.`;

  try {
    // Step 3: Make second API call for matching
    const matchingResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: matchingPrompt }
          ]
        }
      ],
      max_tokens: 1500,
      temperature: 0.1
    });

    const matchingContent = matchingResponse.choices[0]?.message?.content;
    if (!matchingContent) {
      throw new Error('No matching response from GPT-4');
    }

    console.log('✅ Received matching analysis from GPT-4');

    // Parse the JSON response
    let matches: VisualMatch[];
    try {
      const cleanJson = matchingContent.replace(/```json\n?|\n?```/g, '').trim();
      matches = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:', matchingContent);
      throw new Error(`Failed to parse GPT response as JSON: ${parseError}`);
    }

    // Validate the response structure
    if (!Array.isArray(matches)) {
      throw new Error('GPT response is not an array');
    }

    console.log(`✅ GPT-4 Visual Matching found ${matches.length} matches`);
    
    // Log the top matches for debugging
    matches.slice(0, 3).forEach((match, i) => {
      console.log(`  ${i + 1}. ${match.title} (${Math.round(match.matchScore * 100)}%)`);
      console.log(`     Color: ${match.colorName}`);
      console.log(`     Reasons: ${match.reasons.join(', ')}`);
    });

    return matches;

  } catch (error) {
    console.error('❌ GPT-4 Visual Matching error:', error);
    throw error;
  }
}

/**
 * Get candidate products from the database for visual comparison
 */
export async function getCandidateProducts(limit: number = 50): Promise<VisualMatchingRequest['candidateProducts']> {
  // Read from our corrected local data
  const content = fs.readFileSync('./chiquel_with_real_images.jsonl', 'utf-8');
  const lines = content.trim().split('\n');
  
  const candidates: VisualMatchingRequest['candidateProducts'] = [];
  
  // Get a diverse sample of products
  const sampleLines = lines
    .sort(() => 0.5 - Math.random()) // Randomize
    .slice(0, limit);
  
  for (const line of sampleLines) {
    try {
      const record = JSON.parse(line);
      const colorOption = record.attrs?.selectedOptions?.find((opt: any) => 
        opt.name.toLowerCase().includes('color')
      );
      
      if (colorOption && record.attrs?.availableForSale) {
        candidates.push({
          id: record.id,
          title: record.title,
          colorName: colorOption.value,
          price: record.attrs.price,
          imageUrl: record.image?.url,
          colorChipUrl: generateColorChipUrl(colorOption.value)
        });
      }
    } catch (e) {
      // Skip invalid records
    }
  }
  
  console.log(`📊 Selected ${candidates.length} candidate products for GPT comparison`);
  return candidates;
}

// Helper to generate color chip URLs
function generateColorChipUrl(colorName: string): string {
  const normalized = colorName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  return `https://cdn.shopify.com/s/files/1/0506/4710/5726/files/${normalized}.jpg`;
}

/**
 * Complete visual matching pipeline
 */
export async function performCompleteVisualMatching(
  userImageData: string,
  userPreferences?: string,
  maxResults: number = 6
): Promise<VisualMatch[]> {
  console.log('🚀 Starting Complete GPT-4 Visual Matching Pipeline');
  
  // Step 1: Get candidate products from database
  const candidates = await getCandidateProducts(100); // Get more candidates for better selection
  
  // Step 2: Use GPT-4 Vision to compare and match
  const request: VisualMatchingRequest = {
    userImageData,
    candidateProducts: candidates,
    maxResults,
    userPreferences
  };
  
  const matches = await performVisualMatching(request);
  
  console.log(`✅ Visual matching complete: ${matches.length} matches found`);
  return matches;
}
