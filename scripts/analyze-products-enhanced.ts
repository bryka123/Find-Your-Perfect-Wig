/**
 * Enhanced Product Analysis with Detailed Style Attributes
 * Adds more nuanced style detection for better matching
 */

import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in .env.local');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface EnhancedVisualAttributes {
  // Basic attributes (existing)
  actualLength: 'pixie' | 'short' | 'bob' | 'shoulder' | 'medium' | 'long' | 'extra-long';
  lengthInches?: string;
  texture: 'straight' | 'wavy' | 'curly' | 'kinky' | 'mixed';
  coverage: 'full-wig' | 'topper' | 'hairpiece' | 'extension' | 'ponytail';

  // Enhanced style attributes (NEW)
  silhouette: 'sleek' | 'voluminous' | 'tousled' | 'spiky' | 'smooth' | 'natural' | 'edgy';
  overallStyle: string; // Detailed style description
  faceFraming: 'side-swept' | 'center-parted' | 'off-center' | 'face-framing-layers' | 'none';
  partStyle: 'center' | 'side' | 'zigzag' | 'no-part' | 'flexible';
  bangStyle: 'side-swept' | 'straight-across' | 'wispy' | 'curtain' | 'none';

  // Style characteristics (NEW)
  formality: 'casual' | 'versatile' | 'formal' | 'edgy' | 'classic';
  ageGroup: 'youthful' | 'mature' | 'versatile';
  maintenanceLevel: 'low' | 'medium' | 'high';
  volume: 'thin' | 'medium' | 'thick' | 'very-thick';

  // Technical attributes
  heatFriendly: boolean;
  isLayered: boolean;
  hasBangs: boolean;
  hasHighlights: boolean;
  isRooted: boolean;

  // Suitability
  faceShapes: string[]; // oval, round, square, heart, etc.
  occasions: string[]; // everyday, special-event, professional, casual

  confidence: number; // 0-1 confidence in analysis
}

interface EnhancedProductAnalysis {
  id: string;
  title: string;
  imageUrl: string;
  colorName: string;
  visualAttributes: EnhancedVisualAttributes;
  analyzedAt: string;
  version: string; // Track analysis version
}

/**
 * Analyze a single product image with enhanced attributes
 */
