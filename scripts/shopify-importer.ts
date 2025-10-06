#!/usr/bin/env tsx

import * as fs from 'fs';
import { Variant, WigAttributes } from '../src/lib/types';
import { generateWigDescriptor, createJsonlRecord } from './descriptor-utils';

interface ShopifyRow {
  [key: string]: string;
}

/**
 * Enhanced CSV importer specifically for Shopify product exports
 * Handles complex metafield structure and multi-row products
 */
export class ShopifyImporter {
  private inputFile: string;
  private outputFile: string;

  constructor(inputFile: string, outputFile?: string) {
    this.inputFile = inputFile;
    this.outputFile = outputFile || inputFile.replace(/\.csv$/i, '_processed.jsonl');
  }

  async processShopifyExport(): Promise<{ processed: number; errors: string[] }> {
    console.log(`🔄 Processing Shopify export: ${this.inputFile}`);
    console.log(`📄 Output: ${this.outputFile}`);
    
    const stats = { processed: 0, errors: [] as string[] };
    
    try {
      const csvContent = fs.readFileSync(this.inputFile, 'utf-8');
      const lines = csvContent.trim().split('\n');
      
      console.log(`📊 Total rows: ${lines.length - 1} (excluding header)`);

      // Parse header and create column mapping
      const headers = this.parseShopifyCsvLine(lines[0]);
      const columnMap = this.mapShopifyColumns(headers);
      
      console.log(`📋 Found ${headers.length} columns in Shopify export`);
      console.log(`🎯 Key wig attributes found:`, Object.keys(columnMap).filter(k => 
        ['variantId', 'price', 'length', 'hairTexture', 'hairType', 'size', 'density', 'capDesign', 'colorDescription'].includes(k)
      ));

      // Process rows and extract variants
      const variants: Variant[] = [];
      const productCache = new Map<string, any>(); // Cache product-level data
      
      for (let i = 1; i < lines.length; i++) {
        try {
          const row = this.parseShopifyCsvLine(lines[i]);
          
          if (row.length !== headers.length) {
            stats.errors.push(`Row ${i + 1}: Column count mismatch (${row.length} vs ${headers.length})`);
            continue;
          }

          const getValue = (key: string): string => {
            const index = columnMap[key];
            return index !== undefined ? (row[index] || '').trim() : '';
          };

          // Check if this is a variant row (has Variant ID)
          const variantId = getValue('variantId');
          const productId = getValue('id');
          
          if (variantId && productId) {
            // Cache product-level data
            if (!productCache.has(productId)) {
              productCache.set(productId, {
                id: productId,
                title: getValue('title'),
                vendor: getValue('vendor'),
                tags: getValue('tags'),
                bodyHtml: getValue('bodyHtml'),
                // Extract metafields
                length: getValue('length'),
                hairTexture: getValue('hairTexture'),
                design: getValue('design'),
                hairType: getValue('hairType'),
                size: getValue('size'),
                density: getValue('density'),
                capDesign: getValue('capDesign')
              });
            }

            // Create variant from this row
            const variant = this.createVariantFromShopifyRow(row, columnMap, productCache.get(productId), i + 1);
            if (variant) {
              variants.push(variant);
              stats.processed++;
            }
          }

        } catch (rowError) {
          stats.errors.push(`Row ${i + 1}: ${rowError}`);
        }
      }

      console.log(`✅ Extracted ${variants.length} variants from ${lines.length - 1} total rows`);

      // Write JSONL output
      const jsonlLines = variants.map(variant => createJsonlRecord(variant));
      fs.writeFileSync(this.outputFile, jsonlLines.join('\n') + '\n');
      
      console.log(`📄 JSONL file created: ${this.outputFile}`);
      
      if (stats.errors.length > 0) {
        console.log(`⚠️  ${stats.errors.length} errors encountered`);
        stats.errors.slice(0, 3).forEach(error => console.log(`  - ${error}`));
        if (stats.errors.length > 3) {
          console.log(`  - ... and ${stats.errors.length - 3} more errors`);
        }
      }

    } catch (error) {
      console.error('❌ Failed to process Shopify export:', error);
      stats.errors.push(`Processing failed: ${error}`);
    }

    return stats;
  }

