#!/usr/bin/env tsx

import * as fs from 'fs';

// Fix image URLs in the processed JSONL by adding correct Shopify CDN URLs
async function fixImageUrls() {
  const inputFile = './enhanced_chiquel_wigs.jsonl';
  const outputFile = './chiquel_wigs_final.jsonl';
  
  console.log('🔧 Fixing image URLs in wig data...');
  
  try {
    const content = fs.readFileSync(inputFile, 'utf-8');
    const lines = content.trim().split('\n');
    const fixedLines: string[] = [];
    
    for (const line of lines) {
      const record = JSON.parse(line);
      
      // Generate image URL based on product title - exact pattern from working URL
      const title = record.title || '';
      let handle = title.toLowerCase()
        .replace(/\s*\(.*?\)\s*/, '') // Remove parentheses like "(Live)" or "(Clearance)"
        .replace(/\s*-\s*.*$/, '')    // Remove color after dash
        .replace(/\s+/g, '')          // Remove spaces
        .replace(/[^a-z0-9]/g, '');   // Keep only alphanumeric
      
      // Fix specific product name capitalizations to match your CDN
      if (handle === 'sorrentosurprise') handle = 'SorrentoSurprise';
      if (handle === 'meadow') handle = 'Meadow'; 
      if (handle === 'brett') handle = 'Brett';
      if (handle === 'marni') handle = 'Marni';
      if (handle === 'india') handle = 'India';
      
      // Generate Shopify CDN URL using the exact pattern that works
      const imageUrl = `https://cdn.shopify.com/s/files/1/0506/4710/5726/files/${handle}2.jpg?v=1755089971`;
      
      // Update the record with the correct image URL
      record.image = {
        url: imageUrl,
        altText: record.title
      };
      
      // Also update the attrs for consistency
      record.attrs.image = record.image;
      
      fixedLines.push(JSON.stringify(record));
    }
    
    fs.writeFileSync(outputFile, fixedLines.join('\n') + '\n');
    console.log(`✅ Fixed ${fixedLines.length} records with proper image URLs`);
    console.log(`📄 Output: ${outputFile}`);
    
    // Show sample of fixed URLs
    const sample = JSON.parse(fixedLines[0]);
    console.log(`🖼️  Sample image URL: ${sample.image.url}`);

  } catch (error) {
    console.error('❌ Failed to fix image URLs:', error);
  }
}

fixImageUrls();
