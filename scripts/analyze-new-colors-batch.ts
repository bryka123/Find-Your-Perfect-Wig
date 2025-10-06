#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { analyzeMultipleColorChips, ColorChipAnalysis } from './analyze-color-chips';

// Load environment variables
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
      }
    }
  }
}

loadEnvFile();

/**
 * Batch Color Analysis for New Products
 * 
 * Efficiently analyzes unique colors from the new dataset using AI
 */

interface ColorUsage {
  colorName: string;
  variantCount: number;
  sampleVariants: string[];
}

function extractUniqueColors(processedDataPath: string): ColorUsage[] {
  console.log('🎨 Extracting unique colors from processed data...');
  
  const data = JSON.parse(fs.readFileSync(processedDataPath, 'utf-8'));
  const products = data.products;
  
  console.log(`📊 Analyzing ${products.length} products for unique colors`);
  
  const colorMap = new Map<string, ColorUsage>();
  
  for (const product of products) {
    const colorName = product.attrs.selectedOptions[0]?.value;
    if (colorName) {
      const existing = colorMap.get(colorName);
      if (existing) {
        existing.variantCount++;
        if (existing.sampleVariants.length < 3) {
          existing.sampleVariants.push(product.title);
        }
      } else {
        colorMap.set(colorName, {
          colorName,
          variantCount: 1,
          sampleVariants: [product.title]
        });
      }
    }
  }
  
  const uniqueColors = Array.from(colorMap.values())
    .sort((a, b) => b.variantCount - a.variantCount); // Sort by usage count
  
  console.log(`✅ Found ${uniqueColors.length} unique colors`);
  
  return uniqueColors;
}

async function batchAnalyzeColors() {
  try {
    console.log('🎨 Batch Color Analysis for New Products');
    console.log('======================================');
    
    const processedDataPath = process.argv[2] || './new_products_processed.json';
    const outputPath = process.argv[3] || './new_colors_analysis.json';
    const maxColors = parseInt(process.argv[4]) || 50; // Limit for initial analysis
    
    if (!fs.existsSync(processedDataPath)) {
      throw new Error(`Processed data file not found: ${processedDataPath}`);
    }
    
    // Extract unique colors
    const uniqueColors = extractUniqueColors(processedDataPath);
    
    console.log('\n📈 Top 20 Most Used Colors:');
    uniqueColors.slice(0, 20).forEach((color, i) => {
      console.log(`  ${i + 1}. ${color.colorName} (${color.variantCount} variants)`);
    });
    
    console.log(`\n🤖 Analyzing top ${maxColors} colors with AI...`);
    console.log('⚠️ This will use OpenAI API credits');
    
    // Analyze the most commonly used colors first
    const colorsToAnalyze = uniqueColors.slice(0, maxColors).map(c => c.colorName);
    
    console.log('\n🚀 Starting AI color analysis...');
    const analyses = await analyzeMultipleColorChips(colorsToAnalyze);
    
    // Create analysis results
    const results = {
      timestamp: new Date().toISOString(),
      source_file: processedDataPath,
      total_unique_colors: uniqueColors.length,
      analyzed_colors: analyses.length,
      coverage: {
        analyzed_variants: uniqueColors.slice(0, maxColors).reduce((sum, c) => sum + c.variantCount, 0),
        total_variants: uniqueColors.reduce((sum, c) => sum + c.variantCount, 0)
      },
      color_usage: uniqueColors,
      ai_analyses: analyses,
      correction_summary: {
        blonde_to_brunette: analyses.filter(a => a.actualColorFamily === 'brunette' && colorsToAnalyze.some(name => name.toLowerCase().includes('blonde'))).length,
        brunette_to_blonde: analyses.filter(a => a.actualColorFamily === 'blonde' && colorsToAnalyze.some(name => name.toLowerCase().includes('brown'))).length,
        total_corrections_needed: analyses.filter(a => {
          const originalGuess = inferOriginalClassification(a.colorName);
          return originalGuess !== a.actualColorFamily;
        }).length
      }
    };
    
    // Save analysis results
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    
    console.log('\n✅ Batch Analysis Complete!');
    console.log(`📊 Analyzed ${analyses.length} colors`);
    console.log(`📈 Coverage: ${Math.round(results.coverage.analyzed_variants / results.coverage.total_variants * 100)}% of all variants`);
    console.log(`💾 Results saved to: ${outputPath}`);
    
    console.log('\n🔧 Correction Summary:');
    console.log(`  Total corrections needed: ${results.correction_summary.total_corrections_needed}`);
    console.log(`  Colors needing correction: ${Math.round(results.correction_summary.total_corrections_needed / analyses.length * 100)}%`);
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Review the analysis results');
    console.log('2. Apply corrections to the full dataset');
    console.log('3. Upload corrected data to vector store');
    
    // Show some specific examples
    console.log('\n🔍 Example Corrections Needed:');
    analyses.filter(a => {
      const originalGuess = inferOriginalClassification(a.colorName);
      return originalGuess !== a.actualColorFamily;
    }).slice(0, 5).forEach((analysis, i) => {
      const originalGuess = inferOriginalClassification(analysis.colorName);
      console.log(`  ${i + 1}. "${analysis.colorName}"`);
      console.log(`     Current: ${originalGuess} → AI Detected: ${analysis.actualColorFamily}`);
      console.log(`     Confidence: ${Math.round(analysis.confidence * 100)}%`);
    });
    
  } catch (error) {
    console.error('❌ Batch analysis failed:', error);
    process.exit(1);
  }
}

// Helper to guess what the original classification would have been
function inferOriginalClassification(colorName: string): string {
  const name = colorName.toLowerCase();
  
  if (name.includes('blonde') || name.includes('cream') || name.includes('butter')) {
    return 'blonde';
  } else if (name.includes('brown') || name.includes('chocolate') || name.includes('mocha')) {
    return 'brunette';
  } else if (name.includes('black')) {
    return 'black';
  } else if (name.includes('red') || name.includes('cherry')) {
    return 'red';
  } else if (name.includes('gray') || name.includes('silver')) {
    return 'gray';
  }
  
  return 'blonde'; // Default (this is the problem - too many default to blonde)
}

if (require.main === module) {
  batchAnalyzeColors();
}






