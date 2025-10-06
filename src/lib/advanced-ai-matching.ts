/**
 * Advanced AI Matching System
 *
 * Implements state-of-the-art AI techniques for hair and style matching
 * including multi-modal embeddings, face shape detection, and style transfer analysis
 */

import OpenAI from 'openai';

export interface AdvancedHairAnalysis {
  // Visual Features
  hairFeatures: {
    primaryColor: string;
    secondaryColors: string[];
    colorDistribution: { color: string; percentage: number }[];
    texture: 'straight' | 'wavy' | 'curly' | 'kinky' | 'coily';
    textureConfidence: number;
    volume: 'low' | 'medium' | 'high';
    shine: 'matte' | 'natural' | 'glossy';
    density: 'thin' | 'medium' | 'thick';
  };

  // Face Analysis
  faceFeatures: {
    shape: 'oval' | 'round' | 'square' | 'heart' | 'oblong' | 'diamond';
    skinTone: {
      category: 'fair' | 'light' | 'medium' | 'tan' | 'deep' | 'dark';
      undertone: 'warm' | 'cool' | 'neutral';
      hexColor: string;
    };
    features: {
      foreheadWidth: 'narrow' | 'medium' | 'wide';
      cheekbones: 'low' | 'medium' | 'high';
      jawline: 'soft' | 'defined' | 'angular';
    };
  };

  // Style Recommendations
  styleRecommendations: {
    idealLengths: string[];
    idealTextures: string[];
    avoidLengths: string[];
    avoidTextures: string[];
    capConstructionPreference: string[];
    partingPreference: 'center' | 'side' | 'no-part';
  };

  // Color Harmony Analysis
  colorHarmony: {
    bestColors: { name: string; score: number }[];
    goodColors: { name: string; score: number }[];
    avoidColors: { name: string; score: number }[];
    seasonalPalette: 'spring' | 'summer' | 'autumn' | 'winter';
  };

  // Advanced Metrics
  metrics: {
    imageQuality: number; // 0-1
    lightingQuality: number; // 0-1
    poseAlignment: number; // 0-1
    confidence: number; // 0-1
  };

  // Multi-modal Embeddings
  embeddings: {
    styleVector: number[]; // 512-dimensional style embedding
    colorVector: number[]; // 256-dimensional color embedding
    textureVector: number[]; // 128-dimensional texture embedding
  };
}

/**
 * Initialize OpenAI client with optimal settings
 */
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  return new OpenAI({ apiKey });
}

/**
 * Perform advanced AI analysis with multi-stage processing
 */
export async function performAdvancedAnalysis(
  imageData: string,
  additionalContext?: string
): Promise<AdvancedHairAnalysis> {
  console.log('🤖 Starting advanced AI analysis pipeline...');

  const openai = getOpenAIClient();

  // Stage 1: Comprehensive Visual Analysis
  const visualAnalysis = await analyzeVisualFeatures(openai, imageData);

  // Stage 2: Face Shape and Harmony Analysis
  const faceAnalysis = await analyzeFaceFeatures(openai, imageData);

  // Stage 3: Style Transfer and Recommendations
  const styleRecommendations = await generateStyleRecommendations(
    openai,
    imageData,
    visualAnalysis,
    faceAnalysis
  );

  // Stage 4: Generate Multi-modal Embeddings
  const embeddings = await generateMultiModalEmbeddings(
    openai,
    visualAnalysis,
    faceAnalysis,
    additionalContext
  );

  // Combine all analysis results
  return {
    hairFeatures: visualAnalysis.hairFeatures,
    faceFeatures: faceAnalysis,
    styleRecommendations,
    colorHarmony: visualAnalysis.colorHarmony,
    metrics: visualAnalysis.metrics,
    embeddings
  };
}

/**
 * Stage 1: Analyze visual features with GPT-4 Vision
 */
