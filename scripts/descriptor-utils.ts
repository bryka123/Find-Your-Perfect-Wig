import { Variant, WigAttributes } from '../src/lib/types';

// Helper function to generate wig product descriptors (standalone version)
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

// Helper to create JSONL record for vector store (standalone version)
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










