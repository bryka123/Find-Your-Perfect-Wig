#!/usr/bin/env tsx

/**
 * Test specific products that are showing wrong scores
 */

import { loadVisionAnalysis, calculateVisionBasedScore } from '../src/lib/vision-based-matching';

// User from the screenshot has long straight hair
const userProfile = {
  length: 'long',
  texture: 'straight',
  style: 'smooth and sleek',
  hasBangs: false,
  isLayered: false
};

console.log('🧪 Testing Specific Products Against User Profile');
console.log('=' .repeat(60));
console.log('User Profile:', userProfile);
console.log('');

// Load vision analysis
const visionData = loadVisionAnalysis();

if (!visionData) {
  console.error('❌ No vision data available');
  process.exit(1);
}

// Find TANGO and Salsa products
const testProducts = ['TANGO', 'salsa', 'Salsa'];

console.log('📊 Testing products that should NOT match:');
console.log('-'.repeat(60));

Object.values(visionData).forEach((product: any) => {
  const matchesTest = testProducts.some(test =>
    product.title.toLowerCase().includes(test.toLowerCase())
  );

  if (matchesTest) {
    const score = calculateVisionBasedScore(product, userProfile);
    const attrs = product.visualAttributes;

    console.log(`\n${product.title}`);
    console.log(`  Vision Analysis:`);
    console.log(`    - Length: ${attrs.actualLength} (user has ${userProfile.length})`);
    console.log(`    - Texture: ${attrs.texture} (user has ${userProfile.texture})`);
    console.log(`    - Coverage: ${attrs.coverage}`);
    if (attrs.silhouette) {
      console.log(`    - Silhouette: ${attrs.silhouette} (user wants smooth/sleek)`);
    }
    console.log(`  ⭐ SCORE: ${(score * 100).toFixed(1)}%`);

    if (score > 0.5) {
      console.log(`  ⚠️ WARNING: Score is too high!`);
      console.log(`  Expected: < 50% for short ${attrs.texture} vs long straight`);
    } else {
      console.log(`  ✅ Correctly low score`);
    }
  }
});

// Also test some products that SHOULD match
console.log('\n\n📊 Products that SHOULD match well:');
console.log('-'.repeat(60));

const goodMatches = ['luxe', 'long', 'straight', 'sleek'];

let found = 0;
Object.values(visionData).forEach((product: any) => {
  if (found >= 5) return;

  const attrs = product.visualAttributes;

  // Look for long straight wigs
  if (attrs.actualLength === 'long' && attrs.texture === 'straight' && attrs.coverage === 'full-wig') {
    const score = calculateVisionBasedScore(product, userProfile);

    console.log(`\n${product.title}`);
    console.log(`  Vision: ${attrs.actualLength} ${attrs.texture} ${attrs.coverage}`);
    if (attrs.silhouette) {
      console.log(`  Silhouette: ${attrs.silhouette}`);
    }
    console.log(`  ⭐ SCORE: ${(score * 100).toFixed(1)}%`);

    if (score < 0.7) {
      console.log(`  ⚠️ WARNING: Score seems low for good match`);
    } else {
      console.log(`  ✅ Good high score`);
    }

    found++;
  }
});

console.log('\n' + '=' .repeat(60));
console.log('✅ Test complete');