async function analyzeProductEnhanced(product: any): Promise<EnhancedProductAnalysis | null> {
  try {
    // The image URL is directly on the product from the existing analysis
    const imageUrl = product.imageUrl || product.image?.url;
    if (!imageUrl) {
      console.log(`   ⚠️ No image for ${product.title}`);
      return null;
    }

    console.log(`   🔍 Analyzing: ${product.title}`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert wig stylist analyzing product images with extreme attention to detail.
          Focus on style characteristics that affect real-world wearability and matching.
          Be very specific about silhouette and overall style impression.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this wig product image comprehensively.

CRITICAL STYLE ANALYSIS:

1. SILHOUETTE - Choose the most accurate:
   - sleek: Smooth, polished, close to head
   - smooth: Natural smooth flow, not overly styled
   - natural: Realistic, everyday look
   - voluminous: Full body, lots of volume
   - tousled: Messy, beachy, casual texture
   - spiky: Edgy, punk, deliberately spiked
   - edgy: Choppy, modern, fashion-forward

2. LENGTH - Be precise:
   - pixie: Very short, above ears (6-8")
   - short: Chin to jaw (8-10")
   - bob: Jaw to shoulders (10-12")
   - shoulder: Touches shoulders (12-14")
   - medium: Past shoulders (14-18")
   - long: Mid-back (18-24")
   - extra-long: Past waist (24+")

3. FORMALITY:
   - casual: Relaxed, everyday wear
   - versatile: Works for multiple occasions
   - formal: Elegant, professional
   - edgy: Fashion-forward, unconventional
   - classic: Timeless, traditional

4. FACE FRAMING:
   - How does the hair frame the face?
   - Part style and flexibility
   - Bang style if present

5. MAINTENANCE:
   - low: Wash and wear
   - medium: Some styling needed
   - high: Regular styling required

Product: ${product.title}
Color: ${product.colorName}

Return JSON with these exact fields:
{
  "actualLength": "pixie|short|bob|shoulder|medium|long|extra-long",
  "lengthInches": "e.g. 14-16",
  "texture": "straight|wavy|curly|kinky|mixed",
  "coverage": "full-wig|topper|hairpiece|extension|ponytail",
  "silhouette": "sleek|voluminous|tousled|spiky|smooth|natural|edgy",
  "overallStyle": "detailed style description in 5-10 words",
  "faceFraming": "side-swept|center-parted|off-center|face-framing-layers|none",
  "partStyle": "center|side|zigzag|no-part|flexible",
  "bangStyle": "side-swept|straight-across|wispy|curtain|none",
  "formality": "casual|versatile|formal|edgy|classic",
  "ageGroup": "youthful|mature|versatile",
  "maintenanceLevel": "low|medium|high",
  "volume": "thin|medium|thick|very-thick",
  "heatFriendly": true/false,
  "isLayered": true/false,
  "hasBangs": true/false,
  "hasHighlights": true/false,
  "isRooted": true/false,
  "faceShapes": ["oval", "round", etc],
  "occasions": ["everyday", "special-event", etc],
  "confidence": 0.0-1.0
}`
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 800,
      temperature: 0.1 // Low temperature for consistency
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.log(`   ❌ No response for ${product.title}`);
      return null;
    }

    // Extract JSON from response
    let visualAttributes;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        visualAttributes = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.log(`   ❌ Failed to parse JSON for ${product.title}:`, parseError);
      return null;
    }

    const analysis: EnhancedProductAnalysis = {
      id: product.id,
      title: product.title,
      imageUrl: imageUrl,
      colorName: product.colorName,
      visualAttributes,
      analyzedAt: new Date().toISOString(),
      version: '2.0' // Enhanced version
    };

    console.log(`   ✅ Analyzed: ${visualAttributes.actualLength} ${visualAttributes.silhouette} ${visualAttributes.coverage}`);
    return analysis;

  } catch (error) {
    console.error(`   ❌ Error analyzing ${product.title}:`, error);
    return null;
  }
}

/**
 * Update existing analyses with enhanced attributes
 */
async function enhanceProductAnalyses() {
  console.log('🚀 Starting Enhanced Product Analysis');
  console.log('=' .repeat(60));

  // Load existing analyses
  const analysisPath = path.join(process.cwd(), 'product-vision-analysis.json');
  const enhancedPath = path.join(process.cwd(), 'product-vision-enhanced.json');

  let existingAnalysis: Record<string, any> = {};
  let enhancedAnalysis: Record<string, EnhancedProductAnalysis> = {};

  // Load existing basic analysis
  try {
    const existingData = await fs.readFile(analysisPath, 'utf-8');
    const parsed = JSON.parse(existingData);
    existingAnalysis = parsed.products || {};
    console.log(`📂 Found ${Object.keys(existingAnalysis).length} existing analyses`);
  } catch {
    console.log('📂 No existing analysis found');
    return;
  }

  // Load any existing enhanced analysis
  try {
    const enhancedData = await fs.readFile(enhancedPath, 'utf-8');
    const parsed = JSON.parse(enhancedData);
    enhancedAnalysis = parsed.products || {};
    console.log(`📂 Found ${Object.keys(enhancedAnalysis).length} enhanced analyses`);
  } catch {
    console.log('📂 No enhanced analysis found, starting fresh');
  }

  // Select products that need enhanced analysis
  const productsToEnhance = Object.values(existingAnalysis)
    .filter((p: any) => {
      // Skip if already enhanced with version 2.0
      return !enhancedAnalysis[p.id] || enhancedAnalysis[p.id].version !== '2.0';
    }); // Process ALL remaining products

  console.log(`🔄 Need to enhance ${productsToEnhance.length} products`);

  // Process in batches
  const BATCH_SIZE = 3; // Smaller batches for detailed analysis
  const DELAY_MS = 3000; // Longer delay

  for (let i = 0; i < productsToEnhance.length; i += BATCH_SIZE) {
    const batch = productsToEnhance.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(productsToEnhance.length/BATCH_SIZE)}`);

    const batchPromises = batch.map((product: any) => analyzeProductEnhanced(product));
    const batchResults = await Promise.all(batchPromises);

    // Add successful analyses
    batchResults.forEach(result => {
      if (result) {
        enhancedAnalysis[result.id] = result;
      }
    });

    // Save progress
    await fs.writeFile(
      enhancedPath,
      JSON.stringify({
        products: enhancedAnalysis,
        summary: {
          totalAnalyzed: Object.keys(enhancedAnalysis).length,
          version: '2.0',
          lastUpdated: new Date().toISOString()
        }
      }, null, 2)
    );

    console.log(`   💾 Saved progress: ${Object.keys(enhancedAnalysis).length} enhanced`);

    // Rate limit delay
    if (i + BATCH_SIZE < productsToEnhance.length) {
      console.log(`   ⏳ Waiting ${DELAY_MS/1000}s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('✅ Enhancement Complete!');
  console.log(`📊 Enhanced ${Object.keys(enhancedAnalysis).length} products`);
  console.log(`💾 Results saved to: product-vision-enhanced.json`);
}

// Run if executed directly
if (require.main === module) {
  enhanceProductAnalyses().catch(console.error);
}

export { enhanceProductAnalyses, analyzeProductEnhanced };