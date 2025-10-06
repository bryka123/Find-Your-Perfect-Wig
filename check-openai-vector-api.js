const OpenAI = require('openai');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

console.log('OpenAI SDK loaded');
console.log('\nAvailable top-level APIs:');
Object.keys(client).filter(k => !k.startsWith('_')).forEach(key => {
  console.log(`  - ${key}`);
});

// Check if vectorStores exists and what methods it has
if (client.vectorStores) {
  console.log('\n✅ vectorStores API exists!');
  console.log('Available methods:');
  Object.keys(client.vectorStores).filter(k => !k.startsWith('_')).forEach(key => {
    console.log(`  - vectorStores.${key}`);
  });
}

// Check beta APIs
if (client.beta) {
  console.log('\n📦 Beta APIs:');
  Object.keys(client.beta).filter(k => !k.startsWith('_')).forEach(key => {
    console.log(`  - beta.${key}`);
  });

  // Check if vectorStores is under beta
  if (client.beta.vectorStores) {
    console.log('\n✅ beta.vectorStores API also exists!');
  }
}

// Try to access the correct API
async function testVectorStores() {
  try {
    // Try root level first
    if (client.vectorStores && client.vectorStores.list) {
      console.log('\n🔍 Testing client.vectorStores.list()...');
      const stores = await client.vectorStores.list({ limit: 1 });
      console.log('✅ Success! Found', stores.data.length, 'vector stores');
      return;
    }

    // Try beta level
    if (client.beta?.vectorStores && client.beta.vectorStores.list) {
      console.log('\n🔍 Testing client.beta.vectorStores.list()...');
      const stores = await client.beta.vectorStores.list({ limit: 1 });
      console.log('✅ Success! Found', stores.data.length, 'vector stores');
      return;
    }

    console.log('\n❌ No vector stores API found');
  } catch (error) {
    console.log('\n❌ Error:', error.message);
  }
}

testVectorStores();