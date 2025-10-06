import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  console.log('🤖 GPT-4 Vision Analysis API called...');

  try {
    const body = await req.json();
    const { imageData, productImages, userPrompt } = body;

    console.log('📊 Request received with:', {
      hasImageData: !!imageData,
      imageDataLength: imageData?.length || 0,
      productCount: productImages?.length || 0
    });

    if (!imageData) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      );
    }

    // Create the messages array with user image and product images
    const messages: any[] = [
      {
        role: "system",
        content: `You are an expert hair stylist and wig matching specialist. Analyze images carefully and provide detailed comparisons of hair length, style, texture, and color.`
      }
    ];

    // Build the user message with all images
    const userMessage: any = {
      role: "user",
      content: []
    };

    // Add the analysis prompt
    const prompt = userPrompt || `Please analyze these wig product images and compare them to the user's photo.

CRITICAL ANALYSIS POINTS:
1. LENGTH COMPARISON:
   - User's hair length vs. each product's length
   - Flag any significant mismatches (e.g., ponytails for medium hair, pixie cuts for long hair)

2. STYLE MATCHING:
   - Does the style match? (layered, bob, straight, etc.)
   - Are there bangs/fringe if the user has them?

3. COLOR ACCURACY:
   - How well does each product's color match the user's hair?

4. SCORING ISSUES:
   - Point out any products that seem to have incorrect high scores despite poor matches
   - Explain why the match percentage seems wrong

For each product shown, provide:
- Length match: GOOD/POOR/TERRIBLE
- Style match: GOOD/POOR/TERRIBLE
- Color match: GOOD/POOR/TERRIBLE
- Should this be a top match? YES/NO
- If NO, explain what's wrong

BE CRITICAL - point out obvious mismatches!`;

    userMessage.content.push({ type: "text", text: prompt });

    // Add user's photo
    userMessage.content.push({
      type: "image_url",
      image_url: {
        url: imageData,
        detail: "high"
      }
    });

    // Add product images if provided
    if (productImages && Array.isArray(productImages)) {
      productImages.forEach((product, index) => {
        userMessage.content.push({
          type: "text",
          text: `\n\nProduct ${index + 1}: ${product.title || 'Unknown'} (${product.score || 0}% match)`
        });

        if (product.imageUrl) {
          userMessage.content.push({
            type: "image_url",
            image_url: {
              url: product.imageUrl,
              detail: "high"
            }
          });
        }
      });
    }

    messages.push(userMessage);

    // Call GPT-4 Vision
    console.log('🔍 Sending to GPT-4 Vision for analysis...');
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      max_tokens: 2000,
      temperature: 0.1
    });

    const analysis = response.choices[0]?.message?.content;

    if (!analysis) {
      throw new Error('No analysis received from GPT-4 Vision');
    }

    console.log('✅ GPT-4 Vision analysis complete');

    return NextResponse.json({
      success: true,
      analysis: analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ GPT-4 Vision analysis error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze images',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}