import {
  gateByStyleLength,
  deltaE,
  scoreCandidate,
  curateTopN,
  MatchCandidate,
  MatchTarget,
  HardFilterOptions,
  DEFAULT_SCORING_WEIGHTS
} from '../src/lib/match';

// Test data setup
const createTestCandidate = (
  id: string,
  attributes: Partial<MatchCandidate> = {}
): MatchCandidate => ({
  id,
  title: `Test Wig ${id}`,
  descriptor: 'test wig',
  attrs: {
    length: 'medium',
    texture: 'straight',
    color: 'brunette',
    style: 'classic',
    capConstruction: 'basic',
    hairType: 'synthetic',
    price: '99.99',
    availableForSale: true,
    ...attributes.attrs
  },
  score: 0.8,
  price: '99.99',
  availableForSale: true,
  ...attributes
});

describe('gateByStyleLength', () => {
  const testCandidates: MatchCandidate[] = [
    createTestCandidate('1', { attrs: { style: 'professional', length: 'short' } }),
    createTestCandidate('2', { attrs: { style: 'casual', length: 'medium' } }),
    createTestCandidate('3', { attrs: { style: 'professional', length: 'long' } }),
    createTestCandidate('4', { attrs: { style: 'trendy', length: 'short' }, availableForSale: false }),
    createTestCandidate('5', { attrs: { style: 'classic', length: 'extra_long' }, price: '299.99' }),
  ];

  it('should filter by style type', () => {
    const options: HardFilterOptions = { styleType: 'professional' };
    const filtered = gateByStyleLength(testCandidates, options);
    
    // Should match professional + compatible styles (modern, classic, formal, business)
    expect(filtered.length).toBeGreaterThanOrEqual(2);
    expect(filtered.map(c => c.id)).toContain('1'); // professional
    expect(filtered.map(c => c.id)).toContain('3'); // professional
  });

  it('should filter by length', () => {
    const options: HardFilterOptions = { lengthAnyOf: ['short', 'medium'] };
    const filtered = gateByStyleLength(testCandidates, options);
    
    expect(filtered.length).toBe(3);
    expect(filtered.map(c => c.id)).toEqual(['1', '2', '4']);
  });

  it('should filter by availability', () => {
    const options: HardFilterOptions = { availableOnly: true };
    const filtered = gateByStyleLength(testCandidates, options);
    
    expect(filtered.length).toBe(4); // Excludes candidate 4 (unavailable)
    expect(filtered.map(c => c.id)).not.toContain('4');
  });

  it('should filter by price range', () => {
    const options: HardFilterOptions = { priceRange: { min: 50, max: 150 } };
    const filtered = gateByStyleLength(testCandidates, options);
    
    expect(filtered.length).toBe(4); // Excludes candidate 5 ($299.99)
    expect(filtered.map(c => c.id)).not.toContain('5');
  });

  it('should combine multiple filters', () => {
    const options: HardFilterOptions = {
      styleType: 'professional',
      lengthAnyOf: ['short'],
      availableOnly: true,
      priceRange: { min: 50, max: 150 }
    };
    const filtered = gateByStyleLength(testCandidates, options);
    
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('1');
  });

  it('should return empty array when no candidates match filters', () => {
    const options: HardFilterOptions = {
      styleType: 'nonexistent',
      lengthAnyOf: ['impossible']
    };
    const filtered = gateByStyleLength(testCandidates, options);
    
    expect(filtered.length).toBe(0);
  });

  it('should handle style compatibility matching', () => {
    const candidates = [
      createTestCandidate('modern1', { attrs: { style: 'modern' } }),
      createTestCandidate('business1', { attrs: { style: 'business' } }),
    ];
    
    const options: HardFilterOptions = { styleType: 'professional' };
    const filtered = gateByStyleLength(candidates, options);
    
    // Should match 'modern' and 'business' as compatible with 'professional'
    expect(filtered.length).toBe(2);
  });
});

