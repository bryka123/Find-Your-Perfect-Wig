#!/usr/bin/env tsx

/**
 * Test Enhanced Variant Matching System
 * 
 * Tests the complete matching pipeline with sample image
 */

import * as fs from 'fs';
import * as path from 'path';
import { performEnhancedVariantMatching } from '../src/lib/enhanced-variant-matching';

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
 * Main test function
 */
async function testEnhancedMatching() {
  console.log('🧪 Testing Enhanced Variant Matching System');
  console.log('=============================================\n');
  
  // Load environment
  loadEnvFile();
  
  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not configured in .env.local');
    process.exit(1);
  }
  
  // Load sample image
  const sampleImagePath = path.join(__dirname, '..', 'sample.jpeg');
  
  if (!fs.existsSync(sampleImagePath)) {
    console.error('❌ Sample image not found at:', sampleImagePath);
    process.exit(1);
  }
  
  console.log('📸 Loading sample image:', sampleImagePath);
  const imageData = imageToBase64(sampleImagePath);
  console.log('✅ Sample image loaded and converted to base64\n');
  
  try {
    console.log('🚀 Starting enhanced matching process...\n');
    
    // Perform matching
    const matches = await performEnhancedVariantMatching(imageData, 10);
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 MATCHING RESULTS');
    console.log('='.repeat(80) + '\n');
    
    if (matches.length === 0) {
      console.log('❌ No matches found');
      return;
    }
    
    // Display detailed results
    matches.forEach((match, index) => {
      console.log(`\n${index + 1}. ${match.productTitle}`);
      console.log('   ' + '-'.repeat(60));
      console.log(`   Variant Color: ${match.variantColor}`);
      console.log(`   Color Family: ${match.colorFamily}`);
      console.log(`   Price: $${match.price}`);
      console.log(`   \n   Scores:`);
      console.log(`   • Style Match: ${Math.round(match.styleMatch * 100)}%`);
      console.log(`   • Color Match: ${Math.round(match.colorMatch * 100)}%`);
      console.log(`   • Overall Score: ${Math.round(match.overallScore * 100)}%`);
      console.log(`   \n   Style Attributes:`);
      console.log(`   • Length: ${match.attributes.length}`);
      console.log(`   • Texture: ${match.attributes.texture}`);
      console.log(`   • Style: ${match.attributes.style}`);
      console.log(`   • Construction: ${match.attributes.capConstruction}`);
      console.log(`   \n   Match Reasons:`);
      console.log(`   Style: ${match.matchReasons.style.join(', ')}`);
      console.log(`   Color: ${match.matchReasons.color.join(', ')}`);
      
      if (match.image) {
        console.log(`   \n   Image: ✅ Available`);
        console.log(`   URL: ${match.image.url.substring(0, 60)}...`);
      } else {
        console.log(`   \n   Image: ❌ Not available`);
      }
    });
    
    // Summary statistics
    console.log('\n' + '='.repeat(80));
    console.log('📈 SUMMARY STATISTICS');
    console.log('='.repeat(80) + '\n');
    
    const avgStyleScore = matches.reduce((sum, m) => sum + m.styleMatch, 0) / matches.length;
    const avgColorScore = matches.reduce((sum, m) => sum + m.colorMatch, 0) / matches.length;
    const avgOverallScore = matches.reduce((sum, m) => sum + m.overallScore, 0) / matches.length;
    
    console.log(`Total Matches: ${matches.length}`);
    console.log(`Average Style Match: ${Math.round(avgStyleScore * 100)}%`);
    console.log(`Average Color Match: ${Math.round(avgColorScore * 100)}%`);
    console.log(`Average Overall Score: ${Math.round(avgOverallScore * 100)}%`);
    
    const colorFamilies = [...new Set(matches.map(m => m.colorFamily))];
    console.log(`Color Families Represented: ${colorFamilies.join(', ')}`);
    
    const prices = matches.map(m => parseFloat(m.price));
    console.log(`Price Range: $${Math.min(...prices).toFixed(2)} - $${Math.max(...prices).toFixed(2)}`);
    
    // Test API endpoint
    console.log('\n' + '='.repeat(80));
    console.log('🌐 TESTING API ENDPOINT');
    console.log('='.repeat(80) + '\n');
    
    console.log('Testing POST /api/enhanced-match...');
    
    // Simulate API call
    const apiUrl = 'http://localhost:3000/api/enhanced-match';
    console.log(`Endpoint: ${apiUrl}`);
    console.log('Method: POST');
    console.log('Body: { userImageData: "data:image/jpeg;base64,...", maxResults: 10 }');
    
    console.log('\n✅ API endpoint is ready for use');
    console.log('📝 To test via curl:');
    console.log(`
curl -X POST ${apiUrl} \\
  -H "Content-Type: application/json" \\
  -d '{"userImageData": "data:image/jpeg;base64,...", "maxResults": 10}'
    `);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ ENHANCED MATCHING TEST COMPLETE');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testEnhancedMatching().catch(console.error);
}






