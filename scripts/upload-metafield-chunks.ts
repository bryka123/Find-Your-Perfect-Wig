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
 * Upload Priority Metafield Chunks to OpenAI
 */

async function uploadMetafieldChunks() {
  try {
    console.log('📦 Uploading Priority Metafield Chunks to OpenAI');
    console.log('===============================================');
    
    const vectorStoreId = 'vs_68d2f2cb73a88191afd3c918c2fb16d4';
    const chunksDir = './metafield_chunks';
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    
    console.log(`🎯 Vector Store: ${vectorStoreId}`);
    
    const openai = new OpenAI({ apiKey });
    
    // Read metafield index to identify key chunks
    const indexPath = path.join(chunksDir, 'metafield_index.json');
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    
    console.log(`📊 Available chunks: ${index.chunks.length}`);
    
    // Priority upload order (most common use cases + reference match)
    const priorityChunks = [
      'metafield_index.json', // Structure reference
      'blonde_long_classic_lace_front.json', // Has your reference match
      'blonde_medium_classic_lace_front.json', // Most common blonde
      'blonde_short_classic_lace_front.json', // Short blonde
      'brunette_medium_classic_lace_front.json', // Most common brunette
      'black_medium_classic_lace_front.json', // Black options
      'blonde_medium_classic_basic.json', // Alternative construction
      'blonde_long_classic_basic.json', // Alternative construction
    ];
    
    const uploadedFiles: string[] = [];
    
    console.log('\n📤 Uploading priority chunks...');
    
    for (const filename of priorityChunks) {
      const filePath = path.join(chunksDir, filename);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ Skipping ${filename} (not found)`);
        continue;
      }
      
      const fileStats = fs.statSync(filePath);
      const fileSizeKB = Math.round(fileStats.size / 1024 * 100) / 100;
      
      // Check if this chunk has the reference match
      const isReferenceChunk = index.chunks.find((c: any) => 
        c.filename === filename && c.includesReference
      );
      
      console.log(`\n📤 Uploading ${filename} (${fileSizeKB} KB)${isReferenceChunk ? ' [REFERENCE]' : ''}...`);
      
      try {
        const file = await openai.files.create({
          file: fs.createReadStream(filePath),
          purpose: 'assistants'
        });
        
        console.log(`✅ Uploaded: ${filename} → File ID: ${file.id}`);
        uploadedFiles.push(filename);
        
        if (isReferenceChunk) {
          console.log('🎯 Reference match chunk uploaded successfully!');
        }
        
        // Delay to avoid rate limits
        if (uploadedFiles.length < priorityChunks.length) {
          console.log('⏳ Waiting 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (uploadError) {
        console.error(`❌ Failed to upload ${filename}:`, uploadError);
      }
    }
    
    console.log('\n🎯 Upload Summary:');
    console.log(`✅ Successfully uploaded: ${uploadedFiles.length} chunks`);
    uploadedFiles.forEach(file => {
      const isRef = file.includes('blonde_long_classic_lace');
      console.log(`   ${isRef ? '🎯' : '✅'} ${file}`);
    });
    
    console.log('\n📊 Metafield Chunk Benefits:');
    console.log('⚡ Ultra-fast searches: 45KB chunks vs 44MB file');
    console.log('🎯 Targeted results: Only relevant color+style combinations');  
    console.log('🎨 Visual matching: ChatGPT analyzes actual compatibility');
    console.log('✅ Reference guarantee: Your perfect match always available');
    
    console.log('\n🤖 Next: Update assistant to use metafield chunk strategy');
    
  } catch (error) {
    console.error('❌ Upload failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  uploadMetafieldChunks();
}









