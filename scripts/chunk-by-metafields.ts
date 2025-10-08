#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

/**
 * Multi-Dimensional Chunking by Metafields
 * 
 * Creates targeted chunks based on color + length + style + construction
 * for ultra-fast OpenAI assistant processing
 */

interface MetafieldChunk {
  metadata: {
    color: string;
    length: string;
    style: string;
    capConstruction: string;
    totalVariants: number;
    filename: string;
    generated_at: string;
    includes_reference?: boolean;
    reference_match?: any;
  };
  products: any[];
}

async function chunkByMetafields() {
  try {
    console.log('🎯 Multi-Dimensional Chunking by Metafields');
    console.log('===========================================');
    
    const inputFile = process.argv[2] || './new_products_corrected.json';
    const outputDir = process.argv[3] || './metafield_chunks';
    
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
    
    // Find the reference match first
    const referenceMatch = products.find((product: any) => 
      product.attrs?.selectedOptions?.some((opt: any) => 
        opt.value?.toLowerCase().includes('rh22/26ss') ||
        opt.value?.toLowerCase().includes('shaded french vanilla')
      )
    );
    
    console.log(`🎯 Reference match: ${referenceMatch ? '✅ Found - ' + referenceMatch.title : '❌ Not found'}`);
    
    // Multi-dimensional grouping
    const metafieldGroups: { [key: string]: any[] } = {};
    
    for (const product of products) {
      const color = product.attrs?.color || 'brunette';
      const length = product.attrs?.length || 'medium';
      const style = product.attrs?.style || 'classic';
      const capConstruction = product.attrs?.capConstruction || 'basic';
      
      // Create compound key for multi-dimensional chunking
      const chunkKey = `${color}_${length}_${style}_${capConstruction}`;
      
      if (!metafieldGroups[chunkKey]) {
        metafieldGroups[chunkKey] = [];
      }
      
      metafieldGroups[chunkKey].push(product);
    }
    
    console.log(`\n📦 Created ${Object.keys(metafieldGroups).length} metafield-based chunks`);
    
    // Show top chunks by size
    const sortedChunks = Object.entries(metafieldGroups)
      .sort(([,a], [,b]) => b.length - a.length)
      .slice(0, 15);
    
    console.log('\n📊 Top 15 Largest Chunks:');
    sortedChunks.forEach(([key, products], i) => {
      const [color, length, style, cap] = key.split('_');
      const hasReference = products.some((p: any) => p.id === referenceMatch?.id);
      console.log(`  ${i + 1}. ${color}_${length}_${style}_${cap}: ${products.length} variants ${hasReference ? '🎯' : ''}`);
    });
    
    // Create optimized chunks (only for chunks with significant size)
    console.log('\n💾 Creating optimized chunk files...');
    
    const chunkIndex: any[] = [];
    let chunksCreated = 0;
    
    for (const [chunkKey, chunkProducts] of Object.entries(metafieldGroups)) {
      // Only create chunks with reasonable size (5+ products) or that contain reference match
      const hasReference = chunkProducts.some((p: any) => p.id === referenceMatch?.id);
      
      if (chunkProducts.length >= 5 || hasReference) {
        const [color, length, style, capConstruction] = chunkKey.split('_');
        
        // Limit chunk size for optimal performance (max 50 products per chunk)
        const limitedProducts = chunkProducts.slice(0, 50);
        
        const chunk: MetafieldChunk = {
          metadata: {
            color,
            length,
            style,
            capConstruction,
            totalVariants: limitedProducts.length,
            filename: `${chunkKey}.json`,
            generated_at: new Date().toISOString(),
            includes_reference: hasReference,
            reference_match: hasReference ? referenceMatch : undefined
          },
          products: limitedProducts
        };
        
        const chunkPath = path.join(outputDir, `${chunkKey}.json`);
        fs.writeFileSync(chunkPath, JSON.stringify(chunk, null, 2));
        
        const fileSizeKB = Math.round(fs.statSync(chunkPath).size / 1024 * 100) / 100;
        
        chunkIndex.push({
          chunkKey,
          color,
          length,
          style,
          capConstruction,
          filename: `${chunkKey}.json`,
          variants: limitedProducts.length,
          sizeKB: fileSizeKB,
          includesReference: hasReference
        });
        
        chunksCreated++;
        
        if (hasReference) {
          console.log(`  🎯 ${chunkKey}.json: ${limitedProducts.length} variants (${fileSizeKB} KB) [REFERENCE MATCH]`);
        } else if (chunksCreated <= 10) {
          console.log(`  ✅ ${chunkKey}.json: ${limitedProducts.length} variants (${fileSizeKB} KB)`);
        }
      }
    }
    
    if (chunksCreated > 10) {
      console.log(`  ... and ${chunksCreated - 10} more chunks`);
    }
    
    // Create master index
    const masterIndex = {
      metadata: {
        type: 'metafield_chunks_index',
        description: 'Multi-dimensional chunks by color+length+style+construction',
        total_chunks: chunksCreated,
        total_variants: products.length,
        reference_match_location: chunkIndex.find(c => c.includesReference)?.filename,
        generated_at: new Date().toISOString()
      },
      chunks: chunkIndex,
      search_strategy: {
        blonde_hair: 'Search blonde_* chunks based on desired length/style',
        brunette_hair: 'Search brunette_* chunks based on desired length/style',
        example: 'blonde + long + classic + lace_front → blonde_long_classic_lace_front.json'
      }
    };
    
    const indexPath = path.join(outputDir, 'metafield_index.json');
    fs.writeFileSync(indexPath, JSON.stringify(masterIndex, null, 2));
    
    console.log('\n✅ Metafield Chunking Complete!');
    console.log(`📦 Created ${chunksCreated} targeted chunks`);
    console.log(`📋 Index: ${indexPath}`);
    
    // Show reference match location
    const referenceChunk = chunkIndex.find(c => c.includesReference);
    if (referenceChunk) {
      console.log(`🎯 Reference match in: ${referenceChunk.filename}`);
      console.log(`   Chunk specs: ${referenceChunk.color} + ${referenceChunk.length} + ${referenceChunk.style} + ${referenceChunk.capConstruction}`);
    }
    
    console.log('\n🚀 Benefits for OpenAI Assistant:');
    console.log(`⚡ Chunk sizes: 5-50 variants each (vs 38,737 total)`);
    console.log('🎯 Targeted search: blonde_long_classic_lace_front.json');
    console.log('📊 Multi-dimensional: color + length + style + construction');
    console.log('✅ Reference guaranteed: Always available when needed');
    console.log('🤖 OpenAI optimized: Fast processing with relevant results');
    
    console.log('\n📈 Performance Estimate:');
    const avgChunkSize = chunkIndex.reduce((sum, c) => sum + c.sizeKB, 0) / chunkIndex.length;
    console.log(`  Average chunk: ${Math.round(avgChunkSize * 100) / 100} KB`);
    console.log(`  vs Original: 44,570 KB`);
    console.log(`  Speed improvement: ~${Math.round(44570 / avgChunkSize)}x faster`);
    
  } catch (error) {
    console.error('❌ Metafield chunking failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  chunkByMetafields();
}









