/**
 * Upload Product Images to OpenAI Vector Store
 *
 * This script processes all product images and stores them in OpenAI's vector database
 * for efficient retrieval and analysis using GPT-4 Vision
 */

import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in .env.local');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ProductImage {
  id: string;
  title: string;
  imagePath: string;
  colorName: string;
  colorFamily: string;
  length: string;
  style: string;
  texture: string;
  metadata: Record<string, any>;
}

/**
 * Create or get existing vector store
 */
async function getOrCreateVectorStore(name: string): Promise<string> {
  try {
    console.log('🔍 Checking for existing vector store...');

    // Vector stores API is at the root level, not under beta
    if (!openai.vectorStores) {
      console.error('❌ Vector stores API not available. Make sure you have the latest OpenAI SDK.');
      console.log('ℹ️ Vector stores require OpenAI API with Assistants v2 enabled.');
      throw new Error('Vector stores API not available');
    }

    // List existing vector stores
    const vectorStores = await openai.vectorStores.list();

    const existingStore = vectorStores.data.find((store: any) => store.name === name);

    if (existingStore) {
      console.log(`✅ Found existing vector store: ${existingStore.id}`);
      return existingStore.id;
    }

    // Create new vector store
    console.log('📦 Creating new vector store...');
    const newStore = await openai.vectorStores.create({
      name: name,
      expires_after: {
        anchor: 'last_active_at',
        days: 30
      }
    });

    console.log(`✅ Created vector store: ${newStore.id}`);
    return newStore.id;

  } catch (error) {
    console.error('❌ Error with vector store:', error);
    throw error;
  }
}

/**
 * Load product catalog with image information
 */
async function loadProductImages(): Promise<ProductImage[]> {
  console.log('📚 Loading product catalog...');

  const catalogPath = path.join(process.cwd(), 'valid_image_catalog.json');
  const catalogData = await fs.readFile(catalogPath, 'utf-8');
  const catalog = JSON.parse(catalogData);

  const productImages: ProductImage[] = [];

  for (const product of catalog.products) {
    if (product.image?.url) {
      productImages.push({
        id: product.id,
        title: product.title,
        imagePath: product.image.url,
        colorName: product.attrs?.selectedOptions?.find((opt: any) =>
          opt.name.toLowerCase() === 'color'
        )?.value || 'unknown',
        colorFamily: product.attrs?.color || 'unknown',
        length: product.attrs?.length || 'unknown',
        style: product.attrs?.style || 'unknown',
        texture: product.attrs?.texture || 'unknown',
        metadata: {
          price: product.attrs?.price,
          availableForSale: product.attrs?.availableForSale,
          ...product.attrs
        }
      });
    }
  }

  console.log(`✅ Loaded ${productImages.length} products with images`);
  return productImages;
}

/**
 * Create a document for each product with image analysis
 */
async function createProductDocument(product: ProductImage): Promise<string> {
  return `
PRODUCT: ${product.title}
ID: ${product.id}
COLOR: ${product.colorName} (${product.colorFamily})
LENGTH: ${product.length}
STYLE: ${product.style}
TEXTURE: ${product.texture}

DESCRIPTION: ${product.length} length ${product.texture} wig in ${product.colorName}.
MATCHING: Best for ${product.length} hair, ${product.texture} texture, ${product.colorFamily} color family.
`;
}

/**
 * Upload products to vector store
 */
async function uploadToVectorStore(vectorStoreId: string, products: ProductImage[]) {
  console.log(`📤 Uploading ${products.length} products to vector store...`);

  const files: OpenAI.Files.FileObject[] = [];

  // Create batch files (OpenAI recommends batching for large uploads)
  // Reduced batch size to avoid 413 error
  const batchSize = 20;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const batchContent: string[] = [];

    for (const product of batch) {
      const document = await createProductDocument(product);
      batchContent.push(document);
      batchContent.push('---'); // Separator
    }

    // Create a file for this batch
    const fileName = `products_batch_${Math.floor(i / batchSize) + 1}.txt`;
    const filePath = path.join(process.cwd(), 'temp', fileName);

    // Ensure temp directory exists
    await fs.mkdir(path.join(process.cwd(), 'temp'), { recursive: true });

    // Write batch content to file
    await fs.writeFile(filePath, batchContent.join('\n'));

    console.log(`📝 Uploading batch ${Math.floor(i / batchSize) + 1}...`);

    // Upload file to OpenAI
    const file = await openai.files.create({
      file: await fs.readFile(filePath),
      purpose: 'assistants'
    });

    files.push(file);

    // Add file to vector store
    await openai.vectorStores.files.create(vectorStoreId, {
      file_id: file.id
    });

    console.log(`✅ Uploaded batch ${Math.floor(i / batchSize) + 1} (${batch.length} products)`);

    // Clean up temp file
    await fs.unlink(filePath);
  }

  console.log(`✅ Successfully uploaded ${products.length} products in ${files.length} batches`);

  return files;
}

