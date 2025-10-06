import { NextRequest, NextResponse } from 'next/server';
import { VectorMatcher } from '@/lib/vectors';
import { Variant, CatalogImport, WigAttributes } from '@/lib/types';

// Handle CSV upload and convert to normalized data
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const format = formData.get('format') as string || 'csv';
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (format !== 'csv' && format !== 'jsonl') {
      return NextResponse.json({ error: 'Only CSV and JSONL formats are supported' }, { status: 400 });
    }

    console.log(`Processing ${format.toUpperCase()} file: ${file.name}, size: ${file.size} bytes`);

    // Create import record
    const importRecord: CatalogImport = {
      id: `import_${Date.now()}`,
      status: 'processing',
      filename: file.name,
      totalRows: 0,
      processedRows: 0,
      errors: [],
      createdAt: new Date()
    };

    try {
      const fileContent = await file.text();
      
      let variants: Variant[] = [];
      
      if (format === 'csv') {
        variants = await processCsvContent(fileContent, importRecord);
      } else if (format === 'jsonl') {
        variants = await processJsonlContent(fileContent, importRecord);
      }

      // Add variants to vector index
      const vectorMatcher = VectorMatcher.getInstance();
      
      for (const variant of variants) {
        try {
          vectorMatcher.addVariant(variant);
          importRecord.processedRows = (importRecord.processedRows || 0) + 1;
        } catch (error) {
          console.error(`Error indexing variant ${variant.id}:`, error);
          if (!importRecord.errors) importRecord.errors = [];
          importRecord.errors.push(`Failed to index variant ${variant.id}: ${error}`);
        }
      }

      importRecord.status = 'completed';
      importRecord.completedAt = new Date();
      
      const stats = vectorMatcher.getStats();

      return NextResponse.json({
        success: true,
        message: `Successfully processed ${variants.length} variants`,
        importRecord,
        stats
      });

    } catch (processingError) {
      console.error('File processing error:', processingError);
      
      importRecord.status = 'failed';
      if (!importRecord.errors) importRecord.errors = [];
      importRecord.errors.push(`Processing failed: ${processingError}`);
      importRecord.completedAt = new Date();

      return NextResponse.json({
        error: 'File processing failed',
        details: processingError instanceof Error ? processingError.message : 'Unknown error',
        importRecord
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function processCsvContent(csvContent: string, importRecord: CatalogImport): Promise<Variant[]> {
  const lines = csvContent.trim().split('\n');
  const variants: Variant[] = [];
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  console.log('CSV headers:', headers);
  
  importRecord.totalRows = lines.length - 1; // Exclude header

  // Expected CSV columns (flexible mapping)
  const columnMap = mapCsvColumns(headers);
  
  for (let i = 1; i < lines.length; i++) {
    try {
      const row = parseCsvLine(lines[i]);
      
      if (row.length !== headers.length) {
        console.warn(`Row ${i + 1} has ${row.length} columns, expected ${headers.length}`);
        if (!importRecord.errors) importRecord.errors = [];
        importRecord.errors.push(`Row ${i + 1}: Column count mismatch`);
        continue;
      }

      const variant = createVariantFromCsvRow(row, columnMap, i + 1);
      if (variant) {
        variants.push(variant);
      }

    } catch (rowError) {
      console.error(`Error processing row ${i + 1}:`, rowError);
      if (!importRecord.errors) importRecord.errors = [];
      importRecord.errors.push(`Row ${i + 1}: ${rowError}`);
    }
  }

  return variants;
}

async function processJsonlContent(jsonlContent: string, importRecord: CatalogImport): Promise<Variant[]> {
  const lines = jsonlContent.trim().split('\n').filter(line => line.trim());
  const variants: Variant[] = [];
  
  importRecord.totalRows = lines.length;

  for (let i = 0; i < lines.length; i++) {
    try {
      const jsonData = JSON.parse(lines[i]);
      const variant = createVariantFromJson(jsonData, i + 1);
      
      if (variant) {
        variants.push(variant);
      }

    } catch (rowError) {
      console.error(`Error processing JSON line ${i + 1}:`, rowError);
      if (!importRecord.errors) importRecord.errors = [];
      importRecord.errors.push(`Line ${i + 1}: ${rowError}`);
    }
  }

  return variants;
}

function mapCsvColumns(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  
  headers.forEach((header, index) => {
    const headerLower = header.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Map common column variations
    switch (headerLower) {
      case 'id':
      case 'variant_id':
      case 'sku':
        map.id = index;
        break;
      case 'product_id':
      case 'parent_id':
        map.productId = index;
        break;
      case 'title':
      case 'name':
      case 'variant_title':
        map.title = index;
        break;
      case 'price':
      case 'variant_price':
        map.price = index;
        break;
      case 'compare_at_price':
      case 'compare_price':
      case 'was_price':
        map.compareAtPrice = index;
        break;
      case 'available':
      case 'available_for_sale':
      case 'in_stock':
        map.availableForSale = index;
        break;
      case 'image_url':
      case 'image':
      case 'photo':
        map.imageUrl = index;
        break;
      case 'length':
      case 'wig_length':
        map.length = index;
        break;
      case 'texture':
      case 'wig_texture':
        map.texture = index;
        break;
      case 'color':
      case 'wig_color':
      case 'hair_color':
        map.color = index;
        break;
      case 'cap_size':
      case 'size':
        map.capSize = index;
        break;
      case 'cap_construction':
      case 'construction':
        map.capConstruction = index;
        break;
      case 'density':
      case 'wig_density':
        map.density = index;
        break;
      case 'hair_type':
      case 'material':
        map.hairType = index;
        break;
      case 'style':
      case 'wig_style':
        map.style = index;
        break;
    }
  });

  return map;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result.map(cell => cell.replace(/^"|"$/g, '')); // Remove surrounding quotes
}

function createVariantFromCsvRow(row: string[], columnMap: Record<string, number>, rowNumber: number): Variant | null {
  try {
    const getValue = (key: string) => {
      const index = columnMap[key];
      return index !== undefined ? row[index]?.trim() || '' : '';
    };

    const id = getValue('id') || `variant_${rowNumber}`;
    const productId = getValue('productId') || `product_${rowNumber}`;
    const title = getValue('title') || `Wig Variant ${rowNumber}`;
    
    const price = getValue('price');
    const compareAtPrice = getValue('compareAtPrice');
    const availableForSale = getValue('availableForSale');
    
    // Create wig attributes
    const wigAttributes: WigAttributes = {
      length: (getValue('length') as any) || 'medium',
      texture: (getValue('texture') as any) || 'straight',
      color: (getValue('color') as any) || 'brunette',
      capSize: (getValue('capSize') as any) || 'average',
      capConstruction: (getValue('capConstruction') as any) || 'basic',
      density: (getValue('density') as any) || 'medium',
      hairType: (getValue('hairType') as any) || 'synthetic',
      style: (getValue('style') as any) || 'classic'
    };

    const variant: Variant = {
      id,
      productId,
      title,
      price: price || '0.00',
      compareAtPrice: compareAtPrice || undefined,
      availableForSale: availableForSale ? 
        ['true', '1', 'yes', 'available'].includes(availableForSale.toLowerCase()) : true,
      image: getValue('imageUrl') ? {
        url: getValue('imageUrl'),
        altText: title
      } : undefined,
      selectedOptions: [],
      wigAttributes
    };

    return variant;

  } catch (error) {
    console.error(`Error creating variant from CSV row ${rowNumber}:`, error);
    return null;
  }
}

function createVariantFromJson(data: any, lineNumber: number): Variant | null {
  try {
    const wigAttributes: WigAttributes = {
      length: data.wigAttributes?.length || data.length || 'medium',
      texture: data.wigAttributes?.texture || data.texture || 'straight',
      color: data.wigAttributes?.color || data.color || 'brunette',
      capSize: data.wigAttributes?.capSize || data.capSize || 'average',
      capConstruction: data.wigAttributes?.capConstruction || data.capConstruction || 'basic',
      density: data.wigAttributes?.density || data.density || 'medium',
      hairType: data.wigAttributes?.hairType || data.hairType || 'synthetic',
      style: data.wigAttributes?.style || data.style || 'classic'
    };

    const variant: Variant = {
      id: data.id || `variant_${lineNumber}`,
      productId: data.productId || `product_${lineNumber}`,
      title: data.title || `Wig Variant ${lineNumber}`,
      price: data.price?.toString() || '0.00',
      compareAtPrice: data.compareAtPrice?.toString(),
      availableForSale: data.availableForSale !== undefined ? Boolean(data.availableForSale) : true,
      image: data.image || (data.imageUrl ? {
        url: data.imageUrl,
        altText: data.title || ''
      } : undefined),
      selectedOptions: data.selectedOptions || [],
      wigAttributes
    };

    return variant;

  } catch (error) {
    console.error(`Error creating variant from JSON line ${lineNumber}:`, error);
    return null;
  }
}

// GET endpoint to check ingest status and stats
export async function GET() {
  try {
    const vectorMatcher = VectorMatcher.getInstance();
    const stats = vectorMatcher.getStats();
    
    return NextResponse.json({
      success: true,
      message: 'Ingest service is operational',
      stats,
      supportedFormats: ['csv', 'jsonl'],
      sampleCsvHeaders: [
        'id', 'product_id', 'title', 'price', 'compare_at_price', 
        'available_for_sale', 'image_url', 'length', 'texture', 
        'color', 'cap_size', 'cap_construction', 'density', 'hair_type', 'style'
      ]
    });

  } catch (error) {
    console.error('Ingest status error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}







