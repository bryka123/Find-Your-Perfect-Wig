#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

// Manually load environment variables from .env.local
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

loadEnvFile();

/**
 * Process New Products CSV
 * 
 * Converts the new Products.csv to the proper format for vector store upload
 * with improved color classification
 */

interface ProductVariant {
  id: string;
  productId: string;
  handle: string;
  title: string;
  colorOption: string;
  price: string;
  compareAtPrice?: string;
  availableForSale: boolean;
  inventory: number;
  image?: string;
  brand: string;
  tags: string[];
  // Metafields
  length?: string;
  hairTexture?: string;
  capDesign?: string;
  hairType?: string;
  size?: string;
  density?: string;
  // Raw data for processing
  rawData: any;
}

interface ProcessedWigData {
  id: string;
  productId: string;
  title: string;
  descriptor: string;
  attrs: {
    length: string;
    texture: string;
    color: string; // This will be corrected by AI
    capSize: string;
    capConstruction: string;
    density: string;
    hairType: string;
    style: string;
    price: string;
    availableForSale: boolean;
    selectedOptions: Array<{
      name: string;
      value: string;
    }>;
    image?: {
      url: string;
      altText: string;
    };
  };
  content: string;
  image?: {
    url: string;
    altText: string;
  };
}

// Simple CSV parser (avoiding external dependencies)
function parseCSVSimple(csvContent: string): any[] {
  const lines = csvContent.split('\n');
  const headers = lines[0].split('","').map(h => h.replace(/^"|"$/g, ''));
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple CSV parsing - handles quoted values
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
    values.push(current); // Add last value
    
    // Create record object
    const record: any = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });
    
    records.push(record);
  }
  
  return records;
}

function parseCSV(csvPath: string): ProductVariant[] {
  console.log(`📄 Reading CSV file: ${csvPath}`);
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parseCSVSimple(csvContent);
  
  console.log(`📊 Found ${records.length} CSV rows`);
  
  const variants: ProductVariant[] = [];
  
  for (const record of records) {
    // Skip non-wig products or invalid records
    if (!record['Variant ID'] || 
        !record['Title'] || 
        !record['Option1 Value'] || 
        record['Option1 Value'] === 'Default Title') {
      continue;
    }
    
    // Extract tags
    const tags = record['Tags'] ? record['Tags'].split(', ') : [];
    
    // Skip if not a wig product
    const isWig = tags.some((tag: string) => 
      tag.includes('Wig') || 
      tag.includes('cat:') || 
      tags.includes('Women') ||
      record['Title'].toLowerCase().includes('wig')
    );
    
    if (!isWig) {
      continue;
    }
    
    const variant: ProductVariant = {
      id: record['Variant ID'],
      productId: record['ID'],
      handle: record['Handle'],
      title: record['Title'],
      colorOption: record['Option1 Value'],
      price: record['Variant Price'] || '0',
      compareAtPrice: record['Variant Compare At Price'],
      availableForSale: (record['Variant Inventory Qty'] || 0) > 0,
      inventory: parseInt(record['Variant Inventory Qty']) || 0,
      image: record['Image Src'],
      brand: record['Vendor'] || 'Unknown',
      tags: tags,
      // Extract metafields
      length: record['Metafield: custom.length [single_line_text_field]'],
      hairTexture: record['Metafield: custom.hair_texture [single_line_text_field]'],
      capDesign: record['Metafield: custom.cap_design [single_line_text_field]'] || 
                record['Metafield: custom.design [single_line_text_field]'],
      hairType: record['Metafield: custom.hair_type [single_line_text_field]'],
      size: record['Metafield: custom.size [single_line_text_field]'],
      density: record['Metafield: custom.density [single_line_text_field]'],
      rawData: record
    };
    
    variants.push(variant);
  }
  
  console.log(`✅ Extracted ${variants.length} wig variants`);
  return variants;
}

