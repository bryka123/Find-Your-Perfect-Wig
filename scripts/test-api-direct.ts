#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

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

async function testAPIDirectly() {
  try {
    console.log('🧪 Testing Visual Match API Directly');
    console.log('===================================');
    
    const imagePath = process.argv[2] || './SorrentoSurprise2.png';
    
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image not found: ${imagePath}`);
    }
    
    console.log(`📸 Test image: ${imagePath}`);
    console.log('🔄 Converting to base64...');
    
    const userImageData = imageToBase64(imagePath);
    console.log(`📏 Base64 size: ${Math.round(userImageData.length / 1024)} KB`);
    
    console.log('📡 Making API request to /api/visual-match...');
    
    const response = await fetch('http://localhost:3000/api/visual-match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userImageData,
        maxResults: 6,
        userPreferences: 'blonde hair matching test'
      })
    });
    
    console.log(`📊 Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      return;
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ API call successful!');
      console.log(`🎯 Found ${data.matches.length} matches`);
      console.log(`🔧 Method: ${data.processingInfo.methodology}`);
      
      console.log('\n📋 Match Results:');
      data.matches.forEach((match: any, i: number) => {
        console.log(`\n${i + 1}. ${match.title}`);
        console.log(`   Color: ${match.colorName}`);
        console.log(`   Price: $${match.price}`);
        console.log(`   Score: ${Math.round(match.matchScore * 100)}%`);
        console.log(`   Image: ${match.image?.url ? '✅ Available' : '❌ Missing'}`);
        console.log(`   Reason: ${match.reasons[0]}`);
      });
      
      // Check for perfect reference match
      const referenceMatch = data.matches.find((m: any) => 
        m.colorName.toLowerCase().includes('french vanilla')
      );
      
      if (referenceMatch && data.matches.indexOf(referenceMatch) === 0) {
        console.log('\n🎯 ✅ SUCCESS: Reference perfect match is #1!');
        console.log(`   "${referenceMatch.colorName}" at position 1 with ${Math.round(referenceMatch.matchScore * 100)}% score`);
      } else if (referenceMatch) {
        console.log(`\n⚠️ Reference match found but not #1 (position ${data.matches.indexOf(referenceMatch) + 1})`);
      } else {
        console.log('\n❌ Reference match not found in results');
      }
      
    } else {
      console.error('❌ API returned error:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  testAPIDirectly();
}






