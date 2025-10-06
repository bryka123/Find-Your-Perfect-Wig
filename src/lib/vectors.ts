import { Variant, WigAttributes, MatchRequest, VariantMatch } from './types';
import OpenAI from 'openai';
import { promises as fs } from 'fs';

// Vector operations for wig matching
export class VectorMatcher {
  private static instance: VectorMatcher;
  private variants: Map<string, Variant> = new Map();
  private embeddings: Map<string, number[]> = new Map();
  private dataLoaded: boolean = false;

  private constructor() {}

  static getInstance(): VectorMatcher {
    if (!VectorMatcher.instance) {
      VectorMatcher.instance = new VectorMatcher();
    }
    
    // Auto-load data if not already loaded and JSONL file exists
    if (!VectorMatcher.instance.dataLoaded) {
      VectorMatcher.instance.tryLoadPersistedData();
    }
    
    return VectorMatcher.instance;
  }

  // Try to load data from the processed JSONL file
  private async tryLoadPersistedData() {
    try {
      const fs = require('fs');
      const path = './chiquel_with_real_images.jsonl';
      
      if (fs.existsSync(path)) {
        console.log('📂 Loading persisted wig data from JSONL...');
        const content = fs.readFileSync(path, 'utf-8');
        const lines = content.trim().split('\n');
        
        let loaded = 0;
        for (const line of lines) {
          try {
            const record = JSON.parse(line);
            const variant: Variant = {
              id: record.id,
              productId: record.attrs?.productId || record.id,
              title: record.title,
              price: record.attrs?.price || record.price || '0.00',
              compareAtPrice: record.attrs?.compareAtPrice,
              availableForSale: record.attrs?.availableForSale !== false,
              image: record.image || record.attrs?.image || undefined,
              selectedOptions: record.attrs?.selectedOptions || [],
              wigAttributes: {
                length: record.attrs?.length || 'medium',
                texture: record.attrs?.texture || 'straight',
                color: record.attrs?.color || 'brunette',
                capSize: record.attrs?.capSize || 'average',
                capConstruction: record.attrs?.capConstruction || 'basic',
                density: record.attrs?.density || 'medium',
                hairType: record.attrs?.hairType || 'synthetic',
                style: record.attrs?.style || 'classic'
              }
            };
            
            this.addVariant(variant);
            loaded++;
          } catch (parseError) {
            // Skip invalid lines
          }
        }
        
        this.dataLoaded = true;
        console.log(`✅ Loaded ${loaded} variants from persisted data`);
      }
    } catch (error) {
      console.warn('Could not load persisted data:', error);
    }
  }

  // Add variant to the vector index
  addVariant(variant: Variant) {
    this.variants.set(variant.id, variant);
    
    // Generate embedding from wig attributes
    const embedding = this.generateEmbedding(variant.wigAttributes, variant.title, variant.selectedOptions);
    this.embeddings.set(variant.id, embedding);
  }

  // Remove variant from index
  removeVariant(variantId: string) {
    this.variants.delete(variantId);
    this.embeddings.delete(variantId);
  }

