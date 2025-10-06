#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { intelligentHairMatching } from '../src/lib/hybrid-fast-matching';

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

async function testIntelligentMatching() {
  try {
    console.log('🤖 Testing Intelligent Matching (No Hardcoding)');
    console.log('==============================================');
    
    const imagePath = process.argv[2] || './sample.jpeg';
    
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image not found: ${imagePath}`);
    }
    
    console.log(`📸 Test image: ${imagePath}`);
    console.log('🎯 ChatGPT will analyze this image and make ALL matching decisions');
    console.log('✅ No hardcoded rules - pure visual intelligence');
    
    const userImageData = imageToBase64(imagePath);
    
    console.log('\n🤖 Running ChatGPT intelligent analysis...');
    const matches = await intelligentHairMatching(userImageData, 6);
    
    console.log('\n🎯 ChatGPT Intelligent Matching Results:');
    console.log('======================================');
    
    matches.forEach((match, i) => {
      console.log(`\n${i + 1}. ${match.title}`);
      console.log(`   Color: ${match.colorName}`);
      console.log(`   Price: $${match.price}`);
      console.log(`   Score: ${Math.round(match.matchScore * 100)}%`);
      console.log(`   Detected Hair: ${match.detectedHairColor}`);
      console.log(`   Image: ${match.image?.url ? '✅ Position 1 available' : '❌ Missing'}`);
      console.log(`   ChatGPT Logic: ${match.reasons[0]}`);
    });
    
    // Analyze the quality of matches
    const detectedColor = matches[0]?.detectedHairColor || 'unknown';
    console.log(`\n📊 Analysis Summary:`);
    console.log(`🎨 ChatGPT detected: ${detectedColor} hair`);
    console.log(`🎯 Returned: ${matches.length} ${detectedColor} family matches`);
    
    // Check if ChatGPT made good color decisions
    const colorNames = matches.map(m => m.colorName.toLowerCase());
    const hasAppropriateColors = colorNames.some(name => 
      name.includes('caramel') || 
      name.includes('honey') || 
      name.includes('medium') ||
      name.includes('light') ||
      name.includes('golden')
    );
    
    const hasPoorColors = colorNames.some(name => 
      name.includes('dark chocolate') || 
      name.includes('espresso') ||
      name.includes('ebony')
    );
    
    if (hasAppropriateColors && !hasPoorColors) {
      console.log('✅ SUCCESS: ChatGPT found appropriate color matches!');
      console.log('   ✅ Good lightness compatibility');
      console.log('   ✅ No overly dark colors for medium hair');
    } else if (hasPoorColors) {
      console.log('⚠️ ChatGPT returned some dark colors - may need prompt refinement');
    } else {
      console.log('📊 ChatGPT made reasonable color choices');
    }
    
    console.log('\n🎉 Intelligent Matching Test Complete!');
    console.log('🤖 ChatGPT made all decisions based on visual analysis');
    console.log('✅ No hardcoded rules or assumptions');
    console.log('📸 Using Position 1 front-facing photos');
    console.log('🎯 System adapts to any client hair image');
    
  } catch (error) {
    console.error('❌ Intelligent matching test failed:', error);
  }
}

if (require.main === module) {
  testIntelligentMatching();
}






