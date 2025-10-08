#!/usr/bin/env tsx

import { OpenAIVectorStore } from '../src/lib/vectors';

async function uploadDataToOpenAI() {
  try {
    const assistantId = process.env.OPENAI_VECTOR_STORE_ID;
    const jsonlFile = './Export_2025-09-22_161101_processed.jsonl';
    
    if (!assistantId) {
      console.error('❌ OPENAI_VECTOR_STORE_ID not set in environment');
      process.exit(1);
    }

    console.log(`🚀 Uploading wig data to OpenAI assistant: ${assistantId}`);
    console.log(`📄 JSONL file: ${jsonlFile}`);

    const vectorStore = OpenAIVectorStore.getInstance();
    await vectorStore.upsertFromJsonl(assistantId, jsonlFile);
    
    console.log('✅ Upload completed successfully!');
    console.log('🔍 Ready to test search functionality');

  } catch (error) {
    console.error('❌ Upload failed:', error);
    process.exit(1);
  }
}

uploadDataToOpenAI();










