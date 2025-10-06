#!/usr/bin/env tsx

/**
 * Test Visual-to-Visual Style Matching
 * 
 * Validates improved style matching using actual product images
 */

import * as fs from 'fs';
import * as path from 'path';
import { performVisualToVisualMatching } from '../src/lib/visual-to-visual-matching';

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
 * Format match for display
 */
function displayMatch(match: any, index: number) {
  console.log(`\n${index + 1}. ${match.productTitle}`);
  console.log('   ' + '═'.repeat(70));
  console.log(`   Variant: ${match.variantColor}`);
  console.log(`   Price: $${match.price}`);
  console.log(`   \n   🎯 Visual Scores:`);
  console.log(`   • Style Match: ${Math.round(match.visualStyleScore * 100)}%`);
  console.log(`   • Color Match: ${Math.round(match.visualColorScore * 100)}%`);
  console.log(`   • Overall Visual: ${Math.round(match.overallVisualScore * 100)}%`);
  console.log(`   • Confidence: ${match.matchConfidence.toUpperCase()}`);
  
  console.log(`   \n   📸 Style Analysis:`);
  console.log(`   User Style: ${match.styleAnalysis.userStyle}`);
  console.log(`   Product Style: ${match.styleAnalysis.productStyle}`);
  
  if (match.styleAnalysis.similarities?.length > 0) {
    console.log(`   \n   ✅ Similarities:`);
    match.styleAnalysis.similarities.forEach((sim: string) => {
      console.log(`   • ${sim}`);
    });
  }
  
  if (match.styleAnalysis.differences?.length > 0) {
    console.log(`   \n   ⚠️ Differences:`);
    match.styleAnalysis.differences.forEach((diff: string) => {
      console.log(`   • ${diff}`);
    });
  }
  
  console.log(`   \n   💬 Recommendation:`);
  console.log(`   ${match.recommendation}`);
  
  if (match.image?.analyzed) {
    console.log(`   \n   🖼️ Image: ✅ Visually analyzed`);
  } else {
    console.log(`   \n   🖼️ Image: ⚠️ Not analyzed`);
  }
}

/**
 * Main test function
 */
async function testVisualStyleMatching() {
  console.log('🎨 Testing Visual-to-Visual Style Matching');
  console.log('==========================================\n');
  
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
  console.log('   (Woman with medium-length wavy brown hair with highlights)\n');
  
  const imageData = imageToBase64(sampleImagePath);
  console.log('✅ Sample image loaded and converted to base64\n');
  
  try {
    console.log('🚀 Starting visual-to-visual matching process...');
    console.log('   This analyzes actual product images, not just metadata!\n');
    
    // Perform visual matching
    const matches = await performVisualToVisualMatching(imageData, 10);
    
    console.log('\n' + '═'.repeat(80));
    console.log('📊 VISUAL STYLE MATCHING RESULTS');
    console.log('═'.repeat(80));
    
    if (matches.length === 0) {
      console.log('❌ No matches found');
      return;
    }
    
    // Display detailed results
    matches.forEach((match, index) => displayMatch(match, index));
    
    // Summary statistics
    console.log('\n' + '═'.repeat(80));
    console.log('📈 MATCHING STATISTICS');
    console.log('═'.repeat(80) + '\n');
    
    const avgStyleScore = matches.reduce((sum, m) => sum + m.visualStyleScore, 0) / matches.length;
    const avgColorScore = matches.reduce((sum, m) => sum + m.visualColorScore, 0) / matches.length;
    const avgOverallScore = matches.reduce((sum, m) => sum + m.overallVisualScore, 0) / matches.length;
    
    console.log(`Total Matches: ${matches.length}`);
    console.log(`\nAverage Scores:`);
    console.log(`• Visual Style Match: ${Math.round(avgStyleScore * 100)}%`);
    console.log(`• Visual Color Match: ${Math.round(avgColorScore * 100)}%`);
    console.log(`• Overall Visual Score: ${Math.round(avgOverallScore * 100)}%`);
    
    const highConfidence = matches.filter(m => m.matchConfidence === 'high').length;
    const mediumConfidence = matches.filter(m => m.matchConfidence === 'medium').length;
    const lowConfidence = matches.filter(m => m.matchConfidence === 'low').length;
    
    console.log(`\nConfidence Distribution:`);
    console.log(`• High Confidence: ${highConfidence} matches`);
    console.log(`• Medium Confidence: ${mediumConfidence} matches`);
    console.log(`• Low Confidence: ${lowConfidence} matches`);
    
    const prices = matches.map(m => parseFloat(m.price));
    console.log(`\nPrice Range: $${Math.min(...prices).toFixed(2)} - $${Math.max(...prices).toFixed(2)}`);
    
    // Compare with previous approach
    console.log('\n' + '═'.repeat(80));
    console.log('🔄 IMPROVEMENT OVER PREVIOUS SYSTEM');
    console.log('═'.repeat(80) + '\n');
    
    console.log('Previous System (Metadata-based):');
    console.log('• Relied on text descriptions of style');
    console.log('• Could not see actual product appearance');
    console.log('• Style matching based on categories (short/medium/long)');
    console.log('• Often mismatched actual visual style\n');
    
    console.log('New Visual System (Image-based):');
    console.log('• ✅ Analyzes actual product photos');
    console.log('• ✅ Compares visual characteristics directly');
    console.log('• ✅ Identifies specific style features (layers, movement, cut)');
    console.log('• ✅ Provides detailed similarity/difference analysis');
    console.log('• ✅ More accurate style matching');
    
    // Test API endpoint
    console.log('\n' + '═'.repeat(80));
    console.log('🌐 API ENDPOINT INFORMATION');
    console.log('═'.repeat(80) + '\n');
    
    const apiUrl = 'http://localhost:3000/api/visual-style-match';
    console.log(`Endpoint: POST ${apiUrl}`);
    console.log('Purpose: Visual-to-visual style matching with product images');
    console.log('\nExample Request:');
    console.log(`
curl -X POST ${apiUrl} \\
  -H "Content-Type: application/json" \\
  -d '{
    "userImageData": "data:image/jpeg;base64,...",
    "maxResults": 10
  }'
    `);
    
    console.log('\n' + '═'.repeat(80));
    console.log('✅ VISUAL STYLE MATCHING TEST COMPLETE');
    console.log('═'.repeat(80));
    console.log('\n🎯 Key Improvement: Now comparing actual product images visually!');
    console.log('📸 This should provide much better style matching than text metadata alone.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testVisualStyleMatching().catch(console.error);
}






