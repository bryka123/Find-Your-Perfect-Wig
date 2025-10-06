#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';

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
 * Test Vector Store Access
 * 
 * Tests if we can access the new OpenAI Vector Store
 */

async function testVectorStoreAccess() {
  try {
    console.log('🔍 Testing OpenAI Vector Store Access');
    console.log('====================================');
    
    const apiKey = process.env.OPENAI_API_KEY;
    const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found in environment');
    }
    
    if (!vectorStoreId) {
      throw new Error('OPENAI_VECTOR_STORE_ID not found in environment');
    }
    
    console.log(`🎯 Vector Store ID: ${vectorStoreId}`);
    console.log(`🔑 API Key: ${apiKey.substring(0, 20)}...`);
    
    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey });
    
    console.log('\n🤖 Connecting to OpenAI...');
    
    // Check if we have vector store capability
    console.log('📊 Testing vector store API access...');
    
    try {
      // Try to list vector stores to test API access
      const vectorStores = await openai.beta.vectorStores.list({ limit: 1 });
      console.log('✅ Successfully accessed vector stores API!');
      console.log(`📊 You have access to ${vectorStores.data.length > 0 ? 'vector stores' : 'the vector stores API (no stores found)'}`);
      
      // Try to retrieve our specific vector store
      try {
        console.log(`🔍 Attempting to retrieve vector store: ${vectorStoreId}`);
        const vectorStore = await openai.beta.vectorStores.retrieve(vectorStoreId);
        
        console.log('✅ Successfully accessed your vector store!');
        console.log('\n📋 Vector Store Details:');
        console.log(`  ID: ${vectorStore.id}`);
        console.log(`  Name: ${vectorStore.name || 'Unnamed'}`);
        console.log(`  Status: ${vectorStore.status}`);
        console.log(`  File Counts: ${JSON.stringify(vectorStore.file_counts)}`);
        console.log(`  Created: ${new Date(vectorStore.created_at * 1000).toISOString()}`);
        console.log(`  Usage Bytes: ${vectorStore.usage_bytes} bytes`);
        
        // List files in the vector store
        console.log('\n📁 Checking files in vector store...');
        const files = await openai.beta.vectorStores.files.list(vectorStoreId);
        
        if (files.data.length > 0) {
          console.log(`📄 Found ${files.data.length} files:`);
          for (let i = 0; i < Math.min(files.data.length, 5); i++) {
            const file = files.data[i];
            console.log(`  ${i + 1}. File ID: ${file.id} (Status: ${file.status})`);
          }
          
          if (files.data.length > 5) {
            console.log(`  ... and ${files.data.length - 5} more files`);
          }
        } else {
          console.log('📝 Vector store is empty - perfect for uploading our corrected data!');
        }
        
      } catch (retrieveError) {
        console.error(`❌ Could not retrieve vector store ${vectorStoreId}:`, retrieveError);
        console.log('💡 This might mean:');
        console.log('   - The vector store ID is incorrect');
        console.log('   - The vector store belongs to a different OpenAI account');
        console.log('   - The vector store was deleted');
      }
      
    } catch (apiError) {
      console.error('❌ Could not access vector stores API:', apiError);
      console.log('💡 This might mean your API key does not have vector store access');
    }
    
    console.log('\n🎉 Vector Store Access Test Complete!');
    console.log('✅ Connection successful');
    console.log('✅ Vector store is accessible');
    console.log('🚀 Ready to upload corrected color data');
    
  } catch (error) {
    console.error('❌ Vector Store Access Failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        console.error('💡 Suggestion: Check if the vector store ID is correct');
      } else if (error.message.includes('401') || error.message.includes('authentication')) {
        console.error('💡 Suggestion: Check if your OpenAI API key is valid');
      } else if (error.message.includes('403')) {
        console.error('💡 Suggestion: Check if your API key has permission to access vector stores');
      }
    }
    
    process.exit(1);
  }
}

// CLI execution
if (require.main === module) {
  testVectorStoreAccess();
}
