const OpenAI = require('openai');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testOpenAIAPIs() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in .env.local');
    return;
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  console.log('🔍 Testing OpenAI SDK');
  console.log('=' .repeat(60));

  // Check available APIs
  console.log('\n📦 Available APIs:');
  console.log('  - Main API:', !!openai);
  console.log('  - Beta API:', !!openai.beta);

  if (openai.beta) {
    console.log('\n📦 Beta APIs:');
    Object.keys(openai.beta).forEach(key => {
      if (!key.startsWith('_')) {
        console.log(`  - ${key}:`, typeof openai.beta[key]);
      }
    });
  }

  // Test Assistants API
  console.log('\n🤖 Testing Assistants API...');
  try {
    if (openai.beta.assistants) {
      // Try to list assistants
      const assistants = await openai.beta.assistants.list({ limit: 1 });
      console.log('  ✅ Assistants API works!');
      console.log('  Total assistants:', assistants.data.length);
    } else {
      console.log('  ❌ Assistants API not found');
    }
  } catch (error) {
    console.log('  ❌ Assistants API error:', error.message);
  }

  // Test Threads API
  console.log('\n💬 Testing Threads API...');
  try {
    if (openai.beta.threads) {
      // Try to create a thread
      const thread = await openai.beta.threads.create();
      console.log('  ✅ Threads API works!');
      console.log('  Created thread:', thread.id);

      // Clean up
      await openai.beta.threads.del(thread.id);
    } else {
      console.log('  ❌ Threads API not found');
    }
  } catch (error) {
    console.log('  ❌ Threads API error:', error.message);
  }

  // Check for Vector Store under Files or other locations
  console.log('\n📚 Checking for Vector Store API...');

  // Check Files API
  if (openai.files) {
    console.log('  ✅ Files API available');
  }

  // Check if vectorStores exists anywhere
  const checkForVectorStores = (obj, path = '') => {
    for (const key in obj) {
      if (key === 'vectorStores' || key === 'vectorStore') {
        console.log(`  ✅ Found ${key} at: ${path}.${key}`);
        return true;
      }
      if (typeof obj[key] === 'object' && obj[key] !== null && !key.startsWith('_') && path.length < 20) {
        checkForVectorStores(obj[key], `${path}.${key}`);
      }
    }
  };

  checkForVectorStores(openai, 'openai');

  // Test Files API for assistants
  console.log('\n📄 Testing Files API...');
  try {
    const files = await openai.files.list({ purpose: 'assistants' });
    console.log('  ✅ Files API works!');
    console.log('  Total files:', files.data.length);
  } catch (error) {
    console.log('  ❌ Files API error:', error.message);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('✅ API check complete!');
}

testOpenAIAPIs().catch(console.error);