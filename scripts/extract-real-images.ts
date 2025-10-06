#!/usr/bin/env tsx

import * as fs from 'fs';

// Extract actual image URLs from the original Shopify CSV
async function extractRealImages() {
  console.log('🔍 Extracting real image URLs from Shopify CSV...');
  
  const csvContent = fs.readFileSync('./Export_2025-09-22_161101.csv', 'utf-8');
  const lines = csvContent.split('\n');
  
  // Map product IDs to their first image URL
  const productImages = new Map<string, string>();
  
  for (const line of lines) {
    if (line.includes('cdn.shopify.com') && line.includes('.jpg')) {
      // Extract the image URL
      const imageMatch = line.match(/https:\/\/cdn\.shopify\.com[^,]*/);
      if (imageMatch) {
        const imageUrl = imageMatch[0];
        
        // Extract product ID (first column)
        const productId = line.split(',')[0].replace(/"/g, '');
        
        if (productId && !productImages.has(productId)) {
          productImages.set(productId, imageUrl);
          console.log(`📸 Product ${productId}: ${imageUrl}`);
        }
      }
    }
  }
  
  console.log(`✅ Found ${productImages.size} product images`);
  
  // Update the JSONL with real image URLs
  const jsonlContent = fs.readFileSync('./chiquel_complete.jsonl', 'utf-8');
  const records = jsonlContent.trim().split('\n').map(line => JSON.parse(line));
  
  let updated = 0;
  for (const record of records) {
    const productId = record.productId || record.id;
    const realImageUrl = productImages.get(productId);
    
    if (realImageUrl) {
      record.image = {
        url: realImageUrl,
        altText: record.title
      };
      record.attrs.image = record.image;
      updated++;
    }
  }
  
  // Write updated JSONL
  const updatedJsonl = records.map(r => JSON.stringify(r)).join('\n') + '\n';
  fs.writeFileSync('./chiquel_with_real_images.jsonl', updatedJsonl);
  
  console.log(`✅ Updated ${updated} records with real Shopify image URLs`);
  console.log(`📄 Output: ./chiquel_with_real_images.jsonl`);
}

extractRealImages();







