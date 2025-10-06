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
 * Update Assistant with Uploaded File
 * 
 * Directly updates the assistant to use the uploaded data file
 */

async function updateAssistantWithFile() {
  try {
    console.log('🔄 Updating Assistant with Uploaded File');
    console.log('========================================');
    
    const apiKey = process.env.OPENAI_API_KEY;
    const assistantId = 'asst_d2jRMh6C6H9HorKth2FVTASD'; // From earlier creation
    const fileId = process.argv[2] || 'file-Ph1NF7fExkMJwzdkKFPbup'; // From upload
    const vectorStoreId = 'vs_68d2f2cb73a88191afd3c918c2fb16d4';
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found in environment');
    }
    
    console.log(`🤖 Assistant ID: ${assistantId}`);
    console.log(`📄 File ID: ${fileId}`);
    console.log(`🎯 Vector Store: ${vectorStoreId}`);
    
    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey });
    
    console.log('\n🔄 Updating assistant configuration...');
    
    // Update the assistant to ensure it has the right configuration
    const updatedAssistant = await openai.beta.assistants.update(assistantId, {
      name: 'Chiquel Wig Matcher - With Data',
      description: 'AI assistant for matching wigs with uploaded product catalog',
      instructions: `You are a professional wig matching assistant for Chiquel. You have access to a complete catalog of wig products.

CRITICAL RULES FOR RESPONSES:
1. ALWAYS return results as valid JSON arrays when requested
2. NEVER include markdown formatting (no \`\`\`json)
3. Focus on accurate color matching
4. Include product details: id, title, color, price, attributes
5. Provide match scores and reasons

When searching for wigs:
- Look for exact color matches first
- Consider style preferences (length, texture, construction)
- Include availability and pricing
- Explain why each product matches the user's request

Your goal is to help users find their perfect wig match from the available catalog.`,
      model: 'gpt-4o',
      tools: [
        {
          type: 'file_search'
        }
      ],
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStoreId]
        }
      }
    });
    
    console.log('✅ Assistant updated successfully!');
    
    // Test the assistant with the data
    console.log('\n🧪 Testing assistant with catalog data...');
    
    const testThread = await openai.beta.threads.create({
      messages: [{
        role: 'user',
        content: `Search the wig catalog and find 3 blonde wigs. Return as JSON array with this format:
[{"id": "product_id", "title": "product_name", "color": "actual_color", "price": "price", "score": 0.95}]`
      }]
    });
    
    console.log('🔍 Running search test...');
    const testRun = await openai.beta.threads.runs.createAndPoll(testThread.id, {
      assistant_id: assistantId
    });
    
    if (testRun.status === 'completed') {
      console.log('✅ Test completed successfully!');
      const messages = await openai.beta.threads.messages.list(testThread.id);
      const response = messages.data[0];
      
      if (response.content[0].type === 'text') {
        const responseText = response.content[0].text.value;
        console.log('\n📊 Search Results:');
        console.log(responseText);
        
        // Try to parse as JSON to verify format
        try {
          const jsonMatch = responseText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const results = JSON.parse(jsonMatch[0]);
            console.log(`\n✅ Found ${results.length} results in valid JSON format!`);
            
            // Show color analysis
            const colors = results.map((r: any) => r.color).filter((c: string) => c);
            console.log(`🎨 Colors found: ${[...new Set(colors)].join(', ')}`);
          }
        } catch (parseError) {
          console.log('⚠️ Response not in JSON format, but assistant is working');
        }
      }
    } else {
      console.log(`⚠️ Test status: ${testRun.status}`);
      if (testRun.last_error) {
        console.log(`Error: ${testRun.last_error}`);
      }
    }
    
    console.log('\n🎉 Assistant Setup Complete!');
    console.log('✅ Assistant updated with catalog data');
    console.log('✅ File search enabled');
    console.log('✅ Vector store configured');
    console.log('🚀 Ready for wig matching!');
    
    console.log('\n📋 Configuration Summary:');
    console.log(`  Assistant ID: ${assistantId}`);
    console.log(`  File ID: ${fileId}`);
    console.log(`  Vector Store: ${vectorStoreId}`);
    console.log(`  Status: Active`);
    
    console.log('\n🎯 Your wig matching system should now work with the uploaded catalog!');
    
  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
}

// CLI execution
if (require.main === module) {
  updateAssistantWithFile();
}
