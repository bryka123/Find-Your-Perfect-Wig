#!/usr/bin/env tsx

/**
 * Test Exact Visual Matching with Sorrento Surprise
 * 
 * Verifies that uploading the exact product image returns it as #1 match
 */

import * as fs from 'fs';
import * as path from 'path';
import { performExactVisualMatching } from '../src/lib/exact-visual-matching';

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
async function testExactSorrentoMatch() {
  console.log('🧪 Testing Exact Visual Matching with Sorrento Surprise');
  console.log('========================================================\n');
  
  // Load environment
  loadEnvFile();
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not configured');
    process.exit(1);
  }
  
  // Load Sorrento Surprise image
  const sorrentoImagePath = path.join(__dirname, '..', 'SorrentoSurprise2.png');
  
  if (!fs.existsSync(sorrentoImagePath)) {
    console.error('❌ Sorrento Surprise image not found at:', sorrentoImagePath);
    console.log('📝 Please ensure SorrentoSurprise2.png is in the root directory');
    process.exit(1);
  }
  
  console.log('📸 Loading Sorrento Surprise product image...');
  console.log('   Product: Sorrento Surprise');
  console.log('   Color: RH22/26SS SHADED FRENCH VANILLA');
  console.log('   Description: Light golden blonde with darker roots\n');
  
  const imageData = imageToBase64(sorrentoImagePath);
  
  try {
    console.log('🔍 Starting exact visual matching...');
    console.log('   This should recognize the exact product image!\n');
    
    // Perform exact matching
    const matches = await performExactVisualMatching(imageData, 10);
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 EXACT MATCHING RESULTS');
    console.log('='.repeat(70) + '\n');
    
    if (matches.length === 0) {
      console.log('❌ No matches found');
      return;
    }
    
    // Check if Sorrento Surprise is the top match
    const topMatch = matches[0];
    const isSorrento = topMatch.productTitle.includes('Sorrento Surprise') && 
                       topMatch.variantColor.includes('RH22/26SS');
    
    // Display results
    matches.forEach((match, index) => {
      const isThisMatch = match.productTitle.includes('Sorrento Surprise') && 
                          match.variantColor.includes('RH22/26SS');
      
      console.log(`${index + 1}. ${isThisMatch ? '🎯 ' : ''}${match.productTitle}`);
      console.log(`   Match Type: ${match.matchType.toUpperCase()}`);
      console.log(`   Visual Identity Score: ${Math.round(match.visualIdentityScore * 100)}%`);
      console.log(`   Color: ${match.variantColor}`);
      console.log(`   Price: $${match.price}`);
      
      if (match.visualAnalysis.isExactMatch) {
        console.log(`   ✅ EXACT MATCH DETECTED BY GPT-4 VISION`);
      }
      
      if (match.visualAnalysis.identicalFeatures.length > 0) {
        console.log(`   Identical Features:`);
        match.visualAnalysis.identicalFeatures.forEach(f => {
          console.log(`     • ${f}`);
        });
      }
      
      if (match.visualAnalysis.differences.length > 0 && match.visualAnalysis.differences[0] !== 'Unable to analyze') {
        console.log(`   Differences:`);
        match.visualAnalysis.differences.forEach(d => {
          console.log(`     • ${d}`);
        });
      }
      
      console.log(`   Confidence: ${Math.round(match.visualAnalysis.confidence * 100)}%\n`);
    });
    
    // Summary
    console.log('='.repeat(70));
    console.log('📈 TEST SUMMARY');
    console.log('='.repeat(70));
    
    if (isSorrento && topMatch.visualIdentityScore >= 0.95) {
      console.log('\n✅ SUCCESS! Sorrento Surprise detected as #1 match!');
      console.log(`   Product: ${topMatch.productTitle}`);
      console.log(`   Identity Score: ${Math.round(topMatch.visualIdentityScore * 100)}%`);
      console.log(`   Match Type: ${topMatch.matchType}`);
      console.log('\n🎯 The system correctly identified the exact product image!');
    } else if (isSorrento) {
      console.log('\n⚠️ PARTIAL SUCCESS: Sorrento Surprise is #1 but with lower confidence');
      console.log(`   Identity Score: ${Math.round(topMatch.visualIdentityScore * 100)}%`);
      console.log('   The system needs better exact match detection');
    } else {
      // Find where Sorrento appears
      const sorrentoIndex = matches.findIndex(m => 
        m.productTitle.includes('Sorrento Surprise') && 
        m.variantColor.includes('RH22/26SS')
      );
      
      if (sorrentoIndex >= 0) {
        console.log(`\n⚠️ ISSUE: Sorrento Surprise found at position #${sorrentoIndex + 1}`);
        console.log(`   Identity Score: ${Math.round(matches[sorrentoIndex].visualIdentityScore * 100)}%`);
      } else {
        console.log('\n❌ ISSUE: Sorrento Surprise not found in top 10 matches');
      }
      
      console.log('\nTop match was:');
      console.log(`   ${topMatch.productTitle}`);
      console.log(`   Identity Score: ${Math.round(topMatch.visualIdentityScore * 100)}%`);
    }
    
    // Statistics
    const exactMatches = matches.filter(m => m.matchType === 'exact').length;
    const nearExactMatches = matches.filter(m => m.matchType === 'near-exact').length;
    
    console.log('\n📊 Match Distribution:');
    console.log(`   Exact Matches: ${exactMatches}`);
    console.log(`   Near-Exact Matches: ${nearExactMatches}`);
    console.log(`   Similar: ${matches.filter(m => m.matchType === 'similar').length}`);
    console.log(`   Related: ${matches.filter(m => m.matchType === 'related').length}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testExactSorrentoMatch().catch(console.error);
}






