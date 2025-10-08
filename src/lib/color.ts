import { Color, Palette, Season, ColorCategory, SelfieAttributes } from './types';

// Color analysis and palette matching utilities
export class ColorAnalyzer {
  private palettes: Map<Season, Palette> = new Map();

  constructor() {
    this.initializePalettes();
  }

  // Initialize color palettes for each season
  private initializePalettes() {
    // Spring palette - warm, light, clear colors
    const springPalette: Palette = {
      id: 'spring',
      name: 'Spring',
      season: Season.SPRING,
      description: 'Warm, light, and clear colors that complement fair to medium skin tones with golden undertones',
      colors: [
        {
          category: ColorCategory.WARM,
          colors: [
            { name: 'Golden Blonde', hexCode: '#F7E7A1', rgb: [247, 231, 161], hsl: [52, 85, 80], wigColorMatches: ['blonde'] },
            { name: 'Honey Blonde', hexCode: '#D4A574', rgb: [212, 165, 116], hsl: [31, 53, 64], wigColorMatches: ['blonde'] },
            { name: 'Strawberry Blonde', hexCode: '#E9967A', rgb: [233, 150, 122], hsl: [15, 72, 70], wigColorMatches: ['blonde', 'red'] },
            { name: 'Auburn', hexCode: '#A0522D', rgb: [160, 82, 45], hsl: [19, 56, 40], wigColorMatches: ['red'] },
          ]
        },
        {
          category: ColorCategory.NEUTRALS,
          colors: [
            { name: 'Warm Taupe', hexCode: '#8B7355', rgb: [139, 115, 85], hsl: [33, 24, 44], wigColorMatches: ['brunette'] },
            { name: 'Golden Brown', hexCode: '#8B4513', rgb: [139, 69, 19], hsl: [25, 76, 31], wigColorMatches: ['brunette'] },
          ]
        }
      ]
    };

    // Summer palette - cool, soft, muted colors
    const summerPalette: Palette = {
      id: 'summer',
      name: 'Summer', 
      season: Season.SUMMER,
      description: 'Cool, soft, and muted colors that complement fair to medium skin tones with pink undertones',
      colors: [
        {
          category: ColorCategory.COOL,
          colors: [
            { name: 'Ash Blonde', hexCode: '#C4C4AA', rgb: [196, 196, 170], hsl: [60, 18, 72], wigColorMatches: ['blonde'] },
            { name: 'Platinum Blonde', hexCode: '#E5E4E2', rgb: [229, 228, 226], hsl: [40, 8, 89], wigColorMatches: ['blonde', 'white'] },
            { name: 'Cool Brown', hexCode: '#704214', rgb: [112, 66, 20], hsl: [30, 70, 26], wigColorMatches: ['brunette'] },
            { name: 'Silver', hexCode: '#C0C0C0', rgb: [192, 192, 192], hsl: [0, 0, 75], wigColorMatches: ['gray', 'white'] },
          ]
        },
        {
          category: ColorCategory.SOFT,
          colors: [
            { name: 'Soft Black', hexCode: '#36454F', rgb: [54, 69, 79], hsl: [204, 19, 26], wigColorMatches: ['black'] },
            { name: 'Dusty Rose', hexCode: '#DCAE96', rgb: [220, 174, 150], hsl: [21, 48, 73], wigColorMatches: ['red'] },
          ]
        }
      ]
    };

    // Autumn palette - warm, deep, rich colors
    const autumnPalette: Palette = {
      id: 'autumn',
      name: 'Autumn',
      season: Season.AUTUMN,
      description: 'Warm, deep, and rich colors that complement medium to deep skin tones with golden undertones',
      colors: [
        {
          category: ColorCategory.WARM,
          colors: [
            { name: 'Rich Auburn', hexCode: '#722F37', rgb: [114, 47, 55], hsl: [353, 42, 32], wigColorMatches: ['red'] },
            { name: 'Deep Red', hexCode: '#8B0000', rgb: [139, 0, 0], hsl: [0, 100, 27], wigColorMatches: ['red'] },
            { name: 'Copper', hexCode: '#B87333', rgb: [184, 115, 51], hsl: [29, 57, 46], wigColorMatches: ['red', 'brunette'] },
            { name: 'Dark Chocolate', hexCode: '#3C1810', rgb: [60, 24, 16], hsl: [11, 58, 15], wigColorMatches: ['brunette'] },
          ]
        },
        {
          category: ColorCategory.BRIGHT,
          colors: [
            { name: 'Golden Blonde', hexCode: '#DAA520', rgb: [218, 165, 32], hsl: [43, 74, 49], wigColorMatches: ['blonde'] },
            { name: 'Warm Black', hexCode: '#1C1C1C', rgb: [28, 28, 28], hsl: [0, 0, 11], wigColorMatches: ['black'] },
          ]
        }
      ]
    };

    // Winter palette - cool, clear, intense colors
    const winterPalette: Palette = {
      id: 'winter',
      name: 'Winter',
      season: Season.WINTER,
      description: 'Cool, clear, and intense colors that complement fair or deep skin tones with cool undertones',
      colors: [
        {
          category: ColorCategory.COOL,
          colors: [
            { name: 'Jet Black', hexCode: '#000000', rgb: [0, 0, 0], hsl: [0, 0, 0], wigColorMatches: ['black'] },
            { name: 'True Blue Black', hexCode: '#191970', rgb: [25, 25, 112], hsl: [240, 64, 27], wigColorMatches: ['black'] },
            { name: 'Icy Blonde', hexCode: '#F5F5DC', rgb: [245, 245, 220], hsl: [60, 56, 91], wigColorMatches: ['blonde', 'white'] },
            { name: 'Pure White', hexCode: '#FFFFFF', rgb: [255, 255, 255], hsl: [0, 0, 100], wigColorMatches: ['white'] },
          ]
        },
        {
          category: ColorCategory.BRIGHT,
          colors: [
            { name: 'Cool Brown', hexCode: '#654321', rgb: [101, 67, 33], hsl: [30, 51, 26], wigColorMatches: ['brunette'] },
            { name: 'Burgundy', hexCode: '#800020', rgb: [128, 0, 32], hsl: [345, 100, 25], wigColorMatches: ['red'] },
            { name: 'Fantasy Colors', hexCode: '#FF1493', rgb: [255, 20, 147], hsl: [328, 100, 54], wigColorMatches: ['fantasy'] },
          ]
        }
      ]
    };

    this.palettes.set(Season.SPRING, springPalette);
    this.palettes.set(Season.SUMMER, summerPalette);
    this.palettes.set(Season.AUTUMN, autumnPalette);
    this.palettes.set(Season.WINTER, winterPalette);
  }