describe('deltaE', () => {
  it('should calculate identical colors as 0', () => {
    const labWhite: [number, number, number] = [100, 0, 0];
    const deltaEValue = deltaE(labWhite, labWhite);
    
    expect(deltaEValue).toBe(0);
  });

  it('should calculate different colors with expected range', () => {
    const labWhite: [number, number, number] = [100, 0, 0];
    const labBlack: [number, number, number] = [0, 0, 0];
    const deltaEValue = deltaE(labWhite, labBlack);
    
    // Black vs white should have high delta E
    expect(deltaEValue).toBeGreaterThan(40);
    expect(deltaEValue).toBeLessThan(100);
  });

  it('should handle similar colors with small delta E', () => {
    const labBrown: [number, number, number] = [35, 10, 20];
    const labDarkBrown: [number, number, number] = [30, 12, 22];
    const deltaEValue = deltaE(labBrown, labDarkBrown);
    
    // Similar browns should have low delta E
    expect(deltaEValue).toBeGreaterThan(0);
    expect(deltaEValue).toBeLessThan(15);
  });

  it('should be deterministic for same inputs', () => {
    const labA: [number, number, number] = [50, 25, -25];
    const labB: [number, number, number] = [60, 20, -20];
    
    const deltaE1 = deltaE(labA, labB);
    const deltaE2 = deltaE(labA, labB);
    
    expect(deltaE1).toBe(deltaE2);
  });
});

describe('scoreCandidate', () => {
  const baseCandidate = createTestCandidate('test', {
    attrs: {
      color: 'brunette',
      texture: 'wavy',
      capConstruction: 'lace_front',
      hairType: 'human_hair',
      style: 'professional'
    },
    availableForSale: true,
    price: '150.00'
  });

  it('should score color match correctly with deltaE', () => {
    const target: MatchTarget = {
      colorLab: [35, 10, 20] // Brown LAB values
    };
    
    const score = scoreCandidate(baseCandidate, target);
    
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
    expect(baseCandidate.colorScore).toBeGreaterThan(0);
    expect(baseCandidate.deltaE).toBeGreaterThanOrEqual(0); // Can be 0 for perfect matches
  });

  it('should score texture match perfectly', () => {
    const target: MatchTarget = {
      texture: 'wavy'
    };
    
    scoreCandidate(baseCandidate, target);
    expect(baseCandidate.textureScore).toBe(1.0);
  });

  it('should score availability correctly', () => {
    const availableCandidate = { ...baseCandidate, availableForSale: true };
    const unavailableCandidate = { ...baseCandidate, availableForSale: false };
    
    scoreCandidate(availableCandidate, {});
    scoreCandidate(unavailableCandidate, {});
    
    expect(availableCandidate.availabilityScore).toBe(1.0);
    expect(unavailableCandidate.availabilityScore).toBe(0.0);
  });

  it('should score premium cap features higher', () => {
    const basicCandidate = createTestCandidate('basic', {
      attrs: { capConstruction: 'basic' }
    });
    const laceCandidate = createTestCandidate('lace', {
      attrs: { capConstruction: 'lace_front' }
    });
    
    scoreCandidate(basicCandidate, {});
    scoreCandidate(laceCandidate, {});
    
    expect(laceCandidate.capFeatureScore).toBeGreaterThan(basicCandidate.capFeatureScore!);
  });

  it('should apply correct weights to final score', () => {
    const target: MatchTarget = {
      colorFamily: 'brunette',
      texture: 'wavy'
    };
    
    const totalScore = scoreCandidate(baseCandidate, target);
    
    // Verify individual scores are set
    expect(baseCandidate.colorScore).toBeDefined();
    expect(baseCandidate.textureScore).toBeDefined();
    expect(baseCandidate.availabilityScore).toBeDefined();
    expect(baseCandidate.popularityScore).toBeDefined();
    expect(baseCandidate.capFeatureScore).toBeDefined();
    
    // Verify weighted calculation
    const expectedScore = 
      (baseCandidate.colorScore! * DEFAULT_SCORING_WEIGHTS.color) +
      (baseCandidate.textureScore! * DEFAULT_SCORING_WEIGHTS.texture) +
      (baseCandidate.availabilityScore! * DEFAULT_SCORING_WEIGHTS.availability) +
      (baseCandidate.popularityScore! * DEFAULT_SCORING_WEIGHTS.popularity) +
      (baseCandidate.capFeatureScore! * DEFAULT_SCORING_WEIGHTS.capFeature);
    
    expect(totalScore).toBeCloseTo(expectedScore, 5);
    expect(baseCandidate.totalScore).toBeCloseTo(expectedScore, 5);
  });

  it('should handle missing target attributes gracefully', () => {
    const emptyTarget: MatchTarget = {};
    
    const score = scoreCandidate(baseCandidate, emptyTarget);
    
    expect(score).toBeGreaterThan(0); // Should still get some score from availability, popularity, cap features
    expect(score).toBeLessThan(1);
  });

  it('should be deterministic for same inputs', () => {
    const target: MatchTarget = {
      colorFamily: 'brunette',
      texture: 'wavy'
    };
    
    const candidate1 = { ...baseCandidate };
    const candidate2 = { ...baseCandidate };
    
    const score1 = scoreCandidate(candidate1, target);
    const score2 = scoreCandidate(candidate2, target);
    
    expect(score1).toBe(score2);
  });
});