function normalizeAttributes(variant: ProductVariant): {
  length: string;
  texture: string;
  color: string;
  capSize: string;
  capConstruction: string;
  density: string;
  hairType: string;
  style: string;
} {
  // Normalize length
  let length = 'medium';
  const lengthMeta = variant.length?.toLowerCase() || '';
  const titleLower = variant.title.toLowerCase();
  
  if (lengthMeta.includes('long') || titleLower.includes('long')) {
    length = 'long';
  } else if (lengthMeta.includes('short') || titleLower.includes('short')) {
    length = 'short';
  } else if (lengthMeta.includes('medium') || titleLower.includes('medium')) {
    length = 'medium';
  }
  
  // Normalize texture
  let texture = 'straight';
  const textureMeta = variant.hairTexture?.toLowerCase() || '';
  if (textureMeta.includes('wavy') || titleLower.includes('wavy')) {
    texture = 'wavy';
  } else if (textureMeta.includes('curly') || titleLower.includes('curly')) {
    texture = 'curly';
  } else if (textureMeta.includes('kinky') || titleLower.includes('kinky')) {
    texture = 'kinky';
  }
  
  // Determine color family from tags (this will be corrected by AI later)
  let color = 'brunette'; // Default
  const colorName = variant.colorOption.toLowerCase();
  
  if (variant.tags.includes('cat:blondes') || colorName.includes('blonde')) {
    color = 'blonde';
  } else if (variant.tags.includes('cat:brunettes') || colorName.includes('brown')) {
    color = 'brunette';
  } else if (variant.tags.includes('cat:blacks') || colorName.includes('black')) {
    color = 'black';
  } else if (variant.tags.includes('cat:reds') || colorName.includes('red')) {
    color = 'red';
  } else if (variant.tags.includes('cat:grays') || colorName.includes('gray') || colorName.includes('silver')) {
    color = 'gray';
  } else if (colorName.includes('white') || colorName.includes('platinum')) {
    color = 'white';
  }
  
  // Normalize cap size
  let capSize = 'average';
  const sizeMeta = variant.size?.toLowerCase() || '';
  if (sizeMeta.includes('petite') || sizeMeta.includes('small')) {
    capSize = 'petite';
  } else if (sizeMeta.includes('large')) {
    capSize = 'large';
  }
  
  // Normalize cap construction
  let capConstruction = 'basic';
  const capMeta = variant.capDesign?.toLowerCase() || '';
  const capTags = variant.tags.filter(tag => tag.includes('Cap Design_')).join(' ').toLowerCase();
  
  if (capMeta.includes('lace front') || capTags.includes('lace front')) {
    capConstruction = 'lace_front';
  } else if (capMeta.includes('monofilament') || capMeta.includes('mono') || capTags.includes('mono')) {
    capConstruction = 'monofilament';
  } else if (capMeta.includes('hand tied') || capTags.includes('hand tied')) {
    capConstruction = 'hand_tied';
  }
  
  // Normalize density
  let density = 'medium';
  const densityMeta = variant.density?.toLowerCase() || '';
  if (densityMeta.includes('light')) {
    density = 'light';
  } else if (densityMeta.includes('heavy')) {
    density = 'heavy';
  }
  
  // Normalize hair type
  let hairType = 'synthetic';
  const hairTypeMeta = variant.hairType?.toLowerCase() || '';
  if (hairTypeMeta.includes('human')) {
    hairType = 'human';
  } else if (hairTypeMeta.includes('heat')) {
    hairType = 'heat_friendly';
  }
  
  // Determine style
  let style = 'classic';
  if (variant.tags.includes('trendy') || variant.tags.includes('fashion')) {
    style = 'trendy';
  } else if (variant.tags.includes('professional')) {
    style = 'professional';
  } else if (variant.tags.includes('casual')) {
    style = 'casual';
  }
  
  return {
    length,
    texture,
    color,
    capSize,
    capConstruction,
    density,
    hairType,
    style
  };
}

function createWigDescriptor(variant: ProductVariant, attrs: any): string {
  const parts = [
    attrs.length,
    attrs.style,
    attrs.texture !== 'straight' ? attrs.texture : '',
    attrs.color,
    attrs.capConstruction !== 'basic' ? attrs.capConstruction.replace('_', ' ') : '',
    variant.colorOption
  ].filter(Boolean);
  
  return parts.join(', ');
}