async function analyzeVisualFeatures(openai: OpenAI, imageData: string): Promise<any> {
  const prompt = `You are an expert hair stylist and colorist analyzing this image with scientific precision.

Analyze the hair and provide a detailed JSON response with this EXACT structure:

{
  "hairFeatures": {
    "primaryColor": "specific color name (e.g., 'golden blonde', 'ash brown')",
    "secondaryColors": ["array of secondary colors visible"],
    "colorDistribution": [
      {"color": "color name", "percentage": 40},
      {"color": "another color", "percentage": 30}
    ],
    "texture": "straight/wavy/curly/kinky/coily",
    "textureConfidence": 0.95,
    "volume": "low/medium/high",
    "shine": "matte/natural/glossy",
    "density": "thin/medium/thick"
  },
  "colorHarmony": {
    "bestColors": [
      {"name": "platinum blonde", "score": 0.95},
      {"name": "ash blonde", "score": 0.90}
    ],
    "goodColors": [
      {"name": "honey blonde", "score": 0.75}
    ],
    "avoidColors": [
      {"name": "black", "score": 0.20}
    ],
    "seasonalPalette": "spring/summer/autumn/winter"
  },
  "metrics": {
    "imageQuality": 0.0-1.0,
    "lightingQuality": 0.0-1.0,
    "poseAlignment": 0.0-1.0,
    "confidence": 0.0-1.0
  }
}

Be extremely precise about:
1. For ROOTED/SHADOW ROOT styles: Classify by the MID-TO-END color, NOT roots
2. Color percentages must sum to 100
3. If hair is lighter at ends than roots, primaryColor should be the LIGHTER color
4. Examples:
   - Dark roots + blonde lengths = "golden blonde" or "blonde" PRIMARY
   - Shadow roots + light ends = "blonde" PRIMARY
   - Brown roots + blonde body = "blonde" PRIMARY
5. Consider wig naming conventions (rooted blonde is still blonde)`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o", // Use the most advanced model
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: imageData,
              detail: "high"
            }
          }
        ]
      }
    ],
    max_tokens: 2000,
    temperature: 0.1
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from visual analysis');

  return JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
}

/**
 * Stage 2: Analyze face features for better matching
 */
async function analyzeFaceFeatures(openai: OpenAI, imageData: string): Promise<any> {
  const prompt = `Analyze the face in this image to determine features that affect wig selection.

Return ONLY a JSON object with this structure:

{
  "shape": "oval/round/square/heart/oblong/diamond",
  "skinTone": {
    "category": "fair/light/medium/tan/deep/dark",
    "undertone": "warm/cool/neutral",
    "hexColor": "#hex_color"
  },
  "features": {
    "foreheadWidth": "narrow/medium/wide",
    "cheekbones": "low/medium/high",
    "jawline": "soft/defined/angular"
  }
}

Focus on:
1. Accurate face shape classification
2. Skin tone with undertone detection
3. Facial proportions that affect wig styling`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: imageData,
              detail: "high"
            }
          }
        ]
      }
    ],
    max_tokens: 1000,
    temperature: 0.1
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from face analysis');

  return JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
}

/**
 * Stage 3: Generate personalized style recommendations
 */
async function generateStyleRecommendations(
  openai: OpenAI,
  imageData: string,
  visualAnalysis: any,
  faceAnalysis: any
): Promise<any> {
  const prompt = `Based on the face shape "${faceAnalysis.shape}" and current hair analysis, generate wig style recommendations.

Current hair: ${JSON.stringify(visualAnalysis.hairFeatures, null, 2)}
Face features: ${JSON.stringify(faceAnalysis.features, null, 2)}

Return a JSON object with personalized recommendations:

{
  "idealLengths": ["recommended lengths that suit face shape"],
  "idealTextures": ["textures that complement features"],
  "avoidLengths": ["lengths to avoid"],
  "avoidTextures": ["textures to avoid"],
  "capConstructionPreference": ["lace_front", "monofilament", etc.],
  "partingPreference": "center/side/no-part"
}

Consider:
1. Face shape harmony rules
2. Feature balancing
3. Maintenance preferences based on current style
4. Natural movement and fall`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    max_tokens: 1000,
    temperature: 0.3
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from style recommendations');

  return JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
}

