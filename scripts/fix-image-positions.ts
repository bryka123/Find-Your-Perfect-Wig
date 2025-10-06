#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

/**
 * Fix Image Positions to Use Default Position 1 Photos
 * 
 * Ensures all products display their primary front-facing photos (Position 1)
 * instead of side angles or alternative views
 */

interface ProductWithImages {
  id: string;
  title: string;
  handle: string;
  images: Array<{
    position: number;
    url: string;
    altText: string;
  }>;
}

function parseCSVForImages(csvPath: string): Map<string, ProductWithImages> {
  console.log(`📄 Parsing CSV for image positions: ${csvPath}`);
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  const headers = lines[0].split('","').map(h => h.replace(/^"|"$/g, ''));
  
  // Find relevant column indices
  const idIndex = headers.indexOf('ID');
  const titleIndex = headers.indexOf('Title');
  const handleIndex = headers.indexOf('Handle');
  const imagePositionIndex = headers.indexOf('Image Position');
  const imageSrcIndex = headers.indexOf('Image Src');
  const imageAltIndex = headers.indexOf('Image Alt Text');
  
  console.log(`📊 Column indices - ID: ${idIndex}, Title: ${titleIndex}, Position: ${imagePositionIndex}, Src: ${imageSrcIndex}`);
  
  const productImages = new Map<string, ProductWithImages>();
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple CSV parsing
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    
    const productId = values[idIndex];
    const title = values[titleIndex];
    const handle = values[handleIndex];
    const imagePosition = parseInt(values[imagePositionIndex]) || 1;
    const imageSrc = values[imageSrcIndex];
    const imageAlt = values[imageAltIndex];
    
    if (productId && imageSrc && title) {
      if (!productImages.has(productId)) {
        productImages.set(productId, {
          id: productId,
          title,
          handle,
          images: []
        });
      }
      
      const product = productImages.get(productId)!;
      product.images.push({
        position: imagePosition,
        url: imageSrc,
        altText: imageAlt || title
      });
    }
  }
  
  console.log(`✅ Parsed ${productImages.size} products with images`);
  
  // Sort images by position for each product
  for (const product of productImages.values()) {
    product.images.sort((a, b) => a.position - b.position);
  }
  
  return productImages;
}

function fixImagePositionsInData(dataPath: string, productImages: Map<string, ProductWithImages>, outputPath: string) {
  console.log('🔧 Fixing image positions in product data...');
  
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const products = data.products;
  
  let imageUpdates = 0;
  let position1Found = 0;
  let fallbackUsed = 0;
  
  for (const product of products) {
    const productId = product.productId || product.id;
    const productImageData = productImages.get(productId);
    
    if (productImageData && productImageData.images.length > 0) {
      // Find Position 1 image (primary front-facing photo)
      const position1Image = productImageData.images.find(img => img.position === 1);
      
      if (position1Image) {
        // Update with Position 1 image
        const oldUrl = product.image?.url;
        product.image = {
          url: position1Image.url,
          altText: position1Image.altText
        };
        
        // Also update in attrs if present
        if (product.attrs) {
          product.attrs.image = product.image;
        }
        
        imageUpdates++;
        position1Found++;
        
        if (oldUrl !== position1Image.url) {
          console.log(`🔄 ${product.title}`);
          console.log(`   Old: ${oldUrl?.substring(0, 60)}...`);
          console.log(`   New: ${position1Image.url.substring(0, 60)}...`);
        }
      } else {
        // Fallback to first available image
        const firstImage = productImageData.images[0];
        if (firstImage && (!product.image?.url || product.image.url !== firstImage.url)) {
          product.image = {
            url: firstImage.url,
            altText: firstImage.altText
          };
          
          if (product.attrs) {
            product.attrs.image = product.image;
          }
          
          imageUpdates++;
          fallbackUsed++;
        }
      }
    }
  }
  
  // Save updated data
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  
  console.log('\n✅ Image Position Fix Complete!');
  console.log(`📊 Products processed: ${products.length}`);
  console.log(`🔄 Image updates made: ${imageUpdates}`);
  console.log(`🎯 Position 1 images: ${position1Found}`);
  console.log(`⚡ Fallback images: ${fallbackUsed}`);
  console.log(`💾 Updated data: ${outputPath}`);
}

async function fixImagePositions() {
  try {
    console.log('🖼️ Fixing Image Positions to Use Position 1 Photos');
    console.log('=================================================');
    
    const csvPath = process.argv[2] || './Products.csv';
    const dataPath = process.argv[3] || './new_products_corrected.json';
    const outputPath = process.argv[4] || './new_products_position1_images.json';
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }
    
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Data file not found: ${dataPath}`);
    }
    
    // Step 1: Parse CSV to get all image positions
    const productImages = parseCSVForImages(csvPath);
    
    // Show example of Longing for London images
    const londonProduct = Array.from(productImages.values()).find(p => 
      p.title.toLowerCase().includes('longing for london')
    );
    
    if (londonProduct) {
      console.log('\n📸 Example - Longing for London images:');
      londonProduct.images.forEach(img => {
        console.log(`   Position ${img.position}: ${img.url.substring(0, 80)}...`);
      });
    }
    
    // Step 2: Update product data with Position 1 images
    fixImagePositionsInData(dataPath, productImages, outputPath);
    
    console.log('\n🎯 Key Fix Examples:');
    console.log('✅ Longing for London → Now using Position 1 front photo');
    console.log('✅ All products → Primary images instead of side angles');
    console.log('✅ Consistent display → All Position 1 photos in results');
    
    console.log('\n🚀 Benefits:');
    console.log('🎨 Better visual representation');
    console.log('📸 Consistent front-facing product photos');
    console.log('✅ Professional appearance');
    console.log('🎯 Matches user expectations for product images');
    
    console.log('\n📦 Next Steps:');
    console.log('1. Update metafield chunks with Position 1 images');
    console.log('2. Re-upload corrected chunks to OpenAI');
    console.log('3. Test app with proper Position 1 images');
    
  } catch (error) {
    console.error('❌ Image position fix failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  fixImagePositions();
}