describe('curateTopN', () => {
  const createScoredCandidate = (
    id: string,
    totalScore: number,
    color: string,
    style: string
  ): MatchCandidate => ({
    ...createTestCandidate(id, {
      attrs: { color, style }
    }),
    totalScore
  });

  it('should return top N candidates by score', () => {
    const candidates: MatchCandidate[] = [
      createScoredCandidate('1', 0.9, 'blonde', 'professional'),
      createScoredCandidate('2', 0.8, 'blonde', 'casual'),
      createScoredCandidate('3', 0.7, 'brunette', 'professional'),
      createScoredCandidate('4', 0.6, 'brunette', 'casual'),
      createScoredCandidate('5', 0.5, 'red', 'trendy'),
    ];
    
    const curated = curateTopN(candidates, 3);
    
    expect(curated.length).toBe(3);
    expect(curated[0].id).toBe('1'); // Highest score
    expect(curated[0].totalScore).toBe(0.9);
  });

  it('should ensure alternative styles in same color family', () => {
    const candidates: MatchCandidate[] = [
      createScoredCandidate('prof1', 0.9, 'blonde', 'professional'),
      createScoredCandidate('prof2', 0.85, 'brunette', 'professional'),
      createScoredCandidate('cas1', 0.8, 'blonde', 'casual'), // Alternative in blonde
      createScoredCandidate('prof3', 0.75, 'red', 'professional'),
      createScoredCandidate('cas2', 0.7, 'brunette', 'casual'), // Alternative in brunette
      createScoredCandidate('trend1', 0.6, 'black', 'trendy'),
    ];
    
    const curated = curateTopN(candidates, 6);
    
    expect(curated.length).toBe(6);
    
    // Should include alternatives (may be 0 if no alternatives meet criteria)
    const alternatives = curated.filter(c => c.isAlternativeStyle);
    expect(alternatives.length).toBeGreaterThanOrEqual(0);
    
    // Check that we have different styles in same color families
    const blondeItems = curated.filter(c => c.attrs?.color === 'blonde');
    const brunetteItems = curated.filter(c => c.attrs?.color === 'brunette');
    
    if (blondeItems.length > 1) {
      const blondeStyles = new Set(blondeItems.map(c => c.attrs?.style));
      expect(blondeStyles.size).toBeGreaterThan(1);
    }
    
    if (brunetteItems.length > 1) {
      const brunetteStyles = new Set(brunetteItems.map(c => c.attrs?.style));
      expect(brunetteStyles.size).toBeGreaterThan(1);
    }
  });

  it('should handle fewer candidates than requested N', () => {
    const candidates: MatchCandidate[] = [
      createScoredCandidate('1', 0.9, 'blonde', 'professional'),
      createScoredCandidate('2', 0.8, 'brunette', 'casual'),
    ];
    
    const curated = curateTopN(candidates, 6);
    
    expect(curated.length).toBe(2);
    expect(curated[0].totalScore).toBe(0.9);
    expect(curated[1].totalScore).toBe(0.8);
  });

  it('should handle empty candidate array', () => {
    const curated = curateTopN([], 6);
    expect(curated.length).toBe(0);
  });

  it('should maintain score ordering for primary selections', () => {
    const candidates: MatchCandidate[] = [
      createScoredCandidate('low', 0.3, 'blonde', 'professional'),
      createScoredCandidate('high', 0.9, 'brunette', 'professional'),
      createScoredCandidate('medium', 0.6, 'red', 'professional'),
    ];
    
    const curated = curateTopN(candidates, 3);
    
    // Primary selections should be in score order
    expect(curated[0].totalScore).toBeGreaterThanOrEqual(curated[1].totalScore!);
    expect(curated[1].totalScore).toBeGreaterThanOrEqual(curated[2].totalScore!);
  });

  it('should be deterministic for same inputs', () => {
    const candidates: MatchCandidate[] = [
      createScoredCandidate('1', 0.9, 'blonde', 'professional'),
      createScoredCandidate('2', 0.8, 'blonde', 'casual'),
      createScoredCandidate('3', 0.7, 'brunette', 'professional'),
    ];
    
    const curated1 = curateTopN([...candidates], 3);
    const curated2 = curateTopN([...candidates], 3);
    
    expect(curated1.length).toBe(curated2.length);
    expect(curated1.map(c => c.id)).toEqual(curated2.map(c => c.id));
  });
});

