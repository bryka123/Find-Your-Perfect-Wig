#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

/**
 * Apply Color Corrections to Full Dataset
 * 
 * Uses AI analysis results to fix color classifications across all variants
 */

interface ColorMapping {
  originalColor: string;
  correctedColor: string;
  confidence: number;
  variantCount: number;
}

function loadColorAnalysis(analysisPath: string): Map<string, any> {
  console.log(`📊 Loading color analysis from: ${analysisPath}`);
  
  const data = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
  const colorMap = new Map();
  
  for (const analysis of data.ai_analyses) {
    colorMap.set(analysis.colorName, analysis);
  }
  
  console.log(`✅ Loaded analysis for ${colorMap.size} colors`);
  return colorMap;
}

function applyColorCorrections(processedDataPath: string, analysisPath: string, outputPath: string) {
  try {
    console.log('🔧 Applying Color Corrections to Full Dataset');
    console.log('==============================================');
    
    // Load the processed data
    const data = JSON.parse(fs.readFileSync(processedDataPath, 'utf-8'));
    const products = data.products;
    
    console.log(`📊 Processing ${products.length} products`);
    
    // Load color analysis
    const colorAnalysis = loadColorAnalysis(analysisPath);
    
    // Apply corrections
    let correctionsMade = 0;
    const correctionSummary = new Map<string, number>();
    
    console.log('\n🔄 Applying corrections...');
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const colorName = product.attrs.selectedOptions[0]?.value;
      
      if (colorName && colorAnalysis.has(colorName)) {
        const analysis = colorAnalysis.get(colorName);
        const currentColor = product.attrs.color;
        const correctedColor = analysis.actualColorFamily;
        
        if (currentColor !== correctedColor) {
          // Apply correction
          product.attrs.color = correctedColor;
          
          // Update descriptor
          product.descriptor = product.descriptor.replace(
            new RegExp(`\\b${currentColor}\\b`, 'gi'),
            correctedColor
          );
          
          // Update content
          product.content = product.content.replace(
            new RegExp(`"color": "${currentColor}"`, 'g'),
            `"color": "${correctedColor}"`
          );
          
          correctionsMade++;
          correctionSummary.set(
            `${currentColor} → ${correctedColor}`,
            (correctionSummary.get(`${currentColor} → ${correctedColor}`) || 0) + 1
          );
        }
      }
      
      // Progress indicator
      if (i % 5000 === 0) {
        console.log(`  Progress: ${Math.round(i / products.length * 100)}% (${i}/${products.length})`);
      }
    }
    
    // Update metadata
    data.metadata.color_corrected = true;
    data.metadata.color_correction_applied_at = new Date().toISOString();
    data.metadata.corrections_made = correctionsMade;
    data.metadata.color_analysis_source = analysisPath;
    
    // Save corrected data
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    
    console.log('\n✅ Color Corrections Applied!');
    console.log(`📊 Total corrections: ${correctionsMade}`);
    console.log(`💾 Corrected data saved to: ${outputPath}`);
    console.log(`📏 File size: ${Math.round(fs.statSync(outputPath).size / 1024 / 1024 * 100) / 100} MB`);
    
    console.log('\n📈 Correction Summary:');
    const sortedCorrections = Array.from(correctionSummary.entries())
      .sort(([,a], [,b]) => b - a);
      
    sortedCorrections.forEach(([correction, count]) => {
      console.log(`  ${correction}: ${count} products`);
    });
    
    // Show new color distribution
    const newColorCounts = products.reduce((acc: any, item: any) => {
      acc[item.attrs.color] = (acc[item.attrs.color] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n🎨 New Color Distribution:');
    Object.entries(newColorCounts).forEach(([color, count]) => {
      console.log(`  ${color}: ${count} variants`);
    });
    
    console.log('\n🎉 Ready to upload corrected data to vector store!');
    
    return outputPath;
    
  } catch (error) {
    console.error('❌ Correction failed:', error);
    throw error;
  }
}

async function main() {
  try {
    const processedDataPath = process.argv[2] || './new_products_processed.json';
    const analysisPath = process.argv[3] || './new_colors_analysis.json';
    const outputPath = process.argv[4] || './new_products_corrected.json';
    
    const correctedFile = applyColorCorrections(processedDataPath, analysisPath, outputPath);
    
    console.log('\n🚀 All done!');
    console.log(`✅ Corrected data: ${correctedFile}`);
    console.log('🎯 Ready to replace your vector store data with this corrected version');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}