/**
 * Create or update assistant with vector store
 */
async function createAssistant(vectorStoreId: string) {
  console.log('🤖 Creating/updating assistant with vector store...');

  const instructions = `You are a wig matching expert with access to a comprehensive product database.

Your vector store contains detailed information about wig products including:
- Product names and IDs
- Colors (specific shades and color families)
- Lengths (short, medium, long, extra-long)
- Styles (bob, layered, pixie, etc.)
- Textures (straight, wavy, curly, etc.)
- Image URLs
- Metadata and attributes

When analyzing a user's hair photo:
1. Identify their hair length, texture, style, and color
2. Search the vector store for matching products
3. Prioritize LENGTH matching (no ponytails for medium hair, no pixie cuts for long hair)
4. Consider style compatibility (layered, bangs, etc.)
5. Match color family and specific shades
6. Return realistic match percentages

CRITICAL RULES:
- NEVER recommend ponytail extensions for short or medium hair
- NEVER recommend pixie cuts for medium or long hair
- Length mismatch should result in <30% match score
- Prioritize products that match the user's actual hair length`;

  try {
    // Check for existing assistant
    const assistants = await openai.beta.assistants.list();
    const existingAssistant = assistants.data.find(a => a.name === 'Wig Matching Expert');

    if (existingAssistant) {
      console.log('📝 Updating existing assistant...');
      const updated = await openai.beta.assistants.update(existingAssistant.id, {
        instructions,
        tools: [{ type: 'file_search' }],
        tool_resources: {
          file_search: {
            vector_store_ids: [vectorStoreId]
          }
        },
        model: 'gpt-4o'
      });
      console.log(`✅ Updated assistant: ${updated.id}`);
      return updated;
    } else {
      console.log('🆕 Creating new assistant...');
      const assistant = await openai.beta.assistants.create({
        name: 'Wig Matching Expert',
        instructions,
        tools: [{ type: 'file_search' }],
        tool_resources: {
          file_search: {
            vector_store_ids: [vectorStoreId]
          }
        },
        model: 'gpt-4o'
      });
      console.log(`✅ Created assistant: ${assistant.id}`);
      return assistant;
    }
  } catch (error) {
    console.error('❌ Error creating assistant:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting product image upload to OpenAI Vector Store');
    console.log('=' .repeat(60));

    // Step 1: Create or get vector store
    const vectorStoreId = await getOrCreateVectorStore('chiquel-wig-products');

    // Step 2: Load product images
    const products = await loadProductImages();

    // Step 3: Upload to vector store
    await uploadToVectorStore(vectorStoreId, products);

    // Step 4: Create/update assistant
    const assistant = await createAssistant(vectorStoreId);

    // Save configuration
    const config = {
      vectorStoreId,
      assistantId: assistant.id,
      productCount: products.length,
      createdAt: new Date().toISOString()
    };

    await fs.writeFile(
      path.join(process.cwd(), 'openai-vector-store-config.json'),
      JSON.stringify(config, null, 2)
    );

    console.log('\n' + '=' .repeat(60));
    console.log('✅ Setup complete!');
    console.log(`📊 Vector Store ID: ${vectorStoreId}`);
    console.log(`🤖 Assistant ID: ${assistant.id}`);
    console.log(`📦 Products uploaded: ${products.length}`);
    console.log('\nConfiguration saved to: openai-vector-store-config.json');

  } catch (error) {
    console.error('❌ Error in main process:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { getOrCreateVectorStore, uploadToVectorStore, createAssistant };