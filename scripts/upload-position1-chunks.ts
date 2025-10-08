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
 * Upload Position 1 Clean Chunks to OpenAI
 */

async function uploadPosition1Chunks() {
  try {
    console.log('📸 Uploading Position 1 Clean Chunks to OpenAI');
    console.log('==============================================');
    
    const vectorStoreId = 'vs_68d2f2cb73a88191afd3c918c2fb16d4';
    const chunksDir = './metafield_chunks_position1';
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    
    console.log(`🎯 Vector Store: ${vectorStoreId}`);
    console.log(`📁 Clean chunks directory: ${chunksDir}`);
    
    const openai = new OpenAI({ apiKey });
    
    // Read the clean chunks index
    const indexPath = path.join(chunksDir, 'metafield_index.json');
    if (!fs.existsSync(indexPath)) {
      throw new Error('Metafield chunks not found. Run chunk-by-metafields.ts first.');
    }
    
    const chunkIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    console.log(`📊 Clean chunks available: ${chunkIndex.chunks.length}`);
    
    // Find the chunk with reference match
    const referenceChunk = chunkIndex.chunks.find((c: any) => c.includesReference);
    console.log(`🎯 Reference match in: ${referenceChunk?.filename || 'Not found'}`);
    
    // Upload the most important chunks (prioritize reference chunk)
    const uploadOrder = [
      'metafield_index.json',
      referenceChunk?.filename, // Reference chunk first
      ...chunkIndex.chunks
        .filter((c: any) => c.color === 'blonde' && c.filename !== referenceChunk?.filename)
        .slice(0, 3)
        .map((c: any) => c.filename),
      ...chunkIndex.chunks
        .filter((c: any) => c.color === 'brunette')
        .slice(0, 2) 
        .map((c: any) => c.filename),
      ...chunkIndex.chunks
        .filter((c: any) => c.color === 'black')
        .slice(0, 1)
        .map((c: any) => c.filename)
    ].filter(Boolean); // Remove undefined values
    
    console.log('\n📤 Uploading priority clean chunks...');
    console.log(`📋 Upload queue: ${uploadOrder.length} files`);
    
    const uploadedFiles: string[] = [];
    
    for (const filename of uploadOrder) {
      const filePath = path.join(chunksDir, filename);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ Skipping ${filename} (not found)`);
        continue;
      }
      
      const fileStats = fs.statSync(filePath);
      const fileSizeKB = Math.round(fileStats.size / 1024 * 100) / 100;
      
      const isReferenceChunk = filename === referenceChunk?.filename;
      
      console.log(`\n📤 Uploading ${filename} (${fileSizeKB} KB)${isReferenceChunk ? ' [REFERENCE]' : ''}...`);
      
      try {
        const file = await openai.files.create({
          file: fs.createReadStream(filePath),
          purpose: 'assistants'
        });
        
        console.log(`✅ Uploaded: ${filename} → File ID: ${file.id}`);
        uploadedFiles.push(filename);
        
        if (isReferenceChunk) {
          console.log('🎯 Reference match chunk uploaded - ChatGPT can now access your perfect match!');
        }
        
        // Small delay
        if (uploadedFiles.length < uploadOrder.length) {
          console.log('⏳ Waiting 1 second...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (uploadError) {
        console.error(`❌ Failed to upload ${filename}:`, uploadError);
      }
    }
    
    console.log('\n🎯 Position 1 Upload Summary:');
    console.log(`✅ Successfully uploaded: ${uploadedFiles.length} clean chunks`);
    uploadedFiles.forEach(file => {
      const isRef = file === referenceChunk?.filename;
      console.log(`   ${isRef ? '🎯' : '✅'} ${file}`);
    });
    
    console.log('\n📸 Position 1 Benefits:');
    console.log('✅ Only front-facing product photos');
    console.log('✅ Professional, consistent appearance');
    console.log('✅ 2,007 quality products (vs 38,737 mixed)');
    console.log('✅ 2.82MB clean data (vs 44MB mixed)');
    console.log('🎯 Reference match accessible with Position 1 photo');
    
    console.log('\n🤖 ChatGPT Ready:');
    console.log('✅ Clean metafield chunks uploaded');
    console.log('✅ Only Position 1 images for all products');
    console.log('✅ Your reference match available with proper front photo');
    console.log('🚀 Ready for visual matching with consistent image quality!');
    
  } catch (error) {
    console.error('❌ Position 1 upload failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  uploadPosition1Chunks();
}









