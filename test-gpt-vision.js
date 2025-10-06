const fs = require('fs');
const path = require('path');

async function testGPTVision() {
  // Read the test image (you'll need to save your screenshot as test-image.jpg)
  const imagePath = path.join(__dirname, 'jacky_darkchocolaterooted_01_5d4e5945-1.jpg');

  if (!fs.existsSync(imagePath)) {
    console.error('Please save your test image as jacky_darkchocolaterooted_01_5d4e5945-1.jpg in the project root');
    return;
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

  console.log('🚀 Testing GPT-4 Vision analysis...');
  console.log('Image size:', (base64Image.length / 1024).toFixed(2), 'KB');

  try {
    const response = await fetch('http://localhost:3000/api/gpt-vision-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData: base64Image,
        productImages: [
          {
            title: "27 Straight Cinch Pony - R6 dark chocolate",
            score: 90,
            description: "A very long ponytail extension/hair piece"
          },
          {
            title: "Vale - r6/10 medium brown",
            score: 95,
            description: "A short pixie cut style wig"
          },
          {
            title: "Flirty Fringe Bob - r8/29s glazed hazelnut",
            score: 85,
            description: "A short bob with bangs"
          },
          {
            title: "Seriously Sleek Bob - r8/29s glazed hazelnut",
            score: 85,
            description: "A short sleek bob style"
          }
        ],
        userPrompt: `Analyze this user's photo and the product matches.

The user has medium-length (shoulder-length) layered hair with bangs, straight texture, and dark chocolate/brown color.

For each product listed:
1. Is the LENGTH appropriate? (User has MEDIUM length, not short, not extra long)
2. Is the STYLE appropriate? (User has layered hair with bangs)
3. Is the COLOR a good match?
4. What should the match percentage realistically be?

BE CRITICAL - these matches may be very wrong! Point out obvious mismatches.

The system is currently showing these as 85-95% matches - explain if that's accurate or not.`
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('\n✅ GPT-4 Vision Analysis:\n');
      console.log('=' .repeat(80));
      console.log(result.analysis);
      console.log('=' .repeat(80));
    } else {
      console.error('❌ Analysis failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testGPTVision();