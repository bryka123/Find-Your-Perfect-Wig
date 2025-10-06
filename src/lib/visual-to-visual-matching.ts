/**
 * Visual-to-Visual Matching System
 * 
 * Performs true visual comparison between user image and product images
 * Uses GPT-4 Vision to analyze actual product photos for better style matching
 */

import OpenAI from 'openai';
import * as fs from 'fs';

export interface VisualStyleMatch {
  productId: string;
  productTitle: string;
  variantColor: string;
  price: string;
  
  // Visual matching scores
  visualStyleScore: number; // Based on actual image comparison
  visualColorScore: number; // Based on visual color analysis
  overallVisualScore: number;
  
  // Detailed visual analysis
  styleAnalysis: {
    userStyle: string;
    productStyle: string;
    similarities: string[];
    differences: string[];
  };
  
  colorAnalysis: {
    userColor: string;
    productColor: string;
    colorMatch: string;
  };
  
  image: {
    url: string;
    analyzed: boolean;
  };
  
  matchConfidence: 'high' | 'medium' | 'low';
  recommendation: string;
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
 * Analyze user image for detailed characteristics
 */
async function analyzeUserImage(imageData: string): Promise<any> {
  console.log('🔍 Analyzing user image for visual characteristics...');
  
  const openai = getOpenAIClient();
  
  const prompt = `Analyze this person's hair for wig matching. Focus on VISUAL characteristics:

Return a JSON object with:
{
  "hairStyle": {
    "overall": "describe the overall hairstyle",
    "length": "exact length description",
    "texture": "straight/wavy/curly and how much",
    "volume": "thin/medium/full",
    "layers": "describe layering",
    "movement": "how the hair flows",
    "faceFraming": "how it frames the face",
    "specificFeatures": ["list specific style features"]
  },
  "hairColor": {
    "baseColor": "main color",
    "highlights": "describe highlights if any",
    "depth": "color depth and dimension",
    "tone": "warm/cool/neutral",
    "visualAppearance": "how the color looks in the photo"
  },
  "overallLook": "describe the complete visual appearance"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageData, detail: "high" } }
          ]
        }
      ],
      max_tokens: 800,
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Failed to parse user image analysis');
    
  } catch (error) {
    console.error('User image analysis error:', error);
    throw error;
  }
}

/**
 * Compare user image with product images visually
 */
export async function performVisualComparison(
  userImageData: string,
  productImages: Array<{
    id: string;
    title: string;
    color: string;
    price: string;
    imageUrl: string;
  }>,
  maxResults: number = 10
): Promise<VisualStyleMatch[]> {
  console.log('🎯 Starting Visual-to-Visual Comparison...');
  
  const openai = getOpenAIClient();
  
  // First, analyze the user's image
  const userAnalysis = await analyzeUserImage(userImageData);
  console.log('✅ User analysis complete:', userAnalysis.overallLook);
  
  // Prepare batch comparison prompt
  const batchSize = 5; // Process 5 products at a time to avoid token limits
  const allMatches: VisualStyleMatch[] = [];
  
  for (let i = 0; i < productImages.length; i += batchSize) {
    const batch = productImages.slice(i, Math.min(i + batchSize, productImages.length));
    
    console.log(`📸 Analyzing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(productImages.length/batchSize)}...`);
    
    // Create comparison prompt
    const comparisonPrompt = `You are a professional wig stylist. Compare the user's hair with these wig products VISUALLY.

USER'S HAIR ANALYSIS:
${JSON.stringify(userAnalysis, null, 2)}

For each product image, analyze:
1. How similar is the STYLE visually (cut, layers, movement, length)?
2. How similar is the overall LOOK and FEEL?
3. Would this wig recreate the user's hairstyle?
4. Color compatibility (but focus more on style)

Products to analyze:
${batch.map((p, idx) => `${idx + 1}. ${p.title} (${p.color}) - $${p.price}`).join('\n')}

Return a JSON array with visual comparison for each product:
[
  {
    "index": 0,
    "visualStyleScore": 0.0-1.0,
    "visualColorScore": 0.0-1.0,
    "styleMatch": {
      "similarities": ["list visual similarities"],
      "differences": ["list visual differences"],
      "overallFit": "how well this recreates the user's style"
    },
    "recommendation": "why this would or wouldn't work"
  }
]

Focus on VISUAL COMPARISON - does the wig LOOK like the user's hairstyle?`;

