#!/usr/bin/env tsx

/**
 * Test Enhanced Vision-Based Matching
 * Tests the improved matching with silhouette and style attributes
 */

import { loadVisionAnalysis, calculateVisionBasedScore } from '../src/lib/vision-based-matching';

// Test user profile: smooth medium-length straight hair
const testUserProfile = {
  length: 'medium',
  texture: 'straight',
  style: 'smooth and sleek'
};

console.log('🧪 Testing Enhanced Vision-Based Matching');
console.log('=' .repeat(60));
console.log('User Profile:', testUserProfile);
console.log('');

// Load vision analysis
const visionData = loadVisionAnalysis();

if (!visionData) {
  console.error('❌ No vision data available');
  process.exit(1);
}

// Get all products, split by version
const enhancedProducts: any[] = [];
const basicProducts: any[] = [];

Object.values(visionData).forEach((product: any) => {
  if (product.version === '2.0') {
    enhancedProducts.push(product);
  } else {
    basicProducts.push(product);
  }
});

console.log(`📊 Found ${enhancedProducts.length} enhanced products (v2.0)`);
console.log(`📊 Found ${basicProducts.length} basic products`);
console.log('');

// Test scoring on enhanced products
if (enhancedProducts.length > 0) {
  console.log('🎯 TOP ENHANCED PRODUCTS (Should match smooth medium hair):');
  console.log('-'.repeat(60));

  const scoredEnhanced = enhancedProducts
    .map(product => ({
      ...product,
      score: calculateVisionBasedScore(product, testUserProfile)
    }))
    .sort((a, b) => b.score - a.score);

  // Show top 10
  scoredEnhanced.slice(0, 10).forEach((p, i) => {
    const attrs = p.visualAttributes;
    console.log(`${i+1}. ${p.title.substring(0, 40).padEnd(40)} | Score: ${(p.score * 100).toFixed(0)}%`);
    console.log(`   Length: ${attrs.actualLength.padEnd(10)} | Texture: ${attrs.texture.padEnd(8)} | Type: ${attrs.coverage}`);
    if (attrs.silhouette) {
      console.log(`   ✨ Silhouette: ${attrs.silhouette} | Formality: ${attrs.formality || 'N/A'}`);
      console.log(`   ✨ Style: ${attrs.overallStyle || 'N/A'}`);
    }
    console.log('');
  });

  console.log('...\n');
  console.log('❌ BOTTOM 5 (Should be poor matches):');
  console.log('-'.repeat(60));

  scoredEnhanced.slice(-5).reverse().forEach((p, i) => {
    const attrs = p.visualAttributes;
    console.log(`${enhancedProducts.length - i}. ${p.title.substring(0, 40).padEnd(40)} | Score: ${(p.score * 100).toFixed(0)}%`);
    console.log(`   Length: ${attrs.actualLength.padEnd(10)} | Texture: ${attrs.texture.padEnd(8)} | Type: ${attrs.coverage}`);
    if (attrs.silhouette) {
      console.log(`   ⚠️ Silhouette: ${attrs.silhouette} | Formality: ${attrs.formality || 'N/A'}`);
    }
    if (attrs.coverage !== 'full-wig') {
      console.log(`   ⚠️ Coverage Issue: ${attrs.coverage}`);
    }
    console.log('');
  });

  // Find problematic products
  console.log('🔍 CHECKING FOR PROBLEMATIC MATCHES:');
  console.log('-'.repeat(60));

  const problematicProducts = scoredEnhanced.filter(p => {
    const attrs = p.visualAttributes;
    // Spiky/edgy products shouldn't score high for smooth hair
    if ((attrs.silhouette === 'spiky' || attrs.silhouette === 'edgy') && p.score > 0.3) {
      return true;
    }
    // Non-wigs shouldn't score high
    if (attrs.coverage !== 'full-wig' && p.score > 0.15) {
      return true;
    }
    // Wrong texture shouldn't score high
    if (attrs.texture === 'curly' && p.score > 0.5) {
      return true;
    }
    return false;
  });

  if (problematicProducts.length > 0) {
    console.log(`⚠️ Found ${problematicProducts.length} potentially problematic matches:`);
    problematicProducts.slice(0, 10).forEach(p => {
      const attrs = p.visualAttributes;
      console.log(`   - ${p.title.substring(0, 40)} (Score: ${(p.score * 100).toFixed(0)}%)`);
      const issues = [];
      if (attrs.coverage !== 'full-wig') issues.push(`Non-wig (${attrs.coverage})`);
      if (attrs.silhouette === 'spiky' || attrs.silhouette === 'edgy') issues.push(`Wrong style (${attrs.silhouette})`);
      if (attrs.texture === 'curly') issues.push(`Wrong texture (${attrs.texture})`);
      console.log(`     Issues: ${issues.join(', ')}`);
    });
  } else {
    console.log('✅ No problematic matches found!');
  }

  // Check specific products that were problematic before
  console.log('\n📍 SPECIFIC PRODUCT CHECK:');
  console.log('-'.repeat(60));

  const checkProducts = [
    'Voltage Large', // spiky pixie
    'SPIKY clip', // ponytail
    'Top It Off', // hairpiece
    'Sassy Curl' // curly texture
  ];

  checkProducts.forEach(name => {
    const product = scoredEnhanced.find(p => p.title.toLowerCase().includes(name.toLowerCase()));
    if (product) {
      const attrs = product.visualAttributes;
      console.log(`${name}: Score = ${(product.score * 100).toFixed(0)}%`);
      console.log(`   Silhouette: ${attrs.silhouette || 'N/A'} | Coverage: ${attrs.coverage} | Texture: ${attrs.texture}`);
      if (product.score > 0.3) {
        console.log(`   ⚠️ WARNING: Score seems too high for smooth medium hair!`);
      } else {
        console.log(`   ✅ Good: Low score as expected`);
      }
    } else {
      console.log(`${name}: Not found in enhanced products`);
    }
    console.log('');
  });

} else {
  console.log('⚠️ No enhanced products available yet. Run analyze-products-enhanced.ts first.');
}

console.log('=' .repeat(60));
console.log('✅ Test complete');