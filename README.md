# Chiquel Wig Matcher

An AI-powered Shopify embedded app that helps customers find the perfect wig based on their preferences, style, or selfie analysis.

## Features

- **Text-based Search**: Natural language queries for wig recommendations
- **Selfie Analysis**: Upload selfies for personalized color and style matching  
- **AI-Powered Matching**: Vector-based similarity search with intelligent scoring
- **OpenAI Vector Store**: Advanced semantic search using OpenAI's hosted vector database
- **Color Analysis**: Seasonal color palette matching based on skin tone
- **Admin Dashboard**: Manage catalog sync and view analytics
- **Storefront Integration**: Theme App Block for seamless customer experience
- **Real-time Sync**: Webhook integration for product updates
- **CSV Import**: Bulk import wig data with normalized attributes
- **Smart Descriptors**: AI-generated product descriptions optimized for search

## Tech Stack

- **Framework**: Next.js 14 with TypeScript
- **Shopify Integration**: Admin API, Storefront API, App Bridge
- **UI Components**: Shopify Polaris (admin), Custom React (storefront)
- **Authentication**: OAuth 2.0 with Shopify
- **Database**: Prisma ORM (SQLite for development)
- **AI/ML**: Custom vector search and color analysis
- **Deployment**: Vercel/Railway/Heroku compatible

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Shopify CLI
- ngrok (for local development)
- A Shopify development store

### Installation

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. **Create Shopify app**
   ```bash
   npm run shopify app create
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Set up tunnel (in another terminal)**
   ```bash
   npm run dev:tunnel
   ```

### Configuration

Update your `.env.local` with the following:

```env
SHOPIFY_API_KEY=your_api_key_from_partner_dashboard
SHOPIFY_API_SECRET=your_api_secret_from_partner_dashboard
SHOPIFY_SCOPES=read_products,write_products,read_product_listings,read_files,read_metaobjects,read_metafields
HOST=https://your-ngrok-url.ngrok.io
OPENAI_API_KEY=your_openai_key_for_future_ai_features
DATABASE_URL="file:./dev.db"
```

## API Endpoints

### Catalog Management

- `POST /api/catalog/sync` - Sync products from Shopify
- `PUT /api/catalog/sync` - Webhook handler for product updates  
- `GET /api/catalog/sync` - Get sync status

### Matching Engine

- `POST /api/match` - Find wig matches
  ```json
  {
    "type": "query|selfie",
    "query": "long blonde curly wig",
    "selfieAttrs": { "skinTone": "fair", "eyeColor": "blue" },
    "filters": { "priceRange": { "min": 50, "max": 300 } },
    "limit": 6
  }
  ```

### Data Import

- `POST /api/ingest` - Upload CSV/JSONL data
- `GET /api/ingest` - Get import status

### Authentication

- `GET /api/auth?shop=store.myshopify.com` - Start OAuth
- `GET /api/auth/callback` - OAuth callback
- `POST /api/webhooks` - Webhook handler
- `POST /api/search` - OpenAI Vector Store semantic search (NEW!)

## Project Structure

```
src/
├── app/
│   ├── (admin)/
│   │   └── dashboard/          # Admin dashboard
│   ├── (storefront)/
│   │   └── components/         # Storefront components
│   ├── api/                    # API routes
│   │   ├── auth/              # OAuth handlers
│   │   ├── catalog/sync/      # Product sync
│   │   ├── match/             # AI matching
│   │   ├── ingest/            # Data import
│   │   └── webhooks/          # Webhook handlers
│   └── storefront/            # Embedded storefront pages
├── lib/
│   ├── shopify.ts             # Shopify API client
│   ├── vectors.ts             # Vector matching engine
│   ├── color.ts               # Color analysis
│   └── types.ts               # TypeScript definitions
blocks/
├── wig-matcher.liquid         # Theme App Block
assets/
├── wig-matcher-block.css      # Block styles
```

## Development Workflow

### 1. Product Catalog Setup

First, sync your wig products from Shopify:

```bash
# Through admin dashboard or API
curl -X POST http://localhost:3000/api/catalog/sync \
  -H "Content-Type: application/json" \
  -d '{"shop": "your-store.myshopify.com", "accessToken": "token"}'
