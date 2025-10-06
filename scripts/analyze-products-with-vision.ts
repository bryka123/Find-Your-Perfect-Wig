/**
 * Pre-analyze all product images with GPT-4 Vision
 * Store detailed style attributes for accurate matching
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

interface ProductAnalysis {
  id: string;
  title: string;
  imageUrl: string;
  colorName: string;
  visualAttributes: {
    actualLength: 'pixie' | 'short' | 'bob' | 'shoulder' | 'medium' | 'long' | 'extra-long';
    lengthInches?: string; // e.g., "10-12", "14-16", "18-22"
    texture: 'straight' | 'wavy' | 'curly' | 'kinky' | 'mixed';
    style: string; // e.g., "layered bob", "straight with bangs", "curly shag"
    volume: 'thin' | 'medium' | 'thick' | 'very-thick';
    hasPart: boolean;
    hasBangs: boolean;
    isLayered: boolean;
    coverage: 'full-wig' | 'topper' | 'hairpiece' | 'extension' | 'ponytail';
    faceShape: string[]; // recommended face shapes
    confidence: number; // 0-1 confidence in analysis
  };
  analyzedAt: string;
}

/**
 * Analyze a single product image with GPT-4 Vision
 */
async function analyzeProductImage(product: any): Promise<ProductAnalysis | null> {
  try {
    const imageUrl = product.image?.url;
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
          content: `You are a professional wig stylist analyzing product images.
          Provide accurate, detailed analysis of wig attributes.
          Be precise about length measurements and style characteristics.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this wig product image and provide detailed attributes.

CRITICAL: Determine the ACTUAL wig length from the image, not from the product name.
- Pixie: Very short, above ears (6-8 inches)
- Short: Chin to jaw length (8-10 inches)
- Bob: Jaw to shoulders (10-12 inches)
- Shoulder: Touches shoulders (12-14 inches)
- Medium: Past shoulders to mid-back (14-18 inches)
- Long: Mid-back to waist (18-24 inches)
- Extra-long: Past waist (24+ inches)

Also analyze:
- Texture (straight/wavy/curly/kinky)
- Style details (layered, bangs, etc.)
- Coverage type (full wig vs topper/hairpiece/extension)
- Volume/thickness

Product name for reference: ${product.title}
Color: ${product.colorName}

Return a JSON object with these exact fields:
{
  "actualLength": "pixie|short|bob|shoulder|medium|long|extra-long",
  "lengthInches": "estimated range like 14-16",
  "texture": "straight|wavy|curly|kinky|mixed",
  "style": "descriptive style name",
  "volume": "thin|medium|thick|very-thick",
  "hasPart": true/false,
  "hasBangs": true/false,
  "isLayered": true/false,
  "coverage": "full-wig|topper|hairpiece|extension|ponytail",
  "faceShape": ["oval", "round", "square", etc],
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
      max_tokens: 500,
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

    const analysis: ProductAnalysis = {
      id: product.id,
      title: product.title,
      imageUrl: imageUrl,
      colorName: product.colorName,
      visualAttributes,
      analyzedAt: new Date().toISOString()
    };

    console.log(`   ✅ Analyzed: ${visualAttributes.actualLength} ${visualAttributes.texture} ${visualAttributes.coverage}`);
    return analysis;

  } catch (error) {
    console.error(`   ❌ Error analyzing ${product.title}:`, error);
    return null;
  }
}

/**
 * Main function to analyze all products
 */
async function analyzeAllProducts() {
  console.log('🚀 Starting GPT-4 Vision Product Analysis');
  console.log('=' .repeat(60));

  // Load product catalog
  const catalogPath = path.join(process.cwd(), 'valid_image_catalog.json');
  const catalogData = await fs.readFile(catalogPath, 'utf-8');
  const catalog = JSON.parse(catalogData);
  const products = catalog.products || [];

  console.log(`📊 Found ${products.length} products to analyze`);

  // Check for existing analysis
  const analysisPath = path.join(process.cwd(), 'product-vision-analysis.json');
  let existingAnalysis: Record<string, ProductAnalysis> = {};

  try {
    const existingData = await fs.readFile(analysisPath, 'utf-8');
    const parsed = JSON.parse(existingData);
    existingAnalysis = parsed.products || {};
    console.log(`📂 Found existing analysis for ${Object.keys(existingAnalysis).length} products`);
  } catch {
    console.log('📂 No existing analysis found, starting fresh');
  }

  // Process products in batches to avoid rate limits
  const BATCH_SIZE = 5;
  const DELAY_MS = 2000; // 2 seconds between batches
  const results: ProductAnalysis[] = [];

  // Filter out already analyzed products
  const productsToAnalyze = products.filter((p: any) => !existingAnalysis[p.id]);
  console.log(`🔄 Need to analyze ${productsToAnalyze.length} new products`);

  for (let i = 0; i < productsToAnalyze.length; i += BATCH_SIZE) {
    const batch = productsToAnalyze.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(productsToAnalyze.length/BATCH_SIZE)}`);

    // Process batch in parallel
    const batchPromises = batch.map((product: any) => analyzeProductImage(product));
    const batchResults = await Promise.all(batchPromises);

    // Add successful analyses
    batchResults.forEach(result => {
      if (result) {
        results.push(result);
        existingAnalysis[result.id] = result;
      }
    });

    // Save progress after each batch
    const allAnalyses = Object.values(existingAnalysis);
    await fs.writeFile(
      analysisPath,
      JSON.stringify({
        products: existingAnalysis,
        summary: {
          totalProducts: products.length,
          analyzedCount: allAnalyses.length,
          lastUpdated: new Date().toISOString()
        }
      }, null, 2)
    );

    console.log(`   💾 Saved progress: ${allAnalyses.length}/${products.length} analyzed`);

    // Rate limit delay
    if (i + BATCH_SIZE < productsToAnalyze.length) {
      console.log(`   ⏳ Waiting ${DELAY_MS/1000}s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  // Generate summary statistics
  const allAnalyses = Object.values(existingAnalysis);
  const stats = {
    total: allAnalyses.length,
    byLength: {} as Record<string, number>,
    byTexture: {} as Record<string, number>,
    byCoverage: {} as Record<string, number>,
    withBangs: 0,
    layered: 0
  };

  allAnalyses.forEach((analysis: ProductAnalysis) => {
    const attrs = analysis.visualAttributes;
    stats.byLength[attrs.actualLength] = (stats.byLength[attrs.actualLength] || 0) + 1;
    stats.byTexture[attrs.texture] = (stats.byTexture[attrs.texture] || 0) + 1;
    stats.byCoverage[attrs.coverage] = (stats.byCoverage[attrs.coverage] || 0) + 1;
    if (attrs.hasBangs) stats.withBangs++;
    if (attrs.isLayered) stats.layered++;
  });

  console.log('\n' + '=' .repeat(60));
  console.log('✅ Analysis Complete!');
  console.log(`📊 Analyzed ${allAnalyses.length} products`);
  console.log('\n📈 Statistics:');
  console.log('By Length:', stats.byLength);
  console.log('By Texture:', stats.byTexture);
  console.log('By Coverage:', stats.byCoverage);
  console.log(`With Bangs: ${stats.withBangs}`);
  console.log(`Layered: ${stats.layered}`);
  console.log(`\n💾 Results saved to: product-vision-analysis.json`);
}

// Run if executed directly
if (require.main === module) {
  analyzeAllProducts().catch(console.error);
}

export { analyzeAllProducts, analyzeProductImage };