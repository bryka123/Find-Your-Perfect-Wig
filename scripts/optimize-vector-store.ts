#!/usr/bin/env tsx

/**
 * Optimize Vector Store for Enhanced Variant Matching
 * 
 * Creates an optimized vector store structure for efficient variant searching
 */

import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';

// Load environment variables
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
      }
    }
  }
}

/**
 * Create optimized vector store structure
 */
async function optimizeVectorStore() {
  console.log('🚀 Optimizing Vector Store for Variant Matching');
  console.log('================================================\n');
  
  loadEnvFile();
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not configured');
    process.exit(1);
  }
  
  const openai = new OpenAI({ apiKey });
  
  try {
    // Load catalog
    console.log('📚 Loading product catalog...');
    const catalog = JSON.parse(fs.readFileSync('./chiquel_catalog.json', 'utf-8'));
    const products = catalog.products || [];
    console.log(`✅ Loaded ${products.length} product variants\n`);
    
    // Analyze product distribution
    console.log('📊 Analyzing product distribution...');
    const stats = analyzeProductDistribution(products);
    displayStatistics(stats);
    
    // Create optimized data structures
    console.log('\n🔧 Creating optimized data structures...\n');
    
    // 1. Create variant-aware chunks
    const variantChunks = createVariantChunks(products);
    
    // 2. Create style-based indexes
    const styleIndexes = createStyleIndexes(products);
    
    // 3. Create color-variant mapping
    const colorVariantMap = createColorVariantMapping(products);
    
    // Save optimized structures
    console.log('\n💾 Saving optimized structures...');
    
    const outputDir = './optimized_data';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save variant chunks
    fs.writeFileSync(
      path.join(outputDir, 'variant_chunks.json'),
      JSON.stringify(variantChunks, null, 2)
    );
    console.log('✅ Saved variant chunks');
    
    // Save style indexes
    fs.writeFileSync(
      path.join(outputDir, 'style_indexes.json'),
      JSON.stringify(styleIndexes, null, 2)
    );
    console.log('✅ Saved style indexes');
    
    // Save color-variant mapping
    fs.writeFileSync(
      path.join(outputDir, 'color_variant_map.json'),
      JSON.stringify(colorVariantMap, null, 2)
    );
    console.log('✅ Saved color-variant mapping');
    
    // Create enhanced vector store
    console.log('\n🎯 Creating enhanced vector store...');
    
    const vectorStore = await openai.beta.vectorStores.create({
      name: 'Chiquel Enhanced Variant Store',
      expires_after: {
        anchor: 'last_active_at',
        days: 30
      }
    });
    
    console.log(`✅ Created vector store: ${vectorStore.id}`);
    
    // Prepare files for upload
    console.log('\n📤 Uploading optimized data to vector store...');
    
    // Create comprehensive product documents
    const documents = createOptimizedDocuments(products, variantChunks, styleIndexes, colorVariantMap);
    
    // Save documents
    const documentsPath = path.join(outputDir, 'enhanced_documents.jsonl');
    const documentsContent = documents.map(doc => JSON.stringify(doc)).join('\n');
    fs.writeFileSync(documentsPath, documentsContent);
    console.log(`✅ Created ${documents.length} optimized documents`);
    
    // Upload to OpenAI
    const fileStream = fs.createReadStream(documentsPath);
    const file = await openai.files.create({
      file: fileStream,
      purpose: 'assistants'
    });
    
    console.log(`✅ Uploaded file: ${file.id}`);
    
    // Attach to vector store
    await openai.beta.vectorStores.files.createAndPoll(vectorStore.id, {
      file_id: file.id
    });
    
    console.log('✅ File attached to vector store');
    
    // Update or create assistant
    console.log('\n🤖 Configuring assistant for enhanced matching...');
    
    const assistantInstructions = generateEnhancedInstructions(stats);
    
    const assistant = await openai.beta.assistants.create({
      name: 'Chiquel Enhanced Variant Matcher',
      description: 'Advanced wig matching with comprehensive variant support',
      model: 'gpt-4o',
      instructions: assistantInstructions,
      tools: [{ type: 'file_search' }],
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStore.id]
        }
      }
    });
    
    console.log(`✅ Created assistant: ${assistant.id}`);
    
    // Save configuration
    const config = {
      vectorStoreId: vectorStore.id,
      assistantId: assistant.id,
      fileId: file.id,
      statistics: stats,
      createdAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(outputDir, 'vector_store_config.json'),
      JSON.stringify(config, null, 2)
    );
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ VECTOR STORE OPTIMIZATION COMPLETE');
    console.log('='.repeat(80));
    console.log('\nConfiguration saved to: ./optimized_data/vector_store_config.json');
    console.log(`\nVector Store ID: ${vectorStore.id}`);
    console.log(`Assistant ID: ${assistant.id}`);
    console.log('\nUpdate your .env.local with:');
    console.log(`OPENAI_VECTOR_STORE_ID=${vectorStore.id}`);
    console.log(`OPENAI_ASSISTANT_ID=${assistant.id}`);
    
  } catch (error) {
    console.error('❌ Optimization failed:', error);
    process.exit(1);
  }
}

