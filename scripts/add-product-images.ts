#!/usr/bin/env tsx

import * as fs from 'fs';

// Add specific product image URLs based on your working Shopify CDN pattern
async function addProductImages() {
  const inputFile = './chiquel_wigs_final.jsonl';
  const outputFile = './chiquel_complete.jsonl';
  
  console.log('🖼️  Adding product images to wig data...');
  
  // Product name to image URL mappings
  const productImageMappings: Record<string, string> = {
    'sorrento surprise': 'https://cdn.shopify.com/s/files/1/0506/4710/5726/files/SorrentoSurprise2.jpg?v=1755089971',
    'meadow': 'https://cdn.shopify.com/s/files/1/0506/4710/5726/files/Meadow2.jpg?v=1755089971',
    'brett': 'https://cdn.shopify.com/s/files/1/0506/4710/5726/files/Brett2.jpg?v=1755089971',
    'marni': 'https://cdn.shopify.com/s/files/1/0506/4710/5726/files/Marni2.jpg?v=1755089971',
    'india': 'https://cdn.shopify.com/s/files/1/0506/4710/5726/files/India2.jpg?v=1755089971',
    'like': 'https://cdn.shopify.com/s/files/1/0506/4710/5726/files/Like2.jpg?v=1755089971'
  };
  
  try {
    const content = fs.readFileSync(inputFile, 'utf-8');
    const lines = content.trim().split('\n');
    const updatedLines: string[] = [];
    
    for (const line of lines) {
      const record = JSON.parse(line);
      
      // Extract product name from title
      const title = record.title || '';
      const productName = title.toLowerCase()
        .replace(/\s*\(.*?\)\s*/, '') // Remove parentheses like "(Live)" or "(Clearance)"
        .replace(/\s*-\s*.*$/, '')    // Remove color after dash
        .trim();
      
      // Find matching image URL
      let imageUrl = record.image?.url;
      
      for (const [product, url] of Object.entries(productImageMappings)) {
        if (productName.includes(product)) {
          imageUrl = url;
          console.log(`📸 ${title} → ${url}`);
          break;
        }
      }
      
      // Update the record with the correct image URL
      if (imageUrl) {
        record.image = {
          url: imageUrl,
          altText: record.title
        };
        record.attrs.image = record.image;
      }
      
      updatedLines.push(JSON.stringify(record));
    }
    
    fs.writeFileSync(outputFile, updatedLines.join('\n') + '\n');
    console.log(`✅ Updated ${updatedLines.length} records with product images`);
    console.log(`📄 Output: ${outputFile}`);

  } catch (error) {
    console.error('❌ Failed to add product images:', error);
  }
}

addProductImages();







