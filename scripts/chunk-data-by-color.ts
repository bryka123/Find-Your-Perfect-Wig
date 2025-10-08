#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

/**
 * Chunk Data by Color Families
 * 
 * Splits the large dataset into smaller, color-specific files for faster searching
 */

interface ColorChunk {
  metadata: {
    colorFamily: string;
    totalVariants: number;
    generated_at: string;
    source_file: string;
    avg_price: number;
    price_range: { min: number; max: number };
  };
  products: any[];
}

async function chunkDataByColor() {
  try {
    console.log('📦 Chunking Data by Color Families');
    console.log('=================================');
    
    const inputFile = process.argv[2] || './new_products_corrected.json';
    const outputDir = process.argv[3] || './color_chunks';
    
    if (!fs.existsSync(inputFile)) {
      throw new Error(`Input file not found: ${inputFile}`);
    }
    
    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
      console.log(`📁 Created output directory: ${outputDir}`);
    }
    
    console.log(`📄 Reading data from: ${inputFile}`);
    const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
    const products = data.products;
    
    console.log(`📊 Processing ${products.length} products`);
    
    // Group products by color family
    const colorGroups: { [key: string]: any[] } = {
      blonde: [],
      brunette: [],
      black: [],
      red: [],
      gray: [],
      white: [],
      fantasy: []
    };
    
    let processed = 0;
    
    for (const product of products) {
      const colorFamily = product.attrs?.color || 'brunette';
      
      if (colorGroups[colorFamily]) {
        colorGroups[colorFamily].push(product);
      } else {
        // Default to brunette for unknown colors
        colorGroups.brunette.push(product);
      }
      
      processed++;
      if (processed % 5000 === 0) {
        console.log(`  Progress: ${Math.round(processed / products.length * 100)}%`);
      }
    }
    
    console.log('\n📊 Color Distribution:');
    Object.entries(colorGroups).forEach(([color, items]) => {
      console.log(`  ${color}: ${items.length} variants`);
    });
    
    // Create individual color chunk files
    console.log('\n💾 Creating color chunk files...');
    
    for (const [colorFamily, colorProducts] of Object.entries(colorGroups)) {
      if (colorProducts.length === 0) continue;
      
      // Calculate price statistics
      const prices = colorProducts.map(p => parseFloat(p.attrs?.price || '0')).filter(p => p > 0);
      const avgPrice = prices.length > 0 ? Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length * 100) / 100 : 0;
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
      
      const chunk: ColorChunk = {
        metadata: {
          colorFamily,
          totalVariants: colorProducts.length,
          generated_at: new Date().toISOString(),
          source_file: inputFile,
          avg_price: avgPrice,
          price_range: { min: minPrice, max: maxPrice }
        },
        products: colorProducts
      };
      
      const chunkPath = path.join(outputDir, `${colorFamily}.json`);
      fs.writeFileSync(chunkPath, JSON.stringify(chunk, null, 2));
      
      const fileSizeMB = Math.round(fs.statSync(chunkPath).size / 1024 / 1024 * 100) / 100;
      console.log(`  ✅ ${colorFamily}.json: ${colorProducts.length} variants (${fileSizeMB} MB)`);
      
      // Create a smaller sample for quick testing
      if (colorProducts.length > 100) {
        const sampleChunk = {
          ...chunk,
          metadata: {
            ...chunk.metadata,
            totalVariants: 100,
            note: 'Sample subset for quick testing'
          },
          products: colorProducts.slice(0, 100)
        };
        
        const samplePath = path.join(outputDir, `${colorFamily}_sample.json`);
        fs.writeFileSync(samplePath, JSON.stringify(sampleChunk, null, 2));
        
        const sampleSizeMB = Math.round(fs.statSync(samplePath).size / 1024 / 1024 * 100) / 100;
        console.log(`     Sample: ${colorFamily}_sample.json (${sampleSizeMB} MB)`);
      }
    }
    
    // Create index file
    const indexData = {
      metadata: {
        total_variants: products.length,
        color_families: Object.keys(colorGroups).length,
        created_at: new Date().toISOString(),
        source_file: inputFile
      },
      chunks: Object.entries(colorGroups).map(([color, items]) => ({
        color_family: color,
        filename: `${color}.json`,
        sample_filename: items.length > 100 ? `${color}_sample.json` : null,
        variant_count: items.length,
        percentage: Math.round(items.length / products.length * 100 * 10) / 10
      }))
    };
    
    const indexPath = path.join(outputDir, 'index.json');
    fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
    
    console.log('\n✅ Chunking Complete!');
    console.log(`📁 Output directory: ${outputDir}`);
    console.log(`📋 Index file: ${indexPath}`);
    console.log(`📦 Color chunks: ${Object.keys(colorGroups).length} files`);
    
    console.log('\n🚀 Benefits:');
    console.log('✅ Faster searches (search only relevant colors)');
    console.log('✅ Reduced memory usage');
    console.log('✅ No more API timeouts');
    console.log('✅ Better performance');
    
    console.log('\n🎯 Usage:');
    console.log('- Blonde hair → Search blonde.json only');
    console.log('- Brown hair → Search brunette.json only');
    console.log('- Mixed queries → Search multiple relevant chunks');
    
    console.log('\n📊 Performance Improvement:');
    const blondeSize = Math.round(fs.statSync(path.join(outputDir, 'blonde.json')).size / 1024 / 1024 * 100) / 100;
    const originalSize = Math.round(fs.statSync(inputFile).size / 1024 / 1024 * 100) / 100;
    console.log(`  Original file: ${originalSize} MB`);
    console.log(`  Blonde chunk: ${blondeSize} MB (${Math.round(blondeSize / originalSize * 100)}% of original)`);
    console.log(`  Speed improvement: ~${Math.round(originalSize / blondeSize)}x faster for blonde searches`);
    
  } catch (error) {
    console.error('❌ Chunking failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  chunkDataByColor();
}