  // Generate vector embedding from wig attributes
  private generateEmbedding(attributes: WigAttributes, title: string, options: Array<{name: string, value: string}>): number[] {
    // This is a simplified embedding - in production you might use:
    // 1. Pre-trained embeddings from OpenAI
    // 2. Custom trained model
    // 3. More sophisticated feature engineering
    
    const features: number[] = [];
    
    // Categorical features encoded as one-hot or ordinal
    // Length (0-3)
    const lengthMap = { 'short': 0, 'medium': 1, 'long': 2, 'extra_long': 3 };
    features.push((lengthMap as any)[attributes.length] || 1);
    
    // Texture (0-4)
    const textureMap = { 'straight': 0, 'wavy': 1, 'curly': 2, 'kinky': 3, 'coily': 4 };
    features.push((textureMap as any)[attributes.texture] || 0);
    
    // Color (0-6)
    const colorMap = { 'black': 0, 'brunette': 1, 'blonde': 2, 'red': 3, 'gray': 4, 'white': 5, 'fantasy': 6 };
    features.push((colorMap as any)[attributes.color] || 1);
    
    // Cap size (0-2)
    const capSizeMap = { 'petite': 0, 'average': 1, 'large': 2 };
    features.push((capSizeMap as any)[attributes.capSize] || 1);
    
    // Cap construction (0-4)
    const capConstructionMap = { 'basic': 0, 'monofilament': 1, 'lace_front': 2, 'full_lace': 3, 'hand_tied': 4 };
    features.push((capConstructionMap as any)[attributes.capConstruction] || 0);
    
    // Density (0-2)
    const densityMap = { 'light': 0, 'medium': 1, 'heavy': 2 };
    features.push((densityMap as any)[attributes.density] || 1);
    
    // Hair type (0-2)
    const hairTypeMap = { 'synthetic': 0, 'human_hair': 1, 'blend': 2 };
    features.push((hairTypeMap as any)[attributes.hairType] || 0);
    
    // Style (0-5)
    const styleMap = { 'classic': 0, 'modern': 1, 'trendy': 2, 'professional': 3, 'casual': 4, 'formal': 5 };
    features.push((styleMap as any)[attributes.style] || 0);
    
    // Text features from title and options (simplified TF-IDF style)
    const text = `${title} ${options.map(o => `${o.name}:${o.value}`).join(' ')}`.toLowerCase();
    const keywords = ['long', 'short', 'curly', 'straight', 'blonde', 'brunette', 'lace', 'synthetic', 'human'];
    
    keywords.forEach(keyword => {
      features.push(text.includes(keyword) ? 1 : 0);
    });
    
    // Normalize the vector
    const magnitude = Math.sqrt(features.reduce((sum, val) => sum + val * val, 0));
    return features.map(val => magnitude > 0 ? val / magnitude : 0);
  }

  // Find similar variants using cosine similarity
  async findSimilar(query: MatchRequest): Promise<VariantMatch[]> {
    if (query.type === 'query' && query.query) {
      return this.searchByQuery(query.query, query.filters, query.limit);
    } else if (query.type === 'selfie' && query.selfieAttrs) {
      return this.searchBySelfieAttributes(query.selfieAttrs, query.filters, query.limit);
    }
    return [];
  }

  private async searchByQuery(queryText: string, filters?: any, limit: number = 6): Promise<VariantMatch[]> {
    // Generate query embedding
    const queryEmbedding = this.generateQueryEmbedding(queryText);
    
    // Calculate similarities
    const scores: Array<{ variantId: string, score: number, reasons: string[] }> = [];
    
    for (const [variantId, embedding] of this.embeddings.entries()) {
      const variant = this.variants.get(variantId)!;
      
      // Apply filters
      if (filters && !this.passesFilters(variant, filters)) {
        continue;
      }
      
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);
      const reasons = this.generateReasons(queryText, variant);
      
      scores.push({ variantId, score: similarity, reasons });
    }
    
    // Sort by score and return top results
    scores.sort((a, b) => b.score - a.score);
    
