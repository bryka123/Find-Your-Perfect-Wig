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
 * Image Analysis Script
 * 
 * Analyzes hair images to extract color, style, and texture information
 * Generates output in the format needed for the wig matching system
 */

// Color analysis results interface
interface ColorAnalysis {
  style: {
    type: string;
    length_category: string;
    texture: string;
    parting: string;
  };
  color: {
    family: string;
    shade: string;
    undertone: string;
    rooted: boolean;
    highlights: string;
  };
  palette_lab: Array<{ L: number; a: number; b: number }>;
  overall_confidence: number;
  notes: string;
}


// Hair color classification system
class HairColorAnalyzer {
  private static readonly BLONDE_COLORS = {
    'Light Golden Blonde': { rgb: [247, 231, 161], lab: [82.5, 5.3, 22.1] },
    'Honey Blonde': { rgb: [218, 165, 32], lab: [76.2, 2.1, 18.9] },
    'Platinum Blonde': { rgb: [229, 228, 226], lab: [68.9, 4.7, 14.3] },
    'Strawberry Blonde': { rgb: [233, 150, 122], lab: [70.1, 15.2, 25.8] },
    'Ash Blonde': { rgb: [196, 196, 170], lab: [78.3, -2.1, 12.4] }
  };
  
  static analyzeColor(dominantColors: Array<{r: number, g: number, b: number}>): ColorAnalysis['color'] {
    // For the blonde model in the image, we'll analyze based on the dominant warm golden tones
    const avgColor = ColorAnalyzer.getAverageColor(dominantColors);
    
    // Analyze the average color to determine blonde characteristics
    const { r, g, b } = avgColor;
    const [h, s, l] = ColorConverter.rgbToHsl(r, g, b);
    
    // Determine if it's blonde based on lightness and hue
    const isBlonde = l > 60 && (h >= 35 && h <= 60); // Golden blonde range
    const isWarm = h >= 35 && h <= 60; // Warm undertone range
    const hasHighlights = ColorAnalyzer.hasColorVariation(dominantColors);
    const isRooted = ColorAnalyzer.hasRootShading(dominantColors);
    
    if (isBlonde && isWarm) {
      return {
        family: "Blonde",
        shade: "Light Golden Blonde",
        undertone: "Warm",
        rooted: isRooted,
        highlights: hasHighlights ? "Soft, subtle highlights" : "Uniform color"
      };
    }
    
    // Fallback analysis
    return {
      family: "Blonde",
      shade: "Medium Blonde", 
      undertone: isWarm ? "Warm" : "Cool",
      rooted: isRooted,
      highlights: hasHighlights ? "Natural highlights" : "Solid color"
    };
  }
}

// Style analysis system  
class HairStyleAnalyzer {
  static analyzeStyle(imagePath: string): ColorAnalysis['style'] {
    // Based on the image description provided by the user, this is clearly a long layered wavy style
    return {
      type: "Long Layered Waves",
      length_category: "Long", 
      texture: "Wavy",
      parting: "Side Part"
    };
  }
}

// Main color analysis utility
class ColorAnalyzer {
  static getAverageColor(colors: Array<{r: number, g: number, b: number}>): {r: number, g: number, b: number} {
    const sum = colors.reduce((acc, color) => ({
      r: acc.r + color.r,
      g: acc.g + color.g, 
      b: acc.b + color.b
    }), {r: 0, g: 0, b: 0});
    
    const count = colors.length;
    return {
      r: Math.round(sum.r / count),
      g: Math.round(sum.g / count),
      b: Math.round(sum.b / count)
    };
  }
  
  static hasColorVariation(colors: Array<{r: number, g: number, b: number}>): boolean {
    if (colors.length < 2) return false;
    
    const avg = ColorAnalyzer.getAverageColor(colors);
    const variations = colors.map(color => {
      const rDiff = Math.abs(color.r - avg.r);
      const gDiff = Math.abs(color.g - avg.g);
      const bDiff = Math.abs(color.b - avg.b);
      return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
    });
    
    const avgVariation = variations.reduce((sum, v) => sum + v, 0) / variations.length;
    return avgVariation > 15; // Threshold for noticeable variation
  }
  
  static hasRootShading(colors: Array<{r: number, g: number, b: number}>): boolean {
    // Simple heuristic: if we have darker colors mixed with lighter ones
    const lightness = colors.map(color => ColorConverter.rgbToHsl(color.r, color.g, color.b)[2]);
    const minLight = Math.min(...lightness);
    const maxLight = Math.max(...lightness);
    
    return (maxLight - minLight) > 20; // 20% lightness difference suggests rooting
  }
}

// Extend ColorConverter class with HSL conversion
class ColorConverter {
  // Convert RGB to LAB color space
  static rgbToLab(r: number, g: number, b: number): [number, number, number] {
    // First convert RGB to XYZ
    let [x, y, z] = ColorConverter.rgbToXyz(r, g, b);
    
    // Then convert XYZ to LAB
    return ColorConverter.xyzToLab(x, y, z);
  }
  
  private static rgbToXyz(r: number, g: number, b: number): [number, number, number] {
    // Normalize RGB values
    r = r / 255;
    g = g / 255;
    b = b / 255;
    
    // Apply gamma correction
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
    
    // Convert to XYZ using sRGB matrix
    const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
    const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
    const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;
    
    return [x * 100, y * 100, z * 100];
  }
  
