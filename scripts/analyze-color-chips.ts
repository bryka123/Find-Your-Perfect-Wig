#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';

// Manually load environment variables from .env.local
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

// Load environment variables
loadEnvFile();

/**
 * Color Chip Analysis System
 * 
 * Uses OpenAI Vision API to analyze actual color chip images and determine real colors
 * Fixes the color classification problem in the vector database
 */

interface ColorChipAnalysis {
  colorName: string; // Original color name from product
  actualColorFamily: string; // AI-detected color family (blonde, brunette, black, red, gray, white)
  specificShade: string; // Specific shade description
  undertone: string; // Warm, cool, neutral
  labValues: { L: number; a: number; b: number }; // LAB color values
  hexColor: string; // Approximate hex color
  confidence: number; // 0-1 confidence score
  isRooted: boolean; // Has darker roots
  notes: string; // Additional notes
}

// Initialize OpenAI client
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  return new OpenAI({ apiKey });
}

// Convert image URL to base64 for analysis
async function urlToBase64(imageUrl: string): Promise<string> {
  try {
    console.log(`📡 Fetching image: ${imageUrl}`);
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(`❌ Failed to fetch ${imageUrl}:`, error);
    throw error;
  }
}

// Generate color chip URL from color name (replicating the existing logic)
function generateColorChipUrl(colorName: string): string {
  const normalized = colorName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  return `https://cdn.shopify.com/s/files/1/0506/4710/5726/files/${normalized}.jpg`;
}

// Analyze a color chip using OpenAI Vision API
async function analyzeColorChip(colorName: string): Promise<ColorChipAnalysis> {
  console.log(`🎨 Analyzing color chip: ${colorName}`);
  
  const colorChipUrl = generateColorChipUrl(colorName);
  const openai = getOpenAIClient();
  
  try {
    const base64Image = await urlToBase64(colorChipUrl);
    
    const prompt = `Analyze this hair color chip/swatch and determine the actual hair color family. Return ONLY a valid JSON object:

{
  "actualColorFamily": "string (MUST be one of: blonde, brunette, black, red, gray, white, fantasy)",
  "specificShade": "string (e.g., 'Light Golden Blonde', 'Deep Chocolate Brown', 'Auburn Red')", 
  "undertone": "string (warm, cool, neutral)",
  "labValues": {"L": number, "a": number, "b": number},
  "hexColor": "string (#RRGGBB format)",
  "confidence": number (0.0 to 1.0),
  "isRooted": boolean (true if shows darker roots/gradient),
  "notes": "string (brief description of what you see)"
}

CRITICAL: For actualColorFamily, be very strict:
- If it's ANY shade of brown/chocolate/mocha/coffee/cappuccino/etc = "brunette"  
- If it's ANY shade of blonde/golden/honey/platinum/etc = "blonde"
- If it's black or very dark brown = "black"
- If it's red/auburn/copper/ginger = "red" 
- If it's gray/silver = "gray"
- If it's white/platinum white = "white"

Look at the ACTUAL VISUAL COLOR, not just the name. Many products are mislabeled.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // GPT-4 with vision
      messages: [
        {
          role: "user", 
          content: [
            { type: "text", text: prompt },
            { 
              type: "image_url",
              image_url: { 
                url: base64Image,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI Vision API');
    }

    console.log('✅ Received analysis from OpenAI Vision API');
    
    // Parse the JSON response
    let analysis;
    try {
      const cleanJson = content.replace(/```json\n?|\n?```/g, '').trim();
      analysis = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:', content);
      throw new Error(`Failed to parse OpenAI response: ${parseError}`);
    }

    return {
      colorName,
      ...analysis
    } as ColorChipAnalysis;

  } catch (error) {
    console.error(`❌ Failed to analyze color chip ${colorName}:`, error);
    
    // Fallback analysis based on color name text
    const fallback: ColorChipAnalysis = {
      colorName,
      actualColorFamily: inferColorFamilyFromName(colorName),
      specificShade: colorName,
      undertone: 'neutral',
      labValues: { L: 50, a: 0, b: 0 },
      hexColor: '#8B4513',
      confidence: 0.3,
      isRooted: colorName.toLowerCase().includes('rooted'),
      notes: `AI analysis failed, inferred from name. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
    
    return fallback;
  }
}

// Improved color family inference from name (as fallback)
function inferColorFamilyFromName(colorName: string): string {
  const name = colorName.toLowerCase();
  
  // More accurate text-based classification
  if (name.includes('chocolate') || name.includes('mocha') || name.includes('cappuccino') || 
      name.includes('espresso') || name.includes('coffee') || name.includes('caramel') ||
      name.includes('brown') || name.includes('brunette') || name.includes('chestnut')) {
    return 'brunette';
  }
  
  if (name.includes('blonde') || name.includes('golden') || name.includes('honey') || 
      name.includes('butter') || name.includes('cream') && !name.includes('chocolate')) {
    return 'blonde';
  }
  
  if (name.includes('black') || name.includes('ebony') || name.includes('jet')) {
    return 'black';
  }
  
  if (name.includes('red') || name.includes('auburn') || name.includes('copper') || name.includes('ginger')) {
    return 'red';
  }
  
  if (name.includes('gray') || name.includes('silver') || name.includes('salt')) {
    return 'gray';
  }
  
  if (name.includes('white') || name.includes('platinum') && name.includes('white')) {
    return 'white';
  }
  
  // Default to brunette for unclear cases
  return 'brunette';
}