    return scores.slice(0, limit).map(({ variantId, score, reasons }) => ({
      variant: this.variants.get(variantId)!,
      score,
      reasons
    }));
  }

  private async searchBySelfieAttributes(selfieAttrs: any, filters?: any, limit: number = 6): Promise<VariantMatch[]> {
    // Convert selfie attributes to preferences
    const preferences = this.selfieToPreferences(selfieAttrs);
    
    // Score variants based on how well they match the preferences
    const scores: Array<{ variantId: string, score: number, reasons: string[] }> = [];
    
    for (const [variantId, variant] of this.variants.entries()) {
      // Apply filters
      if (filters && !this.passesFilters(variant, filters)) {
        continue;
      }
      
      const { score, reasons } = this.scoreVariantForSelfie(variant, preferences);
      scores.push({ variantId, score, reasons });
    }
    
    // Sort by score and return top results
    scores.sort((a, b) => b.score - a.score);
    
    return scores.slice(0, limit).map(({ variantId, score, reasons }) => ({
      variant: this.variants.get(variantId)!,
      score,
      reasons
    }));
  }

  private generateQueryEmbedding(query: string): number[] {
    // Simplified query embedding - extract wig-related terms
    const keywords = {
      // Length terms
      'short': [3, 0, 0, 0, 0, 0, 0, 0],
      'medium': [0, 3, 0, 0, 0, 0, 0, 0],
      'long': [0, 0, 3, 0, 0, 0, 0, 0],
      // Texture terms
      'straight': [0, 0, 0, 3, 0, 0, 0, 0],
      'wavy': [0, 0, 0, 0, 3, 0, 0, 0],
      'curly': [0, 0, 0, 0, 0, 3, 0, 0],
      // Color terms
      'blonde': [0, 0, 0, 0, 0, 0, 3, 0],
      'brunette': [0, 0, 0, 0, 0, 0, 0, 3],
    };
    
    const queryLower = query.toLowerCase();
    const embedding = new Array(17).fill(0); // Match the feature dimension
    
    // Add keyword weights
    for (const [keyword, weights] of Object.entries(keywords)) {
      if (queryLower.includes(keyword)) {
        weights.forEach((weight, index) => {
          if (index < embedding.length) {
            embedding[index] += weight;
          }
        });
      }
    }
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
  }

  private selfieToPreferences(selfieAttrs: any): any {
    // Convert selfie analysis to wig preferences
    const preferences: any = {};
    
    // Color matching based on skin tone and eye color
    if (selfieAttrs.skinTone) {
      preferences.colors = this.recommendColorsForSkinTone(selfieAttrs.skinTone);
    }
    
    // Style based on face shape
    if (selfieAttrs.faceShape) {
      preferences.styles = this.recommendStylesForFaceShape(selfieAttrs.faceShape);
      preferences.lengths = this.recommendLengthsForFaceShape(selfieAttrs.faceShape);
    }
    
    return preferences;
  }

  private recommendColorsForSkinTone(skinTone: string): string[] {
    // Simplified color recommendations
    const recommendations: {[key: string]: string[]} = {
      'fair': ['blonde', 'red', 'brunette'],
      'medium': ['brunette', 'blonde', 'red'],
      'dark': ['black', 'brunette', 'fantasy'],
      'olive': ['brunette', 'black', 'fantasy']
    };
    
    return recommendations[skinTone] || ['brunette', 'blonde', 'black'];
  }

  private recommendStylesForFaceShape(faceShape: string): string[] {
    const recommendations: {[key: string]: string[]} = {
      'oval': ['classic', 'modern', 'trendy'],
      'round': ['professional', 'formal', 'classic'],
      'square': ['casual', 'trendy', 'modern'],
      'heart': ['classic', 'professional', 'formal']
    };
    
    return recommendations[faceShape] || ['classic', 'modern'];
  }

  private recommendLengthsForFaceShape(faceShape: string): string[] {
    const recommendations: {[key: string]: string[]} = {
      'oval': ['short', 'medium', 'long'],
      'round': ['medium', 'long'],
      'square': ['short', 'medium'],
      'heart': ['medium', 'long']
    };
    
    return recommendations[faceShape] || ['medium'];
  }

  private scoreVariantForSelfie(variant: Variant, preferences: any): { score: number, reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    
    // Color matching
    if (preferences.colors && preferences.colors.includes(variant.wigAttributes.color)) {
      score += 0.3;
      reasons.push(`Great color match for your skin tone`);
    }
    
    // Style matching
    if (preferences.styles && preferences.styles.includes(variant.wigAttributes.style)) {
      score += 0.25;
      reasons.push(`Perfect style for your face shape`);
    }
    
    // Length matching
    if (preferences.lengths && preferences.lengths.includes(variant.wigAttributes.length)) {
      score += 0.2;
      reasons.push(`Ideal length for your features`);
    }
    
    // Base score for quality attributes
    if (variant.wigAttributes.capConstruction === 'lace_front' || variant.wigAttributes.capConstruction === 'full_lace') {
      score += 0.15;
      reasons.push(`Natural-looking lace construction`);
    }
    
    if (variant.wigAttributes.hairType === 'human_hair') {
      score += 0.1;
      reasons.push(`High-quality human hair`);
    }
    
    return { score, reasons };
  }

  private passesFilters(variant: Variant, filters: any): boolean {
    if (filters.priceRange) {
      const price = parseFloat(variant.price);
      if (price < filters.priceRange.min || price > filters.priceRange.max) {
        return false;
      }
    }
    
    if (filters.colors && !filters.colors.includes(variant.wigAttributes.color)) {
      return false;
    }
    
    if (filters.lengths && !filters.lengths.includes(variant.wigAttributes.length)) {
      return false;
    }
    
    if (filters.textures && !filters.textures.includes(variant.wigAttributes.texture)) {
      return false;
    }
    
    if (filters.availableOnly && !variant.availableForSale) {
      return false;
    }
    
    return true;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private generateReasons(query: string, variant: Variant): string[] {
    const reasons: string[] = [];
    const queryLower = query.toLowerCase();
    
    // Check for direct attribute matches
    if (queryLower.includes(variant.wigAttributes.length)) {
      reasons.push(`Matches your requested ${variant.wigAttributes.length} length`);
    }
    
    if (queryLower.includes(variant.wigAttributes.texture)) {
      reasons.push(`Perfect ${variant.wigAttributes.texture} texture as requested`);
    }
    
    if (queryLower.includes(variant.wigAttributes.color)) {
      reasons.push(`Beautiful ${variant.wigAttributes.color} color match`);
    }
    
    // Add quality indicators
    if (variant.wigAttributes.capConstruction === 'lace_front') {
      reasons.push(`Features natural-looking lace front construction`);
    }
    
    if (variant.wigAttributes.hairType === 'human_hair') {
      reasons.push(`Made with premium human hair`);
    }
    
    if (reasons.length === 0) {
      reasons.push(`Great overall match for your preferences`);
    }
    
    return reasons;
  }

  // Bulk operations
  async indexAllVariants(variants: Variant[]) {
    for (const variant of variants) {
      this.addVariant(variant);
    }
  }

  clearIndex() {
    this.variants.clear();
    this.embeddings.clear();
  }

  getStats() {
    return {
      totalVariants: this.variants.size,
      indexedVariants: this.embeddings.size
    };
  }
}