/**
 * Analyze product distribution
 */
function analyzeProductDistribution(products: any[]) {
  const stats = {
    totalProducts: products.length,
    uniqueBaseProducts: new Set<string>(),
    colorFamilies: new Map<string, number>(),
    lengths: new Map<string, number>(),
    textures: new Map<string, number>(),
    styles: new Map<string, number>(),
    variantsPerProduct: new Map<string, number>(),
    priceRange: { min: Infinity, max: 0 },
    availableCount: 0
  };
  
  products.forEach(product => {
    // Base product
    const baseTitle = product.title.split(' - ')[0];
    stats.uniqueBaseProducts.add(baseTitle);
    
    // Count variants per product
    const count = stats.variantsPerProduct.get(baseTitle) || 0;
    stats.variantsPerProduct.set(baseTitle, count + 1);
    
    // Color families
    const colorFamily = product.attrs?.color || 'unknown';
    stats.colorFamilies.set(colorFamily, (stats.colorFamilies.get(colorFamily) || 0) + 1);
    
    // Attributes
    const length = product.attrs?.length || 'unknown';
    stats.lengths.set(length, (stats.lengths.get(length) || 0) + 1);
    
    const texture = product.attrs?.texture || 'unknown';
    stats.textures.set(texture, (stats.textures.get(texture) || 0) + 1);
    
    const style = product.attrs?.style || 'unknown';
    stats.styles.set(style, (stats.styles.get(style) || 0) + 1);
    
    // Price range
    const price = parseFloat(product.attrs?.price || '0');
    if (price > 0) {
      stats.priceRange.min = Math.min(stats.priceRange.min, price);
      stats.priceRange.max = Math.max(stats.priceRange.max, price);
    }
    
    // Availability
    if (product.attrs?.availableForSale) {
      stats.availableCount++;
    }
  });
  
  return stats;
}

/**
 * Display statistics
 */
function displayStatistics(stats: any) {
  console.log(`\nTotal Product Variants: ${stats.totalProducts}`);
  console.log(`Unique Base Products: ${stats.uniqueBaseProducts.size}`);
  console.log(`Available for Sale: ${stats.availableCount} (${Math.round(stats.availableCount / stats.totalProducts * 100)}%)`);
  console.log(`Price Range: $${stats.priceRange.min.toFixed(2)} - $${stats.priceRange.max.toFixed(2)}`);
  
  console.log('\nColor Family Distribution:');
  Array.from(stats.colorFamilies.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([family, count]) => {
      const percentage = (count / stats.totalProducts * 100).toFixed(1);
      console.log(`  ${family}: ${count} (${percentage}%)`);
    });
  
  console.log('\nVariants per Product:');
  const variantCounts = Array.from(stats.variantsPerProduct.values());
  const maxVariants = Math.max(...variantCounts);
  const avgVariants = variantCounts.reduce((a, b) => a + b, 0) / variantCounts.length;
  console.log(`  Maximum: ${maxVariants} variants`);
  console.log(`  Average: ${avgVariants.toFixed(1)} variants`);
}