```

### 2. Test Matching

Test the AI matching system:

```bash
curl -X POST http://localhost:3000/api/match \
  -H "Content-Type: application/json" \
  -d '{"type": "query", "query": "blonde wavy wig for round face"}'
```

### 3. Import Custom Data

Upload a CSV with wig attributes:

```csv
id,title,price,length,texture,color,cap_size,cap_construction,density,hair_type,style
1,"Blonde Wavy Wig",129.99,medium,wavy,blonde,average,lace_front,medium,human_hair,casual
```

## Wig Attribute Schema

The app recognizes these wig attributes:

- **Length**: short, medium, long, extra_long
- **Texture**: straight, wavy, curly, kinky, coily  
- **Color**: blonde, brunette, black, red, gray, white, fantasy
- **Cap Size**: petite, average, large
- **Construction**: basic, monofilament, lace_front, full_lace, hand_tied
- **Density**: light, medium, heavy
- **Hair Type**: synthetic, human_hair, blend
- **Style**: classic, modern, trendy, professional, casual, formal

## Theme App Block Integration

1. **Install the app** on a development store
2. **Add the block** to your theme:
   - Go to Online Store → Themes → Customize
   - Add App Block → Wig Matcher
   - Configure settings (title, colors, max results)

3. **Customize appearance** via block settings:
   - Theme (light/dark)
   - Colors and styling
   - Maximum results to show
   - Filter options

## Color Analysis System

The app includes a seasonal color analysis system:

- **Spring**: Warm, light, clear colors
- **Summer**: Cool, soft, muted colors  
- **Autumn**: Warm, deep, rich colors
- **Winter**: Cool, clear, intense colors

Based on selfie analysis (skin tone, eye color, hair color), users get personalized color recommendations.

## Deployment

### Environment Setup

For production, set these additional environment variables:

```env
NODE_ENV=production
NEXTAUTH_URL=https://your-production-domain.com
DATABASE_URL=postgresql://user:password@host:port/database
```

### Deploy to Vercel

```bash
npm run build
vercel deploy --prod
```

### Deploy to Railway

```bash
railway login
railway init
railway up
```

## OpenAI Vector Store Setup

The app includes advanced OpenAI Vector Store integration for superior semantic search capabilities.

### 1. Setup OpenAI API Key

```bash
# Add to your .env.local file
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 2. Create and Configure Vector Store

#### Option A: Using the API
```bash
# Create a new vector store
curl -X PATCH http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"action": "create", "name": "Chiquel Wig Catalog"}'

# Response will include vectorStoreId: vs_abc123...
# Add this to your .env.local:
OPENAI_VECTOR_STORE_ID=vs_abc123...
```

