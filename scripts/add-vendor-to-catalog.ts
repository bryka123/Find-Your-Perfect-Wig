#!/usr/bin/env tsx
/**
 * Add vendor information from Products.CSV to valid_image_catalog.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';
import { createReadStream } from 'fs';

interface Product {
  id: string;
  title: string;
  handle: string;
  vendor?: string;
  [key: string]: any;
}

interface VendorMap {
  [handle: string]: string;
}

async function loadVendorMap(): Promise<VendorMap> {
  const vendorMap: VendorMap = {};
  const csvPath = path.join(process.cwd(), 'Products.csv');

  return new Promise((resolve, reject) => {
    createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row: any) => {
        const handle = row['Handle']?.toLowerCase().trim();
        const vendor = row['Vendor']?.trim();

        if (handle && vendor) {
          vendorMap[handle] = vendor;
        }
      })
      .on('end', () => {
        console.log(`✅ Loaded ${Object.keys(vendorMap).length} vendors from CSV`);
        resolve(vendorMap);
      })
      .on('error', reject);
  });
}

async function main() {
  console.log('🔄 Loading vendor data from Products.CSV...');
  const vendorMap = await loadVendorMap();

  console.log('📖 Reading valid_image_catalog.json...');
  const catalogPath = path.join(process.cwd(), 'valid_image_catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

  let updatedCount = 0;
  let notFoundCount = 0;

  console.log('🔄 Adding vendor information to products...');
  for (const product of catalog.products) {
    const handle = product.handle?.toLowerCase().trim();

    if (handle && vendorMap[handle]) {
      product.vendor = vendorMap[handle];
      updatedCount++;
    } else {
      notFoundCount++;
      if (notFoundCount <= 5) {
        console.log(`⚠️  No vendor found for: ${product.title} (handle: ${handle})`);
      }
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   ✅ Updated: ${updatedCount} products`);
  console.log(`   ⚠️  Not found: ${notFoundCount} products`);

  // Create backup
  const backupPath = catalogPath + '.backup-' + Date.now();
  fs.copyFileSync(catalogPath, backupPath);
  console.log(`\n💾 Backup created: ${path.basename(backupPath)}`);

  // Write updated catalog
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
  console.log(`✅ Updated catalog written to: valid_image_catalog.json`);
}

main().catch(console.error);