  // Analyze selfie attributes and determine best color season
  analyzeSelfieColors(selfieAttrs: SelfieAttributes): { 
    season: Season, 
    confidence: number, 
    recommendedColors: string[], 
    reasons: string[] 
  } {
    const analysis = {
      season: Season.AUTUMN,
      confidence: 0.5,
      recommendedColors: [] as string[],
      reasons: [] as string[]
    };

    // Simplified color season analysis based on selfie attributes
    const skinTone = selfieAttrs.skinTone.toLowerCase();
    const eyeColor = selfieAttrs.eyeColor.toLowerCase();
    const hairColor = selfieAttrs.hairColor.toLowerCase();

    let springScore = 0;
    let summerScore = 0;
    let autumnScore = 0;
    let winterScore = 0;

    // Skin tone analysis
    if (skinTone.includes('fair') || skinTone.includes('light')) {
      if (skinTone.includes('pink') || skinTone.includes('cool')) {
        summerScore += 2;
        winterScore += 1;
      } else if (skinTone.includes('warm') || skinTone.includes('golden') || skinTone.includes('peach')) {
        springScore += 2;
        autumnScore += 1;
      }
    } else if (skinTone.includes('medium') || skinTone.includes('olive')) {
      if (skinTone.includes('warm') || skinTone.includes('golden')) {
        autumnScore += 2;
        springScore += 1;
      } else if (skinTone.includes('cool') || skinTone.includes('neutral')) {
        summerScore += 1;
        winterScore += 1;
      }
    } else if (skinTone.includes('deep') || skinTone.includes('dark')) {
      winterScore += 2;
      autumnScore += 1;
    }

    // Eye color analysis
    if (eyeColor.includes('blue') || eyeColor.includes('green')) {
      if (eyeColor.includes('light') || eyeColor.includes('bright')) {
        springScore += 1;
        summerScore += 1;
      } else if (eyeColor.includes('deep') || eyeColor.includes('dark')) {
        winterScore += 1;
      }
    } else if (eyeColor.includes('brown')) {
      if (eyeColor.includes('warm') || eyeColor.includes('golden')) {
        autumnScore += 1;
        springScore += 1;
      } else if (eyeColor.includes('dark') || eyeColor.includes('deep')) {
        winterScore += 1;
        autumnScore += 1;
      }
    } else if (eyeColor.includes('hazel')) {
      autumnScore += 1;
      springScore += 1;
    }

    // Hair color analysis
    if (hairColor.includes('blonde')) {
      springScore += 1;
      summerScore += 1;
    } else if (hairColor.includes('brown') || hairColor.includes('brunette')) {
      if (hairColor.includes('warm') || hairColor.includes('golden')) {
        autumnScore += 1;
      } else if (hairColor.includes('cool') || hairColor.includes('ash')) {
        summerScore += 1;
        winterScore += 1;
      }
    } else if (hairColor.includes('black')) {
      winterScore += 1;
      autumnScore += 1;
    } else if (hairColor.includes('red')) {
      autumnScore += 2;
      springScore += 1;
    }

    // Determine winning season
    const scores = { spring: springScore, summer: summerScore, autumn: autumnScore, winter: winterScore };
    const maxScore = Math.max(...Object.values(scores));
    const winningSeasons = Object.entries(scores).filter(([_, score]) => score === maxScore);

    if (winningSeasons.length === 1) {
      analysis.season = winningSeasons[0][0] as Season;
      analysis.confidence = Math.min(maxScore / 6, 1); // Normalize confidence
    } else {
      // Default to autumn if tie
      analysis.season = Season.AUTUMN;
      analysis.confidence = 0.5;
    }

    // Get recommended colors for the winning season
    const palette = this.palettes.get(analysis.season);
    if (palette) {
      analysis.recommendedColors = this.extractWigColorsFromPalette(palette);
      analysis.reasons = this.generateColorReasons(analysis.season, selfieAttrs);
    }

    return analysis;
  }

