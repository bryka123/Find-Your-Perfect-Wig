# Find Your Perfect Wig

AI-powered wig matching application using GPT-4 Vision API to analyze user hair and recommend the best matching wigs from your catalog.

## Features

- **AI Hair Analysis**: Upload a photo and GPT-4 Vision detects hair color, length, texture, and style
- **Smart Color Matching**: Visual color similarity using Lab color space and color family expansion
- **Vision-Based Product Matching**: Pre-analyzed product attributes ensure accurate recommendations
- **Weighted Scoring System**: Prioritizes length (50%), coverage type (20%), texture (15%), and style (15%)
- **Color Chip Visualization**: Dynamically generated color previews for each wig variant

## Technology Stack

- **Next.js 15.5.3**: React framework with server-side rendering
- **TypeScript**: Type-safe development
- **OpenAI GPT-4o Vision**: Hair analysis and product attribute detection
- **Tailwind CSS**: Utility-first styling
- **React Dropzone**: File upload handling

## Prerequisites

- Node.js 20+
- npm or yarn
- OpenAI API key with GPT-4o Vision access
- Shopify store (for deployment)

## Environment Variables

Create a `.env.local` file in the root directory:

```env
OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_SHOPIFY_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=your_admin_access_token
```

## Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
src/
├── app/
│   ├── (storefront)/
│   │   └── components/
│   │       └── WigMatchBlock.tsx    # Main UI component
│   └── api/
│       ├── analyze-hair/            # Hair analysis endpoint
│       └── visual-color-match/      # Product matching endpoint
├── lib/
│   ├── visual-color-matching.ts     # Core matching logic
│   ├── vision-based-matching.ts     # Vision scoring algorithms
│   └── style-compatibility.ts       # Style profiling
└── data/
    ├── valid_image_catalog.json     # Product catalog
    ├── product-vision-analysis.json # Pre-analyzed products (basic)
    └── product-vision-enhanced.json # Pre-analyzed products (enhanced)
```

## Data Files

### Required Data Files

- `valid_image_catalog.json`: Complete product catalog with image URLs and metadata
- `product-vision-analysis.json`: Basic visual attributes for each product
- `product-vision-enhanced.json`: Enhanced attributes (silhouette, formality, maintenance)

### Generating Vision Analysis

To analyze new products:

```bash
npm run build-jsonl  # Generate training data
# Then run vision analysis scripts from .archive/scripts/
```

## API Endpoints

### POST /api/analyze-hair

Analyzes uploaded hair photo using GPT-4 Vision.

**Request:**
```json
{
  "imageData": "data:image/jpeg;base64,..."
}
```

**Response:**
```json
{
  "analysis": {
    "color": ["R6/10", "R8/29S"],
    "colorFamily": "brunette",
    "length": "shoulder",
    "texture": "wavy",
    "style": "layered with side part",
    "hasBangs": false,
    "isLayered": true
  }
}
```

### POST /api/visual-color-match

Finds matching products based on hair profile.

**Request:**
```json
{
  "hairProfile": {
    "length": "shoulder",
    "texture": "wavy",
    "style": "layered",
    "colors": ["R6/10"],
    "colorFamily": "brunette"
  }
}
```

**Response:**
```json
{
  "matches": [
    {
      "id": "123",
      "title": "Product Name",
      "imageUrl": "https://...",
      "colorCode": "R6/10",
      "colorName": "Chestnut",
      "visionScore": 0.85,
      "visualAttributes": {...}
    }
  ]
}
```

## Matching Algorithm

### Scoring Weights
- **Length**: 50% (strict penalties for mismatches)
- **Coverage Type**: 20% (full-wig vs topper vs extension)
- **Texture**: 15% (straight, wavy, curly, kinky)
- **Style Compatibility**: 15% (silhouette, formality, maintenance)

### Length Categories
- `short`: Above chin (pixie, crop)
- `bob`: At chin/jaw, above shoulders
- `shoulder`: At or just below shoulders
- `medium`: Below shoulders, above mid-back
- `long`: Mid-back or longer
- `extra-long`: Beyond long

### Color Matching
1. **Exact Match**: Product available in detected color code
2. **Color Family**: If <50 exact matches, expand to entire color family
3. **Visual Similarity**: Lab color space distance calculation

## Deployment to Shopify

### Option 1: Shopify App (Recommended)

1. Install Shopify CLI:
```bash
npm install -g @shopify/cli
```

2. Create Shopify app:
```bash
shopify app create
```

3. Configure app settings in Shopify Partners dashboard

4. Deploy:
```bash
npm run deploy
```

### Option 2: Custom Storefront Integration

1. Build the application:
```bash
npm run build
```

2. Deploy to Vercel, Netlify, or your hosting provider

3. Embed in Shopify theme using iframe or custom liquid sections

## Environment-Specific Configuration

### Development
- Hot reload enabled
- Detailed console logging
- Development server on port 3000

### Production
- Optimized build
- Reduced logging
- Environment variables from hosting platform

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Troubleshooting

### Cache Issues
If changes aren't reflected:
```bash
rm -rf .next
npm run dev
```

### OpenAI API Errors
- Verify API key has GPT-4o Vision access
- Check rate limits and quota
- Ensure proper error handling for fallback models

### Color Matching Issues
- Regenerate vision analysis if product catalog changes
- Verify color codes match between catalog and analysis files
- Check color family mappings in visual-color-matching.ts

## Contributing

This is a production application. For changes:

1. Create feature branch
2. Test thoroughly in development
3. Update documentation
4. Submit pull request

## License

Proprietary - All rights reserved

## Support

For issues or questions, contact the development team.