/**
 * Stage 4: Generate multi-modal embeddings for similarity search
 */
async function generateMultiModalEmbeddings(
  openai: OpenAI,
  visualAnalysis: any,
  faceAnalysis: any,
  additionalContext?: string
): Promise<any> {
  // Create a comprehensive text description for embedding
  const description = `
Hair: ${visualAnalysis.hairFeatures.primaryColor} ${visualAnalysis.hairFeatures.texture} hair with ${visualAnalysis.hairFeatures.volume} volume.
Secondary colors: ${visualAnalysis.hairFeatures.secondaryColors.join(', ')}.
Face shape: ${faceAnalysis.shape} with ${faceAnalysis.skinTone.undertone} undertones.
Skin tone: ${faceAnalysis.skinTone.category}.
${additionalContext || ''}
  `.trim();

  // Generate embeddings using OpenAI's embedding model
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: description,
    dimensions: 512 // Optimal dimension for our use case
  });

  const fullEmbedding = embeddingResponse.data[0].embedding;

  // Split into specialized embeddings (this is a simplified version)
  // In production, you'd generate these separately with specialized prompts
  return {
    styleVector: fullEmbedding.slice(0, 512),
    colorVector: fullEmbedding.slice(0, 256),
    textureVector: fullEmbedding.slice(0, 128)
  };
}

/**
 * Calculate similarity between user analysis and product
 */
export function calculateAdvancedSimilarity(
  userAnalysis: AdvancedHairAnalysis,
  productFeatures: any
): number {
  let score = 0;
  let weights = {
    color: 0.35,
    texture: 0.20,
    faceShape: 0.15,
    skinTone: 0.15,
    style: 0.15
  };

  // Color matching with undertone consideration
  const colorMatch = calculateColorSimilarity(
    userAnalysis.colorHarmony,
    productFeatures.color
  );
  score += colorMatch * weights.color;

  // Texture compatibility
  const textureMatch = userAnalysis.hairFeatures.texture === productFeatures.texture ? 1 : 0.5;
  score += textureMatch * weights.texture;

  // Face shape compatibility
  const faceShapeMatch = calculateFaceShapeCompatibility(
    userAnalysis.faceFeatures.shape,
    productFeatures.style,
    userAnalysis.styleRecommendations
  );
  score += faceShapeMatch * weights.faceShape;

  // Skin tone harmony
  const skinToneMatch = calculateSkinToneHarmony(
    userAnalysis.faceFeatures.skinTone,
    productFeatures.color
  );
  score += skinToneMatch * weights.skinTone;

  // Style preference matching
  const styleMatch = calculateStylePreference(
    userAnalysis.styleRecommendations,
    productFeatures
  );
  score += styleMatch * weights.style;

  return score;
}

/**
 * Calculate color similarity with advanced metrics
 */
function calculateColorSimilarity(colorHarmony: any, productColor: string): number {
  // Check if product color is in best colors
  const bestMatch = colorHarmony.bestColors.find(
    (c: any) => c.name.toLowerCase().includes(productColor.toLowerCase())
  );
  if (bestMatch) return bestMatch.score;

  // Check good colors
  const goodMatch = colorHarmony.goodColors.find(
    (c: any) => c.name.toLowerCase().includes(productColor.toLowerCase())
  );
  if (goodMatch) return goodMatch.score;

  // Check avoid colors (negative scoring)
  const avoidMatch = colorHarmony.avoidColors.find(
    (c: any) => c.name.toLowerCase().includes(productColor.toLowerCase())
  );
  if (avoidMatch) return 0.3; // Low score for colors to avoid

  return 0.5; // Neutral score for unknown colors
}

/**
 * Calculate face shape compatibility with style
 */
