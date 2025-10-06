/**
 * Exact Visual Matching System
 * 
 * Prioritizes exact visual matches when user uploads product images
 * Uses GPT-4 Vision to detect identical or near-identical images
 */

import OpenAI from 'openai';
import * as fs from 'fs';

export interface ExactVisualMatch {
  productId: string;
  productTitle: string;
  variantColor: string;
  price: string;
  
  // Visual matching scores
  visualIdentityScore: number; // How identical the images are (0-1)
  styleScore: number;
  colorScore: number;
  overallScore: number;
  
  matchType: 'exact' | 'near-exact' | 'similar' | 'related';
  
  visualAnalysis: {
    isExactMatch: boolean;
    identicalFeatures: string[];
    differences: string[];
    confidence: number;
  };
  
  image: {
    url: string;
    altText?: string;
  };
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
 * Perform exact visual matching with emphasis on identical images
 */
export async function performExactVisualMatching(
  userImageData: string,
  maxResults: number = 10
): Promise<ExactVisualMatch[]> {
  console.log('🎯 Starting Exact Visual Matching...');
  
  const openai = getOpenAIClient();
  
  // Load products including reference products
  const products = await loadProductsWithReferenceFirst();
  console.log(`📸 Comparing against ${products.length} products (reference products first)`);
  
  // First pass: Check for exact matches
  console.log('🔍 Phase 1: Checking for exact visual matches...');
  
  const batchSize = 10; // Smaller batches for more detailed comparison
  const allMatches: ExactVisualMatch[] = [];
  
  for (let i = 0; i < Math.min(products.length, 50); i += batchSize) {
    const batch = products.slice(i, Math.min(i + batchSize, products.length));
    
    console.log(`  Batch ${Math.floor(i/batchSize) + 1}: Comparing ${batch.length} products...`);
    
    const exactMatchPrompt = `You are a visual comparison expert. Your task is to identify if the user's image is IDENTICAL or NEARLY IDENTICAL to any of these product images.

CRITICAL INSTRUCTION: 
- If you see THE EXACT SAME WIG/PRODUCT in both images, give it a visualIdentityScore of 0.95-1.0
- Look for identical styling, color, cut, waves, layers - everything that makes it the same product
- Even if the photo angle is slightly different, if it's clearly the same wig product, mark it as exact match

For each product, analyze:
1. Is this the EXACT SAME wig/product? (not just similar - the actual same product)
2. Are the waves, layers, color gradients in the same positions?
3. Is the overall shape and styling identical?
4. Could this be the same wig photographed from a slightly different angle?

Products to compare:
${batch.map((p, idx) => `${idx + 1}. ${p.title} (${p.color})`).join('\n')}

Return a JSON array:
[
  {
    "index": 0-based index,
    "visualIdentityScore": 0.0-1.0 (1.0 = identical image, 0.95+ = same product different angle),
    "isExactMatch": true/false,
    "identicalFeatures": ["list what's identical"],
    "differences": ["list any differences"],
    "confidence": 0.0-1.0
  }
]

IMPORTANT: Be very generous with visualIdentityScore if it appears to be the same product!`;

    try {
      const messageContent: any[] = [
        { type: "text", text: exactMatchPrompt },
        { type: "text", text: "USER'S IMAGE:" },
        { type: "image_url", image_url: { url: userImageData, detail: "high" } },
        { type: "text", text: "PRODUCT IMAGES TO COMPARE:" }
      ];
      
      // Add product images
      batch.forEach((product, idx) => {
        messageContent.push(
          { type: "text", text: `${idx + 1}. ${product.title}:` },
          { type: "image_url", image_url: { url: product.imageUrl, detail: "high" } }
        );
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: messageContent
          }
        ],
        max_tokens: 2000,
        temperature: 0.1 // Low temperature for consistent detection
      });

      const content = response.choices[0]?.message?.content || '';
      
      // Parse response
      let comparisons;
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          comparisons = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON array found');
        }
      } catch (parseError) {
        console.warn('Failed to parse comparison response');
        comparisons = batch.map((_, idx) => ({
          index: idx,
          visualIdentityScore: 0.5,
          isExactMatch: false,
          identicalFeatures: [],
          differences: ['Unable to analyze'],
          confidence: 0.5
        }));
      }

      // Convert to ExactVisualMatch format
      comparisons.forEach((comp: any) => {
        const product = batch[comp.index];
        
        // Determine match type based on score
        let matchType: 'exact' | 'near-exact' | 'similar' | 'related';
        if (comp.visualIdentityScore >= 0.95) {
          matchType = 'exact';
        } else if (comp.visualIdentityScore >= 0.85) {
          matchType = 'near-exact';
        } else if (comp.visualIdentityScore >= 0.70) {
          matchType = 'similar';
        } else {
          matchType = 'related';
        }
        
        const match: ExactVisualMatch = {
          productId: product.id,
          productTitle: product.title,
          variantColor: product.color,
          price: product.price,
          
          visualIdentityScore: comp.visualIdentityScore,
          styleScore: comp.visualIdentityScore * 0.9, // High correlation for exact matches
          colorScore: comp.visualIdentityScore * 0.95,
          overallScore: comp.visualIdentityScore, // Identity score is the primary score
          
          matchType,
          
          visualAnalysis: {
            isExactMatch: comp.isExactMatch,
            identicalFeatures: comp.identicalFeatures || [],
            differences: comp.differences || [],
            confidence: comp.confidence
          },
          
          image: {
            url: product.imageUrl,
            altText: product.title
          }
        };
        
        allMatches.push(match);
        
        // Log if we found an exact match
        if (comp.visualIdentityScore >= 0.95) {
          console.log(`    🎯 EXACT MATCH FOUND: ${product.title} (${Math.round(comp.visualIdentityScore * 100)}%)`);
        }
      });
      
    } catch (error) {
      console.error(`Batch comparison error:`, error);
    }
  }
  
  // Sort by visual identity score (exact matches first)
  allMatches.sort((a, b) => b.visualIdentityScore - a.visualIdentityScore);
  
  // Log results
  console.log('\n📊 Matching Results:');
  const exactMatches = allMatches.filter(m => m.matchType === 'exact');
  const nearExactMatches = allMatches.filter(m => m.matchType === 'near-exact');
  
  console.log(`  Exact matches: ${exactMatches.length}`);
  console.log(`  Near-exact matches: ${nearExactMatches.length}`);
  
  if (exactMatches.length > 0) {
    console.log('\n🎯 Top Exact Match:');
    console.log(`  ${exactMatches[0].productTitle}`);
    console.log(`  Identity Score: ${Math.round(exactMatches[0].visualIdentityScore * 100)}%`);
    console.log(`  Color: ${exactMatches[0].variantColor}`);
  }
  
  // Return top matches
  return allMatches.slice(0, maxResults);
}

