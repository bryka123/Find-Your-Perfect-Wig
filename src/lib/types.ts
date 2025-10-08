// Core types for the Chiquel Wig Matcher app

export interface Variant {
  id: string;
  productId: string;
  title: string;
  price: string;
  compareAtPrice?: string;
  availableForSale: boolean;
  productUrl?: string;
  vendor?: string;
  image?: {
    url: string;
    altText?: string;
  };
  selectedOptions: Array<{
    name: string;
    value: string;
  }>;
  // Wig-specific attributes
  wigAttributes: WigAttributes;
  // Vector embedding for similarity matching
  embedding?: number[];
}

export interface WigAttributes {
  length: WigLength;
  texture: WigTexture;
  color: WigColor;
  capSize: CapSize;
  capConstruction: CapConstruction;
  density: WigDensity;
  hairType: HairType;
  style: WigStyle;
}

export interface Palette {
  id: string;
  name: string;
  season: Season;
  colors: ColorGroup[];
  description?: string;
}

export interface ColorGroup {
  category: ColorCategory;
  colors: Color[];
}

export interface Color {
  name: string;
  hexCode: string;
  rgb: [number, number, number];
  hsl: [number, number, number];
  // For matching with wig colors
  wigColorMatches?: string[];
}

export interface StyleTaxonomy {
  categories: StyleCategory[];
}

export interface StyleCategory {
  id: string;
  name: string;
  description?: string;
  subcategories: StyleSubcategory[];
  // Associated attributes that influence this style
  influences: StyleInfluence[];
}

export interface StyleSubcategory {
  id: string;
  name: string;
  description?: string;
  // Keywords that might appear in user queries
  keywords: string[];
  // Recommended wig attributes for this style
  recommendations: WigAttributes;
}

export interface StyleInfluence {
  attribute: keyof WigAttributes;
  weight: number; // 0-1, how much this attribute influences the style
  preferredValues: string[];
}

// Enums for wig attributes
export enum WigLength {
  SHORT = 'short',
  MEDIUM = 'medium', 
  LONG = 'long',
  EXTRA_LONG = 'extra_long'
}

export enum WigTexture {
  STRAIGHT = 'straight',
  WAVY = 'wavy',
  CURLY = 'curly',
  KINKY = 'kinky',
  COILY = 'coily'
}

export enum WigColor {
  BLONDE = 'blonde',
  BRUNETTE = 'brunette',
  BLACK = 'black',
  RED = 'red',
  GRAY = 'gray',
  WHITE = 'white',
  FANTASY = 'fantasy'
}

export enum CapSize {
  PETITE = 'petite',
  AVERAGE = 'average', 
  LARGE = 'large'
}

export enum CapConstruction {
  BASIC = 'basic',
  MONOFILAMENT = 'monofilament',
  LACE_FRONT = 'lace_front',
  FULL_LACE = 'full_lace',
  HAND_TIED = 'hand_tied'
}

export enum WigDensity {
  LIGHT = 'light',
  MEDIUM = 'medium',
  HEAVY = 'heavy'
}

export enum HairType {
  SYNTHETIC = 'synthetic',
  HUMAN_HAIR = 'human_hair',
  BLEND = 'blend'
}

export enum WigStyle {
  CLASSIC = 'classic',
  MODERN = 'modern',
  TRENDY = 'trendy',
  PROFESSIONAL = 'professional',
  CASUAL = 'casual',
  FORMAL = 'formal'
}

export enum Season {
  SPRING = 'spring',
  SUMMER = 'summer', 
  AUTUMN = 'autumn',
  WINTER = 'winter'
}

export enum ColorCategory {
  NEUTRALS = 'neutrals',
  WARM = 'warm',
  COOL = 'cool',
  BRIGHT = 'bright',
  SOFT = 'soft'
}

// API request/response types
export interface MatchRequest {
  type: 'query' | 'selfie';
  query?: string;
  selfieAttrs?: SelfieAttributes;
  aiAnalysis?: any; // AI analysis results from frontend
  filters?: MatchFilters;
  limit?: number;
}

export interface SelfieAttributes {
  skinTone: string;
  eyeColor: string;
  hairColor: string;
  faceShape: FaceShape;
  style?: string;
}

export interface MatchFilters {
  priceRange?: {
    min: number;
    max: number;
  };
  colors?: WigColor[];
  lengths?: WigLength[];
  textures?: WigTexture[];
  capSizes?: CapSize[];
  hairTypes?: HairType[];
  availableOnly?: boolean;
}

export interface MatchResponse {
  matches: VariantMatch[];
  query: string;
  filters?: MatchFilters;
  total: number;
}

export interface VariantMatch {
  variant: Variant;
  score: number;
  reasons: string[];
}

export enum FaceShape {
  OVAL = 'oval',
  ROUND = 'round',
  SQUARE = 'square',
  HEART = 'heart',
  DIAMOND = 'diamond',
  OBLONG = 'oblong'
}

// Webhook types
export interface WebhookPayload {
  id: string;
  topic: string;
  shop_domain: string;
  data: any;
  created_at: string;
}

// Database/Storage types
export interface CatalogImport {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filename?: string;
  totalRows?: number;
  processedRows?: number;
  errors?: string[];
  createdAt: Date;
  completedAt?: Date;
}