function processVariantsToWigData(variants: ProductVariant[]): ProcessedWigData[] {
  console.log('🔄 Converting variants to wig data format...');
  
  const wigData: ProcessedWigData[] = [];
  
  for (const variant of variants) {
    const attrs = normalizeAttributes(variant);
    const descriptor = createWigDescriptor(variant, attrs);
    
    const wigItem: ProcessedWigData = {
      id: variant.id,
      productId: variant.productId,
      title: `${variant.title} - ${variant.colorOption}`,
      descriptor,
      attrs: {
        length: attrs.length,
        texture: attrs.texture,
        color: attrs.color,
        capSize: attrs.capSize,
        capConstruction: attrs.capConstruction,
        density: attrs.density,
        hairType: attrs.hairType,
        style: attrs.style,
        price: variant.price,
        availableForSale: variant.availableForSale,
        selectedOptions: [
          {
            name: 'Color',
            value: variant.colorOption
          }
        ],
        image: variant.image ? {
          url: variant.image,
          altText: `${variant.title} - ${variant.colorOption}`
        } : undefined
      },
      content: `${variant.title} - ${variant.colorOption}\n\nDescription: ${descriptor}\n\nBrand: ${variant.brand}\n\nAttributes: ${JSON.stringify({
        length: attrs.length,
        texture: attrs.texture,
        color: attrs.color,
        capSize: attrs.capSize,
        capConstruction: attrs.capConstruction,
        density: attrs.density,
        hairType: attrs.hairType,
        style: attrs.style
      }, null, 2)}`,
      image: variant.image ? {
        url: variant.image,
        altText: `${variant.title} - ${variant.colorOption}`
      } : undefined
    };
    
    wigData.push(wigItem);
  }
  
  console.log(`✅ Converted ${wigData.length} wig data items`);
  return wigData;
}

async function processNewProductsCSV() {
  try {
    console.log('🚀 Processing New Products CSV');
    console.log('=============================');
    
    const csvPath = process.argv[2] || './Products.csv';
    const outputPath = process.argv[3] || './processed_products.json';
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }
    
    // Step 1: Parse CSV and extract variants
    const variants = parseCSV(csvPath);
    
    // Step 2: Convert to wig data format
    const wigData = processVariantsToWigData(variants);
    
    // Step 3: Create output structure
    const output = {
      metadata: {
        type: 'wig_catalog_v2',
        description: 'Processed wig catalog from Products.csv with normalized attributes',
        source_file: csvPath,
        total_variants: wigData.length,
        generated_at: new Date().toISOString(),
        color_correction_needed: true,
        notes: 'This data needs AI color correction before final use'
      },
      products: wigData
    };
    
    // Step 4: Save processed data
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    console.log('\n✅ Processing Complete!');
    console.log(`📊 Total variants processed: ${wigData.length}`);
    console.log(`💾 Output saved to: ${outputPath}`);
    console.log(`📏 File size: ${Math.round(fs.statSync(outputPath).size / 1024 / 1024 * 100) / 100} MB`);
    
    // Step 5: Show sample data
    console.log('\n📋 Sample processed items:');
    wigData.slice(0, 3).forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.title}`);
      console.log(`     Color: ${item.attrs.selectedOptions[0].value} → ${item.attrs.color}`);
      console.log(`     Attributes: ${item.attrs.length}, ${item.attrs.texture}, ${item.attrs.capConstruction}`);
    });
    
    // Step 6: Show color distribution
    const colorCounts = wigData.reduce((acc, item) => {
      acc[item.attrs.color] = (acc[item.attrs.color] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n🎨 Color Distribution:');
    Object.entries(colorCounts).forEach(([color, count]) => {
      console.log(`  ${color}: ${count} variants`);
    });
    
    console.log('\n⚠️ IMPORTANT: This data needs AI color correction!');
    console.log('Many products may be misclassified (e.g., brown wigs labeled as blonde)');
    console.log('Run the color analysis system next to fix classifications.');
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Apply AI color correction to this processed data');
    console.log('2. Upload corrected data to replace old vector store');
    console.log('3. Test with your wig matching application');
    
  } catch (error) {
    console.error('❌ Processing failed:', error);
    process.exit(1);
  }
}

// CLI execution
if (require.main === module) {
  processNewProductsCSV();
}

export { processNewProductsCSV, ProcessedWigData };
