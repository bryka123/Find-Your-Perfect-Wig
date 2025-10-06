#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { Variant, WigAttributes } from '../src/lib/types';
import { generateWigDescriptor, createJsonlRecord } from './descriptor-utils';

interface CsvRow {
  [key: string]: string;
}

interface ColumnMapping {
  [key: string]: number;
}

/**
 * Convert CSV file to JSONL format for OpenAI Vector Store
 */
export class JsonlBuilder {
  private inputFile: string;
  private outputFile: string;
  private delimiter: string;

  constructor(inputFile: string, outputFile?: string, delimiter = ',') {
    this.inputFile = inputFile;
    this.outputFile = outputFile || inputFile.replace(/\.csv$/i, '.jsonl');
    this.delimiter = delimiter;
  }

  /**
   * Parse CSV file and convert to JSONL
   */
  async build(): Promise<{ processed: number; errors: string[] }> {
    console.log(`Converting CSV to JSONL: ${this.inputFile} → ${this.outputFile}`);
    
    const stats = { processed: 0, errors: [] as string[] };
    
    try {
      // Read and parse CSV
      const csvContent = fs.readFileSync(this.inputFile, 'utf-8');
      const lines = csvContent.trim().split('\n');
      
      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }

      // Parse header and create column mapping
      const headers = this.parseCsvLine(lines[0]);
      const columnMap = this.mapCsvColumns(headers);
      console.log(`Found ${headers.length} columns: ${headers.join(', ')}`);
      
      // Process each row and convert to JSONL records
      const jsonlLines: string[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        try {
          const row = this.parseCsvLine(lines[i]);
          
          if (row.length !== headers.length) {
            stats.errors.push(`Row ${i + 1}: Expected ${headers.length} columns, got ${row.length}`);
            continue;
          }

          const variant = this.createVariantFromCsvRow(row, columnMap, i + 1);
          if (variant) {
            const jsonlRecord = createJsonlRecord(variant);
            jsonlLines.push(jsonlRecord);
            stats.processed++;
          }

        } catch (rowError) {
          stats.errors.push(`Row ${i + 1}: ${rowError}`);
        }
      }

      // Write JSONL output
      fs.writeFileSync(this.outputFile, jsonlLines.join('\n') + '\n');
      console.log(`✅ Successfully converted ${stats.processed} records to JSONL`);
      
      if (stats.errors.length > 0) {
        console.log(`⚠️  ${stats.errors.length} errors encountered:`);
        stats.errors.slice(0, 5).forEach(error => console.log(`  - ${error}`));
        if (stats.errors.length > 5) {
          console.log(`  - ... and ${stats.errors.length - 5} more errors`);
        }
      }

    } catch (error) {
      console.error('❌ Failed to convert CSV to JSONL:', error);
      stats.errors.push(`Conversion failed: ${error}`);
    }

