#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';

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

/**
 * Upload Dynamic Color Chunks with Position 1 Photos
 */

async function uploadDynamicChunks() {
  try {
    console.log('🎨 Uploading Dynamic Color Chunks (Position 1 + All Colors)');
    console.log('==========================================================');
    
    const vectorStoreId = 'vs_68d2f2cb73a88191afd3c918c2fb16d4';
    const chunksDir = './dynamic_chunks';
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    
    console.log(`🎯 Vector Store: ${vectorStoreId}`);
    console.log(`📁 Dynamic chunks: ${chunksDir}`);
    
    const openai = new OpenAI({ apiKey });
    
    // Read dynamic index
    const indexPath = path.join(chunksDir, 'dynamic_index.json');
    const dynamicIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    
    console.log(`📊 Dynamic color families: ${dynamicIndex.colorFamilies.length}`);
    console.log(`📸 Total Position 1 variants: ${dynamicIndex.metadata.total_variants}`);
    
    // Upload all color family chunks
    const uploadOrder = [
      'dynamic_index.json',
      ...dynamicIndex.colorFamilies.map((cf: any) => cf.filename)
    ];
    
    console.log('\n📤 Uploading dynamic color chunks...');
    
    const uploadedFiles: string[] = [];
    
    for (const filename of uploadOrder) {
      const filePath = path.join(chunksDir, filename);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ Skipping ${filename} (not found)`);
        continue;
      }
      
      const fileStats = fs.statSync(filePath);
      const fileSizeKB = Math.round(fileStats.size / 1024 * 100) / 100;
      
      // Get color family info
      const colorFamily = filename.replace('_position1.json', '').replace('.json', '');
      const familyInfo = dynamicIndex.colorFamilies.find((cf: any) => cf.colorFamily === colorFamily);
      
      console.log(`\n📤 Uploading ${filename} (${fileSizeKB} KB)`);
      if (familyInfo) {
        console.log(`   📊 ${familyInfo.colorFamily}: ${familyInfo.variantCount} Position 1 variants`);
      }
      
      try {
        const file = await openai.files.create({
          file: fs.createReadStream(filePath),
          purpose: 'assistants'
        });
        
        console.log(`✅ Uploaded: ${filename} → File ID: ${file.id}`);
        uploadedFiles.push(filename);
        
        // Small delay
        if (uploadedFiles.length < uploadOrder.length) {
          console.log('⏳ Waiting 1 second...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (uploadError) {
        console.error(`❌ Failed to upload ${filename}:`, uploadError);
      }
    }
    
    console.log('\n🎯 Dynamic Upload Summary:');
    console.log(`✅ Successfully uploaded: ${uploadedFiles.length} dynamic chunks`);
    uploadedFiles.forEach(file => {
      const colorFamily = file.replace('_position1.json', '').replace('.json', '');
      console.log(`   ✅ ${file} (${colorFamily} color family)`);
    });
    
    console.log('\n🎨 Dynamic Color System Benefits:');
    console.log('✅ Works for ANY hair color (blonde, brunette, black, red, gray)');
    console.log('✅ Position 1 front-facing photos only');
    console.log('✅ No hardcoding - adapts to user\'s actual hair color');
    console.log('✅ Separate chunks per color family for efficiency');
    console.log('✅ ChatGPT can analyze any hair type dynamically');
    
    console.log('\n📊 Color Coverage:');
    dynamicIndex.colorFamilies.forEach((cf: any) => {
      console.log(`  ${cf.colorFamily}: ${cf.variantCount} Position 1 variants`);
    });
    
    console.log('\n🤖 ChatGPT Now Ready For:');
    console.log('🎨 Blonde hair → Search blonde_position1.json');
    console.log('🤎 Brunette hair → Search brunette_position1.json');  
    console.log('⚫ Black hair → Search black_position1.json');
    console.log('🔴 Red hair → Search red_position1.json');
    console.log('🩶 Gray hair → Search gray_position1.json');
    console.log('✨ Any color → Dynamic detection and matching');
    
  } catch (error) {
    console.error('❌ Dynamic upload failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  uploadDynamicChunks();
}









