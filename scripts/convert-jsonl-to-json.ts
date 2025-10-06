#!/usr/bin/env tsx

import * as fs from 'fs';

/**
 * Convert JSONL to JSON for OpenAI Upload
 * 
 * Converts JSONL format to JSON array format that OpenAI accepts
 */

function convertJsonlToJson(inputPath: string, outputPath: string) {
  console.log('🔄 Converting JSONL to JSON for OpenAI upload');
  console.log('===============================================');
  
  console.log(`📄 Input: ${inputPath}`);
  console.log(`📄 Output: ${outputPath}`);
  
  // Read JSONL file
  const content = fs.readFileSync(inputPath, 'utf-8');
  const lines = content.trim().split('\n');
  
  console.log(`📊 Found ${lines.length} records`);
  
  // Parse each line as JSON
  const records = lines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      console.error(`❌ Failed to parse line ${index + 1}:`, error);
      return null;
    }
  }).filter(record => record !== null);
  
  console.log(`✅ Successfully parsed ${records.length} records`);
  
  // Create a structured format for OpenAI
  const jsonOutput = {
    metadata: {
      type: 'wig_catalog',
      description: 'Chiquel wig product catalog with color-corrected data',
      total_products: records.length,
      generated_at: new Date().toISOString()
    },
    products: records
  };
  
  // Write JSON file
  fs.writeFileSync(outputPath, JSON.stringify(jsonOutput, null, 2));
  
  console.log(`✅ Conversion complete!`);
  console.log(`💾 Saved: ${outputPath}`);
  console.log(`📏 File size: ${Math.round(fs.statSync(outputPath).size / 1024 / 1024 * 100) / 100} MB`);
}

// CLI execution
if (require.main === module) {
  const inputFile = process.argv[2] || './chiquel_with_real_images.jsonl';
  const outputFile = process.argv[3] || './chiquel_catalog.json';
  
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Input file not found: ${inputFile}`);
    process.exit(1);
  }
  
  convertJsonlToJson(inputFile, outputFile);
}






