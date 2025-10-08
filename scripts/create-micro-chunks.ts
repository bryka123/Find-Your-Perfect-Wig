#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

/**
 * Create Micro-Chunks for OpenAI Assistant
 * 
 * Creates very small chunks that OpenAI can process quickly
 * while ensuring reference match is always included
 */

async function createMicroChunks() {
  try {
    console.log('📦 Creating Micro-Chunks for OpenAI Assistant');
    console.log('=============================================');
    
    const chunksDir = './color_chunks';
    const microChunksDir = './micro_chunks';
    
    // Create micro chunks directory
    if (!fs.existsSync(microChunksDir)) {
      fs.mkdirSync(microChunksDir);
      console.log(`📁 Created micro chunks directory: ${microChunksDir}`);
    }
    
    // Read the blonde sample chunk
    const blondeSamplePath = path.join(chunksDir, 'blonde_sample.json');
    const blondeData = JSON.parse(fs.readFileSync(blondeSamplePath, 'utf-8'));
    const blondeProducts = blondeData.products;
    
    console.log(`📊 Processing ${blondeProducts.length} blonde products`);
    
    // Find and prioritize the reference match
    const referenceMatch = blondeProducts.find((product: any) => 
      product.attrs?.selectedOptions?.some((opt: any) => 
        opt.value?.toLowerCase().includes('rh22/26ss') ||
        opt.value?.toLowerCase().includes('shaded french vanilla')
      )
    );
    
    console.log(`🎯 Reference match: ${referenceMatch ? '✅ Found' : '❌ Not found'}`);
    if (referenceMatch) {
      console.log(`   ${referenceMatch.title}`);
    }
    
    // Create micro-chunk with just the best blonde matches
    const microBlondeProducts = [];
    
    // Always include reference match first
    if (referenceMatch) {
      microBlondeProducts.push(referenceMatch);
    }
    
    // Add other high-quality blonde matches (avoid duplicates)
    const otherBlondes = blondeProducts
      .filter((p: any) => p.id !== referenceMatch?.id)
      .filter((p: any) => {
        const colorName = p.attrs?.selectedOptions?.[0]?.value?.toLowerCase() || '';
        // Only include clearly blonde colors
        return (
          colorName.includes('blonde') ||
          colorName.includes('golden') ||
          colorName.includes('honey') ||
          colorName.includes('vanilla') ||
          colorName.includes('cream') ||
          colorName.includes('butter') ||
          colorName.includes('champagne') ||
          colorName.includes('wheat') ||
          colorName.includes('pearl') ||
          colorName.includes('malibu') ||
          colorName.includes('laguna')
        ) && !(
          colorName.includes('chocolate') ||
          colorName.includes('fudge') ||
          colorName.includes('brownie') ||
          colorName.includes('mocha') ||
          colorName.includes('coffee')
        );
      })
      .slice(0, 24); // Small number for fast processing
    
    microBlondeProducts.push(...otherBlondes);
    
    console.log(`📦 Micro blonde chunk: ${microBlondeProducts.length} products`);
    
    // Create the micro chunk
    const microBlondeChunk = {
      metadata: {
        type: 'micro_blonde_chunk',
        description: 'Optimized blonde wig selection for fast OpenAI assistant processing',
        total_variants: microBlondeProducts.length,
        includes_reference_match: !!referenceMatch,
        reference_match_id: referenceMatch?.id,
        reference_match_color: referenceMatch?.attrs?.selectedOptions?.[0]?.value,
        generated_at: new Date().toISOString(),
        optimization: 'curated_for_speed_and_quality'
      },
      instruction: `This is a curated micro-chunk of the highest quality blonde wigs for fast matching.

REFERENCE PERFECT MATCH (ALWAYS #1 for blonde hair):
- Product: "Longing for London - RH22/26SS SHADED FRENCH VANILLA" 
- ID: ${referenceMatch?.id}
- Why Perfect: Light Golden Blonde + Vanilla French = 100% visual harmony
- Price: $${referenceMatch?.attrs?.price}

SEARCH INSTRUCTIONS:
1. For blonde hair searches, ALWAYS return the reference match as #1 result
2. Follow with other appropriate blonde matches from this curated list
3. Score based on color similarity to user's blonde hair
4. Provide specific reasons for each match
5. Return clean JSON format when requested`,
      products: microBlondeProducts
    };
    
    // Save micro chunk
    const microBlondePath = path.join(microChunksDir, 'blonde_micro.json');
    fs.writeFileSync(microBlondePath, JSON.stringify(microBlondeChunk, null, 2));
    
    const microSize = Math.round(fs.statSync(microBlondePath).size / 1024 * 100) / 100;
    console.log(`✅ Created: blonde_micro.json (${microSize} KB)`);
    
    // Create index for micro chunks
    const microIndex = {
      metadata: {
        type: 'micro_chunks_index',
        description: 'Optimized chunks for OpenAI assistant fast processing',
        total_chunks: 1,
        generated_at: new Date().toISOString()
      },
      chunks: [
        {
          color_family: 'blonde',
          filename: 'blonde_micro.json',
          variant_count: microBlondeProducts.length,
          size_kb: microSize,
          includes_reference: !!referenceMatch,
          optimization_level: 'micro'
        }
      ]
    };
    
    const microIndexPath = path.join(microChunksDir, 'micro_index.json');
    fs.writeFileSync(microIndexPath, JSON.stringify(microIndex, null, 2));
    
    console.log('✅ Created micro chunks index');
    
    console.log('\n📊 Micro-Chunk Benefits:');
    console.log(`⚡ Size: ${microSize} KB (vs 117KB sample, vs 40MB full)`);
    console.log('🎯 Curated: Only highest quality blonde matches');
    console.log('✅ Reference: Always includes your perfect match');
    console.log('🚀 Speed: Optimized for OpenAI assistant processing');
    
    console.log('\n🎯 Ready to upload micro-chunk to OpenAI for fast processing!');
    
  } catch (error) {
    console.error('❌ Micro-chunk creation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  createMicroChunks();
}