function calculateFaceShapeCompatibility(
  faceShape: string,
  productStyle: string,
  recommendations: any
): number {
  // Check if product style matches ideal recommendations
  const styleLength = extractLengthFromStyle(productStyle);

  if (recommendations.idealLengths.includes(styleLength)) {
    return 1.0;
  }
  if (recommendations.avoidLengths.includes(styleLength)) {
    return 0.3;
  }

  return 0.6; // Neutral compatibility
}

/**
 * Calculate skin tone harmony with hair color
 */
function calculateSkinToneHarmony(skinTone: any, productColor: string): number {
  // Color theory based matching
  const warmTones = ['golden', 'honey', 'caramel', 'auburn', 'copper'];
  const coolTones = ['ash', 'platinum', 'silver', 'violet', 'blue'];
  const neutralTones = ['natural', 'medium', 'chocolate'];

  const productColorLower = productColor.toLowerCase();

  if (skinTone.undertone === 'warm') {
    if (warmTones.some(tone => productColorLower.includes(tone))) return 1.0;
    if (coolTones.some(tone => productColorLower.includes(tone))) return 0.4;
  } else if (skinTone.undertone === 'cool') {
    if (coolTones.some(tone => productColorLower.includes(tone))) return 1.0;
    if (warmTones.some(tone => productColorLower.includes(tone))) return 0.4;
  }

  if (neutralTones.some(tone => productColorLower.includes(tone))) return 0.8;

  return 0.6;
}

/**
 * Calculate style preference matching
 */
function calculateStylePreference(recommendations: any, productFeatures: any): number {
  let score = 0;
  let factors = 0;

  // Check texture preference
  if (recommendations.idealTextures.includes(productFeatures.texture)) {
    score += 1.0;
    factors++;
  } else if (recommendations.avoidTextures.includes(productFeatures.texture)) {
    score += 0.3;
    factors++;
  } else {
    score += 0.6;
    factors++;
  }

  // Check cap construction preference
  if (productFeatures.capConstruction &&
      recommendations.capConstructionPreference.includes(productFeatures.capConstruction)) {
    score += 1.0;
    factors++;
  }

  // Check parting preference
  if (productFeatures.parting === recommendations.partingPreference) {
    score += 1.0;
    factors++;
  }

  return factors > 0 ? score / factors : 0.5;
}

/**
 * Helper: Extract length from style description
 */
function extractLengthFromStyle(style: string): string {
  const styleLower = style.toLowerCase();
  if (styleLower.includes('short')) return 'short';
  if (styleLower.includes('long')) return 'long';
  if (styleLower.includes('medium')) return 'medium';
  return 'medium'; // default
}

/**
 * Generate match explanation for user
 */
export function generateMatchExplanation(
  userAnalysis: AdvancedHairAnalysis,
  productFeatures: any,
  similarityScore: number
): string[] {
  const reasons: string[] = [];

  // Color match explanation
  const colorMatch = userAnalysis.colorHarmony.bestColors.find(
    c => c.name.toLowerCase().includes(productFeatures.color.toLowerCase())
  );
  if (colorMatch) {
    reasons.push(`Perfect color match for your skin tone (${Math.round(colorMatch.score * 100)}% compatibility)`);
  }

  // Face shape explanation
  if (userAnalysis.styleRecommendations.idealLengths.includes(productFeatures.length)) {
    reasons.push(`Ideal length for your ${userAnalysis.faceFeatures.shape} face shape`);
  }

  // Texture explanation
  if (userAnalysis.hairFeatures.texture === productFeatures.texture) {
    reasons.push(`Matches your natural ${productFeatures.texture} texture perfectly`);
  }

  // Skin tone harmony
  if (similarityScore > 0.8) {
    reasons.push(`Harmonizes beautifully with your ${userAnalysis.faceFeatures.skinTone.undertone} undertones`);
  }

  // Quality features
  if (productFeatures.capConstruction === 'lace_front') {
    reasons.push('Premium lace front for natural hairline');
  }

  return reasons;
}