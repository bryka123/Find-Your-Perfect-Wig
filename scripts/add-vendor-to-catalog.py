#!/usr/bin/env python3
"""
Add vendor information from Products.CSV to valid_image_catalog.json
"""

import csv
import json
import shutil
from datetime import datetime
from pathlib import Path

def load_vendor_map(csv_path):
    """Load vendor mapping from Products.CSV"""
    vendor_map = {}

    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            handle = row.get('Handle', '').lower().strip()
            vendor = row.get('Vendor', '').strip()

            if handle and vendor:
                vendor_map[handle] = vendor

    print(f"✅ Loaded {len(vendor_map)} vendors from CSV")
    return vendor_map

def main():
    # Paths
    csv_path = Path('Products.csv')
    catalog_path = Path('valid_image_catalog.json')

    print('🔄 Loading vendor data from Products.CSV...')
    vendor_map = load_vendor_map(csv_path)

    print('📖 Reading valid_image_catalog.json...')
    with open(catalog_path, 'r') as f:
        catalog = json.load(f)

    updated_count = 0
    not_found_count = 0

    print('🔄 Adding vendor information to products...')
    for product in catalog['products']:
        handle = product.get('handle', '').lower().strip()

        if handle and handle in vendor_map:
            product['vendor'] = vendor_map[handle]
            updated_count += 1
        else:
            not_found_count += 1
            if not_found_count <= 5:
                print(f"⚠️  No vendor found for: {product.get('title')} (handle: {handle})")

    print(f"\n📊 Results:")
    print(f"   ✅ Updated: {updated_count} products")
    print(f"   ⚠️  Not found: {not_found_count} products")

    # Create backup
    backup_path = f"{catalog_path}.backup-{int(datetime.now().timestamp())}"
    shutil.copy2(catalog_path, backup_path)
    print(f"\n💾 Backup created: {Path(backup_path).name}")

    # Write updated catalog
    with open(catalog_path, 'w') as f:
        json.dump(catalog, f, indent=2)
    print(f"✅ Updated catalog written to: valid_image_catalog.json")

if __name__ == '__main__':
    main()
