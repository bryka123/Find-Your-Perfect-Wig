import { generateWigDescriptor, createJsonlRecord } from '../src/lib/vectors';
import { Variant, WigAttributes } from '../src/lib/types';

describe('generateWigDescriptor', () => {
  // Test basic descriptor generation
  it('should generate a basic descriptor with length, texture, and color', () => {
    const variant: Variant = {
      id: 'test-1',
      productId: 'prod-1',
      title: 'Beautiful Wig',
      price: '129.99',
      availableForSale: true,
      selectedOptions: [],
      wigAttributes: {
        length: 'medium',
        texture: 'wavy',
        color: 'blonde',
        capSize: 'average',
        capConstruction: 'basic',
        density: 'medium',
        hairType: 'synthetic',
        style: 'classic'
      }
    };

    const descriptor = generateWigDescriptor(variant);
    expect(descriptor).toBe('medium classic, wavy, blonde');
  });

  // Test with premium construction
  it('should include cap construction for premium wigs', () => {
    const variant: Variant = {
      id: 'test-2',
      productId: 'prod-2',
      title: 'Premium Lace Front Wig',
      price: '299.99',
      availableForSale: true,
      selectedOptions: [],
      wigAttributes: {
        length: 'long',
        texture: 'straight',
        color: 'brunette',
        capSize: 'average',
        capConstruction: 'lace_front',
        density: 'medium',
        hairType: 'human_hair',
        style: 'modern'
      }
    };

    const descriptor = generateWigDescriptor(variant);
    expect(descriptor).toBe('long modern, brunette, lace front, human hair');
  });

  // Test with color codes from title
  it('should extract color codes from title', () => {
    const variant: Variant = {
      id: 'test-3',
      productId: 'prod-3',
      title: 'Raquel Welch Wig RL19/23SS Shaded Biscuit',
      price: '179.99',
      availableForSale: true,
      selectedOptions: [],
      wigAttributes: {
        length: 'short',
        texture: 'straight',
        color: 'blonde',
        capSize: 'average',
        capConstruction: 'basic',
        density: 'medium',
        hairType: 'synthetic',
        style: 'classic'
      }
    };

    const descriptor = generateWigDescriptor(variant);
    expect(descriptor).toContain('RL19/23SS');
    expect(descriptor).toBe('short classic, blonde, RL19/23SS');
  });

  // Test with rooted/highlighted keywords
  it('should include rooted and highlighted keywords from title', () => {
    const variant: Variant = {
      id: 'test-4',
      productId: 'prod-4',
      title: 'Rooted Blonde Highlighted Bob Wig',
      price: '149.99',
      availableForSale: true,
      selectedOptions: [],
      wigAttributes: {
        length: 'short',
        texture: 'straight',
        color: 'blonde',
        capSize: 'average',
        capConstruction: 'basic',
        density: 'medium',
        hairType: 'synthetic',
        style: 'trendy'
      }
    };

    const descriptor = generateWigDescriptor(variant);
    expect(descriptor).toContain('rooted');
    expect(descriptor).toContain('highlighted');
  });

  // Test with selected options
  it('should include relevant selected options', () => {
    const variant: Variant = {
      id: 'test-5',
      productId: 'prod-5',
      title: 'Custom Wig',
      price: '199.99',
      availableForSale: true,
      selectedOptions: [
        { name: 'Color', value: 'Champagne Blonde' },
        { name: 'Style', value: 'Beach Waves' },
        { name: 'Size', value: 'Large' }
      ],
      wigAttributes: {
        length: 'medium',
        texture: 'wavy',
        color: 'blonde',
        capSize: 'large',
        capConstruction: 'basic',
        density: 'medium',
        hairType: 'synthetic',
        style: 'casual'
      }
    };

    const descriptor = generateWigDescriptor(variant);
    expect(descriptor).toContain('Champagne Blonde');
    expect(descriptor).toContain('Beach Waves');
  });

  // Test edge case with minimal attributes
  it('should handle minimal wig attributes gracefully', () => {
    const variant: Variant = {
      id: 'test-6',
      productId: 'prod-6',
      title: 'Basic Wig',
      price: '49.99',
      availableForSale: true,
      selectedOptions: [],
      wigAttributes: {
        length: 'medium',
        texture: 'straight',
        color: 'brunette',
        capSize: 'average',
        capConstruction: 'basic',
        density: 'medium',
        hairType: 'synthetic',
        style: 'classic'
      }
    };

    const descriptor = generateWigDescriptor(variant);
    expect(descriptor).toBe('medium classic, brunette');
  });

  // Test with fantasy color
  it('should handle fantasy colors correctly', () => {
    const variant: Variant = {
      id: 'test-7',
      productId: 'prod-7',
      title: 'Rainbow Fantasy Wig',
      price: '79.99',
      availableForSale: true,
      selectedOptions: [],
      wigAttributes: {
        length: 'long',
        texture: 'curly',
        color: 'fantasy',
        capSize: 'average',
        capConstruction: 'basic',
        density: 'heavy',
        hairType: 'synthetic',
        style: 'trendy'
      }
    };

    const descriptor = generateWigDescriptor(variant);
    expect(descriptor).toBe('long trendy, curly, fantasy');
  });

  // Test fallback for empty attributes
  it('should return fallback for completely empty attributes', () => {
    const variant: Variant = {
      id: 'test-8',
      productId: 'prod-8',
      title: '',
      price: '0.00',
      availableForSale: false,
      selectedOptions: [],
      wigAttributes: {
        length: '',
        texture: '',
        color: '',
        capSize: 'average',
        capConstruction: 'basic',
        density: 'medium',
        hairType: 'synthetic',
        style: ''
      } as any // Type assertion to allow empty strings
    };

    const descriptor = generateWigDescriptor(variant);
    expect(descriptor).toBe('wig product');
  });
});

