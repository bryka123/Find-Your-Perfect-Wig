#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { performCompleteVisualMatching } from '../src/lib/gpt-visual-matching-v2';

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

loadEnvFile();

// Convert image to base64
function imageToBase64(imagePath: string): string {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = path.extname(imagePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mimeType};base64,${base64Image}`;
}

async function testVisualMatching() {
  try {
    console.log('🧪 Testing GPT-4 Vision Direct Matching');
    console.log('======================================');
    
    const imagePath = process.argv[2] || './SorrentoSurprise2.png';
    
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image not found: ${imagePath}`);
    }
    
    console.log(`📸 Test image: ${imagePath}`);
    console.log('🤖 Converting to base64 and sending to GPT-4 Vision...');
    
    const userImageData = imageToBase64(imagePath);
    
    // Test the visual matching system
    const matches = await performCompleteVisualMatching(
      userImageData,
      'Looking for blonde wigs similar to my hair color',
      6
    );
    
    console.log('\n✅ GPT-4 Visual Matching Results:');
    console.log('================================');
    
    matches.forEach((match, i) => {
      console.log(`\n${i + 1}. ${match.title}`);
      console.log(`   Color: ${match.colorName}`);
      console.log(`   Price: $${match.price}`);
      console.log(`   Match Score: ${Math.round(match.matchScore * 100)}%`);
      console.log(`   Reasons: ${match.reasons.join(', ')}`);
    });
    
    console.log('\n🎯 Key Test: Does it include problematic mismatches?');
    
    const hasCherry = matches.some(m => m.colorName.toLowerCase().includes('cherry'));
    const hasChocolate = matches.some(m => m.colorName.toLowerCase().includes('chocolate'));
    const hasFudge = matches.some(m => m.colorName.toLowerCase().includes('fudge'));
    
    if (hasCherry || hasChocolate || hasFudge) {
      console.log('❌ PROBLEM: Still returning non-blonde colors for blonde image');
      if (hasCherry) console.log('   - Found cherry creme (should be red, not blonde match)');
      if (hasChocolate) console.log('   - Found chocolate (should be brown, not blonde match)');
      if (hasFudge) console.log('   - Found fudge (should be brown/black, not blonde match)');
    } else {
      console.log('✅ SUCCESS: Only returning appropriate colors for blonde image');
    }
    
    // Show actual color families found
    console.log('\n🎨 Colors returned by GPT-4 Vision:');
    matches.forEach(match => {
      console.log(`   "${match.colorName}"`);
    });
    
    console.log('\n🎉 Visual Matching Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  testVisualMatching();
}