#### Option B: Using OpenAI Dashboard
1. Go to [OpenAI Platform](https://platform.openai.com/vector-stores)
2. Create a new Vector Store named "Chiquel Wig Catalog"
3. Copy the Vector Store ID to your `.env.local`

### 3. Prepare Your Data

Convert your wig catalog CSV to JSONL format:

```bash
# Convert CSV to JSONL with smart descriptors
npm run build-jsonl wigs.csv

# Example CSV format:
id,title,price,length,texture,color,cap_size,cap_construction,density,hair_type,style
wig001,"Elegant Bob RL6/30 Chocolate Copper",189.99,short,straight,brunette,average,monofilament,medium,human_hair,professional
wig002,"Beachy Waves Blonde Lace Front",249.99,long,wavy,blonde,average,lace_front,medium,human_hair,casual
```

The script will generate descriptors like:
- `"short professional, brunette, monofilament, human hair, RL6/30"`  
- `"long casual, wavy, blonde, lace front, human hair"`

### 4. Upload Data to Vector Store

#### Option A: Via API
```bash
# Upload JSONL file (requires file system access)
curl -X PATCH http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"action": "upload", "vectorStoreId": "vs_abc123", "filePath": "./wigs.jsonl"}'
```

#### Option B: Via OpenAI Dashboard (Recommended)
1. Go to your Vector Store in the OpenAI dashboard
2. Click "Add Files"
3. Upload your generated `wigs.jsonl` file
4. Wait for processing to complete

### 5. Test Vector Search

```bash
# Test semantic search
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"q": "short blonde professional wig for work"}'

# With custom parameters
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"q": "long curly red hair", "k": 12, "vectorStoreId": "vs_custom123"}'
```

### 6. Manage Vector Stores

```bash
# List all vector stores
curl -X PATCH http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"action": "list"}'

# Delete a vector store
curl -X PATCH http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"action": "delete", "vectorStoreId": "vs_old123"}'
```

## API Endpoints

### Vector Search (NEW!)
- **`POST /api/search`** - Semantic search using OpenAI Vector Store
  ```json
  {
    "q": "blonde wavy wig for round face",
    "k": 24,
    "vectorStoreId": "vs_optional"
  }
  ```

### Legacy Endpoints
- `POST /api/catalog/sync` - Sync products from Shopify
- `POST /api/match` - Find wig matches
- `POST /api/ingest` - Upload CSV/JSONL data
- `POST /api/webhooks` - Webhook handler

## Webhook Configuration

The app automatically handles these webhooks:

- `products/create` - Index new products
- `products/update` - Update existing products  
- `products/delete` - Remove from index
- `app/uninstalled` - Cleanup app data

## Development Workflow

### 1. Data Preparation & Testing

Create a sample CSV file for testing:

```csv
id,title,price,length,texture,color,cap_size,cap_construction,density,hair_type,style
wig001,"Raquel Welch Short Bob RL6/8 Dark Chocolate",179.99,short,straight,brunette,average,monofilament,medium,human_hair,professional
wig002,"Long Beach Waves Blonde Lace Front Wig",249.99,long,wavy,blonde,average,lace_front,medium,human_hair,casual
wig003,"Curly Red Fantasy Wig Rainbow Highlights",89.99,medium,curly,fantasy,large,basic,heavy,synthetic,trendy
wig004,"Elegant Silver Bob for Mature Women",159.99,short,straight,gray,average,hand_tied,light,human_hair,classic
wig005,"Professional Brunette Straight Long Hair",199.99,long,straight,brunette,average,full_lace,medium,human_hair,professional
```

Convert to JSONL and test:

```bash
# Generate JSONL with smart descriptors
npm run build-jsonl test-wigs.csv

# Run unit tests  
npm test

# Test descriptor generation
npm run test:coverage
```

### 2. Vector Store Workflow

```bash
# 1. Convert CSV to JSONL
npm run build-jsonl your-catalog.csv

# 2. Create vector store
curl -X PATCH http://localhost:3000/api/search -H "Content-Type: application/json" \
  -d '{"action": "create", "name": "My Wig Store Catalog"}'

# 3. Upload via OpenAI dashboard (recommended) or API

# 4. Test searches
curl -X POST http://localhost:3000/api/search -H "Content-Type: application/json" \
  -d '{"q": "professional short blonde wig for work"}'
```

### 3. Manual Testing

1. **Admin Dashboard**: Navigate to `/dashboard`
2. **Storefront Component**: Navigate to `/storefront/wig-matcher`  
3. **Vector Search API**: Use `/api/search` endpoint
4. **Original Matching**: Use `/api/match` endpoint

## Unit Tests

Run comprehensive tests for descriptor generation:

```bash
# Run all tests
npm test

# Watch mode during development
npm run test:watch  

# Coverage report
npm run test:coverage
```

### Test Coverage

The test suite covers:
- ✅ Basic descriptor generation (length, texture, color)
- ✅ Premium wig features (lace front, human hair, etc.)
- ✅ Color code extraction (RL6/30, etc.)
- ✅ Special keywords (rooted, highlighted)
- ✅ Selected options integration
- ✅ Edge cases and fallbacks
- ✅ JSON validity and structure
- ✅ Unique descriptors for different products

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For questions or issues:

- Check the [Shopify App Development docs](https://shopify.dev/docs/apps)
- Review the [API documentation](#api-endpoints)
- Create an issue in this repository

## License

MIT License - see LICENSE file for details.