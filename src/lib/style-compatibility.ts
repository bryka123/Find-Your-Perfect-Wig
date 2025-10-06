/**
 * Style Compatibility Matrix
 * Determines how well different wig styles match user preferences
 */

export interface StyleProfile {
  silhouette: 'sleek' | 'voluminous' | 'tousled' | 'spiky' | 'smooth' | 'natural' | 'edgy';
  maintenance: 'low' | 'medium' | 'high';
  formality: 'casual' | 'versatile' | 'formal' | 'edgy' | 'classic';
  ageGroup: 'youthful' | 'mature' | 'versatile';
}

/**
 * Calculate compatibility between user style and product style
 */
export function calculateStyleCompatibility(
  userStyle: Partial<StyleProfile>,
  productStyle: Partial<StyleProfile>
): number {
  let score = 1.0;

  // Silhouette compatibility matrix
  if (userStyle.silhouette && productStyle.silhouette) {
    score *= getSilhouetteCompatibility(userStyle.silhouette, productStyle.silhouette);
  }

  // Formality compatibility
  if (userStyle.formality && productStyle.formality) {
    score *= getFormalityCompatibility(userStyle.formality, productStyle.formality);
  }

  // Age group compatibility
  if (userStyle.ageGroup && productStyle.ageGroup) {
    score *= getAgeCompatibility(userStyle.ageGroup, productStyle.ageGroup);
  }

  return score;
}

/**
 * Silhouette compatibility scoring
 */
function getSilhouetteCompatibility(user: string, product: string): number {
  const compatibilityMatrix: Record<string, Record<string, number>> = {
    'sleek': {
      'sleek': 1.0,
      'smooth': 0.9,
      'natural': 0.7,
      'voluminous': 0.5,
      'tousled': 0.4,
      'edgy': 0.3,
      'spiky': 0.1  // Very poor match
    },
    'smooth': {
      'smooth': 1.0,
      'sleek': 0.9,
      'natural': 0.8,
      'voluminous': 0.6,
      'tousled': 0.4,
      'edgy': 0.2,
      'spiky': 0.1  // Very poor match
    },
    'natural': {
      'natural': 1.0,
      'smooth': 0.8,
      'sleek': 0.7,
      'tousled': 0.7,
      'voluminous': 0.6,
      'edgy': 0.4,
      'spiky': 0.3
    },
    'voluminous': {
      'voluminous': 1.0,
      'tousled': 0.7,
      'natural': 0.6,
      'sleek': 0.5,
      'smooth': 0.6,
      'edgy': 0.5,
      'spiky': 0.4
    },
    'tousled': {
      'tousled': 1.0,
      'voluminous': 0.7,
      'natural': 0.7,
      'edgy': 0.6,
      'spiky': 0.5,
      'smooth': 0.4,
      'sleek': 0.4
    },
    'edgy': {
      'edgy': 1.0,
      'spiky': 0.8,
      'tousled': 0.6,
      'voluminous': 0.5,
      'natural': 0.4,
      'sleek': 0.3,
      'smooth': 0.2
    },
    'spiky': {
      'spiky': 1.0,
      'edgy': 0.8,
      'tousled': 0.5,
      'voluminous': 0.4,
      'natural': 0.3,
      'smooth': 0.1,  // Very poor match
      'sleek': 0.1     // Very poor match
    }
  };

  return compatibilityMatrix[user]?.[product] || 0.5;
}

/**
 * Formality compatibility scoring
 */
function getFormalityCompatibility(user: string, product: string): number {
  const compatibilityMatrix: Record<string, Record<string, number>> = {
    'classic': {
      'classic': 1.0,
      'versatile': 0.8,
      'formal': 0.7,
      'casual': 0.4,
      'edgy': 0.2
    },
    'versatile': {
      'versatile': 1.0,
      'classic': 0.8,
      'casual': 0.8,
      'formal': 0.8,
      'edgy': 0.6
    },
    'casual': {
      'casual': 1.0,
      'versatile': 0.8,
      'edgy': 0.6,
      'classic': 0.4,
      'formal': 0.3
    },
    'formal': {
      'formal': 1.0,
      'classic': 0.7,
      'versatile': 0.8,
      'casual': 0.3,
      'edgy': 0.2
    },
    'edgy': {
      'edgy': 1.0,
      'casual': 0.6,
      'versatile': 0.6,
      'classic': 0.2,
      'formal': 0.2
    }
  };

  return compatibilityMatrix[user]?.[product] || 0.6;
}

