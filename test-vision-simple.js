// Simple test for GPT-4 Vision analysis
async function testGPTVisionSimple() {
  console.log('🚀 Testing GPT-4 Vision analysis...');

  try {
    const response = await fetch('http://localhost:3000/api/gpt-vision-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData: "https://example.com/test.jpg", // This would be your base64 image
        productImages: [
          {
            title: "27 Straight Cinch Pony - R6 dark chocolate",
            score: 90,
            description: "A very long ponytail extension - THIS IS WRONG for medium hair!"
          },
          {
            title: "Vale - r6/10 medium brown",
            score: 95,
            description: "A short pixie cut - TOO SHORT for medium layered hair!"
          },
          {
            title: "Flirty Fringe Bob - r8/29s glazed hazelnut",
            score: 85,
            description: "A short bob - shorter than the user's medium length hair"
          }
        ],
        userPrompt: `CRITICAL ANALYSIS NEEDED:

User has: MEDIUM-LENGTH layered hair with bangs (shoulder length, not short, not long)

These products are showing as 85-95% matches but they seem WRONG:
1. Ponytail extension (for someone with medium hair??)
2. Pixie cut (way too short!)
3. Short bob (shorter than user's hair)

Please explain what's wrong with these matches and why the scoring is incorrect.`
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('\n✅ GPT-4 Vision Analysis:\n');
      console.log('=' .repeat(80));
      console.log(result.analysis);
      console.log('=' .repeat(80));

      // Save to file for review
      require('fs').writeFileSync('gpt-vision-analysis.txt', result.analysis);
      console.log('\n📄 Analysis saved to gpt-vision-analysis.txt');
    } else {
      console.error('❌ Analysis failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nMake sure the development server is running on http://localhost:3000');
  }
}

// Run the test
testGPTVisionSimple();