#!/usr/bin/env tsx

/**
 * Test Enhanced Color Chip Matching
 * 
 * Specifically tests that blonde hair gets blonde color chips, not brown
 */

import * as fs from 'fs';
import * as path from 'path';
import { analyzeHairColorDetailed, performEnhancedColorMatching } from '../src/lib/enhanced-color-analysis';

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
 * Test color analysis accuracy
 */
async function testColorChipMatching() {
  console.log('🧪 Testing Enhanced Color Chip Matching');
  console.log('=======================================\n');
  
  // Load environment
  loadEnvFile();
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not configured');
    process.exit(1);
  }
  
  // Test with blonde bob image (the one that was returning brown chips)
  const testImagePath = path.join(__dirname, '..', 'sample.jpeg');
  
  if (!fs.existsSync(testImagePath)) {
    console.error('❌ Test image not found at:', testImagePath);
    console.log('📝 Please ensure sample.jpeg is available');
    process.exit(1);
  }
  
  console.log('📸 Loading blonde bob test image...');
  console.log('   Expected: Blonde hair (possibly rooted)');
  console.log('   Problem: Previously returned brown/chestnut color chips\n');
  
  const imageData = imageToBase64(testImagePath);
  
  try {
    // Step 1: Test detailed color analysis
    console.log('🔍 Step 1: Detailed Color Analysis');
    console.log('----------------------------------');
    
    const colorAnalysis = await analyzeHairColorDetailed(imageData);
    
    console.log('📊 Color Analysis Results:');
    console.log(`   Primary Family: ${colorAnalysis.primaryFamily}`);
    console.log(`   Base Color: ${colorAnalysis.baseColor}`);
    console.log(`   Rooted: ${colorAnalysis.isRooted ? 'Yes' : 'No'}`);
    console.log(`   Highlights: ${colorAnalysis.hasHighlights ? 'Yes' : 'No'}`);
    console.log(`   Undertone: ${colorAnalysis.undertone}`);
    console.log(`   Lightness: ${colorAnalysis.lightness}/10`);
    console.log(`   Root Color: ${colorAnalysis.rootColor || 'N/A'}`);
    console.log(`   End Color: ${colorAnalysis.endColor || 'N/A'}`);
    console.log(`   Confidence: ${Math.round(colorAnalysis.confidence * 100)}%\n`);
    
    console.log('🎯 Best Match Colors:');
    colorAnalysis.bestMatchColors.forEach(color => {
      console.log(`   ✅ ${color}`);
    });
    
    console.log('\n❌ Colors to Avoid:');
    colorAnalysis.avoidColors.forEach(color => {
      console.log(`   ❌ ${color}`);
    });
    
    // Step 2: Test full enhanced matching
    console.log('\n🔍 Step 2: Enhanced Color Matching');
    console.log('----------------------------------\n');
    
    const matches = await performEnhancedColorMatching(imageData, 10);
    
    console.log('📊 ENHANCED MATCHING RESULTS');
    console.log('============================\n');
    
    // Analyze color chip accuracy
    let blondeMatches = 0;
    let brownMatches = 0;
    let correctColorFamily = 0;
    
    matches.forEach((match, index) => {
      const colorName = match.colorName?.toLowerCase() || '';
      const isBlonde = colorName.includes('blonde') || colorName.includes('golden') || 
                       colorName.includes('honey') || colorName.includes('vanilla') ||
                       colorName.includes('champagne') || colorName.includes('butter');
      
      const isBrown = colorName.includes('brown') || colorName.includes('chocolate') || 
                      colorName.includes('chestnut') || colorName.includes('mocha') ||
                      colorName.includes('espresso');
      
      if (isBlonde) blondeMatches++;
      if (isBrown) brownMatches++;
      if (match.colorAnalysis?.primaryFamily === colorAnalysis.primaryFamily) correctColorFamily++;
      
      console.log(`${index + 1}. ${match.title}`);
      console.log(`   Color: ${match.colorName}`);
      console.log(`   Family: ${match.colorAnalysis?.primaryFamily || 'unknown'}`);
      console.log(`   Style Score: ${Math.round((match.styleScore || 0) * 100)}%`);
      console.log(`   Color Score: ${Math.round((match.colorScore || 0) * 100)}%`);
      console.log(`   Overall: ${Math.round((match.overallScore || 0) * 100)}%`);
      
      // Flag problematic matches
      if (colorAnalysis.primaryFamily === 'blonde' && isBrown) {
        console.log(`   ⚠️  WARNING: Brown color for blonde hair!`);
      } else if (colorAnalysis.primaryFamily === 'blonde' && isBlonde) {
        console.log(`   ✅ Correct: Blonde color for blonde hair`);
      }
      
      console.log('');
    });
    
    // Summary
    console.log('='.repeat(50));
    console.log('📈 COLOR CHIP ACCURACY ANALYSIS');
    console.log('='.repeat(50));
    
    console.log(`\nDetected Hair Color: ${colorAnalysis.primaryFamily}`);
    console.log(`Matches with Correct Family: ${correctColorFamily}/${matches.length}`);
    
    if (colorAnalysis.primaryFamily === 'blonde') {
      console.log(`\nFor BLONDE hair:`);
      console.log(`   ✅ Blonde color chips: ${blondeMatches}`);
      console.log(`   ❌ Brown color chips: ${brownMatches}`);
      
      if (brownMatches > blondeMatches) {
        console.log(`\n❌ ISSUE: More brown chips than blonde for blonde hair!`);
      } else {
        console.log(`\n✅ SUCCESS: Blonde hair correctly matched to blonde chips!`);
      }
    }
    
    // Check if we fixed the original problem
    const topMatch = matches[0];
    if (colorAnalysis.primaryFamily === 'blonde' && topMatch) {
      const topColorName = topMatch.colorName?.toLowerCase() || '';
      const topIsBlonde = topColorName.includes('blonde') || topColorName.includes('golden') ||
                          topColorName.includes('honey') || topColorName.includes('vanilla');
      
      console.log(`\n🎯 TOP MATCH CHECK:`);
      console.log(`   Product: ${topMatch.title}`);
      console.log(`   Color: ${topMatch.colorName}`);
      
      if (topIsBlonde) {
        console.log(`   ✅ SUCCESS: Top match has correct blonde color!`);
      } else {
        console.log(`   ❌ ISSUE: Top match still has wrong color`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('The enhanced color analysis should now provide:');
    console.log('1. ✅ Accurate primary color family detection');
    console.log('2. ✅ Detection of rooted/highlighted hair');  
    console.log('3. ✅ Color chips that match the uploaded hair');
    console.log('4. ✅ Avoidance of wrong color families');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testColorChipMatching().catch(console.error);
}






