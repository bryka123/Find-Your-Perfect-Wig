#!/usr/bin/env tsx

import * as fs from 'fs';

// Fix image mapping using product title matching instead of IDs
async function fixImageMapping() {
  console.log('🔍 Fixing image mapping using title matching...');
  
  // Extract image URLs by product title from CSV
  const csvContent = fs.readFileSync('./Export_2025-09-22_161101.csv', 'utf-8');
  const lines = csvContent.split('\n');
  
  const productImageMap = new Map<string, string>();
  
  for (const line of lines) {
    if (line.includes('cdn.shopify.com') && line.includes('.jpg')) {
      const columns = line.split(',');
      const title = columns[1]?.replace(/"/g, '').trim();
      const imageMatch = line.match(/https:\/\/cdn\.shopify\.com[^,]*/);
      
      if (title && imageMatch) {
        const cleanTitle = title.toLowerCase()
          .replace(/\s*\(.*?\)\s*/g, '') // Remove (Live), (Clearance), etc.
          .replace(/\s*-\s*.*$/g, '')    // Remove color after dash
          .trim();
        
        if (!productImageMap.has(cleanTitle)) {
          productImageMap.set(cleanTitle, imageMatch[0]);
          console.log(`📸 ${cleanTitle}: ${imageMatch[0]}`);
        }
      }
    }
  }
  
  console.log(`✅ Found ${productImageMap.size} unique product images`);
  
  // Update JSONL records
  const jsonlContent = fs.readFileSync('./chiquel_complete.jsonl', 'utf-8');
  const records = jsonlContent.trim().split('\n').map(line => JSON.parse(line));
  
  let updated = 0;
  for (const record of records) {
    const title = record.title || '';
    const cleanTitle = title.toLowerCase()
      .replace(/\s*\(.*?\)\s*/g, '') // Remove (Live), (Clearance), etc.
      .replace(/\s*-\s*.*$/g, '')    // Remove color after dash
      .trim();
    
    const imageUrl = productImageMap.get(cleanTitle);
    if (imageUrl) {
      record.image = {
        url: imageUrl,
        altText: record.title
      };
      record.attrs.image = record.image;
      updated++;
      
      if (updated <= 5) { // Show first 5 updates
        console.log(`✅ Updated: ${record.title} → ${imageUrl}`);
      }
    }
  }
  
  // Write updated JSONL
  const updatedJsonl = records.map(r => JSON.stringify(r)).join('\n') + '\n';
  fs.writeFileSync('./chiquel_final_with_images.jsonl', updatedJsonl);
  
  console.log(`✅ Updated ${updated}/${records.length} records with real image URLs`);
  console.log(`📄 Output: ./chiquel_final_with_images.jsonl`);
}

fixImageMapping();