/**
 * Load products with reference products first for priority checking
 */
async function loadProductsWithReferenceFirst(): Promise<any[]> {
  const allProducts: any[] = [];
  
  // 1. Load reference products first (known exact products)
  if (fs.existsSync('./reference_products.json')) {
    const referenceData = JSON.parse(fs.readFileSync('./reference_products.json', 'utf-8'));
    const referenceProducts = (referenceData.products || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      color: p.colorName,
      price: p.price,
      imageUrl: p.image.url,
      isReference: true
    }));
    
    allProducts.push(...referenceProducts);
    console.log(`  📌 Loaded ${referenceProducts.length} reference products (priority)`);
  }
  
  // 2. Load valid catalog products
  if (fs.existsSync('./valid_image_catalog.json')) {
    const validCatalog = JSON.parse(fs.readFileSync('./valid_image_catalog.json', 'utf-8'));
    const catalogProducts = (validCatalog.products || [])
      .filter((p: any) => !allProducts.some(ref => ref.id === p.id)) // Avoid duplicates
      .slice(0, 100) // Limit for performance
      .map((p: any) => ({
        id: p.id,
        title: p.title,
        color: p.colorName,
        price: p.price,
        imageUrl: p.image.url,
        isReference: false
      }));
    
    allProducts.push(...catalogProducts);
    console.log(`  📚 Loaded ${catalogProducts.length} catalog products`);
  }
  
  return allProducts;
}

/**
 * Test exact matching with Sorrento Surprise
 */
export async function testSorrentoMatching(imageData: string) {
  console.log('\n🧪 Testing Sorrento Surprise Exact Matching');
  console.log('==========================================');
  
  const matches = await performExactVisualMatching(imageData, 5);
  
  console.log('\nTop 5 Matches:');
  matches.forEach((match, i) => {
    console.log(`\n${i + 1}. ${match.productTitle}`);
    console.log(`   Type: ${match.matchType.toUpperCase()}`);
    console.log(`   Visual Identity: ${Math.round(match.visualIdentityScore * 100)}%`);
    console.log(`   Color: ${match.variantColor}`);
    console.log(`   Price: $${match.price}`);
    
    if (match.visualAnalysis.isExactMatch) {
      console.log(`   ✅ EXACT MATCH DETECTED`);
    }
    
    if (match.visualAnalysis.identicalFeatures.length > 0) {
      console.log(`   Identical: ${match.visualAnalysis.identicalFeatures.join(', ')}`);
    }
  });
  
  return matches;
}

export default {
  performExactVisualMatching,
  testSorrentoMatching
};






