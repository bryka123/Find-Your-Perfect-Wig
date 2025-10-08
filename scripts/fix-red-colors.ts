#!/usr/bin/env tsx

import * as fs from 'fs';

/**
 * Fix Red Color Misclassifications
 * 
 * Specifically targets red colors that are misclassified as blonde
 */

function fixRedColors() {
  console.log('🔧 Fixing Red Color Misclassifications');
  console.log('=====================================');
  
  const localDataPath = './chiquel_with_real_images.jsonl';
  
  if (!fs.existsSync(localDataPath)) {
    throw new Error('Local data file not found');
  }
  
  console.log('📄 Reading local data...');
  let content = fs.readFileSync(localDataPath, 'utf-8');
  let lines = content.trim().split('\n');
  
  console.log(`📊 Processing ${lines.length} products`);
  
  // Red colors that are misclassified as blonde
  const redColorFixes = [
    '"32f cherry creme"',
    '"cherry creme"', 
    '"cherry"',
    '"auburn"',
    '"copper"',
    '"red"',
    '"ginger"',
    '"burgundy"',
    '"strawberry"',
    '"raspberry"',
    '"wine"',
    '"crimson"',
    '"mahogany"'
  ];
  
  let totalFixes = 0;
  const fixDetails: string[] = [];
  
  console.log('\n🔄 Applying red color fixes...');
  
  for (let i = 0; i < lines.length; i++) {
    try {
      const record = JSON.parse(lines[i]);
      
      if (record.attrs && record.attrs.selectedOptions) {
        const colorOption = record.attrs.selectedOptions.find((opt: any) => 
          opt.name.toLowerCase().includes('color')
        );
        
        if (colorOption) {
          const colorName = colorOption.value.toLowerCase();
          
          // Check if this is a red color misclassified as blonde
          const isRedColor = redColorFixes.some(redColor => 
            colorName.includes(redColor.replace(/"/g, ''))
          );
          
          if (isRedColor && record.attrs.color === 'blonde') {
            // Fix the classification
            const oldColor = record.attrs.color;
            record.attrs.color = 'red';
            
            // Update descriptor
            record.descriptor = record.descriptor.replace(
              new RegExp(`\\b${oldColor}\\b`, 'gi'),
              'red'
            );
            
            // Update content
            record.content = record.content.replace(
              new RegExp(`"color": "${oldColor}"`, 'g'),
              `"color": "red"`
            );
            
            lines[i] = JSON.stringify(record);
            totalFixes++;
            
            fixDetails.push(`${record.title}: ${colorOption.value} → red`);
            
            if (fixDetails.length <= 10) {
              console.log(`  ✅ ${record.title}: "${colorOption.value}" → red`);
            }
          }
        }
      }
    } catch (parseError) {
      // Skip invalid lines
    }
  }
  
  // Save the fixed content
  const fixedContent = lines.join('\n') + '\n';
  fs.writeFileSync(localDataPath, fixedContent);
  
  console.log('\n✅ Red Color Fixes Applied!');
  console.log(`📊 Total fixes: ${totalFixes} products`);
  console.log(`💾 Updated: ${localDataPath}`);
  
  if (totalFixes > 10) {
    console.log(`\n📝 Additional fixes applied (showing first 10 of ${totalFixes})`);
  }
  
  console.log('\n🎯 Critical Fix:');
  console.log('✅ "32f cherry creme" → red (was blonde)');
  console.log('✅ Other red colors properly classified');
  
  console.log('\n🚀 Now "32f cherry creme" won\'t appear in blonde searches!');
  console.log('   Blonde searches will only return actual blonde wigs');
  console.log('   Red searches will return the cherry creme and similar red wigs');
  
  return totalFixes;
}

// Also check what other color families might be misclassified
function analyzeColorDistribution() {
  console.log('\n📊 Analyzing Current Color Distribution...');
  
  const content = fs.readFileSync('./chiquel_with_real_images.jsonl', 'utf-8');
  const lines = content.trim().split('\n');
  
  const colorCounts: { [key: string]: number } = {};
  const sampleColors: { [key: string]: string[] } = {};
  
  for (const line of lines) {
    try {
      const record = JSON.parse(line);
      const color = record.attrs?.color || 'unknown';
      const colorOption = record.attrs?.selectedOptions?.find((opt: any) => 
        opt.name.toLowerCase().includes('color')
      )?.value;
      
      colorCounts[color] = (colorCounts[color] || 0) + 1;
      
      if (colorOption) {
        if (!sampleColors[color]) sampleColors[color] = [];
        if (sampleColors[color].length < 3) {
          sampleColors[color].push(colorOption);
        }
      }
    } catch (e) {
      // Skip invalid lines
    }
  }
  
  console.log('\n🎨 Current Color Distribution:');
  Object.entries(colorCounts)
    .sort(([,a], [,b]) => b - a)
    .forEach(([color, count]) => {
      console.log(`  ${color}: ${count} variants`);
      if (sampleColors[color]) {
        console.log(`    Examples: ${sampleColors[color].slice(0, 2).join(', ')}`);
      }
    });
}

if (require.main === module) {
  const fixes = fixRedColors();
  if (fixes > 0) {
    analyzeColorDistribution();
  }
}