// Initialize OpenAI client (conditional for testing and scripts)
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'script') {
    return null;
  }
  
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OpenAI API key not configured');
    return null;
  }

  if (!openaiClient) {
    try {
      openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      console.log('✅ OpenAI client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize OpenAI client:', error);
      return null;
    }
  }
  
  return openaiClient;
}

// OpenAI Vector Store Helper Functions
export class OpenAIVectorStore {
  private static instance: OpenAIVectorStore;
  private client: OpenAI;

  private constructor() {
    const client = getOpenAIClient();
    if (!client) {
      throw new Error('OpenAI client not available - check your API key configuration');
    }
    this.client = client;
  }

  static getInstance(): OpenAIVectorStore {
    if (!OpenAIVectorStore.instance) {
      OpenAIVectorStore.instance = new OpenAIVectorStore();
    }
    return OpenAIVectorStore.instance;
  }

  /**
   * Create a new assistant with file search (acts as vector store)
   */
  async createVectorStore(name: string): Promise<string> {
    try {
      console.log(`Creating assistant with file search capabilities: ${name}`);
      
      if (!this.client) {
        throw new Error('OpenAI client not initialized');
      }

      if (!this.client.beta || !this.client.beta.assistants) {
        throw new Error('OpenAI assistants API not available');
      }
      
      const assistant = await this.client.beta.assistants.create({
        name: `${name} Search Assistant`,
        instructions: 'You are a helpful assistant that searches for wig products based on customer preferences.',
        model: 'gpt-4o',
        tools: [{ type: 'file_search' }]
      });

      console.log(`✅ Assistant created successfully with ID: ${assistant.id}`);
      return assistant.id;

    } catch (error) {
      console.error('❌ Error creating assistant:', error);
      throw new Error(`Failed to create assistant: ${error}`);
    }
  }

  /**
   * Upload JSONL file to assistant for search
   */
  async upsertFromJsonl(assistantId: string, filePath: string): Promise<void> {
    try {
      console.log(`Uploading JSONL file to assistant ${assistantId}: ${filePath}`);

      // Check if file exists
      await fs.access(filePath);

      // Upload file to OpenAI
      const file = await this.client.files.create({
        file: await fs.readFile(filePath),
        purpose: 'assistants'
      });

      console.log(`File uploaded with ID: ${file.id}`);

      // Update assistant with file
      await this.client.beta.assistants.update(assistantId, {
        tool_resources: {
          file_search: {
            vector_store_ids: [] // Will be automatically created
          }
        }
      });

      console.log('✅ File successfully processed for search');

    } catch (error) {
      console.error('❌ Error uploading JSONL file:', error);
      throw new Error(`Failed to upload JSONL file: ${error}`);
    }
  }