  // Extract wig color matches from a palette
  private extractWigColorsFromPalette(palette: Palette): string[] {
    const wigColors = new Set<string>();
    
    palette.colors.forEach(colorGroup => {
      colorGroup.colors.forEach(color => {
        if (color.wigColorMatches) {
          color.wigColorMatches.forEach(wigColor => wigColors.add(wigColor));
        }
      });
    });
    
    return Array.from(wigColors);
  }

  // Generate reasons for color recommendations
  private generateColorReasons(season: Season, selfieAttrs: SelfieAttributes): string[] {
    const reasons: string[] = [];
    
    switch (season) {
      case Season.SPRING:
        reasons.push("Your warm, light complexion looks best with golden and honey-toned colors");
        if (selfieAttrs.eyeColor.includes('blue') || selfieAttrs.eyeColor.includes('green')) {
          reasons.push("Your eye color creates beautiful contrast with warm hair tones");
        }
        break;
      case Season.SUMMER:
        reasons.push("Your cool undertones are complemented by soft, muted colors");
        reasons.push("Ash and platinum tones will enhance your natural coloring");
        break;
      case Season.AUTUMN:
        reasons.push("Rich, warm colors bring out the golden tones in your complexion");
        if (selfieAttrs.hairColor.includes('brown') || selfieAttrs.hairColor.includes('red')) {
          reasons.push("Deep, warm hair colors harmonize with your natural coloring");
        }
        break;
      case Season.WINTER:
        reasons.push("Your striking features can handle bold, clear colors");
        reasons.push("Cool-toned colors create dramatic contrast with your complexion");
        break;
    }
    
    return reasons;
  }

  // Get color recommendations for a specific query
  getColorRecommendations(query: string): string[] {
    const queryLower = query.toLowerCase();
    const recommendations: string[] = [];
    
    // Check for seasonal keywords
    if (queryLower.includes('warm') || queryLower.includes('golden') || queryLower.includes('honey')) {
      recommendations.push('blonde', 'red', 'brunette');
    } else if (queryLower.includes('cool') || queryLower.includes('ash') || queryLower.includes('platinum')) {
      recommendations.push('blonde', 'gray', 'white');
    }
    
    // Check for specific color mentions
    if (queryLower.includes('blonde')) recommendations.push('blonde');
    if (queryLower.includes('brunette') || queryLower.includes('brown')) recommendations.push('brunette');
    if (queryLower.includes('black')) recommendations.push('black');
    if (queryLower.includes('red') || queryLower.includes('auburn')) recommendations.push('red');
    if (queryLower.includes('gray') || queryLower.includes('grey') || queryLower.includes('silver')) recommendations.push('gray');
    if (queryLower.includes('white') || queryLower.includes('platinum')) recommendations.push('white');
    
    return [...new Set(recommendations)]; // Remove duplicates
  }

  // Get all available palettes
  getAllPalettes(): Palette[] {
    return Array.from(this.palettes.values());
  }

  // Get specific palette by season
  getPalette(season: Season): Palette | undefined {
    return this.palettes.get(season);
  }

  // Utility function to convert between color formats
  static hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result 
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [0, 0, 0];
  }

  static rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // Achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  }
}