/**
 * Age group compatibility scoring
 */
function getAgeCompatibility(user: string, product: string): number {
  const compatibilityMatrix: Record<string, Record<string, number>> = {
    'youthful': {
      'youthful': 1.0,
      'versatile': 0.9,
      'mature': 0.4
    },
    'versatile': {
      'versatile': 1.0,
      'youthful': 0.9,
      'mature': 0.9
    },
    'mature': {
      'mature': 1.0,
      'versatile': 0.9,
      'youthful': 0.4
    }
  };

  return compatibilityMatrix[user]?.[product] || 0.7;
}

/**
 * Detect style profile from product attributes
 */
export function detectProductStyleProfile(visualAttributes: any): StyleProfile {
  const style = visualAttributes.style?.toLowerCase() || '';
  const texture = visualAttributes.texture?.toLowerCase() || '';
  const coverage = visualAttributes.coverage?.toLowerCase() || '';

  // Determine silhouette
  let silhouette: StyleProfile['silhouette'] = 'natural';
  if (style.includes('spiky') || style.includes('punk')) {
    silhouette = 'spiky';
  } else if (style.includes('sleek') || style.includes('straight')) {
    silhouette = 'sleek';
  } else if (style.includes('smooth')) {
    silhouette = 'smooth';
  } else if (style.includes('volum') || style.includes('full')) {
    silhouette = 'voluminous';
  } else if (style.includes('tousled') || style.includes('messy')) {
    silhouette = 'tousled';
  } else if (style.includes('edgy') || style.includes('choppy')) {
    silhouette = 'edgy';
  }

  // Determine maintenance level
  let maintenance: StyleProfile['maintenance'] = 'medium';
  if (texture === 'curly' || texture === 'kinky' || silhouette === 'spiky') {
    maintenance = 'high';
  } else if (texture === 'straight' && (silhouette === 'sleek' || silhouette === 'smooth')) {
    maintenance = 'low';
  }

  // Determine formality
  let formality: StyleProfile['formality'] = 'versatile';
  if (silhouette === 'sleek' || style.includes('elegant')) {
    formality = 'classic';
  } else if (silhouette === 'spiky' || silhouette === 'edgy') {
    formality = 'edgy';
  } else if (style.includes('casual') || style.includes('beach')) {
    formality = 'casual';
  } else if (style.includes('professional') || style.includes('business')) {
    formality = 'formal';
  }

  // Determine age group
  let ageGroup: StyleProfile['ageGroup'] = 'versatile';
  if (style.includes('mature') || style.includes('sophisticated') || style.includes('elegant')) {
    ageGroup = 'mature';
  } else if (style.includes('fun') || style.includes('trendy') || silhouette === 'spiky') {
    ageGroup = 'youthful';
  }

  return {
    silhouette,
    maintenance,
    formality,
    ageGroup
  };
}

/**
 * Detect user style preferences from their photo
 */
export function detectUserStyleProfile(detectedStyle: any): Partial<StyleProfile> {
  const style = detectedStyle.style?.toLowerCase() || '';
  const texture = detectedStyle.texture?.toLowerCase() || '';

  const profile: Partial<StyleProfile> = {};

  // Infer desired silhouette from current style
  if (texture === 'straight' && !style.includes('messy')) {
    profile.silhouette = style.includes('sleek') ? 'sleek' : 'smooth';
  } else if (texture === 'wavy') {
    profile.silhouette = 'natural';
  } else if (texture === 'curly') {
    profile.silhouette = 'voluminous';
  }

  // Assume they want similar maintenance level
  if (texture === 'straight') {
    profile.maintenance = 'low';
  } else if (texture === 'wavy') {
    profile.maintenance = 'medium';
  } else if (texture === 'curly') {
    profile.maintenance = 'high';
  }

  // Default to versatile for unknown attributes
  profile.formality = 'versatile';
  profile.ageGroup = 'versatile';

  return profile;
}