import OpenAI from 'openai';

/**
 * Image Analysis Library
 * 
 * Provides real-time hair color and style analysis using OpenAI Vision API
 * Integrates with the wig matching system to provide actual image-based analysis
 */

// Analysis result interface
export interface HairAnalysis {
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

// Initialize OpenAI client
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  return new OpenAI({ apiKey });
}

/**
 * Analyze hair image using OpenAI Vision API
 * @param imageData - Base64 encoded image data (data:image/jpeg;base64,...)
 * @returns Promise<HairAnalysis> - Detailed hair analysis
 */
export async function analyzeHairImage(imageData: string): Promise<HairAnalysis> {
  console.log('🔍 Analyzing hair image with OpenAI Vision API...');
  
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
    "family": "string (Blonde/Brunette/Black/Red/Gray/White) - BASE ON MID/END COLOR NOT ROOTS",
    "shade": "string (e.g., 'Rooted Golden Blonde', 'Shadow Root Platinum', 'Venice Blonde')",
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

IMPORTANT FOR WIGS:
- For ROOTED styles: The color.family should be based on MID-TO-END color, NOT roots
- Example: Dark roots with blonde ends = "Blonde" family
- Shadow roots, rooted blonde, dimensional blonde = ALL classify as "Blonde"
- Venice Blonde, Shaded Wheat, etc = "Blonde" family
- The color.shade should describe the full look (e.g., "Rooted Golden Blonde")

Focus on the actual hair in the image. Be accurate about wig color classification.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Most advanced GPT-4 with vision capabilities
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { 
              type: "image_url", 
              image_url: { 
                url: imageData,
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

    // Parse the JSON response
    let analysis: HairAnalysis;
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

    console.log('✅ Successfully analyzed hair image with OpenAI Vision API');
    return analysis;

  } catch (error) {
    console.error('❌ OpenAI Vision API error:', error);
    throw error; // Re-throw to let the caller handle the error
  }
}

/**
 * Convert File to base64 data URL for OpenAI API
 * @param file - File object from browser
 * @returns Promise<string> - Base64 data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert HairAnalysis to SelfieAttributes format for matching system
 * @param analysis - Hair analysis from OpenAI Vision API
 * @returns SelfieAttributes compatible object
 */
export function analysisToSelfieAttributes(analysis: HairAnalysis) {
  // Map analysis to matching system format
  const selfieAttrs = {
    skinTone: 'medium', // Default, can be enhanced later
    eyeColor: 'brown', // Default, can be enhanced later
    hairColor: analysis.color.family.toLowerCase(),
    faceShape: 'oval' as const, // Default, can be enhanced later
    style: `${analysis.style.length_category.toLowerCase()} ${analysis.style.texture.toLowerCase()} ${analysis.color.shade.toLowerCase()}`
  };

  return selfieAttrs;
}

/**
 * Enhanced analysis with color matching recommendations
 * @param analysis - Base hair analysis
 * @returns Enhanced analysis with wig color recommendations
 */
export function enhanceAnalysisWithColorRecommendations(analysis: HairAnalysis) {
  const colorFamily = analysis.color.family.toLowerCase();
  const undertone = analysis.color.undertone.toLowerCase();
  const isRooted = analysis.color.rooted;
  
  // Generate color recommendations based on analysis
  let recommendations: string[] = [];
  
  switch (colorFamily) {
    case 'blonde':
      if (undertone === 'warm') {
        recommendations = ['blonde', 'honey', 'golden', 'strawberry'];
      } else if (undertone === 'cool') {
        recommendations = ['blonde', 'ash', 'platinum', 'silver'];
      } else {
        recommendations = ['blonde', 'natural', 'medium'];
      }
      break;
      
    case 'brunette':
      if (undertone === 'warm') {
        recommendations = ['brunette', 'chocolate', 'caramel', 'auburn'];
      } else {
        recommendations = ['brunette', 'ash', 'cool brown'];
      }
      break;
      
    case 'black':
      recommendations = ['black', 'dark brown', 'jet black'];
      break;
      
    case 'red':
      recommendations = ['red', 'auburn', 'copper', 'burgundy'];
      break;
      
    default:
      recommendations = [colorFamily];
  }

  return {
    ...analysis,
    colorRecommendations: recommendations,
    stylePreferences: {
      length: analysis.style.length_category.toLowerCase(),
      texture: analysis.style.texture.toLowerCase(),
      preferRooted: isRooted
    }
  };
}