describe('createJsonlRecord', () => {
  it('should create a valid JSONL record', () => {
    const variant: Variant = {
      id: 'variant-123',
      productId: 'product-456',
      title: 'Elegant Bob Wig RL6/30 Chocolate Copper',
      price: '189.99',
      compareAtPrice: '249.99',
      availableForSale: true,
      image: {
        url: 'https://example.com/wig.jpg',
        altText: 'Elegant Bob Wig'
      },
      selectedOptions: [
        { name: 'Color', value: 'Chocolate Copper' },
        { name: 'Cap Size', value: 'Average' }
      ],
      wigAttributes: {
        length: 'short',
        texture: 'straight',
        color: 'brunette',
        capSize: 'average',
        capConstruction: 'monofilament',
        density: 'medium',
        hairType: 'human_hair',
        style: 'professional'
      }
    };

    const jsonlRecord = createJsonlRecord(variant);
    const parsed = JSON.parse(jsonlRecord);

    // Verify structure
    expect(parsed).toHaveProperty('id', 'variant-123');
    expect(parsed).toHaveProperty('title', 'Elegant Bob Wig RL6/30 Chocolate Copper');
    expect(parsed).toHaveProperty('descriptor');
    expect(parsed).toHaveProperty('attrs');
    expect(parsed).toHaveProperty('content');

    // Verify descriptor content
    expect(parsed.descriptor).toContain('short');
    expect(parsed.descriptor).toContain('brunette');
    expect(parsed.descriptor).toContain('monofilament');
    expect(parsed.descriptor).toContain('human hair');

    // Verify attrs object
    expect(parsed.attrs.length).toBe('short');
    expect(parsed.attrs.color).toBe('brunette');
    expect(parsed.attrs.price).toBe('189.99');
    expect(parsed.attrs.compareAtPrice).toBe('249.99');
    expect(parsed.attrs.availableForSale).toBe(true);

    // Verify content field includes title and descriptor
    expect(parsed.content).toContain('Elegant Bob Wig RL6/30 Chocolate Copper');
    expect(parsed.content).toContain('Description:');
    expect(parsed.content).toContain('Attributes:');
  });

  it('should handle variants with minimal data', () => {
    const variant: Variant = {
      id: 'minimal-1',
      productId: 'minimal-prod',
      title: 'Simple Wig',
      price: '59.99',
      availableForSale: true,
      selectedOptions: [],
      wigAttributes: {
        length: 'medium',
        texture: 'straight',
        color: 'brunette',
        capSize: 'average',
        capConstruction: 'basic',
        density: 'medium',
        hairType: 'synthetic',
        style: 'classic'
      }
    };

    const jsonlRecord = createJsonlRecord(variant);
    const parsed = JSON.parse(jsonlRecord);

    expect(parsed.id).toBe('minimal-1');
    expect(parsed.title).toBe('Simple Wig');
    expect(parsed.descriptor).toBe('medium classic, brunette');
    expect(parsed.attrs.compareAtPrice).toBeUndefined();
  });

  it('should produce valid JSON that can be parsed', () => {
    const variant: Variant = {
      id: 'json-test',
      productId: 'json-prod',
      title: 'Wig with "Quotes" and Special Characters & Symbols',
      price: '99.99',
      availableForSale: true,
      selectedOptions: [
        { name: 'Special Option', value: 'Value with "quotes" and & symbols' }
      ],
      wigAttributes: {
        length: 'long',
        texture: 'wavy',
        color: 'blonde',
        capSize: 'average',
        capConstruction: 'basic',
        density: 'medium',
        hairType: 'synthetic',
        style: 'classic'
      }
    };

    const jsonlRecord = createJsonlRecord(variant);
    
    // This should not throw an error
    expect(() => JSON.parse(jsonlRecord)).not.toThrow();
    
    const parsed = JSON.parse(jsonlRecord);
    expect(parsed.title).toContain('Quotes');
    expect(parsed.attrs.selectedOptions[0].value).toContain('symbols');
  });
});

