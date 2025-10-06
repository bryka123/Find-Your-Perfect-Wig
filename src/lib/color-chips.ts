// Color chip visualization for wig colors
// Generates visual color representations for wig variants

export interface ColorChip {
  name: string;
  hexColor: string;
  description: string;
  isRooted?: boolean;
  rootColor?: string;
  tipColor?: string;
}

export class ColorChipGenerator {
  private static colorMappings: Record<string, ColorChip> = {
    // Blonde variations
    'blonde': { name: 'Blonde', hexColor: '#F7E7A1', description: 'Classic golden blonde' },
    'golden': { name: 'Golden Blonde', hexColor: '#DAA520', description: 'Rich golden tones' },
    'honey': { name: 'Honey Blonde', hexColor: '#D4A574', description: 'Warm honey highlights' },
    'platinum': { name: 'Platinum Blonde', hexColor: '#E5E4E2', description: 'Cool platinum tones' },
    'ash': { name: 'Ash Blonde', hexColor: '#C4C4AA', description: 'Cool ash undertones' },
    'strawberry': { name: 'Strawberry Blonde', hexColor: '#E9967A', description: 'Warm strawberry tints' },
    
    // Brunette variations
    'brunette': { name: 'Brunette', hexColor: '#8B4513', description: 'Rich brown tones' },
    'chocolate': { name: 'Chocolate', hexColor: '#3C1810', description: 'Deep chocolate brown' },
    'chestnut': { name: 'Chestnut', hexColor: '#954535', description: 'Warm chestnut brown' },
    'espresso': { name: 'Espresso', hexColor: '#4A2C2A', description: 'Dark espresso brown' },
    'caramel': { name: 'Caramel', hexColor: '#AF6E2D', description: 'Golden caramel tones' },
    'mocha': { name: 'Mocha', hexColor: '#6F4E37', description: 'Rich mocha brown' },
    'cappuccino': { name: 'Cappuccino', hexColor: '#8B7355', description: 'Warm cappuccino brown' },
    'mochaccino': { name: 'Mochaccino', hexColor: '#A0785A', description: 'Creamy mochaccino blend' },
    
    // Red variations
    'red': { name: 'Red', hexColor: '#8B0000', description: 'Classic red tones' },
    'auburn': { name: 'Auburn', hexColor: '#A0522D', description: 'Rich auburn red' },
    'copper': { name: 'Copper', hexColor: '#B87333', description: 'Metallic copper shine' },
    'burgundy': { name: 'Burgundy', hexColor: '#800020', description: 'Deep wine burgundy' },
    'ginger': { name: 'Ginger', hexColor: '#B06500', description: 'Vibrant ginger red' },
    
    // Black variations
    'black': { name: 'Black', hexColor: '#000000', description: 'Natural black' },
    'jet': { name: 'Jet Black', hexColor: '#0C0C0C', description: 'Deep jet black' },
    'raven': { name: 'Raven Black', hexColor: '#1C1C1C', description: 'Glossy raven black' },
    
    // Gray variations  
    'gray': { name: 'Gray', hexColor: '#808080', description: 'Natural gray' },
    'grey': { name: 'Grey', hexColor: '#808080', description: 'Natural grey' },
    'silver': { name: 'Silver', hexColor: '#C0C0C0', description: 'Bright silver' },
    'salt': { name: 'Salt & Pepper', hexColor: '#999999', description: 'Mixed gray and white' },
    
    // White variations
    'white': { name: 'White', hexColor: '#FFFFFF', description: 'Pure white' },
    'snow': { name: 'Snow White', hexColor: '#FFFAFA', description: 'Cool snow white' },
    
    // Fantasy colors
    'pink': { name: 'Fantasy Pink', hexColor: '#FFB6C1', description: 'Pastel pink' },
    'blue': { name: 'Fantasy Blue', hexColor: '#87CEEB', description: 'Sky blue' },
    'purple': { name: 'Fantasy Purple', hexColor: '#DDA0DD', description: 'Lavender purple' },
    'rainbow': { name: 'Rainbow', hexColor: '#FF69B4', description: 'Multi-color fantasy' }
  };

  /**
   * Generate color chip URL based on exact variant color name
   * Example: "22F16S8 - Venice Blonde - Rooted Light Blonde" → "22f16s8-venice-blonde.jpg"
   * Example: "R6/10 - Rooted Medium Brown" → "r6-10-medium-brown.jpg"
   * Example: "RH4/39SS SHADED MULBERRY" → "rh4-39ss-shaded-mulberry.jpg"
   */
  static generateColorChipUrl(colorName: string, wigTitle?: string): string {
    // Extract the color code if present (e.g., "22F16S8" from "22F16S8 - Venice Blonde - Rooted Light Blonde")
    const colorCodeMatch = colorName.match(/^([A-Z0-9]+(?:\/[A-Z0-9]+)?)/i);

    if (colorCodeMatch) {
      // We have a color code at the start
      const colorCode = colorCodeMatch[1].toLowerCase().replace(/\//g, '-');

      // Extract everything after the code
      const afterCode = colorName.substring(colorCodeMatch[0].length).trim();

      // Remove leading dash/hyphen if present
      const cleanedAfterCode = afterCode.replace(/^[\-–]\s*/, '');

      if (cleanedAfterCode) {
        // Split by dash to get parts - we only want the FIRST part after the color code
        // "Venice Blonde - Rooted Light Blonde" → take "Venice Blonde"
        // "Rooted Medium Brown" → take "Medium Brown" (after removing "Rooted")
        const parts = cleanedAfterCode.split(/\s*-\s*/);
        let firstPart = parts[0].trim();

        // Remove "Rooted" prefix if it exists
        firstPart = firstPart.replace(/^rooted\s+/gi, '').trim();

        // Format the name part
        const formattedName = firstPart
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9\-]/g, '')
          .replace(/--+/g, '-')
          .replace(/^-|-$/g, '');

        if (formattedName) {
          // Format: "22f16s8-venice-blonde.jpg" or "r6-10-medium-brown.jpg"
          return `https://chiquel.com/cdn/shop/files/${colorCode}-${formattedName}.jpg`;
        }
      }

      // If no name part or empty after cleaning, just use the code
      return `https://chiquel.com/cdn/shop/files/${colorCode}.jpg`;
    }