/**
 * Create variant-aware chunks
 */
function createVariantChunks(products: any[]) {
  const chunks = new Map<string, any[]>();
  
  // Group by base product
  products.forEach(product => {
    const baseTitle = product.title.split(' - ')[0];
    if (!chunks.has(baseTitle)) {
      chunks.set(baseTitle, []);
    }
    chunks.get(baseTitle)!.push(product);
  });
  
  // Convert to array format
  return Array.from(chunks.entries()).map(([baseTitle, variants]) => ({
    baseProduct: baseTitle,
    variantCount: variants.length,
    variants: variants.map(v => ({
      id: v.id,
      color: v.attrs?.selectedOptions?.[0]?.value || 'unknown',
      colorFamily: v.attrs?.color,
      price: v.attrs?.price,
      available: v.attrs?.availableForSale,
      image: v.image
    }))
  }));
}

/**
 * Create style-based indexes
 */
function createStyleIndexes(products: any[]) {
  const indexes = {
    byLength: new Map<string, string[]>(),
    byTexture: new Map<string, string[]>(),
    byStyle: new Map<string, string[]>(),
    byConstruction: new Map<string, string[]>()
  };
  
  products.forEach(product => {
    const id = product.id;
    
    // Index by length
    const length = product.attrs?.length || 'unknown';
    if (!indexes.byLength.has(length)) {
      indexes.byLength.set(length, []);
    }
    indexes.byLength.get(length)!.push(id);
    
    // Index by texture
    const texture = product.attrs?.texture || 'unknown';
    if (!indexes.byTexture.has(texture)) {
      indexes.byTexture.set(texture, []);
    }
    indexes.byTexture.get(texture)!.push(id);
    
    // Index by style
    const style = product.attrs?.style || 'unknown';
    if (!indexes.byStyle.has(style)) {
      indexes.byStyle.set(style, []);
    }
    indexes.byStyle.get(style)!.push(id);
    
    // Index by construction
    const construction = product.attrs?.capConstruction || 'unknown';
    if (!indexes.byConstruction.has(construction)) {
      indexes.byConstruction.set(construction, []);
    }
    indexes.byConstruction.get(construction)!.push(id);
  });
  
  // Convert maps to objects
  return {
    byLength: Object.fromEntries(indexes.byLength),
    byTexture: Object.fromEntries(indexes.byTexture),
    byStyle: Object.fromEntries(indexes.byStyle),
    byConstruction: Object.fromEntries(indexes.byConstruction)
  };
}

/**
 * Create color-variant mapping
 */
function createColorVariantMapping(products: any[]) {
  const colorMap = new Map<string, Set<string>>();
  
  products.forEach(product => {
    const colorOption = product.attrs?.selectedOptions?.find((opt: any) => 
      opt.name.toLowerCase() === 'color'
    );
    
    if (colorOption) {
      const color = colorOption.value.toLowerCase();
      const baseProduct = product.title.split(' - ')[0];
      
      if (!colorMap.has(color)) {
        colorMap.set(color, new Set());
      }
      colorMap.get(color)!.add(baseProduct);
    }
  });
  
  // Convert to object with arrays
  const result: { [key: string]: string[] } = {};
  colorMap.forEach((products, color) => {
    result[color] = Array.from(products);
  });
  
  return result;
}

/**
 * Create optimized documents for vector store
 */