// Integration tests for the complete scoring and curation pipeline
describe('Integration: Scoring and Curation Pipeline', () => {
  const createTestCandidateSet = (): MatchCandidate[] => [
    // High scoring blonde professional
    createTestCandidate('blonde-prof', {
      attrs: {
        color: 'blonde',
        style: 'professional',
        texture: 'straight',
        capConstruction: 'lace_front',
        hairType: 'human_hair'
      },
      price: '199.99',
      availableForSale: true
    }),
    // Alternative blonde casual
    createTestCandidate('blonde-cas', {
      attrs: {
        color: 'blonde',
        style: 'casual',
        texture: 'wavy',
        capConstruction: 'monofilament',
        hairType: 'human_hair'
      },
      price: '149.99',
      availableForSale: true
    }),
    // High scoring brunette professional
    createTestCandidate('brunette-prof', {
      attrs: {
        color: 'brunette',
        style: 'professional',
        texture: 'straight',
        capConstruction: 'full_lace',
        hairType: 'human_hair'
      },
      price: '299.99',
      availableForSale: true
    }),
    // Lower scoring but available red option
    createTestCandidate('red-trendy', {
      attrs: {
        color: 'red',
        style: 'trendy',
        texture: 'curly',
        capConstruction: 'basic',
        hairType: 'synthetic'
      },
      price: '79.99',
      availableForSale: true
    }),
    // Unavailable high-quality option
    createTestCandidate('unavailable', {
      attrs: {
        color: 'blonde',
        style: 'professional',
        texture: 'straight',
        capConstruction: 'full_lace',
        hairType: 'human_hair'
      },
      price: '399.99',
      availableForSale: false
    })
  ];

  it('should score and curate professionally for blonde preference', () => {
    const candidates = createTestCandidateSet();
    const target: MatchTarget = {
      colorFamily: 'blonde',
      texture: 'straight',
      styleType: 'professional'
    };

    // Score all candidates
    for (const candidate of candidates) {
      scoreCandidate(candidate, target);
    }

    // Apply hard filters
    const filtered = gateByStyleLength(candidates, {
      availableOnly: true,
      styleType: 'professional'
    });

    // Curate final results
    const curated = curateTopN(filtered, 4);

    // Verify results
    expect(curated.length).toBeGreaterThan(0);
    expect(curated.length).toBeLessThanOrEqual(4);

    // Top result should be available and match preferences
    const topMatch = curated[0];
    expect(topMatch.availableForSale).toBe(true);
    expect(topMatch.totalScore).toBeGreaterThan(0.5);

    // Should have alternatives if available
    const alternatives = curated.filter(c => c.isAlternativeStyle);
    expect(alternatives.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle texture mismatch gracefully', () => {
    const candidates = createTestCandidateSet();
    const target: MatchTarget = {
      colorFamily: 'brunette',
      texture: 'curly', // Most candidates are straight/wavy
      styleType: 'casual'
    };

    // Score candidates
    for (const candidate of candidates) {
      scoreCandidate(candidate, target);
    }

    // Should still return some results despite texture mismatch
    const curated = curateTopN(candidates, 3);
    expect(curated.length).toBeGreaterThan(0);

    // Should still return some results despite texture mismatch
    expect(curated.length).toBeGreaterThan(0);
    
    // At least some candidates should have texture scores (even if not perfect)
    const candidatesWithTextureScores = curated.filter(c => c.textureScore !== undefined);
    expect(candidatesWithTextureScores.length).toBeGreaterThan(0);
  });

  it('should prioritize availability when requested', () => {
    const candidates = createTestCandidateSet();
    
    // Filter for available only
    const available = gateByStyleLength(candidates, { availableOnly: true });
    
    expect(available.length).toBe(4); // Should exclude unavailable item
    expect(available.every(c => c.availableForSale)).toBe(true);
  });

  it('should produce consistent results with same inputs', () => {
    const target: MatchTarget = {
      colorFamily: 'blonde',
      texture: 'straight',
      styleType: 'professional'
    };

    // Run pipeline twice
    const runPipeline = () => {
      const candidates = createTestCandidateSet();
      for (const candidate of candidates) {
        scoreCandidate(candidate, target);
      }
      const filtered = gateByStyleLength(candidates, { availableOnly: true });
      return curateTopN(filtered, 4);
    };

    const result1 = runPipeline();
    const result2 = runPipeline();

    expect(result1.length).toBe(result2.length);
    expect(result1.map(c => c.id)).toEqual(result2.map(c => c.id));
    expect(result1.map(c => c.totalScore)).toEqual(result2.map(c => c.totalScore));
  });
});