    try {
      // Build message with all images
      const messageContent: any[] = [
        { type: "text", text: comparisonPrompt },
        { type: "text", text: "USER'S HAIR:" },
        { type: "image_url", image_url: { url: userImageData, detail: "high" } },
        { type: "text", text: "PRODUCT WIGS TO COMPARE:" }
      ];
      
      // Add each product image (all validated)
      batch.forEach((product, idx) => {
        messageContent.push(
          { type: "text", text: `${idx + 1}. ${product.title} (${product.color}):` },
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
        temperature: 0.1
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
        console.warn('Failed to parse comparison response, using fallback');
        comparisons = batch.map((_, idx) => ({
          index: idx,
          visualStyleScore: 0.5,
          visualColorScore: 0.5,
          styleMatch: {
            similarities: ['Unable to analyze'],
            differences: ['Unable to analyze'],
            overallFit: 'Analysis failed'
          },
          recommendation: 'Manual review needed'
        }));
      }

      // Convert to VisualStyleMatch format
      comparisons.forEach((comp: any) => {
        const product = batch[comp.index];
        
        const match: VisualStyleMatch = {
          productId: product.id,
          productTitle: product.title,
          variantColor: product.color,
          price: product.price,
          
          visualStyleScore: comp.visualStyleScore,
          visualColorScore: comp.visualColorScore,
          overallVisualScore: (comp.visualStyleScore * 0.7 + comp.visualColorScore * 0.3), // Weight style more
          
          styleAnalysis: {
            userStyle: userAnalysis.hairStyle.overall,
            productStyle: comp.styleMatch.overallFit,
            similarities: comp.styleMatch.similarities,
            differences: comp.styleMatch.differences
          },
          
          colorAnalysis: {
            userColor: userAnalysis.hairColor.baseColor,
            productColor: product.color,
            colorMatch: `${Math.round(comp.visualColorScore * 100)}% match`
          },
          
          image: {
            url: product.imageUrl,
            analyzed: true
          },
          
          matchConfidence: comp.visualStyleScore > 0.8 ? 'high' : 
                          comp.visualStyleScore > 0.6 ? 'medium' : 'low',
          
          recommendation: comp.recommendation
        };
        
        allMatches.push(match);
      });
      
    } catch (error) {
      console.error(`Batch comparison error:`, error);
      // Add fallback matches for this batch
      batch.forEach(product => {
        allMatches.push({
          productId: product.id,
          productTitle: product.title,
          variantColor: product.color,
          price: product.price,
          visualStyleScore: 0.5,
          visualColorScore: 0.5,
          overallVisualScore: 0.5,
          styleAnalysis: {
            userStyle: userAnalysis.hairStyle?.overall || 'unknown',
            productStyle: 'unknown',
            similarities: ['Unable to analyze'],
            differences: ['Unable to analyze']
          },
          colorAnalysis: {
            userColor: userAnalysis.hairColor?.baseColor || 'unknown',
            productColor: product.color,
            colorMatch: 'Unable to determine'
          },
          image: {
            url: product.imageUrl,
            analyzed: false
          },
          matchConfidence: 'low',
          recommendation: 'Manual review recommended'
        });
      });
    }
  }
  
  // Sort by overall visual score
  allMatches.sort((a, b) => b.overallVisualScore - a.overallVisualScore);
  
  // Return top matches
  const topMatches = allMatches.slice(0, maxResults);
  
  console.log('✅ Visual comparison complete');
  console.log(`📊 Top match: ${topMatches[0]?.productTitle} (${Math.round(topMatches[0]?.overallVisualScore * 100)}% visual match)`);
  
  return topMatches;
}

/**
 * Validate if an image URL is accessible
 */
async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok && response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Load products with images for visual comparison
 */
export async function loadProductsWithImages(
  colorFamily?: string,
  limit: number = 50
): Promise<Array<{ id: string; title: string; color: string; price: string; imageUrl: string }>> {
  console.log('📚 Loading products with images for visual comparison...');
  
  // Use the valid image catalog instead of main catalog
  const catalogPath = './valid_image_catalog.json';
  
  if (!fs.existsSync(catalogPath)) {
    throw new Error('Product catalog not found');
  }
  
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  let products = catalog.products || [];
  
  // Filter by color family if specified
  if (colorFamily && catalog.byColorFamily) {
    products = catalog.byColorFamily[colorFamily] || [];
    console.log(`  Filtering for ${colorFamily}: ${products.length} products`);
  }
  
  // All products in valid catalog already have validated images
  const productsWithImages = products
    .slice(0, limit)
    .map((p: any) => ({
      id: p.id,
      title: p.title,
      color: p.colorName || 'unknown',
      price: p.price || '0',
      imageUrl: p.image.url
    }));
  
  console.log(`✅ Loaded ${productsWithImages.length} products with validated images`);
  
  return productsWithImages;
}

/**
 * Complete visual-to-visual matching pipeline
 */
export async function performVisualToVisualMatching(
  userImageData: string,
  maxResults: number = 10
): Promise<VisualStyleMatch[]> {
  console.log('🚀 Starting Visual-to-Visual Matching Pipeline');
  console.log('==============================================');
  
  try {
    // Quick analysis to determine color family
    const openai = getOpenAIClient();
    const quickAnalysis = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What is the primary hair color family? Reply with just one word: blonde/brunette/black/red/gray" },
            { type: "image_url", image_url: { url: userImageData, detail: "low" } }
          ]
        }
      ],
      max_tokens: 10
    });
    
    const colorFamily = quickAnalysis.choices[0]?.message?.content?.toLowerCase().trim() || 'brunette';
    console.log(`🎨 Detected color family: ${colorFamily}`);
    
    // Load products with images from detected color family
    const productsWithImages = await loadProductsWithImages(colorFamily, 30);
    
    // Also load some from adjacent color families for variety
    const adjacentFamily = colorFamily === 'blonde' ? 'brunette' : 
                          colorFamily === 'brunette' ? 'blonde' : 
                          colorFamily;
    const adjacentProducts = await loadProductsWithImages(adjacentFamily, 20);
    
    // Combine products
    const allProducts = [...productsWithImages, ...adjacentProducts];
    
    console.log(`📸 Analyzing ${allProducts.length} product images...`);
    
    // Perform visual comparison
    const matches = await performVisualComparison(
      userImageData,
      allProducts,
      maxResults
    );
    
    console.log('\n✅ Visual-to-Visual Matching Complete!');
    console.log('Top 3 Visual Matches:');
    matches.slice(0, 3).forEach((match, i) => {
      console.log(`${i + 1}. ${match.productTitle}`);
      console.log(`   Visual Style Score: ${Math.round(match.visualStyleScore * 100)}%`);
      console.log(`   Visual Color Score: ${Math.round(match.visualColorScore * 100)}%`);
      console.log(`   Confidence: ${match.matchConfidence}`);
      console.log(`   Recommendation: ${match.recommendation}`);
    });
    
    return matches;
    
  } catch (error) {
    console.error('Visual matching pipeline error:', error);
    throw error;
  }
}

/**
 * Export for API usage
 */
export default {
  performVisualToVisualMatching,
  performVisualComparison,
  loadProductsWithImages
};
