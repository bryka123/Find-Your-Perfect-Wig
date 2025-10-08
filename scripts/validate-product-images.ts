#!/usr/bin/env tsx

/**
 * Validate Product Images
 * 
 * Checks which product images are actually accessible and creates a clean dataset
 */

import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

/**
 * Check if an image URL is accessible
 */
async function checkImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      timeout: 5000
    });
    return response.ok && response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Main validation function
 */
async function validateProductImages() {
  console.log('🔍 Validating Product Images');
  console.log('============================\n');
  
  // Load catalog
  const catalogPath = './chiquel_catalog.json';
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  const products = catalog.products || [];
  
  console.log(`Total products: ${products.length}`);
  
  // Filter products with images
  const productsWithImages = products.filter((p: any) => p.image?.url);
  console.log(`Products with image URLs: ${productsWithImages.length}`);
  
  // Check a sample of images
  console.log('\n📸 Checking image accessibility (sample of 50)...\n');
  
  const sampleSize = 50;
  const sample = productsWithImages.slice(0, sampleSize);
  
  const validProducts: any[] = [];
  const invalidProducts: any[] = [];
  
  for (let i = 0; i < sample.length; i++) {
    const product = sample[i];
    const imageUrl = product.image.url;
    
    process.stdout.write(`Checking ${i + 1}/${sampleSize}... `);
    
    const isValid = await checkImageUrl(imageUrl);
    
    if (isValid) {
      console.log(`✅ ${product.title.substring(0, 30)}...`);
      validProducts.push(product);
    } else {
      console.log(`❌ ${product.title.substring(0, 30)}...`);
      invalidProducts.push(product);
    }
  }
  
  console.log('\n📊 Results:');
  console.log(`Valid images: ${validProducts.length}/${sampleSize}`);
  console.log(`Invalid images: ${invalidProducts.length}/${sampleSize}`);
  
  // Analyze patterns
  console.log('\n🔍 Analyzing URL patterns...\n');
  
  const urlPatterns = new Map<string, number>();
  
  invalidProducts.forEach(p => {
    const url = p.image.url;
    
    // Extract patterns
    if (url.includes('v=1755089971')) {
      urlPatterns.set('Future timestamp (v=1755089971)', (urlPatterns.get('Future timestamp (v=1755089971)') || 0) + 1);
    }
    
    const match = url.match(/files\/([^\/]+)\.(jpg|png|webp)/);
    if (match) {
      const filename = match[1];
      if (filename.endsWith('2')) {
        urlPatterns.set('Filename ending with "2"', (urlPatterns.get('Filename ending with "2"') || 0) + 1);
      }
    }
  });
  
  console.log('Invalid image patterns:');
  urlPatterns.forEach((count, pattern) => {
    console.log(`  ${pattern}: ${count} images`);
  });
  
  // Check alternative sources
  console.log('\n🔄 Checking alternative image sources...\n');
  
  // Check dynamic chunks
  const dynamicChunks = [
    './dynamic_chunks/blonde_position1.json',
    './dynamic_chunks/brunette_position1.json',
    './dynamic_chunks/black_position1.json'
  ];
  
  let validDynamicImages = 0;
  
  for (const chunkPath of dynamicChunks) {
    if (fs.existsSync(chunkPath)) {
      const chunk = JSON.parse(fs.readFileSync(chunkPath, 'utf-8'));
      const products = chunk.products || [];
      
      const withImages = products.filter((p: any) => p.image?.url && !p.image.url.includes('v=1755089971'));
      validDynamicImages += withImages.length;
      
      console.log(`${path.basename(chunkPath)}: ${withImages.length} products with valid-looking images`);
    }
  }
  
  // Create cleaned dataset
  console.log('\n💾 Creating cleaned dataset...\n');
  
  const cleanProducts = validProducts.map(p => ({
    id: p.id,
    title: p.title,
    color: p.attrs?.selectedOptions?.[0]?.value || 'unknown',
    colorFamily: p.attrs?.color || 'unknown',
    price: p.attrs?.price || '0',
    imageUrl: p.image.url,
    style: {
      length: p.attrs?.length,
      texture: p.attrs?.texture,
      construction: p.attrs?.capConstruction
    }
  }));
  
  const outputPath = './valid_product_images.json';
  fs.writeFileSync(outputPath, JSON.stringify({
    metadata: {
      totalProducts: cleanProducts.length,
      validatedAt: new Date().toISOString()
    },
    products: cleanProducts
  }, null, 2));
  
  console.log(`✅ Created ${outputPath} with ${cleanProducts.length} valid products`);
  
  console.log('\n📝 Recommendations:');
  console.log('1. Most images with v=1755089971 timestamp are broken (future date)');
  console.log('2. Use dynamic chunks or position1 mapping for better image availability');
  console.log('3. Consider using fallback images for products without valid images');
  console.log('4. The visual matching system should validate images before sending to GPT-4');
}

// Run validation
if (require.main === module) {
  validateProductImages().catch(console.error);
}