function createOptimizedDocuments(
  products: any[],
  variantChunks: any[],
  styleIndexes: any,
  colorVariantMap: any
): any[] {
  const documents: any[] = [];
  
  // Create product variant documents
  products.forEach(product => {
    const colorOption = product.attrs?.selectedOptions?.find((opt: any) => 
      opt.name.toLowerCase() === 'color'
    );
    
    const doc = {
      type: 'product_variant',
      id: product.id,
      title: product.title,
      baseProduct: product.title.split(' - ')[0],
      variantColor: colorOption?.value || 'unknown',
      colorFamily: product.attrs?.color,
      style: {
        length: product.attrs?.length,
        texture: product.attrs?.texture,
        construction: product.attrs?.capConstruction,
        category: product.attrs?.style
      },
      price: product.attrs?.price,
      available: product.attrs?.availableForSale,
      searchableText: `${product.title} ${product.descriptor} ${colorOption?.value} ${product.attrs?.color} ${product.attrs?.length} ${product.attrs?.texture} ${product.attrs?.style}`,
      metadata: {
        hasImage: !!product.image?.url,
        imageUrl: product.image?.url
      }
    };
    
    documents.push(doc);
  });
  
  // Create chunk summary documents
  variantChunks.forEach(chunk => {
    const doc = {
      type: 'product_group',
      baseProduct: chunk.baseProduct,
      variantCount: chunk.variantCount,
      colorOptions: chunk.variants.map((v: any) => v.color),
      priceRange: {
        min: Math.min(...chunk.variants.map((v: any) => parseFloat(v.price))),
        max: Math.max(...chunk.variants.map((v: any) => parseFloat(v.price)))
      },
      availableColors: chunk.variants.filter((v: any) => v.available).map((v: any) => v.color)
    };
    
    documents.push(doc);
  });
  
  return documents;
}

/**
 * Generate enhanced assistant instructions
 */
function generateEnhancedInstructions(stats: any): string {
  return `You are Chiquel's Enhanced Variant Matching Assistant with access to a comprehensive catalog of ${stats.totalProducts} product variants across ${stats.uniqueBaseProducts.size} unique wig styles.

## YOUR CATALOG STRUCTURE

**Product Organization:**
- Total Variants: ${stats.totalProducts}
- Unique Base Products: ${stats.uniqueBaseProducts.size}
- Available for Purchase: ${stats.availableCount}
- Price Range: $${stats.priceRange.min.toFixed(2)} - $${stats.priceRange.max.toFixed(2)}

**Color Distribution:**
${Array.from(stats.colorFamilies.entries())
  .sort((a, b) => b[1] - a[1])
  .map(([family, count]) => `- ${family}: ${count} variants`)
  .join('\n')}

## MATCHING METHODOLOGY

When matching user images to products:

1. **ANALYZE USER'S HAIR:**
   - Identify exact color family, shade, and undertones
   - Assess style characteristics (length, texture, volume)
   - Note any special coloring (highlights, rooting, dimension)

2. **SEARCH STRATEGY:**
   - First search for exact color matches within the identified family
   - Consider all variants of products that match style criteria
   - Each product can have up to 35 color variants - evaluate them all

3. **SCORING CRITERIA:**
   - Style Match (40%): Length, texture, overall aesthetic
   - Color Match (40%): Family, shade, undertone compatibility
   - Availability (20%): Prioritize in-stock variants

4. **VARIANT SELECTION:**
   - When a base product matches well, explore ALL its color variants
   - Don't limit to just the first variant found
   - Consider that users want to see options across the color spectrum

## RESPONSE FORMAT

Always provide:
1. **Primary Matches**: Top 3-5 variants that best match the user's current look
2. **Alternative Colors**: Other color variants of the same products for variety
3. **Style Variations**: Different products with similar color but varied styles

## CRITICAL RULES

1. **No Hardcoding**: Never assume color families based on names alone
2. **Visual Priority**: Actual appearance matters more than product labels
3. **Comprehensive Coverage**: Show the full range of available variants
4. **Dynamic Adaptation**: Adjust recommendations based on user's specific characteristics

You have access to detailed product information including:
- Complete variant specifications
- Actual product images (Position 1 front-facing photos)
- Real-time availability status
- Precise color names and families

Your goal is to provide personalized, accurate matches that showcase the full variety of options available to each customer.`;
}

// Run the optimization
if (require.main === module) {
  optimizeVectorStore().catch(console.error);
}






