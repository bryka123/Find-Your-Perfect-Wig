#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

/**
 * Clean Dataset to Position 1 Images Only
 * 
 * Removes all image positions except Position 1 (main front-facing photos)
 * and updates the product data accordingly
 */

interface ProductData {
  id: string;
  productId: string;
  title: string;
  variantId: string;
  colorName: string;
  position1Image?: string;
  price: string;
  availableForSale: boolean;
  rawData: any;
}

function extractPosition1Products(csvPath: string): Map<string, ProductData> {
  console.log(`📄 Extracting Position 1 products from: ${csvPath}`);
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  const headers = lines[0].split('","').map(h => h.replace(/^"|"$/g, ''));
  
  // Find column indices
  const productIdIndex = headers.indexOf('ID');
  const variantIdIndex = headers.indexOf('Variant ID');
  const titleIndex = headers.indexOf('Title');
  const handleIndex = headers.indexOf('Handle');
  const imagePositionIndex = headers.indexOf('Image Position');
  const imageSrcIndex = headers.indexOf('Image Src');
  const imageAltIndex = headers.indexOf('Image Alt Text');
  const colorIndex = headers.indexOf('Option1 Value');
  const priceIndex = headers.indexOf('Variant Price');
  const inventoryIndex = headers.indexOf('Variant Inventory Qty');
  
  console.log(`📊 Key columns found - Position: ${imagePositionIndex}, Src: ${imageSrcIndex}, Color: ${colorIndex}`);
  
  const position1Products = new Map<string, ProductData>();
  let position1Count = 0;
  let otherPositionsSkipped = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line
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
    
    const productId = values[productIdIndex];
    const variantId = values[variantIdIndex];
    const title = values[titleIndex];
    const handle = values[handleIndex];
    const imagePosition = parseInt(values[imagePositionIndex]) || 1;
    const imageSrc = values[imageSrcIndex];
    const imageAlt = values[imageAltIndex];
    const colorName = values[colorIndex];
    const price = values[priceIndex];
    const inventory = parseInt(values[inventoryIndex]) || 0;
    
    // Only process Position 1 images
    if (imagePosition === 1 && imageSrc && variantId && title) {
      const key = variantId; // Use variant ID as unique key
      
      position1Products.set(key, {
        id: variantId,
        productId,
        title,
        variantId,
        colorName,
        position1Image: imageSrc,
        price: price || '0',
        availableForSale: inventory > 0,
        rawData: {
          handle,
          imageAlt,
          inventory
        }
      });
      
      position1Count++;
    } else if (imagePosition > 1) {
      otherPositionsSkipped++;
    }
  }
  
  console.log(`✅ Position 1 products: ${position1Count}`);
  console.log(`🗑️ Other positions skipped: ${otherPositionsSkipped}`);
  
  return position1Products;
}

function updateDataWithPosition1Images(
  dataPath: string, 
  position1Products: Map<string, ProductData>,
  outputPath: string
) {
  console.log('🔄 Updating product data with Position 1 images only...');
  
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const products = data.products;
  
  let updatedProducts = 0;
  let imageUpdates = 0;
  let removedProducts = 0;
  
  const cleanedProducts = [];
  
  for (const product of products) {
    const variantId = product.id;
    const position1Data = position1Products.get(variantId);
    
    if (position1Data) {
      // Update with Position 1 image
      const updatedProduct = {
        ...product,
        image: {
          url: position1Data.position1Image,
          altText: `${position1Data.title} - Position 1 Front View`
        }
      };
      
      // Update attrs.image as well
      if (updatedProduct.attrs) {
        updatedProduct.attrs.image = updatedProduct.image;
      }
      
      cleanedProducts.push(updatedProduct);
      updatedProducts++;
      
      if (product.image?.url !== position1Data.position1Image) {
        imageUpdates++;
        
        if (imageUpdates <= 5) {
          console.log(`🖼️ ${position1Data.title.substring(0, 40)}...`);
          console.log(`   ✅ Position 1: ${position1Data.position1Image.substring(0, 70)}...`);
        }
      }
    } else {
      // No Position 1 image found - exclude this variant
      removedProducts++;
    }
  }
  
  if (imageUpdates > 5) {
    console.log(`   ... and ${imageUpdates - 5} more image updates`);
  }
  
  // Update metadata
  data.metadata.position1_only = true;
  data.metadata.position1_update_at = new Date().toISOString();
  data.metadata.products_with_position1 = cleanedProducts.length;
  data.metadata.products_removed_no_position1 = removedProducts;
  data.products = cleanedProducts;
  
  // Save cleaned data
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  
  console.log('\n✅ Position 1 Cleanup Complete!');
  console.log(`📊 Products with Position 1 images: ${updatedProducts}`);
  console.log(`🔄 Image URLs updated: ${imageUpdates}`);
  console.log(`🗑️ Products removed (no Position 1): ${removedProducts}`);
  console.log(`💾 Clean data saved: ${outputPath}`);
  
  const fileSizeMB = Math.round(fs.statSync(outputPath).size / 1024 / 1024 * 100) / 100;
  console.log(`📏 File size: ${fileSizeMB} MB`);
  
  return outputPath;
}

async function cleanToPosition1Only() {
  try {
    console.log('🧹 Cleaning Dataset to Position 1 Images Only');
    console.log('==============================================');
    
    const csvPath = process.argv[2] || './Products.csv';
    const dataPath = process.argv[3] || './new_products_corrected.json';
    const outputPath = process.argv[4] || './products_position1_only.json';
    
    // Step 1: Extract Position 1 products from CSV
    const position1Products = extractPosition1Products(csvPath);
    
    // Step 2: Update data with only Position 1 images
    const cleanedDataPath = updateDataWithPosition1Images(dataPath, position1Products, outputPath);
    
    console.log('\n🎯 Position 1 Cleanup Benefits:');
    console.log('✅ Consistent front-facing product photos');
    console.log('✅ Professional appearance for all results');
    console.log('✅ Reduced data size (removed unused positions)');
    console.log('✅ Better user experience');
    
    console.log('\n📸 Longing for London Example:');
    console.log('✅ Will now show: Position 1 front-facing photo');
    console.log('❌ No more: Side angles or alternative views');
    
    console.log('\n🚀 Ready to update metafield chunks with Position 1 images!');
    
    return cleanedDataPath;
    
  } catch (error) {
    console.error('❌ Position 1 cleanup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  cleanToPosition1Only();
}