// Integration tests for the descriptor system
describe('Descriptor Integration Tests', () => {
  it('should create descriptors that are suitable for vector search', () => {
    const testVariants: Variant[] = [
      {
        id: '1',
        productId: 'p1',
        title: 'Raquel Welch Short Bob RL6/8 Dark Chocolate',
        price: '179.99',
        availableForSale: true,
        selectedOptions: [],
        wigAttributes: {
          length: 'short',
          texture: 'straight',
          color: 'brunette',
          capSize: 'average',
          capConstruction: 'monofilament',
          density: 'medium',
          hairType: 'human_hair',
          style: 'professional'
        }
      },
      {
        id: '2',
        productId: 'p2',
        title: 'Long Beachy Waves Blonde Lace Front',
        price: '249.99',
        availableForSale: true,
        selectedOptions: [],
        wigAttributes: {
          length: 'long',
          texture: 'wavy',
          color: 'blonde',
          capSize: 'average',
          capConstruction: 'lace_front',
          density: 'medium',
          hairType: 'human_hair',
          style: 'casual'
        }
      }
    ];

    testVariants.forEach(variant => {
      const descriptor = generateWigDescriptor(variant);
      const jsonlRecord = createJsonlRecord(variant);
      const parsed = JSON.parse(jsonlRecord);

      // Descriptors should be meaningful and contain key attributes
      expect(descriptor.length).toBeGreaterThan(5);
      expect(descriptor).not.toBe('wig product'); // Should not fall back to default
      
      // Should contain at least color and length info for search
      expect(
        descriptor.includes(variant.wigAttributes.color) || 
        descriptor.includes(variant.wigAttributes.length)
      ).toBe(true);

      // JSONL record should be complete
      expect(parsed.descriptor).toBe(descriptor);
      expect(parsed.attrs).toBeDefined();
      expect(parsed.content).toContain(descriptor);
    });
  });

  it('should generate unique descriptors for different wigs', () => {
    const variants = [
      { length: 'short', texture: 'straight', color: 'blonde', style: 'classic' },
      { length: 'long', texture: 'curly', color: 'brunette', style: 'trendy' },
      { length: 'medium', texture: 'wavy', color: 'red', style: 'casual' }
    ];

    const descriptors = variants.map((attrs, index) => {
      const variant: Variant = {
        id: `unique-${index}`,
        productId: `prod-${index}`,
        title: `Test Wig ${index}`,
        price: '99.99',
        availableForSale: true,
        selectedOptions: [],
        wigAttributes: {
          ...attrs,
          capSize: 'average',
          capConstruction: 'basic',
          density: 'medium',
          hairType: 'synthetic'
        } as WigAttributes
      };
      return generateWigDescriptor(variant);
    });

    // All descriptors should be different
    const uniqueDescriptors = new Set(descriptors);
    expect(uniqueDescriptors.size).toBe(descriptors.length);
  });
});