  /**
   * Search using assistant with file search
   */
  async search(assistantId: string, textQuery: string, k = 24): Promise<VectorSearchResult[]> {
    try {
      console.log(`Searching with assistant ${assistantId} for query: "${textQuery}"`);

      // Create a thread for this search
      const thread = await this.client.beta.threads.create({
        messages: [{
          role: 'user',
          content: `Find the top ${k} wig products that best match this description: "${textQuery}". 

Return the results as a JSON array with exactly this format:
[
  {
    "id": "variant_id",
    "title": "product_title", 
    "descriptor": "short_descriptor",
    "price": "price_value",
    "score": 0.95,
    "attrs": {"length": "short", "color": "blonde", ...}
  }
]

Focus on wig characteristics like length, color, texture, style, and construction quality.`
        }]
      });

      const run = await this.client.beta.threads.runs.createAndPoll(thread.id, {
        assistant_id: assistantId
      });

      if (run.status === 'completed') {
        const messages = await this.client.beta.threads.messages.list(thread.id);
        const response = messages.data[0];
        
        // Parse the response to extract search results
        const results = this.parseSearchResponse(response, k);
        
        console.log(`✅ Found ${results.length} search results`);
        return results;

      } else {
        console.error(`❌ Search failed with status: ${run.status}`);
        throw new Error(`Search failed with status: ${run.status}`);
      }

    } catch (error) {
      console.error('❌ Error searching with assistant:', error);
      throw new Error(`Failed to search: ${error}`);
    }
  }

  /**
   * List all assistants (acts as vector stores)
   */
  async listVectorStores(): Promise<VectorStoreInfo[]> {
    try {
      const response = await this.client.beta.assistants.list();
      
      return response.data.map(assistant => ({
        id: assistant.id,
        name: assistant.name || 'Unnamed',
        file_counts: {
          total: 0,
          completed: 0,
          failed: 0,
          in_progress: 0,
          cancelled: 0
        },
        status: 'active',
        created_at: new Date(assistant.created_at * 1000).toISOString()
      }));

    } catch (error) {
      console.error('Error listing assistants:', error);
      throw new Error(`Failed to list assistants: ${error}`);
    }
  }

  /**
   * Delete an assistant (vector store)
   */
  async deleteVectorStore(assistantId: string): Promise<void> {
    try {
      await this.client.beta.assistants.del(assistantId);
      console.log(`✅ Assistant ${assistantId} deleted successfully`);
    } catch (error) {
      console.error('❌ Error deleting assistant:', error);
      throw new Error(`Failed to delete assistant: ${error}`);
    }
  }

  /**
   * Wait for file processing to complete
   */
  private async waitForFileProcessing(vectorStoreId: string, fileId: string, maxWaitTime = 300000): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 5000; // Check every 5 seconds

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const fileStatus = await this.client.beta.vectorStores.files.retrieve(vectorStoreId, fileId);
        
        console.log(`File processing status: ${fileStatus.status}`);
        
