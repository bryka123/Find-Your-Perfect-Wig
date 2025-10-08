#!/usr/bin/env tsx

/**
 * Create Valid Image Catalog
 * 
 * Combines products from various sources with valid, working images
 */

import * as fs from 'fs';
import * as path from 'path';

function loadValidProducts() {
  console.log('🔍 Creating Valid Image Catalog');
  console.log('================================\n');
  
  const validProducts: any[] = [];
  const seenIds = new Set<string>();
  
  // 1. Load from dynamic chunks (these have valid images)
  console.log('📂 Loading from dynamic chunks...');
  
  const dynamicChunks = [
    './dynamic_chunks/blonde_position1.json',
    './dynamic_chunks/brunette_position1.json', 
    './dynamic_chunks/black_position1.json',
    './dynamic_chunks/red_position1.json',
    './dynamic_chunks/gray_position1.json'
  ];
  
  for (const chunkPath of dynamicChunks) {
    if (fs.existsSync(chunkPath)) {
      const chunk = JSON.parse(fs.readFileSync(chunkPath, 'utf-8'));
      const products = chunk.products || [];
      
      // Filter for valid images (not future timestamps)
      const validChunkProducts = products.filter((p: any) => {
        if (!p.image?.url || seenIds.has(p.id)) return false;
        
        const url = p.image.url;
        // Skip future-dated images
        if (url.includes('v=1755089971')) return false;
        
        // Must be a Shopify CDN image
        if (!url.includes('cdn.shopify.com')) return false;
        
        // Must have proper file extension
        if (!url.match(/\.(jpg|jpeg|png|webp)/i)) return false;
        
        return true;
      });
      
      validChunkProducts.forEach((p: any) => {
        seenIds.add(p.id);
        validProducts.push({
          id: p.id,
          title: p.title,
          colorName: p.colorName,
          colorFamily: p.colorFamily || chunk.colorFamily,
          price: p.price,
          image: p.image,
          attributes: {
            length: p.length,
            texture: p.texture,
            style: p.style,
            construction: p.construction
          },
          source: 'dynamic_chunks'
        });
      });
      
      console.log(`  ${path.basename(chunkPath)}: ${validChunkProducts.length} valid products`);
    }
  }
  
  // 2. Load from main catalog (filter for valid images)
  console.log('\n📚 Loading from main catalog...');
  
  const catalogPath = './chiquel_catalog.json';
  if (fs.existsSync(catalogPath)) {
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    const products = catalog.products || [];
    
    const validCatalogProducts = products.filter((p: any) => {
      if (!p.image?.url || seenIds.has(p.id)) return false;
      
      const url = p.image.url;
      
      // Skip future-dated images
      if (url.includes('v=1755089971')) return false;
      
      // Must be a valid timestamp (between 2020 and 2025)
      const timestampMatch = url.match(/v=(\d+)/);
      if (timestampMatch) {
        const timestamp = parseInt(timestampMatch[1]);
        const year2020 = 1577836800;
        const year2026 = 1767225600;
        if (timestamp < year2020 || timestamp > year2026) return false;
      }
      
      return true;
    }).slice(0, 100); // Take a limited number to keep catalog manageable
    
    validCatalogProducts.forEach((p: any) => {
      seenIds.add(p.id);
      validProducts.push({
        id: p.id,
        title: p.title,
        colorName: p.attrs?.selectedOptions?.[0]?.value || 'unknown',
        colorFamily: p.attrs?.color || 'unknown',
        price: p.attrs?.price || '0',
        image: p.image,
        attributes: {
          length: p.attrs?.length,
          texture: p.attrs?.texture,
          style: p.attrs?.style,
          construction: p.attrs?.capConstruction
        },
        source: 'main_catalog'
      });
    });
    
    console.log(`  Main catalog: ${validCatalogProducts.length} valid products added`);
  }
  
  // 3. Create organized output
  console.log('\n📊 Organizing by color family...');
  
  const byColorFamily: { [key: string]: any[] } = {};
  
  validProducts.forEach(p => {
    const family = p.colorFamily || 'unknown';
    if (!byColorFamily[family]) {
      byColorFamily[family] = [];
    }
    byColorFamily[family].push(p);
  });
  
  Object.keys(byColorFamily).forEach(family => {
    console.log(`  ${family}: ${byColorFamily[family].length} products`);
  });
  
  // 4. Save the valid catalog
  const outputPath = './valid_image_catalog.json';
  
  const output = {
    metadata: {
      totalProducts: validProducts.length,
      byColorFamily: Object.keys(byColorFamily).map(family => ({
        family,
        count: byColorFamily[family].length
      })),
      createdAt: new Date().toISOString(),
      description: 'Catalog of products with validated, working image URLs'
    },
    products: validProducts,
    byColorFamily
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  
  console.log(`\n✅ Created ${outputPath}`);
  console.log(`📊 Total valid products: ${validProducts.length}`);
  console.log('\n🎯 This catalog contains only products with working images!');
  console.log('   Use this for visual-to-visual matching to avoid errors.');
}

// Run the script
if (require.main === module) {
  loadValidProducts();
}