    return stats;
  }

  /**
   * Parse CSV line, handling quoted fields
   */
  private parseCsvLine(line: string): string[] {
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
      } else if (char === this.delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    result.push(current.trim());
    return result.map(cell => cell.replace(/^"|"$/g, '')); // Remove surrounding quotes
  }

  /**
   * Map CSV column headers to field indexes
   */
  private mapCsvColumns(headers: string[]): ColumnMapping {
    const map: ColumnMapping = {};

    headers.forEach((header, index) => {
      const headerLower = header.toLowerCase().replace(/[^a-z0-9]/g, '_');

      // Map common column variations
      const mappings: { [key: string]: string } = {
        // Basic fields
        'id': 'id',
        'variant_id': 'id',
        'sku': 'id',
        'product_id': 'productId',
        'parent_id': 'productId',
        'title': 'title',
        'name': 'title',
        'variant_title': 'title',
        'description': 'title',
        'price': 'price',
        'variant_price': 'price',
        'compare_at_price': 'compareAtPrice',
        'compare_price': 'compareAtPrice',
        'was_price': 'compareAtPrice',
        'available': 'availableForSale',
        'available_for_sale': 'availableForSale',
        'in_stock': 'availableForSale',
        'inventory': 'availableForSale',
        'image_url': 'imageUrl',
        'image': 'imageUrl',
        'photo': 'imageUrl',

        // Wig-specific attributes
        'length': 'length',
        'wig_length': 'length',
        'hair_length': 'length',
        'texture': 'texture',
        'wig_texture': 'texture',
        'hair_texture': 'texture',
        'curl': 'texture',
        'color': 'color',
        'wig_color': 'color',
        'hair_color': 'color',
        'colour': 'color',
        'cap_size': 'capSize',
        'size': 'capSize',
        'head_size': 'capSize',
        'cap_construction': 'capConstruction',
        'construction': 'capConstruction',
        'cap_type': 'capConstruction',
        'density': 'density',
        'wig_density': 'density',
        'hair_density': 'density',
        'thickness': 'density',
        'hair_type': 'hairType',
        'material': 'hairType',
        'fiber': 'hairType',
        'style': 'style',
        'wig_style': 'style',
        'hair_style': 'style'
      };

      const mappedField = mappings[headerLower];
      if (mappedField) {
        map[mappedField] = index;
      } else {
        // Store unmapped columns for potential use
        map[`_${headerLower}`] = index;
      }
    });

    console.log('Column mappings:', Object.keys(map).filter(k => !k.startsWith('_')).join(', '));
    return map;
  }

  /**
   * Create Variant object from CSV row
   */
  private createVariantFromCsvRow(row: string[], columnMap: ColumnMapping, rowNumber: number): Variant | null {
    try {
      const getValue = (key: string): string => {
        const index = columnMap[key];
        return index !== undefined ? (row[index] || '').trim() : '';
      };

      // Basic variant information
      const id = getValue('id') || `variant_${rowNumber}`;
      const productId = getValue('productId') || `product_${rowNumber}`;
      const title = getValue('title') || `Wig Variant ${rowNumber}`;
      const price = getValue('price') || '0.00';
      const compareAtPrice = getValue('compareAtPrice') || undefined;
      const availableForSale = this.parseBoolean(getValue('availableForSale'), true);
      const imageUrl = getValue('imageUrl');

      // Create wig attributes with normalization
      const wigAttributes: WigAttributes = {
        length: this.normalizeLength(getValue('length')),
        texture: this.normalizeTexture(getValue('texture')),
        color: this.normalizeColor(getValue('color')),
        capSize: this.normalizeCapSize(getValue('capSize')),
        capConstruction: this.normalizeCapConstruction(getValue('capConstruction')),
        density: this.normalizeDensity(getValue('density')),
        hairType: this.normalizeHairType(getValue('hairType')),
        style: this.normalizeStyle(getValue('style'))
      };

      // Build the variant object
      const variant: Variant = {
        id,
        productId,
        title,
        price: this.normalizePrice(price),
        compareAtPrice: compareAtPrice ? this.normalizePrice(compareAtPrice) : undefined,
        availableForSale,
        image: imageUrl ? {
          url: imageUrl,
          altText: title
        } : undefined,
        selectedOptions: this.extractSelectedOptions(row, columnMap),
        wigAttributes
      };

      return variant;

    } catch (error) {
      console.error(`Error creating variant from row ${rowNumber}:`, error);
      return null;
    }
  }

  /**
   * Extract selected options from additional CSV columns
   */
  private extractSelectedOptions(row: string[], columnMap: ColumnMapping): Array<{ name: string; value: string }> {
    const options: Array<{ name: string; value: string }> = [];

    // Look for unmapped columns that might be options
    for (const [key, index] of Object.entries(columnMap)) {
      if (key.startsWith('_') && row[index] && row[index].trim()) {
        const optionName = key.substring(1).replace(/_/g, ' ');
        const optionValue = row[index].trim();
        
        // Skip if it's likely metadata rather than an option
        if (!['created', 'updated', 'status', 'vendor'].some(skip => optionName.includes(skip))) {
          options.push({
            name: this.capitalize(optionName),
            value: optionValue
          });
        }
      }
    }

    return options;
  }

  // Normalization methods for wig attributes
  private normalizeLength(value: string): 'short' | 'medium' | 'long' | 'extra_long' {
    const val = value.toLowerCase();
    if (val.includes('short') || val.includes('bob') || val.match(/\b[0-9]+"?\b/) && parseInt(val) < 10) return 'short';
    if (val.includes('long') || val.includes('extra') || val.match(/\b[0-9]+"?\b/) && parseInt(val) > 16) return 'long';
    if (val.includes('extra') && val.includes('long')) return 'extra_long';
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

  private normalizeColor(value: string): 'blonde' | 'brunette' | 'black' | 'red' | 'gray' | 'white' | 'fantasy' {
    const val = value.toLowerCase();
    if (val.includes('blonde') || val.includes('blond') || val.includes('yellow')) return 'blonde';
    if (val.includes('brunette') || val.includes('brown')) return 'brunette';
    if (val.includes('black') || val.includes('dark')) return 'black';
    if (val.includes('red') || val.includes('auburn') || val.includes('copper')) return 'red';
    if (val.includes('gray') || val.includes('grey') || val.includes('silver')) return 'gray';
    if (val.includes('white') || val.includes('platinum')) return 'white';
    if (val.includes('pink') || val.includes('blue') || val.includes('purple') || val.includes('rainbow')) return 'fantasy';
    return 'brunette';
  }

  private normalizeCapSize(value: string): 'petite' | 'average' | 'large' {
    const val = value.toLowerCase();
    if (val.includes('petite') || val.includes('small') || val.includes('xs') || val.includes('s')) return 'petite';
    if (val.includes('large') || val.includes('xl') || val.includes('l')) return 'large';
    return 'average';
  }

  private normalizeCapConstruction(value: string): 'basic' | 'monofilament' | 'lace_front' | 'full_lace' | 'hand_tied' {
    const val = value.toLowerCase();
    if (val.includes('monofilament') || val.includes('mono')) return 'monofilament';
    if (val.includes('lace') && val.includes('front')) return 'lace_front';
    if (val.includes('full') && val.includes('lace')) return 'full_lace';
    if (val.includes('hand') && (val.includes('tied') || val.includes('tie'))) return 'hand_tied';
    return 'basic';
  }

  private normalizeDensity(value: string): 'light' | 'medium' | 'heavy' {
    const val = value.toLowerCase();
    if (val.includes('light') || val.includes('thin') || val.includes('130%') || val.includes('120%')) return 'light';
    if (val.includes('heavy') || val.includes('thick') || val.includes('180%') || val.includes('200%')) return 'heavy';
    return 'medium';
  }

  private normalizeHairType(value: string): 'synthetic' | 'human_hair' | 'blend' {
    const val = value.toLowerCase();
    if (val.includes('human') || val.includes('real') || val.includes('natural')) return 'human_hair';
    if (val.includes('blend') || val.includes('mix')) return 'blend';
    return 'synthetic';
  }

  private normalizeStyle(value: string): 'classic' | 'modern' | 'trendy' | 'professional' | 'casual' | 'formal' {
    const val = value.toLowerCase();
    if (val.includes('classic') || val.includes('traditional')) return 'classic';
    if (val.includes('modern') || val.includes('contemporary')) return 'modern';
    if (val.includes('trendy') || val.includes('fashion') || val.includes('style')) return 'trendy';
    if (val.includes('professional') || val.includes('business') || val.includes('work')) return 'professional';
    if (val.includes('casual') || val.includes('everyday')) return 'casual';
    if (val.includes('formal') || val.includes('elegant') || val.includes('special')) return 'formal';
    return 'classic';
  }

  private normalizePrice(value: string): string {
    // Remove currency symbols and normalize price
    const cleaned = value.replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? '0.00' : parsed.toFixed(2);
  }

  private parseBoolean(value: string, defaultValue = false): boolean {
    const val = value.toLowerCase();
    if (['true', '1', 'yes', 'y', 'available', 'in_stock'].includes(val)) return true;
    if (['false', '0', 'no', 'n', 'unavailable', 'out_of_stock'].includes(val)) return false;
    return defaultValue;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

/**
 * CLI interface for the JSONL builder
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: tsx scripts/build-jsonl.ts <input.csv> [output.jsonl] [options]

Convert CSV file to JSONL format for OpenAI Vector Store.

Arguments:
  input.csv     Input CSV file path
  output.jsonl  Output JSONL file path (optional, defaults to input.csv -> input.jsonl)

Options:
  --delimiter=,   CSV delimiter (default: comma)
  --help, -h      Show this help message

Examples:
  tsx scripts/build-jsonl.ts wigs.csv
  tsx scripts/build-jsonl.ts wigs.csv wigs_processed.jsonl
  tsx scripts/build-jsonl.ts wigs.tsv --delimiter='\t'

Expected CSV columns (any order):
  - id, variant_id, sku
  - title, name, description
  - price, variant_price
  - compare_at_price, compare_price, was_price
  - available, available_for_sale, in_stock
  - image_url, image, photo
  - length, wig_length, hair_length
  - texture, wig_texture, curl
  - color, wig_color, hair_color
  - cap_size, size, head_size
  - cap_construction, construction, cap_type
  - density, wig_density, thickness
  - hair_type, material, fiber
  - style, wig_style, hair_style
`);
    process.exit(0);
  }

  const inputFile = args[0];
  const outputFile = args[1];
  const delimiter = args.find(arg => arg.startsWith('--delimiter='))?.split('=')[1] || ',';

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Input file not found: ${inputFile}`);
    process.exit(1);
  }

  try {
    const builder = new JsonlBuilder(inputFile, outputFile, delimiter);
    const stats = await builder.build();
    
    console.log(`
📊 Conversion Summary:
  ✅ Records processed: ${stats.processed}
  ❌ Errors: ${stats.errors.length}
  📄 Output file: ${builder['outputFile']}

To upload to OpenAI Vector Store:
  1. Create vector store: curl -X PATCH http://localhost:3000/api/search -d '{"action": "create", "name": "Wig Catalog"}'
  2. Upload file: Use OpenAI API or dashboard to upload the JSONL file
  3. Set environment variable: OPENAI_VECTOR_STORE_ID=vs_xxx

Test search:
  curl -X POST http://localhost:3000/api/search -d '{"q": "blonde curly wig"}' -H "Content-Type: application/json"
`);

    process.exit(stats.errors.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run CLI if called directly
if (require.main === module) {
  main().catch(console.error);
}
