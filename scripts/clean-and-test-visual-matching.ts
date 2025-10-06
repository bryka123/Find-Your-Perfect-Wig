#!/usr/bin/env tsx

/**
 * Clean and Test Visual Matching
 * 
 * Cleans corrupted data and tests visual matching with proper color detection
 */

import * as fs from 'fs';
import * as path from 'path';
import { performVisualComparison } from '../src/lib/visual-to-visual-matching';
import OpenAI from 'openai';

// Load environment variables
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
      }
    }
  }
}

/**
 * Convert image file to base64 data URL
 */
function imageToBase64(imagePath: string): string {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');
  const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Clean corrupted products from catalog
 */
function cleanCatalog() {
  console.log('🧹 Cleaning catalog...');
  
  const catalogPath = './valid_image_catalog.json';
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  
  // Filter out corrupted products
  const cleanProducts = catalog.products.filter((p: any) => {
    // Check for valid ID (should be numeric string)
    if (!/^\d+$/.test(p.id)) {
      console.log(`  Removing corrupted product: ${p.id}`);
      return false;
    }
    
    // Check for valid image URL
    if (!p.image?.url?.startsWith('https://')) {
      console.log(`  Removing product with invalid image: ${p.title}`);
      return false;
    }
    
    // Check for valid price (should be numeric)
    if (isNaN(parseFloat(p.price))) {
      console.log(`  Removing product with invalid price: ${p.title}`);
      return false;
    }
    
    return true;
  });
  
  console.log(`✅ Cleaned catalog: ${catalog.products.length} → ${cleanProducts.length} products`);
  
  // Rebuild color families
  const byColorFamily: { [key: string]: any[] } = {};
  cleanProducts.forEach((p: any) => {
    const family = p.colorFamily || 'unknown';
    if (!byColorFamily[family]) {
      byColorFamily[family] = [];
    }
    byColorFamily[family].push(p);
  });
  
  // Save cleaned catalog
  const cleanedCatalog = {
    metadata: {
      ...catalog.metadata,
      cleanedAt: new Date().toISOString(),
      totalProducts: cleanProducts.length
    },
    products: cleanProducts,
    byColorFamily
  };
  
  fs.writeFileSync('./clean_image_catalog.json', JSON.stringify(cleanedCatalog, null, 2));
  console.log('✅ Saved clean_image_catalog.json');
  
  return cleanedCatalog;
}

/**
 * Better color detection
 */
async function detectHairColor(imageData: string): Promise<string> {
  console.log('🎨 Detecting hair color with improved accuracy...');
  
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { 
            type: "text", 
            text: `Analyze this person's hair color. Be very precise.

Look for:
- Base color (darkest/most dominant color)
- Highlights or lighter pieces
- Overall color family

Common mistakes to avoid:
- Don't confuse brown hair with highlights as blonde
- Don't confuse warm brown as red unless it's truly red/auburn
- Caramel/honey highlights on brown hair = still brunette

Return ONLY ONE of these color families:
- blonde (for truly light/golden hair)
- brunette (for brown hair, even with highlights)
- black (for very dark/black hair)
- red (for actual red/auburn hair)
- gray (for gray/silver hair)

What is the PRIMARY color family?` 
          },
          { type: "image_url", image_url: { url: imageData, detail: "high" } }
        ]
      }
    ],
    max_tokens: 50,
    temperature: 0.1
  });
  
  const colorFamily = response.choices[0]?.message?.content?.toLowerCase().trim() || 'brunette';
  
  // Validate it's one of our expected values
  const validFamilies = ['blonde', 'brunette', 'black', 'red', 'gray'];
  const finalFamily = validFamilies.includes(colorFamily) ? colorFamily : 'brunette';
  
  console.log(`✅ Detected color family: ${finalFamily}`);
  return finalFamily;
}

/**
 * Main test function with cleaned data
 */
async function testCleanVisualMatching() {
  console.log('🎯 Testing Visual Matching with Clean Data');
  console.log('==========================================\n');
  
  // Load environment
  loadEnvFile();
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not configured');
    process.exit(1);
  }
  
  // Clean the catalog
  const cleanedCatalog = cleanCatalog();
  
  // Load sample image
  const sampleImagePath = path.join(__dirname, '..', 'sample.jpeg');
  if (!fs.existsSync(sampleImagePath)) {
    console.error('❌ Sample image not found');
    process.exit(1);
  }
  
  console.log('\n📸 Loading sample image...');
  const imageData = imageToBase64(sampleImagePath);
  
  try {
    // Better color detection
    const detectedColor = await detectHairColor(imageData);
    
    // Get products from detected color family
    const colorProducts = cleanedCatalog.byColorFamily[detectedColor] || [];
    console.log(`\n📦 Found ${colorProducts.length} ${detectedColor} products`);
    
    // Also get some from adjacent colors for variety
    let adjacentProducts: any[] = [];
    if (detectedColor === 'brunette') {
      adjacentProducts = [
        ...(cleanedCatalog.byColorFamily['blonde'] || []).slice(0, 10),
        ...(cleanedCatalog.byColorFamily['black'] || []).slice(0, 5)
      ];
    } else if (detectedColor === 'blonde') {
      adjacentProducts = (cleanedCatalog.byColorFamily['brunette'] || []).slice(0, 10);
    }
    
    // Prepare products for comparison
    const productsToCompare = [
      ...colorProducts.slice(0, 20),
      ...adjacentProducts
    ].map(p => ({
      id: p.id,
      title: p.title,
      color: p.colorName,
      price: p.price,
      imageUrl: p.image.url
    }));
    
    console.log(`\n🔄 Comparing ${productsToCompare.length} products visually...`);
    
    // Perform visual comparison
    const matches = await performVisualComparison(
      imageData,
      productsToCompare,
      10
    );
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 VISUAL MATCHING RESULTS');
    console.log('='.repeat(70) + '\n');
    
    matches.forEach((match, index) => {
      console.log(`${index + 1}. ${match.productTitle}`);
      console.log(`   Color: ${match.variantColor}`);
      console.log(`   Style Score: ${Math.round(match.visualStyleScore * 100)}%`);
      console.log(`   Color Score: ${Math.round(match.visualColorScore * 100)}%`);
      console.log(`   Overall: ${Math.round(match.overallVisualScore * 100)}%`);
      console.log(`   Confidence: ${match.matchConfidence}`);
      console.log('');
    });
    
    console.log('='.repeat(70));
    console.log('✅ Visual matching completed successfully!');
    console.log('📸 Products were compared using actual images');
    console.log('🎯 Style matching based on visual characteristics');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testCleanVisualMatching().catch(console.error);
}