// Analyze multiple color chips
async function analyzeMultipleColorChips(colorNames: string[]): Promise<ColorChipAnalysis[]> {
  console.log(`🎨 Analyzing ${colorNames.length} color chips...`);
  
  const results: ColorChipAnalysis[] = [];
  
  for (let i = 0; i < colorNames.length; i++) {
    const colorName = colorNames[i];
    console.log(`\n[${i + 1}/${colorNames.length}] Processing: ${colorName}`);
    
    try {
      const analysis = await analyzeColorChip(colorName);
      results.push(analysis);
      
      console.log(`✅ ${colorName} → ${analysis.actualColorFamily} (${analysis.confidence * 100}% confidence)`);
      
      // Add delay to avoid rate limits
      if (i < colorNames.length - 1) {
        console.log('⏳ Waiting 1 second to avoid rate limits...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error(`❌ Failed to analyze ${colorName}:`, error);
    }
  }
  
  return results;
}

// Extract unique color names from JSONL data
function extractColorNamesFromJsonl(jsonlPath: string): string[] {
  const content = fs.readFileSync(jsonlPath, 'utf-8');
  const records = content.trim().split('\n').map(line => JSON.parse(line));
  
  const colorNames = new Set<string>();
  
  for (const record of records) {
    // Get color from selectedOptions
    const colorOption = record.attrs.selectedOptions.find((opt: any) => 
      opt.name.toLowerCase().includes('color')
    );
    
    if (colorOption && colorOption.value) {
      colorNames.add(colorOption.value);
    }
  }
  
  return Array.from(colorNames);
}

// Main CLI execution
async function main() {
  try {
    console.log('🎨 Color Chip AI Analysis Tool');
    console.log('===============================');
    
    const jsonlPath = process.argv[2] || './chiquel_with_real_images.jsonl';
    const outputPath = process.argv[3] || './color_chip_analysis.json';
    const maxColors = parseInt(process.argv[4]) || 20; // Limit for testing
    
    console.log(`📄 Reading JSONL data from: ${jsonlPath}`);
    
    if (!fs.existsSync(jsonlPath)) {
      throw new Error(`JSONL file not found: ${jsonlPath}`);
    }
    
    // Extract unique color names
    const allColorNames = extractColorNamesFromJsonl(jsonlPath);
    console.log(`🎨 Found ${allColorNames.length} unique color names`);
    
    // Limit for testing (remove this in production)
    const colorNamesToAnalyze = allColorNames.slice(0, maxColors);
    console.log(`📊 Analyzing first ${colorNamesToAnalyze.length} colors (for testing)`);
    
    // Show the colors we'll analyze
    console.log('\nColors to analyze:');
    colorNamesToAnalyze.forEach((name, i) => {
      console.log(`  ${i + 1}. ${name}`);
    });
    
    console.log('\n🚀 Starting analysis...');
    
    // Analyze the color chips
    const results = await analyzeMultipleColorChips(colorNamesToAnalyze);
    
    // Save results
    const analysisData = {
      timestamp: new Date().toISOString(),
      totalAnalyzed: results.length,
      results,
      summary: {
        blonde: results.filter(r => r.actualColorFamily === 'blonde').length,
        brunette: results.filter(r => r.actualColorFamily === 'brunette').length,
        black: results.filter(r => r.actualColorFamily === 'black').length,
        red: results.filter(r => r.actualColorFamily === 'red').length,
        gray: results.filter(r => r.actualColorFamily === 'gray').length,
        white: results.filter(r => r.actualColorFamily === 'white').length,
        fantasy: results.filter(r => r.actualColorFamily === 'fantasy').length
      }
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(analysisData, null, 2));
    
    console.log(`\n✅ Analysis complete!`);
    console.log(`📊 Results saved to: ${outputPath}`);
    console.log(`\n📈 Summary:`);
    console.log(`  Blonde: ${analysisData.summary.blonde}`);
    console.log(`  Brunette: ${analysisData.summary.brunette}`);
    console.log(`  Black: ${analysisData.summary.black}`);
    console.log(`  Red: ${analysisData.summary.red}`);
    console.log(`  Gray: ${analysisData.summary.gray}`);
    console.log(`  White: ${analysisData.summary.white}`);
    console.log(`  Fantasy: ${analysisData.summary.fantasy}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Export for use in other modules
export { analyzeColorChip, ColorChipAnalysis, analyzeMultipleColorChips };

// Run if called directly  
if (require.main === module) {
  main();
}






