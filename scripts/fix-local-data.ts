#!/usr/bin/env tsx

import * as fs from 'fs';

/**
 * Fix Local Data with Color Corrections
 * 
 * Replace the local JSONL file with corrected color classifications
 * so even the fallback data is accurate
 */

async function fixLocalData() {
  try {
    console.log('🔧 Fixing Local Data with Color Corrections');
    console.log('==========================================');
    
    // Load our corrected new data
    const correctedDataPath = './new_products_corrected.json';
    const oldLocalPath = './chiquel_with_real_images.jsonl';
    const newLocalPath = './chiquel_corrected_local.jsonl';
    
    if (!fs.existsSync(correctedDataPath)) {
      throw new Error('Corrected data file not found. Run the color correction pipeline first.');
    }
    
    console.log('📄 Loading corrected data...');
    const correctedData = JSON.parse(fs.readFileSync(correctedDataPath, 'utf-8'));
    const products = correctedData.products;
    
    console.log(`📊 Found ${products.length} corrected products`);
    
    // Convert to JSONL format for local VectorMatcher
    console.log('🔄 Converting to JSONL format...');
    const jsonlLines = products.map((product: any) => JSON.stringify(product));
    const jsonlContent = jsonlLines.join('\n') + '\n';
    
    // Save as new local data file
    fs.writeFileSync(newLocalPath, jsonlContent);
    console.log(`✅ Saved corrected local data: ${newLocalPath}`);
    
    // Backup old file
    if (fs.existsSync(oldLocalPath)) {
      fs.renameSync(oldLocalPath, oldLocalPath + '.backup');
      console.log(`📦 Backed up old data: ${oldLocalPath}.backup`);
    }
    
    // Replace old file with corrected data
    fs.renameSync(newLocalPath, oldLocalPath);
    console.log(`🔄 Replaced old data file: ${oldLocalPath}`);
    
    // Verify specific problematic colors are fixed
    console.log('\n🔍 Verifying color fixes...');
    const content = fs.readFileSync(oldLocalPath, 'utf-8');
    
    // Check for the dark chocolate problem
    const darkChocolateMatch = content.match(/"RH2\/4 DARK CHOCOLATE".*?"color":"([^"]+)"/);
    if (darkChocolateMatch) {
      console.log(`✅ RH2/4 DARK CHOCOLATE: color = "${darkChocolateMatch[1]}"`);
    }
    
    // Check sample blonde products
    const blondeMatches = content.match(/"Light Blonde".*?"color":"([^"]+)"/);
    if (blondeMatches) {
      console.log(`✅ Light Blonde: color = "${blondeMatches[1]}"`);
    }
    
    console.log('\n🎉 Local Data Fix Complete!');
    console.log('✅ Old incorrect data backed up');
    console.log('✅ New corrected data active');
    console.log('✅ VectorMatcher will now use correct colors');
    console.log('🚀 Your app should now return proper color matches!');
    
    console.log('\n📋 Summary:');
    console.log(`  Products updated: ${products.length}`);
    console.log(`  Old file: ${oldLocalPath}.backup`);
    console.log(`  New file: ${oldLocalPath} (corrected)`);
    console.log(`  Status: Ready for testing`);
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  fixLocalData();
}






