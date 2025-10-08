#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { OpenAIVectorStore } from '../src/lib/vectors';

// Manually load environment variables from .env.local
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

// Load environment variables
loadEnvFile();

/**
 * Upload Corrected Color Data to OpenAI Vector Store
 * 
 * Replaces the existing vector store data with color-corrected JSONL data
 */

async function uploadCorrectedData() {
  try {
    console.log('🚀 Uploading Corrected Color Data to OpenAI Vector Store');
    console.log('======================================================');
    
    const inputPath = process.argv[2] || './chiquel_fixed_colors_test.jsonl';
    const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;
    
    if (!vectorStoreId) {
      throw new Error('OPENAI_VECTOR_STORE_ID not configured in environment');
    }
    
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input JSONL file not found: ${inputPath}`);
    }
    
    console.log(`📄 Reading corrected data from: ${inputPath}`);
    console.log(`🎯 Target vector store: ${vectorStoreId}`);
    
    // Read the corrected JSONL data
    const content = fs.readFileSync(inputPath, 'utf-8');
    const records = content.trim().split('\n').map(line => JSON.parse(line));
    
    console.log(`📊 Found ${records.length} corrected records`);
    
    // Show sample of corrections
    console.log('\n🔧 Sample corrections:');
    let sampleCount = 0;
    for (const record of records.slice(0, 5)) {
      const colorOption = record.attrs.selectedOptions.find((opt: any) => 
        opt.name.toLowerCase().includes('color')
      );
      if (colorOption) {
        console.log(`  ${record.title} (${colorOption.value}): ${record.attrs.color}`);
        sampleCount++;
      }
    }
    
    // Initialize OpenAI Vector Store
    console.log('\n🤖 Connecting to OpenAI Vector Store...');
    const vectorStore = OpenAIVectorStore.getInstance();
    
    // Save the corrected data to a file for upload
    const uploadPath = './corrected_data_for_upload.jsonl';
    fs.writeFileSync(uploadPath, content);
    
    console.log(`💾 Saved upload file: ${uploadPath}`);
    console.log('\n📤 Ready for upload to OpenAI Vector Store');
    
    // Note: You would upload this file manually via OpenAI dashboard or API
    console.log('\n🔧 Next Steps:');
    console.log('1. Go to OpenAI Platform: https://platform.openai.com/vector-stores');
    console.log(`2. Find your vector store: ${vectorStoreId}`);
    console.log('3. Delete existing files and upload the new corrected JSONL file');
    console.log(`4. Upload file: ${path.resolve(uploadPath)}`);
    
    console.log('\n✅ Corrected data is ready for upload!');
    console.log('Once uploaded, your blonde searches should return actual blonde wigs!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// CLI execution
if (require.main === module) {
  uploadCorrectedData();
}









