#!/usr/bin/env tsx

/**
 * Fix catalog issues:
 * 1. Remove duplicate products
 * 2. Add handles for product URLs
 * 3. Fix image URLs
 */

import * as fs from 'fs';
import * as path from 'path';

interface Product {
  id: string;
  title: string;
  handle?: string;
  colorName: string;
  colorCode?: string;
  image: {
    url: string;
    position?: number;
  };
  [key: string]: any;
}

/**
 * Generate a URL-safe handle from product title
 */
function generateHandle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '')       // Remove leading/trailing hyphens
    .replace(/--+/g, '-');         // Replace multiple hyphens with single
}

/**
 * Check if image URL is valid (not a placeholder or back view)
 */
function isValidProductImage(url: string): boolean {
  const invalidPatterns = [
    'placeholder',
    'no-image',
    'coming-soon',
    '_back',
    'Back_',
    'BACK'
  ];

  return !invalidPatterns.some(pattern => url.includes(pattern));
}

async function fixCatalog() {
  console.log('🔧 Fixing Product Catalog');
  console.log('=' .repeat(60));

  // Load current catalog
  const catalogPath = path.join(process.cwd(), 'valid_image_catalog.json');
  const catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  const products = catalogData.products || [];

  console.log(`📊 Found ${products.length} products in catalog`);

  // Track unique products
  const uniqueProducts = new Map<string, Product>();
  const duplicates: string[] = [];

  // Process products
  for (const product of products) {
    // Create unique key based on title + color
    const key = `${product.title}_${product.colorName}`.toLowerCase();

    if (uniqueProducts.has(key)) {
      // Found duplicate
      const existing = uniqueProducts.get(key)!;
      duplicates.push(`${product.title} - ${product.colorName}`);

      // Keep the one with better image
      if (!isValidProductImage(existing.image.url) && isValidProductImage(product.image.url)) {
        // Replace with better image
        existing.image = product.image;
      }
    } else {
      // Add handle if missing
      if (!product.handle) {
        product.handle = generateHandle(product.title);
      }

      // Store unique product
      uniqueProducts.set(key, product);
    }
  }

  console.log(`\n📋 Summary:`);
  console.log(`   - Original products: ${products.length}`);
  console.log(`   - Unique products: ${uniqueProducts.size}`);
  console.log(`   - Duplicates removed: ${duplicates.length}`);

  if (duplicates.length > 0) {
    console.log(`\n⚠️ Removed duplicates:`);
    duplicates.slice(0, 10).forEach(d => console.log(`   - ${d}`));
    if (duplicates.length > 10) {
      console.log(`   ... and ${duplicates.length - 10} more`);
    }
  }

  // Convert back to array and sort
  const fixedProducts = Array.from(uniqueProducts.values())
    .sort((a, b) => a.title.localeCompare(b.title));

  // Check for missing handles
  const missingHandles = fixedProducts.filter(p => !p.handle);
  if (missingHandles.length > 0) {
    console.log(`\n⚠️ Products missing handles: ${missingHandles.length}`);
  }

  // Check for invalid images
  const invalidImages = fixedProducts.filter(p => !isValidProductImage(p.image.url));
  console.log(`\n🖼️ Products with potentially invalid images: ${invalidImages.length}`);
  if (invalidImages.length > 0) {
    console.log(`   Examples:`);
    invalidImages.slice(0, 5).forEach(p => {
      console.log(`   - ${p.title}: ${p.image.url.substring(p.image.url.lastIndexOf('/') + 1)}`);
    });
  }

  // Save fixed catalog
  const outputPath = path.join(process.cwd(), 'fixed_catalog.json');
  const output = {
    metadata: {
      totalProducts: fixedProducts.length,
      duplicatesRemoved: duplicates.length,
      lastUpdated: new Date().toISOString(),
      version: '2.0'
    },
    products: fixedProducts
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`\n✅ Fixed catalog saved to: fixed_catalog.json`);

  // Show some example products with handles
  console.log(`\n🔗 Example Product URLs:`);
  fixedProducts.slice(0, 5).forEach(p => {
    console.log(`   ${p.title}: https://chiquel.com/products/${p.handle}`);
  });
}

// Run if executed directly
if (require.main === module) {
  fixCatalog().catch(console.error);
}

export { fixCatalog, generateHandle };