        if (fileStatus.status === 'completed') {
          console.log('File processing completed successfully');
          return;
        } else if (fileStatus.status === 'failed') {
          throw new Error(`File processing failed: ${fileStatus.last_error?.message}`);
        } else if (fileStatus.status === 'cancelled') {
          throw new Error('File processing was cancelled');
        }

        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, checkInterval));

      } catch (error) {
        console.error('Error checking file status:', error);
        throw error;
      }
    }

    throw new Error(`File processing timeout after ${maxWaitTime}ms`);
  }

  /**
   * Parse search response from OpenAI
   */
  private parseSearchResponse(response: any, maxResults: number): VectorSearchResult[] {
    try {
      // Extract content from the response
      const content = response.content?.[0]?.text?.value || '';
      console.log('OpenAI response content:', content.substring(0, 200) + '...');
      
      // For now, return empty results since OpenAI assistant doesn't have our data yet
      console.log('⚠️ OpenAI assistant needs data upload - returning empty results for now');
      return [];

    } catch (error) {
      console.error('Error parsing search response:', error);
      return [];
    }
  }

  /**
   * Normalize a single search result
   */
  private normalizeSearchResult(item: any): VectorSearchResult {
    return {
      id: item.id || item.variant_id || 'unknown',
      title: item.title || item.name || 'Untitled',
      descriptor: item.descriptor || '',
      attrs: item.attrs || {},
      score: item.score || 0.8, // Default score if not provided
      price: item.price || '0.00',
      compareAtPrice: item.compare_at_price || item.compareAtPrice,
      availableForSale: item.available_for_sale !== undefined ? item.available_for_sale : true,
      image: item.image || item.image_url ? {
        url: item.image?.url || item.image_url,
        altText: item.image?.altText || item.title || ''
      } : undefined
    };
  }
}

// Type definitions for OpenAI Vector Store
export interface VectorSearchResult {
  id: string;
  title: string;
  descriptor: string;
  attrs: Record<string, unknown>;
  score: number;
  price: string;
  compareAtPrice?: string;
  availableForSale: boolean;
  image?: {
    url: string;
    altText: string;
  };
}

export interface VectorStoreInfo {
  id: string;
  name: string;
  file_counts: {
    total: number;
    completed: number;
    failed: number;
    in_progress: number;
    cancelled: number;
  };
  status: string;
  created_at: string;
}

// Helper function to generate wig product descriptors
export function generateWigDescriptor(variant: Variant): string {
  const { wigAttributes, title, selectedOptions } = variant;
  const { length, texture, color, capConstruction, hairType, style } = wigAttributes;

  // Build descriptor components
  const parts: string[] = [];

  // Length and style
  if (length && style) {
    parts.push(`${length} ${style}`);
  } else if (length) {
    parts.push(length);
  }

  // Texture
  if (texture && texture !== 'straight') {
    parts.push(texture);
  }

  // Color description
  if (color) {
    parts.push(color);
  }

  // Construction type for premium wigs
  if (capConstruction && capConstruction !== 'basic') {
    parts.push(capConstruction.replace('_', ' '));
  }

  // Hair type
  if (hairType && hairType !== 'synthetic') {
    parts.push(hairType.replace('_', ' '));
  }

  // Add any specific option values
  const relevantOptions = selectedOptions.filter(opt => 
    opt.name.toLowerCase().includes('color') || 
    opt.name.toLowerCase().includes('style') ||
    opt.name.toLowerCase().includes('length')
  );

  for (const option of relevantOptions) {
    if (!parts.some(part => part.toLowerCase().includes(option.value.toLowerCase()))) {
      parts.push(option.value);
    }
  }

  // Create final descriptor
  let descriptor = parts.join(', ');
  
  // Add title information if it contains additional useful details
  const titleWords = title.toLowerCase().split(/[\s\-_]+/);
  const descriptorLower = descriptor.toLowerCase();
  
  for (const word of titleWords) {
    if (word.length > 3 && 
        !descriptorLower.includes(word) &&
        !['wig', 'hair', 'the', 'and', 'with', 'for'].includes(word)) {
      if (/^[a-z]+\d+/.test(word)) { // Color codes like RL19/23SS
        descriptor += `, ${word.toUpperCase()}`;
      } else if (word.match(/^(rooted|highlighted|tipped|streaked)/)) {
        descriptor += `, ${word}`;
      }
    }
  }

  return descriptor || 'wig product';
}

// Helper to create JSONL record for vector store
export function createJsonlRecord(variant: Variant): string {
  const descriptor = generateWigDescriptor(variant);
  
  const record = {
    id: variant.id,
    title: variant.title,
    descriptor: descriptor,
    attrs: {
      ...variant.wigAttributes,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice,
      availableForSale: variant.availableForSale,
      selectedOptions: variant.selectedOptions
    },
    content: `${variant.title}\n\nDescription: ${descriptor}\n\nAttributes: ${JSON.stringify(variant.wigAttributes, null, 2)}`
  };

  return JSON.stringify(record);
}