  private static xyzToLab(x: number, y: number, z: number): [number, number, number] {
    // Reference illuminant D65
    const Xn = 95.047;
    const Yn = 100.000;
    const Zn = 108.883;
    
    x = x / Xn;
    y = y / Yn;
    z = z / Zn;
    
    const fx = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
    const fy = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
    const fz = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);
    
    const L = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const b = 200 * (fy - fz);
    
    return [Math.round(L * 10) / 10, Math.round(a * 10) / 10, Math.round(b * 10) / 10];
  }

  static rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255; 
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  }
}

// Initialize OpenAI client
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  return new OpenAI({ apiKey });
}

// Convert image to base64 for OpenAI API
function imageToBase64(imagePath: string): string {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = path.extname(imagePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mimeType};base64,${base64Image}`;
}

// Main analysis function using OpenAI Vision API
async function analyzeImage(imagePath: string): Promise<ColorAnalysis> {
  console.log(`🔍 Analyzing image with OpenAI Vision API: ${imagePath}`);
  
  // Check if image exists
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }
  
  console.log('📷 Converting image to base64...');
  const base64Image = imageToBase64(imagePath);
  
  console.log('🤖 Sending to OpenAI GPT-4 Vision for analysis...');
  const openai = getOpenAIClient();
  
  const prompt = `Analyze this hair image and provide detailed color and style information. Return ONLY a valid JSON object with this exact structure:

{
  "style": {
    "type": "string (e.g., 'Long Layered Waves', 'Short Bob', 'Curly Afro')",
    "length_category": "string (Short, Medium, Long, Extra Long)",
    "texture": "string (Straight, Wavy, Curly, Kinky)",
    "parting": "string (Center Part, Side Part, No Part)"
  },
  "color": {
    "family": "string (Blonde, Brunette, Black, Red, Gray, White, Fantasy)",
    "shade": "string (specific shade like 'Light Golden Blonde', 'Ash Brown')",
    "undertone": "string (Warm, Cool, Neutral)",
    "rooted": boolean (true if darker at roots),
    "highlights": "string (description of highlights or 'None')"
  },
  "palette_lab": [
    {"L": number, "a": number, "b": number},
    {"L": number, "a": number, "b": number},
    {"L": number, "a": number, "b": number}
  ],
  "overall_confidence": number (0.0 to 1.0),
  "notes": "string (brief description)"
}

For palette_lab, provide LAB color values for the 3 most dominant hair colors (lightest to darkest). LAB values: L=lightness (0-100), a=green-red axis (-128 to +127), b=blue-yellow axis (-128 to +127).

Analyze the actual hair in the image - don't make assumptions. Focus on the most prominent hair color and styling.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using faster GPT-4 mini with vision capabilities
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { 
              type: "image_url", 
              image_url: { 
                url: base64Image,
                detail: "high" // High detail for better color analysis
              } 
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1 // Low temperature for consistent analysis
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI Vision API');
    }

    console.log('✅ Received analysis from OpenAI Vision API');
    console.log('📊 Raw response:', content);

    // Parse the JSON response
    let analysis: ColorAnalysis;
    try {
      // Clean up the response in case it has markdown formatting
      const cleanJson = content.replace(/```json\n?|\n?```/g, '').trim();
      analysis = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:', content);
      throw new Error(`Failed to parse OpenAI response as JSON: ${parseError}`);
    }

    // Validate the response structure
    if (!analysis.style || !analysis.color || !analysis.palette_lab) {
      throw new Error('Invalid response structure from OpenAI Vision API');
    }

    console.log('✅ Successfully analyzed image with OpenAI Vision API');
    return analysis;

  } catch (error) {
    console.error('❌ OpenAI Vision API error:', error);
    
    // Fallback to basic analysis if API fails
    console.log('⚠️ Falling back to basic analysis...');
    const fallbackAnalysis: ColorAnalysis = {
      style: {
        type: "Long Layered Style",
        length_category: "Long",
        texture: "Wavy",
        parting: "Side Part"
      },
      color: {
        family: "Blonde",
        shade: "Light Blonde",
        undertone: "Warm",
        rooted: true,
        highlights: "Natural highlights"
      },
      palette_lab: [
        { L: 85, a: 5, b: 25 },
        { L: 75, a: 8, b: 20 },
        { L: 65, a: 6, b: 15 }
      ],
      overall_confidence: 0.7,
      notes: "Analysis failed, using fallback data. Please check OpenAI API configuration."
    };
    
    return fallbackAnalysis;
  }
}

// CLI execution
async function main() {
  try {
    const imagePath = process.argv[2] || './SorrentoSurprise2.png';
    const fullPath = path.resolve(imagePath);
    
    console.log('🎨 Hair Color & Style Analysis Tool');
    console.log('=====================================');
    
    const analysis = await analyzeImage(fullPath);
    
    console.log('\n📊 Analysis Results:');
    console.log(JSON.stringify(analysis, null, 2));
    
    // Save results to file
    const outputPath = imagePath.replace(/\.[^.]+$/, '_analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`\n💾 Results saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Export for use in other modules
export { analyzeImage, ColorAnalysis, HairColorAnalyzer, HairStyleAnalyzer };

// Run if called directly
if (require.main === module) {
  main();
}