  private parseShopifyCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quotes
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    result.push(current.trim());
    return result;
  }

  private mapShopifyColumns(headers: string[]): Record<string, number> {
    const map: Record<string, number> = {};

    headers.forEach((header, index) => {
      const headerClean = header.replace(/\uFEFF/g, '').trim(); // Remove BOM
      
      switch (headerClean) {
        // Basic product fields
        case 'ID':
          map.id = index;
          break;
        case 'Handle':
          map.handle = index;
          break;
        case 'Title':
          map.title = index;
          break;
        case 'Body HTML':
          map.bodyHtml = index;
          break;
        case 'Vendor':
          map.vendor = index;
          break;
        case 'Type':
          map.type = index;
          break;
        case 'Tags':
          map.tags = index;
          break;
        case 'Status':
          map.status = index;
          break;
        case 'Published':
          map.published = index;
          break;

        // Variant fields
        case 'Variant ID':
          map.variantId = index;
          break;
        case 'Option1 Name':
          map.option1Name = index;
          break;
        case 'Option1 Value':
          map.option1Value = index;
          break;
        case 'Option2 Name':
          map.option2Name = index;
          break;
        case 'Option2 Value':
          map.option2Value = index;
          break;
        case 'Variant SKU':
          map.variantSku = index;
          break;
        case 'Variant Price':
          map.price = index;
          break;
        case 'Variant Compare At Price':
          map.compareAtPrice = index;
          break;
        case 'Variant Inventory Qty':
          map.inventoryQty = index;
          break;
        case 'Variant Image':
          map.variantImage = index;
          break;

        // Image fields
        case 'Image Src':
          map.imageSrc = index;
          break;
        case 'Image Alt Text':
          map.imageAlt = index;
          break;
        case 'Variant Image':
          map.variantImage = index;
          break;

        // Wig-specific metafields
        case 'Metafield: custom.length [single_line_text_field]':
          map.length = index;
          break;
        case 'Metafield: custom.hair_texture [single_line_text_field]':
          map.hairTexture = index;
          break;
        case 'Metafield: custom.design [single_line_text_field]':
          map.design = index;
          break;
        case 'Metafield: custom.hair_type [single_line_text_field]':
          map.hairType = index;
          break;
        case 'Metafield: custom.size [single_line_text_field]':
          map.size = index;
          break;
        case 'Metafield: custom.density [single_line_text_field]':
          map.density = index;
          break;
        case 'Metafield: custom.cap_design_new [list.single_line_text_field]':
          map.capDesign = index;
          break;
        case 'Metafield: custom.cap_design [single_line_text_field]':
          map.capDesignOld = index;
          break;
        case 'Variant Metafield: custom.color_description [metaobject_reference]':
          map.colorDescription = index;
          break;
      }
    });

    return map;
  }

  private createVariantFromShopifyRow(
    row: string[], 
    columnMap: Record<string, number>, 
    productData: any,
    rowNumber: number
  ): Variant | null {
    try {
      const getValue = (key: string): string => {
        const index = columnMap[key];
        return index !== undefined ? (row[index] || '').trim() : '';
      };

      const variantId = getValue('variantId');
      const productId = getValue('id');
      const title = getValue('title') || productData?.title || `Wig ${rowNumber}`;
      const price = getValue('price') || '0.00';
      const compareAtPrice = getValue('compareAtPrice');
      const inventoryQty = parseInt(getValue('inventoryQty') || '0');
      const option1Value = getValue('option1Value'); // Usually the color
      
      // Extract wig attributes from metafields and tags
      const wigAttributes = this.extractWigAttributes(getValue, productData, option1Value);
      
      // Get image URL (prefer variant image, fallback to product image)
      let imageUrl = getValue('variantImage') || getValue('imageSrc');
      
      // If no image found, search entire row for Shopify CDN URLs
      if (!imageUrl) {
        // Look for CDN URLs anywhere in the row
        for (let i = 0; i < row.length; i++) {
          const cell = row[i];
          if (cell && cell.includes('cdn.shopify.com') && (cell.includes('.jpg') || cell.includes('.png') || cell.includes('.webp'))) {
            imageUrl = cell;
            console.log(`Found image URL in column ${i}:`, imageUrl);
            break;
          }
        }
      }
      
      // Build variant title with color/option
      const variantTitle = option1Value ? `${title} - ${option1Value}` : title;

      // Generate consistent image URL pattern if no direct image found
      if (!imageUrl) {
        // Use default product images from Shopify CDN
        const handle = getValue('handle');
        const title = getValue('title') || '';
        
        if (handle) {
          // Try different image naming patterns
          const titleForUrl = title.toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[^a-z0-9]/g, '');
          
          // Generate potential image URLs
          const possibleUrls = [
            `https://cdn.shopify.com/s/files/1/0506/4710/5726/files/${titleForUrl}2.jpg?v=1755089971`,
            `https://cdn.shopify.com/s/files/1/0506/4710/5726/files/${titleForUrl}.jpg?v=1755089971`,
            `https://cdn.shopify.com/s/files/1/0506/4710/5726/products/${handle}.jpg`,
            `https://cdn.shopify.com/s/files/1/0506/4710/5726/files/${handle}.jpg`
          ];
          
          // Use the first pattern for now (like SorrentoSurprise2.jpg)
          imageUrl = possibleUrls[0];
        }
      }

      const variant: Variant = {
        id: variantId,
        productId: productId,
        title: variantTitle,
        price: this.normalizePrice(price),
        compareAtPrice: compareAtPrice ? this.normalizePrice(compareAtPrice) : undefined,
        availableForSale: inventoryQty > 0,
        image: imageUrl ? {
          url: imageUrl,
          altText: getValue('imageAlt') || variantTitle
        } : undefined,
        selectedOptions: this.buildSelectedOptions(getValue),
        wigAttributes
      };

      return variant;

    } catch (error) {
      console.error(`Error creating variant from Shopify row ${rowNumber}:`, error);
      return null;
    }
  }

  private extractWigAttributes(getValue: (key: string) => string, productData: any, colorOption: string): WigAttributes {
    // Extract from metafields first, then fallback to tags
    const length = getValue('length') || productData?.length || this.extractFromTags(productData?.tags, 'Length_') || 'medium';
    const hairTexture = getValue('hairTexture') || productData?.hairTexture || this.extractFromTags(productData?.tags, 'Texture_') || 'straight';
    const hairType = getValue('hairType') || productData?.hairType || this.extractFromTags(productData?.tags, 'Hair Type_') || 'synthetic';
    const size = getValue('size') || productData?.size || this.extractFromTags(productData?.tags, 'Size_') || 'average';
    const density = getValue('density') || productData?.density || this.extractFromTags(productData?.tags, 'Density_') || 'medium';
    const capDesign = getValue('capDesign') || getValue('capDesignOld') || productData?.capDesign || this.extractFromTags(productData?.tags, 'Cap Design_') || 'basic';
    
    // Extract color from tags or option value
    let color = 'brunette';
    const tags = productData?.tags || '';
    const colorOptionLower = colorOption.toLowerCase();
    
    if (tags.includes('cat:blondes') || colorOptionLower.includes('blonde') || colorOptionLower.includes('golden')) color = 'blonde';
    else if (tags.includes('cat:brunettes') || colorOptionLower.includes('brown') || colorOptionLower.includes('brunette')) color = 'brunette';
    else if (tags.includes('cat:reds') || colorOptionLower.includes('red') || colorOptionLower.includes('auburn')) color = 'red';
    else if (tags.includes('cat:grays') || colorOptionLower.includes('gray') || colorOptionLower.includes('silver')) color = 'gray';
    else if (tags.includes('cat:blacks') || colorOptionLower.includes('black')) color = 'black';
    else if (colorOptionLower.includes('white') || colorOptionLower.includes('platinum')) color = 'white';
    else if (colorOptionLower.includes('pink') || colorOptionLower.includes('blue') || colorOptionLower.includes('purple')) color = 'fantasy';

    // Determine style from tags and product data
    let style = 'classic';
    if (tags.includes('trendy') || tags.includes('fashion')) style = 'trendy';
    else if (tags.includes('professional') || tags.includes('business')) style = 'professional';
    else if (tags.includes('casual') || tags.includes('everyday')) style = 'casual';
    else if (tags.includes('formal') || tags.includes('elegant')) style = 'formal';
    else if (tags.includes('modern') || tags.includes('contemporary')) style = 'modern';

    return {
      length: this.normalizeLength(length),
      texture: this.normalizeTexture(hairTexture),
      color: color as any,
      capSize: this.normalizeCapSize(size),
      capConstruction: this.normalizeCapConstruction(capDesign),
      density: this.normalizeDensity(density),
      hairType: this.normalizeHairType(hairType),
      style: style as any
    };
  }

  private extractFromTags(tags: string, prefix: string): string {
    if (!tags) return '';
    
    const tagArray = tags.split(',').map(t => t.trim());
    const matchingTag = tagArray.find(tag => tag.startsWith(prefix));
    
    return matchingTag ? matchingTag.replace(prefix, '').replace(/_/g, ' ').toLowerCase() : '';
  }

  private buildSelectedOptions(getValue: (key: string) => string): Array<{ name: string; value: string }> {
    const options: Array<{ name: string; value: string }> = [];

    const option1Name = getValue('option1Name');
    const option1Value = getValue('option1Value');
    const option2Name = getValue('option2Name'); 
    const option2Value = getValue('option2Value');

    if (option1Name && option1Value) {
      options.push({ name: option1Name, value: option1Value });
    }
    
    if (option2Name && option2Value) {
      options.push({ name: option2Name, value: option2Value });
    }

    return options;
  }

  // Normalization methods adapted for Shopify data
  private normalizeLength(value: string): 'short' | 'medium' | 'long' | 'extra_long' {
    const val = value.toLowerCase();
    if (val.includes('short') || val.includes('pixie') || val.includes('bob')) return 'short';
    if (val.includes('long') && !val.includes('shoulder')) return 'long';
    if (val.includes('extra') || val.includes('very long')) return 'extra_long';
    return 'medium';
  }

  private normalizeTexture(value: string): 'straight' | 'wavy' | 'curly' | 'kinky' | 'coily' {
    const val = value.toLowerCase();
    if (val.includes('straight')) return 'straight';
    if (val.includes('wavy') || val.includes('wave')) return 'wavy';
    if (val.includes('curly') || val.includes('curl')) return 'curly';
    if (val.includes('kinky')) return 'kinky';
    if (val.includes('coily') || val.includes('coil')) return 'coily';
    return 'straight';
  }

  private normalizeCapSize(value: string): 'petite' | 'average' | 'large' {
    const val = value.toLowerCase();
    if (val.includes('petite') || val.includes('small')) return 'petite';
    if (val.includes('large') || val.includes('xl')) return 'large';
    return 'average';
  }

  private normalizeCapConstruction(value: string): 'basic' | 'monofilament' | 'lace_front' | 'full_lace' | 'hand_tied' {
    const val = value.toLowerCase().replace(/[\[\]"]/g, ''); // Remove brackets and quotes
    if (val.includes('lace front') || val.includes('lace_front')) return 'lace_front';
    if (val.includes('full lace') || val.includes('full_lace')) return 'full_lace';
    if (val.includes('monofilament') || val.includes('mono')) return 'monofilament';
    if (val.includes('hand tied') || val.includes('hand_tied')) return 'hand_tied';
    return 'basic';
  }

  private normalizeDensity(value: string): 'light' | 'medium' | 'heavy' {
    const val = value.toLowerCase();
    if (val.includes('light') || val.includes('thin')) return 'light';
    if (val.includes('heavy') || val.includes('thick') || val.includes('dense')) return 'heavy';
    return 'medium';
  }

  private normalizeHairType(value: string): 'synthetic' | 'human_hair' | 'blend' {
    const val = value.toLowerCase();
    if (val.includes('human') || val.includes('real')) return 'human_hair';
    if (val.includes('blend') || val.includes('mix')) return 'blend';
    return 'synthetic';
  }

  private normalizePrice(value: string): string {
    const cleaned = value.replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? '0.00' : parsed.toFixed(2);
  }
}

// CLI for processing Shopify exports
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Usage: tsx scripts/shopify-importer.ts <shopify-export.csv> [output.jsonl]

Process Shopify product export CSV and convert to JSONL for vector store.

Examples:
  tsx scripts/shopify-importer.ts Export_2025-09-22_161101.csv
  tsx scripts/shopify-importer.ts products.csv wigs_processed.jsonl
`);
    process.exit(0);
  }

  const inputFile = args[0];
  const outputFile = args[1];

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Input file not found: ${inputFile}`);
    process.exit(1);
  }

  try {
    const importer = new ShopifyImporter(inputFile, outputFile);
    const stats = await importer.processShopifyExport();
    
    console.log(`
📊 Import Summary:
  ✅ Variants processed: ${stats.processed}
  ❌ Errors: ${stats.errors.length}
  📄 Output file: ${importer['outputFile']}

🚀 Next Steps:
  1. Create OpenAI Vector Store
  2. Upload the JSONL file  
  3. Set OPENAI_VECTOR_STORE_ID in .env.local
  4. Test semantic search!
`);

    process.exit(stats.errors.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
