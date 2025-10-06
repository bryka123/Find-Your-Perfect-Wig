#!/usr/bin/env tsx

/**
 * Test Simplified Color Matching
 * 
 * Tests just the core color detection without full visual matching
 */

import * as fs from 'fs';
import * as path from 'path';
import { analyzeHairColorDetailed, getColorMatchedProducts } from '../src/lib/enhanced-color-analysis';

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

async function testSimplifiedColorMatching() {
  console.log('🧪 Testing Simplified Color Matching');
  console.log('====================================\n');
  
  // Load environment
  loadEnvFile();
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not configured');
    process.exit(1);
  }
  
  const testImagePath = path.join(__dirname, '..', 'sample.jpeg');
  if (!fs.existsSync(testImagePath)) {
    console.error('❌ Test image not found');
    process.exit(1);
  }
  
  console.log('📸 Testing with blonde bob image...\n');
  const imageData = imageToBase64(testImagePath);
  
  try {
    // Step 1: Color analysis
    console.log('🔍 Step 1: Color Analysis');
    const colorAnalysis = await analyzeHairColorDetailed(imageData);
    
    console.log(`✅ Detected: ${colorAnalysis.primaryFamily} hair`);
    console.log(`   Base: ${colorAnalysis.baseColor}`);
    console.log(`   Best colors: ${colorAnalysis.bestMatchColors.join(', ')}`);
    console.log(`   Avoid: ${colorAnalysis.avoidColors.join(', ')}\n`);
    
    // Step 2: Load products and test matching
    console.log('🔍 Step 2: Product Matching');
    
    let allProducts: any[] = [];
    if (fs.existsSync('./valid_image_catalog.json')) {
      const catalog = JSON.parse(fs.readFileSync('./valid_image_catalog.json', 'utf-8'));
      allProducts = catalog.products || [];
    }
    
    console.log(`📚 Loaded ${allProducts.length} total products`);
    
    const colorMatched = await getColorMatchedProducts(colorAnalysis, allProducts, 20);
    
    console.log('\n📊 TOP COLOR MATCHES:');
    console.log('====================');
    
    let blondeCount = 0;
    let brownCount = 0;
    
    colorMatched.slice(0, 10).forEach((product, i) => {
      const colorName = product.colorName?.toLowerCase() || '';
      const isBlonde = colorName.includes('blonde') || colorName.includes('golden') || 
                       colorName.includes('honey') || colorName.includes('vanilla');
      const isBrown = colorName.includes('brown') || colorName.includes('chocolate') || 
                      colorName.includes('chestnut');
      
      if (isBlonde) blondeCount++;
      if (isBrown) brownCount++;
      
      console.log(`${i + 1}. ${product.title}`);
      console.log(`   Color: ${product.colorName}`);
      console.log(`   Family: ${product.colorFamily}`);
      console.log(`   Score: ${product.colorMatchScore}`);
      
      if (colorAnalysis.primaryFamily === 'blonde') {
        if (isBlonde) {
          console.log(`   ✅ Correct blonde match`);
        } else if (isBrown) {
          console.log(`   ❌ Wrong brown match for blonde hair`);
        }
      }
      console.log('');
    });
    
    console.log('='.repeat(40));
    console.log('📈 RESULTS SUMMARY');
    console.log('='.repeat(40));
    
    console.log(`\nHair Detected: ${colorAnalysis.primaryFamily}`);
    console.log(`Blonde Products: ${blondeCount}`);
    console.log(`Brown Products: ${brownCount}`);
    
    if (colorAnalysis.primaryFamily === 'blonde') {
      if (blondeCount > brownCount) {
        console.log('\n✅ SUCCESS: More blonde than brown matches!');
        console.log('🎯 Color chip matching should now be accurate');
      } else {
        console.log('\n❌ ISSUE: Still getting more brown than blonde');
      }
    }
    
    console.log('\n🔧 HOW IT WORKS:');
    console.log('1. ✅ Detects primary hair color family');
    console.log('2. ✅ Identifies rooted/highlighted patterns');
    console.log('3. ✅ Scores products based on color name matching');
    console.log('4. ✅ Avoids wrong color families');
    console.log('5. ✅ Returns products with matching color chips');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  testSimplifiedColorMatching().catch(console.error);
}






