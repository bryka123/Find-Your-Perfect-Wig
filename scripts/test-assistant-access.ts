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

async function testAssistantAccess() {
  try {
    console.log('🧪 Testing Assistant Data Access');
    console.log('==============================');
    
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const assistantId = 'asst_d2jRMh6C6H9HorKth2FVTASD';
    
    // Test 1: Can it access any data?
    console.log('🔍 Test 1: General data access...');
    const thread1 = await openai.beta.threads.create({
      messages: [{
        role: 'user',
        content: 'How many wig products do you have in total? Just give me a number.'
      }]
    });
    
    const run1 = await openai.beta.threads.runs.createAndPoll(thread1.id, {
      assistant_id: assistantId
    });
    
    if (run1.status === 'completed') {
      const messages1 = await openai.beta.threads.messages.list(thread1.id);
      const response1 = messages1.data[0];
      if (response1.content[0].type === 'text') {
        console.log('✅ Response:', response1.content[0].text.value);
      }
    }
    
    // Test 2: Can it find products with specific color names?
    console.log('\n🔍 Test 2: Finding "Chocolate" products...');
    const thread2 = await openai.beta.threads.create({
      messages: [{
        role: 'user',
        content: 'Find products with "Chocolate" in the color name. List 3 examples with their color values.'
      }]
    });
    
    const run2 = await openai.beta.threads.runs.createAndPoll(thread2.id, {
      assistant_id: assistantId
    });
    
    if (run2.status === 'completed') {
      const messages2 = await openai.beta.threads.messages.list(thread2.id);
      const response2 = messages2.data[0];
      if (response2.content[0].type === 'text') {
        console.log('✅ Response:', response2.content[0].text.value);
      }
    }
    
    // Test 3: Check what colors are actually labeled as "blonde"
    console.log('\n🔍 Test 3: What products are labeled as color: "blonde"?...');
    const thread3 = await openai.beta.threads.create({
      messages: [{
        role: 'user',
        content: 'Show me 3 products where the "color" attribute is exactly "blonde". Include their color names and titles.'
      }]
    });
    
    const run3 = await openai.beta.threads.runs.createAndPoll(thread3.id, {
      assistant_id: assistantId
    });
    
    if (run3.status === 'completed') {
      const messages3 = await openai.beta.threads.messages.list(thread3.id);
      const response3 = messages3.data[0];
      if (response3.content[0].type === 'text') {
        console.log('✅ Response:', response3.content[0].text.value);
      }
    }
    
    console.log('\n🎯 Test Complete! This will show us exactly what data the assistant can access.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  testAssistantAccess();
}