    // Fallback: Use the full color name converted to URL format
    let urlName = colorName.toLowerCase()
      .replace(/\//g, '-')            // slashes to dashes
      .replace(/\s+/g, '-')           // spaces to dashes
      .replace(/[^a-z0-9\-]/g, '')    // remove other special chars
      .replace(/--+/g, '-')           // multiple dashes to single
      .replace(/^-|-$/g, '');         // remove leading/trailing dashes

    return `https://chiquel.com/cdn/shop/files/${urlName}.jpg`;
  }

  /**
   * Generate color chip for a wig variant
   */
  static generateColorChip(colorName: string, wigTitle?: string): ColorChip {
    const normalizedColor = colorName.toLowerCase();
    
    // Check for exact matches first
    if (this.colorMappings[normalizedColor]) {
      return { ...this.colorMappings[normalizedColor] };
    }
    
    // Check for partial matches
    for (const [key, chip] of Object.entries(this.colorMappings)) {
      if (normalizedColor.includes(key) || key.includes(normalizedColor)) {
        return { ...chip };
      }
    }
    
    // Check if it's a rooted color from the title
    if (wigTitle) {
      const rootedInfo = this.parseRootedColor(wigTitle, colorName);
      if (rootedInfo) {
        return rootedInfo;
      }
    }
    
    // Fallback to neutral brown
    return {
      name: colorName || 'Natural',
      hexColor: '#8B4513',
      description: 'Natural hair color'
    };
  }

  /**
   * Parse rooted color combinations (e.g., "RH2/4 DARK CHOCOLATE", "bernstein rooted")
   */
  private static parseRootedColor(title: string, colorOption: string): ColorChip | null {
    const titleLower = title.toLowerCase();
    const colorLower = colorOption.toLowerCase();
    
    // Detect rooted patterns
    if (titleLower.includes('rooted') || colorLower.includes('rooted') || 
        titleLower.match(/r[hlq]\d+/) || titleLower.includes('/')) {
      
      // Extract root and tip colors
      let rootColor = '#2C1810'; // Default dark root
      let tipColor = '#F7E7A1';  // Default blonde tip
      
      // Specific rooted color mappings
      if (colorLower.includes('chocolate') || titleLower.includes('chocolate')) {
        rootColor = '#2C1810'; // Dark chocolate
        tipColor = '#8B4513';  // Medium brown
      } else if (colorLower.includes('bernstein') || titleLower.includes('bernstein')) {
        rootColor = '#4A2C2A'; // Dark brown
        tipColor = '#DAA520';  // Golden blonde
      } else if (colorLower.includes('cookie') || titleLower.includes('cookie')) {
        rootColor = '#654321'; // Brown sugar
        tipColor = '#F5DEB3';  // Wheat blonde
      } else if (colorLower.includes('butterbeer') || titleLower.includes('butterbeer')) {
        rootColor = '#8B4513'; // Medium brown
        tipColor = '#F0E68C';  // Butter yellow
      }
      
      return {
        name: `${colorOption} (Rooted)`,
        hexColor: tipColor, // Show the lighter color as primary
        description: `Rooted style: dark roots transitioning to ${colorOption}`,
        isRooted: true,
        rootColor,
        tipColor
      };
    }
    
    return null;
  }

  /**
   * Generate SVG color chip for display
   */
  static generateColorChipSvg(colorChip: ColorChip, size: number = 40): string {
    if (colorChip.isRooted && colorChip.rootColor && colorChip.tipColor) {
      // Gradient for rooted colors
      return `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <defs>
            <linearGradient id="rooted-${colorChip.name.replace(/\s+/g, '')}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:${colorChip.rootColor};stop-opacity:1" />
              <stop offset="100%" style="stop-color:${colorChip.tipColor};stop-opacity:1" />
            </linearGradient>
          </defs>
          <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" 
                  fill="url(#rooted-${colorChip.name.replace(/\s+/g, '')})" 
                  stroke="#ddd" stroke-width="1"/>
        </svg>
      `;
    } else {
      // Solid color
      return `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" 
                  fill="${colorChip.hexColor}" 
                  stroke="#ddd" stroke-width="1"/>
        </svg>
      `;
    }
  }

  /**
   * Get CSS background for color chip
   */
  static getColorChipBackground(colorChip: ColorChip): string {
    if (colorChip.isRooted && colorChip.rootColor && colorChip.tipColor) {
      return `linear-gradient(to bottom, ${colorChip.rootColor} 0%, ${colorChip.tipColor} 100%)`;
    } else {
      return colorChip.hexColor;
    }
  }
}
