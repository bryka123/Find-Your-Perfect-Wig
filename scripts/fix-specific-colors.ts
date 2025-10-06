#!/usr/bin/env tsx

import * as fs from 'fs';

/**
 * Quick Fix for Specific Color Issues
 * 
 * Directly fixes the most problematic color classifications that are causing issues
 */

function fixSpecificColors() {
  console.log('🔧 Applying Direct Color Fixes');
  console.log('=============================');
  
  const localDataPath = './chiquel_with_real_images.jsonl';
  
  if (!fs.existsSync(localDataPath)) {
    throw new Error('Local data file not found');
  }
  
  console.log('📄 Reading local data...');
  let content = fs.readFileSync(localDataPath, 'utf-8');
  let lines = content.trim().split('\n');
  
  console.log(`📊 Processing ${lines.length} products`);
  
  // Direct color fixes based on our AI analysis
  const colorFixes = [
    // Colors that should be BLACK
    { from: '"DARK CHOCOLATE"', toColor: 'black' },
    { from: '"RH2/4 DARK CHOCOLATE"', toColor: 'black' },
    { from: '"1b hot fudge"', toColor: 'black' },
    { from: '"hot fudge"', toColor: 'black' },
    { from: '"1B"', toColor: 'black' },
    
    // Colors that should be BRUNETTE  
    { from: '"6 fudgesicle"', toColor: 'brunette' },
    { from: '"4 brownie finale"', toColor: 'brunette' },
    { from: '"6/33 raspberry twist"', toColor: 'brunette' },
    { from: '"6f27 caramel ribbon"', toColor: 'brunette' },
    { from: '"espresso mix"', toColor: 'brunette' },
    { from: '"RH4/39SS Shaded Mulberry"', toColor: 'brunette' },
    { from: '"8/30 cocoa twist"', toColor: 'brunette' },
    { from: '"Mocha Frost"', toColor: 'brunette' },
    { from: '"Cinnamon Raisin"', toColor: 'brunette' },
    { from: '"Medium Brown"', toColor: 'brunette' },
    { from: '"Dark Brown"', toColor: 'brunette' },
    { from: '"Light Brown"', toColor: 'blonde' }, // AI said this was actually blonde
    
    // Colors that should stay BLONDE (verified by AI)
    { from: '"12fs8 shaded praline"', toColor: 'blonde' },
    { from: '"champagne rooted"', toColor: 'blonde' },
    { from: '"Dark Blonde"', toColor: 'blonde' },
    { from: '"Medium Blonde"', toColor: 'blonde' },
    { from: '"Light Blonde"', toColor: 'blonde' },
    { from: '"24bt18s8 shaded mocha"', toColor: 'blonde' }, // AI confirmed this is blonde
    { from: '"Frosted"', toColor: 'blonde' },
    { from: '"Sparkling Champagne"', toColor: 'blonde' },
    { from: '"RH22/26SS SHADED FRENCH VANILLA"', toColor: 'blonde' },
    
    // Gray colors
    { from: '"Light Grey"', toColor: 'gray' },
  ];
  
  let totalFixes = 0;
  const fixSummary: { [key: string]: number } = {};
  
  console.log('\n🔄 Applying color fixes...');
  
  for (const fix of colorFixes) {
    let linesFixes = 0;
    
    // Find all lines containing this color and fix them
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(fix.from)) {
        // Parse the JSON
        try {
          const record = JSON.parse(lines[i]);
          
          // Check if this record has the wrong color classification
          if (record.attrs && record.attrs.color !== fix.toColor) {
            const oldColor = record.attrs.color;
            
            // Fix the color
            record.attrs.color = fix.toColor;
            
            // Update descriptor
            record.descriptor = record.descriptor.replace(
              new RegExp(`\\b${oldColor}\\b`, 'gi'),
              fix.toColor
            );
            
            // Update content
            record.content = record.content.replace(
              new RegExp(`"color": "${oldColor}"`, 'g'),
              `"color": "${fix.toColor}"`
            );
            
            // Save the fixed line
            lines[i] = JSON.stringify(record);
            linesFixes++;
            totalFixes++;
            
            fixSummary[`${oldColor} → ${fix.toColor}`] = (fixSummary[`${oldColor} → ${fix.toColor}`] || 0) + 1;
          }
        } catch (parseError) {
          // Skip invalid lines
        }
      }
    }
    
    if (linesFixes > 0) {
      console.log(`  ✅ ${fix.from}: ${linesFixes} products fixed`);
    }
  }
  
  // Save the fixed content
  const fixedContent = lines.join('\n') + '\n';
  fs.writeFileSync(localDataPath, fixedContent);
  
  console.log('\n✅ Color Fixes Applied!');
  console.log(`📊 Total fixes: ${totalFixes} products`);
  console.log(`💾 Updated: ${localDataPath}`);
  
  console.log('\n📈 Fix Summary:');
  Object.entries(fixSummary).forEach(([fix, count]) => {
    console.log(`  ${fix}: ${count} products`);
  });
  
  console.log('\n🎯 Critical Fixes:');
  console.log('✅ "DARK CHOCOLATE" → black (was blonde)');
  console.log('✅ "Shaded Mulberry" → brunette (was blonde)');  
  console.log('✅ "Hot Fudge" → black (was blonde)');
  console.log('✅ "Brownie Finale" → brunette (was blonde)');
  
  console.log('\n🚀 Ready to test! Restart your app to load the fixed data.');
}

if (require.main === module) {
  fixSpecificColors();
}






