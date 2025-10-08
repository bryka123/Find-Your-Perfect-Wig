#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { analyzeColorChip, ColorChipAnalysis } from './analyze-color-chips';

/**
 * Fix Color Classifications in JSONL Database
 * 
 * Uses AI color chip analysis to correct the color classifications in the vector database
 * Fixes the major issue where brunette wigs are classified as blonde
 */

interface JsonlRecord {
  id: string;
  title: string;
  descriptor: string;
  attrs: {
    length: string;
    texture: string;
    color: string; // This is what we need to fix
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

// Load existing color chip analysis if available
function loadExistingAnalysis(analysisPath: string): Map<string, ColorChipAnalysis> {
  const analysisMap = new Map<string, ColorChipAnalysis>();
  
  if (fs.existsSync(analysisPath)) {
    console.log(`📊 Loading existing color analysis from: ${analysisPath}`);
    const data = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
    
    for (const result of data.results) {
      analysisMap.set(result.colorName, result);
    }
    
    console.log(`✅ Loaded ${analysisMap.size} existing color analyses`);
  }
  
  return analysisMap;
}

// Fix color classification for a single record
function fixRecordColorClassification(record: JsonlRecord, colorAnalysis: ColorChipAnalysis): JsonlRecord {
  const originalColor = record.attrs.color;
  const correctedColor = colorAnalysis.actualColorFamily;
  
  // Create a deep copy
  const fixedRecord = JSON.parse(JSON.stringify(record));
  
  // Update the color classification
  fixedRecord.attrs.color = correctedColor;
  
  // Update the descriptor if it mentions the old color
  fixedRecord.descriptor = fixedRecord.descriptor.replace(
    new RegExp(`\\b${originalColor}\\b`, 'gi'),
    correctedColor
  );
  
  // Update the content section
  fixedRecord.content = fixedRecord.content.replace(
    new RegExp(`"color": "${originalColor}"`, 'g'),
    `"color": "${correctedColor}"`
  );
  
  console.log(`🔧 ${record.title}: ${originalColor} → ${correctedColor} (${Math.round(colorAnalysis.confidence * 100)}% confidence)`);
  
  return fixedRecord;
}

// Process the entire JSONL file
async function fixColorClassifications(
  inputJsonlPath: string,
  outputJsonlPath: string,
  colorAnalysisPath?: string,
  maxRecords?: number
): Promise<void> {
  console.log('🔧 Fixing Color Classifications in JSONL Database');
  console.log('=================================================');
  
  // Read the input JSONL
  console.log(`📄 Reading JSONL from: ${inputJsonlPath}`);
  const content = fs.readFileSync(inputJsonlPath, 'utf-8');
  const records: JsonlRecord[] = content.trim().split('\n').map(line => JSON.parse(line));
  
  console.log(`📊 Found ${records.length} records`);
  
  if (maxRecords) {
    records.splice(maxRecords);
    console.log(`🔄 Processing first ${records.length} records for testing`);
  }
  
  // Load existing color analysis or create new map
  const existingAnalysis = colorAnalysisPath ? 
    loadExistingAnalysis(colorAnalysisPath) : 
    new Map<string, ColorChipAnalysis>();
  
  // Collect unique colors that need analysis
  const colorsToAnalyze = new Set<string>();
  const colorUsageCount = new Map<string, number>();
  
  for (const record of records) {
    const colorOption = record.attrs.selectedOptions.find(opt => 
      opt.name.toLowerCase().includes('color')
    );
    
    if (colorOption && colorOption.value) {
      const colorName = colorOption.value;
      colorsToAnalyze.add(colorName);
      colorUsageCount.set(colorName, (colorUsageCount.get(colorName) || 0) + 1);
    }
  }
  
  console.log(`🎨 Found ${colorsToAnalyze.size} unique colors`);
  
  // Show color usage stats
  const sortedColors = Array.from(colorUsageCount.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);
    
  console.log('\n📈 Top 10 most used colors:');
  sortedColors.forEach(([color, count], i) => {
    console.log(`  ${i + 1}. ${color} (${count} products)`);
  });
  
  // Analyze colors that we don't have analysis for yet
  const newColorsToAnalyze = Array.from(colorsToAnalyze).filter(color => 
    !existingAnalysis.has(color)
  );
  
  if (newColorsToAnalyze.length > 0) {
    console.log(`\n🤖 Need to analyze ${newColorsToAnalyze.length} new colors with AI...`);
    console.log('Note: This may take a while and use OpenAI API credits.');
    
    // For now, let's just process a subset for testing
    const colorsToProcess = newColorsToAnalyze.slice(0, 10);
    console.log(`🧪 Processing first ${colorsToProcess.length} colors for testing`);
    
    // Import and use the color analysis function
    const { analyzeMultipleColorChips } = await import('./analyze-color-chips');
    const newAnalyses = await analyzeMultipleColorChips(colorsToProcess);
    
    // Add to existing analysis
    for (const analysis of newAnalyses) {
      existingAnalysis.set(analysis.colorName, analysis);
    }
    
    console.log(`✅ Completed analysis of ${newAnalyses.length} colors`);
  }
  
  // Now fix the records
  console.log('\n🔧 Applying color corrections to records...');
  
  const fixedRecords: JsonlRecord[] = [];
  let correctionsMade = 0;
  const correctionSummary = new Map<string, { from: string; to: string; count: number }>();
  
  for (const record of records) {
    const colorOption = record.attrs.selectedOptions.find(opt => 
      opt.name.toLowerCase().includes('color')
    );
    
    if (colorOption && colorOption.value) {
      const colorName = colorOption.value;
      const colorAnalysis = existingAnalysis.get(colorName);
      
      if (colorAnalysis) {
        const originalColor = record.attrs.color;
        const correctedColor = colorAnalysis.actualColorFamily;
        
        if (originalColor !== correctedColor) {
          const fixedRecord = fixRecordColorClassification(record, colorAnalysis);
          fixedRecords.push(fixedRecord);
          correctionsMade++;
          
          // Track corrections
          const correctionKey = `${originalColor}_to_${correctedColor}`;
          const existing = correctionSummary.get(correctionKey) || { from: originalColor, to: correctedColor, count: 0 };
          existing.count++;
          correctionSummary.set(correctionKey, existing);
        } else {
          // No correction needed
          fixedRecords.push(record);
        }
      } else {
        // No analysis available, keep original
        fixedRecords.push(record);
        console.log(`⚠️ No analysis available for color: ${colorName}`);
      }
    } else {
      // No color option found, keep original  
      fixedRecords.push(record);
    }
  }
  
  // Save the corrected JSONL
  console.log(`\n💾 Saving corrected JSONL to: ${outputJsonlPath}`);
  const correctedJsonl = fixedRecords.map(record => JSON.stringify(record)).join('\n') + '\n';
  fs.writeFileSync(outputJsonlPath, correctedJsonl);
  
  // Print summary
  console.log(`\n✅ Color Classification Fix Complete!`);
  console.log(`📊 Records processed: ${records.length}`);
  console.log(`🔧 Corrections made: ${correctionsMade}`);
  console.log(`💾 Output saved to: ${outputJsonlPath}`);
  
  console.log('\n📈 Correction Summary:');
  for (const [key, correction] of correctionSummary.entries()) {
    console.log(`  ${correction.from} → ${correction.to}: ${correction.count} products`);
  }
  
  return;
}

// CLI execution
async function main() {
  try {
    const inputPath = process.argv[2] || './chiquel_with_real_images.jsonl';
    const outputPath = process.argv[3] || './chiquel_fixed_colors.jsonl';
    const colorAnalysisPath = process.argv[4] || './color_analysis_test.json';
    const maxRecords = process.argv[5] ? parseInt(process.argv[5]) : undefined;
    
    await fixColorClassifications(inputPath, outputPath, colorAnalysisPath, maxRecords);
    
    console.log('\n🎉 All done! You can now re-upload this corrected JSONL to your vector store.');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}









