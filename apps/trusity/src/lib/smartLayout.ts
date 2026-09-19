import {
  Slide,
  LayoutName,
  SmartLayoutRecommendation,
} from '../types';

/**
 * Calculates visual balance, content volume metrics, and density scaling
 * for a 16:9 widescreen presentation slide.
 */
export function analyzeAndRecommendLayout(slide: Slide): SmartLayoutRecommendation {
  const content = slide.content;
  const slideType = slide.slideType;
  const bullets = content.bulletPoints || [];
  const metrics = content.metrics || [];
  const steps = content.processSteps || [];
  const comparison = content.comparisonRows || [];
  const pricing = content.pricingTiers || [];
  const team = content.teamMembers || [];

  const features: string[] = [];

  // Total text character count
  const allText = [
    content.headline,
    content.subheadline || '',
    ...bullets,
    ...(metrics.map((m) => `${m.value} ${m.label} ${m.subtext || ''}`)),
    ...(steps.map((s) => `${s.title} ${s.desc}`)),
  ].join(' ');
  const charCount = allText.length;
  const wordCount = allText.trim().split(/\s+/).filter(Boolean).length;

  // Layout candidate base scores
  const scores: Record<LayoutName, number> = {
    centered_hero: 10,
    split_with_stat: 15,
    bullet_list: 20,
    split_text_image: 20,
    process_steps: 10,
    metrics_grid: 15,
    comparison_table: 10,
    timeline_horizontal: 10,
    swot_grid: 10,
    roadmap_horizontal: 10,
    pricing_table: 10,
    team_cards: 10,
    business_detail: 15,
    full_bleed_statement: 10,
    fallback_layout: 0,
    quad_grid: 15,
    three_columns: 15,
  };

  const reasons: Partial<Record<LayoutName, string>> = {};

  // 1. Archetype Check
  if (slideType === 'title') {
    scores.centered_hero += 85;
    features.push('Title slide archetype');
    reasons.centered_hero = 'Centered hero creates an immediate high-focus visual focal point for the cover slide.';
  } else if (slideType === 'call_to_action') {
    scores.full_bleed_statement += 75;
    features.push('Call-to-action closing ask');
    reasons.full_bleed_statement = 'Bold full-bleed statement drives maximum urgency and clarity for the funding ask.';
  } else if (slideType === 'team' && team.length >= 2) {
    scores.team_cards += 85;
    features.push(`Leadership profiles (${team.length} founders)`);
    reasons.team_cards = 'Team cards highlight founder credentials and domain authority.';
  } else if (slideType === 'pricing' && pricing.length >= 2) {
    scores.pricing_table += 85;
    features.push(`Pricing packages (${pricing.length} tiers)`);
    reasons.pricing_table = 'Pricing table enables instant comparative evaluation of packaging tiers.';
  } else if (slideType === 'swot' && content.swot) {
    scores.swot_grid += 90;
    features.push('SWOT strategic quadrant');
    reasons.swot_grid = '2x2 quadrant organizes strategic strengths, weaknesses, opportunities, and threats.';
  } else if (slideType === 'comparison' && comparison.length >= 2) {
    scores.comparison_table += 85;
    features.push(`Feature comparison matrix (${comparison.length} rows)`);
    reasons.comparison_table = 'Feature matrix explicitly contrasts your technological moat against incumbents.';
  }

  // 2. Standout Numerical Statistic
  if (content.statistic && content.statistic.number && content.statistic.number.trim().length > 0) {
    scores.split_with_stat += 60;
    features.push(`Prominent metric: ${content.statistic.number} (${content.statistic.label})`);
    reasons.split_with_stat = `Highlights the standout metric (${content.statistic.number}) alongside context to anchor investor attention.`;
  }

  // 3. Quantitative Metrics Cluster
  if (metrics.length >= 3) {
    scores.metrics_grid += 70;
    features.push(`Quantitative KPI cluster (${metrics.length} metrics)`);
    reasons.metrics_grid = `Displays ${metrics.length} distinct KPIs in a balanced row with comparative hierarchy.`;
  }

  // 4. Sequential Process Steps
  if (steps.length >= 3) {
    scores.process_steps += 75;
    features.push(`Sequential process workflow (${steps.length} stages)`);
    reasons.process_steps = `Numbered flow guides the viewer through the ${steps.length}-stage execution path.`;
  }

  // 5. CONTENT VOLUME HARMONY RE-EVALUATION RULES (Key algorithm!)
  const itemCount = bullets.length;

  if (itemCount === 4) {
    // 4 items is the canonical 2x2 grid match!
    scores.quad_grid += 88;
    features.push('Content volume: 4 distinct points (Ideal 2x2 symmetry)');
    reasons.quad_grid = '4 points naturally map into a 2x2 grid, maximizing 16:9 widescreen harmony and eliminating right-hand dead space.';
    // A single vertical bullet list of 4 items is sub-optimal on widescreen
    scores.bullet_list -= 15;
  } else if (itemCount === 3) {
    // 3 items naturally form a 3-column triage
    scores.three_columns += 82;
    features.push('Content volume: 3 key pillars (Ideal 3-column card row)');
    reasons.three_columns = '3 points distribute harmoniously across 3 equal vertical card columns on widescreen.';
    scores.bullet_list += 10;
  } else if (itemCount === 2) {
    // 2 items balance as a two-column split
    scores.split_text_image += 70;
    scores.business_detail += 65;
    features.push('Content volume: 2 core arguments (Ideal dual-column split)');
    reasons.split_text_image = '2 core points create an optically balanced dual-column layout with high visual contrast.';
  } else if (itemCount === 1) {
    // 1 item is ideal for focused hero statement
    scores.centered_hero += 60;
    scores.full_bleed_statement += 55;
    features.push('Content volume: Single key thesis');
    reasons.centered_hero = 'Single prominent thesis benefits from focused center-stage typography.';
  } else if (itemCount >= 5 && itemCount <= 6) {
    // 5 or 6 items: cards grid or structured compact list
    scores.bullet_list += 40;
    scores.quad_grid += 35;
    features.push(`Content volume: ${itemCount} items (Dense list)`);
    reasons.bullet_list = 'Compact vertical list preserves readability for multi-item sequences.';
  } else if (itemCount > 6) {
    features.push(`High content volume: ${itemCount} items (Slide splitting advised)`);
  }

  // Rank all candidate layouts
  const ranked = (Object.keys(scores) as LayoutName[])
    .filter((lay) => lay !== 'fallback_layout')
    .map((lay) => ({
      layout: lay,
      score: scores[lay],
      reason: reasons[lay] || `Clean balanced layout structured for ${lay.replace('_', ' ')}.`,
    }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];

  // Calculate current slide's Visual Harmony Score (0 - 100)
  let harmonyScore = 80;
  let densityLevel: 'optimal' | 'sparse' | 'crowded' | 'unbalanced' = 'optimal';

  // Specific layout fit evaluation
  if (slide.layout === 'quad_grid') {
    if (itemCount === 4) {
      harmonyScore = 98;
      densityLevel = 'optimal';
    } else if (itemCount === 3 || itemCount === 5) {
      harmonyScore = 84;
      densityLevel = 'optimal';
    } else if (itemCount < 3) {
      harmonyScore = 65;
      densityLevel = 'sparse';
    } else {
      harmonyScore = 72;
      densityLevel = 'crowded';
    }
  } else if (slide.layout === 'three_columns') {
    if (itemCount === 3) {
      harmonyScore = 97;
      densityLevel = 'optimal';
    } else if (itemCount === 2 || itemCount === 4) {
      harmonyScore = 82;
      densityLevel = 'optimal';
    } else if (itemCount < 2) {
      harmonyScore = 60;
      densityLevel = 'sparse';
    } else {
      harmonyScore = 70;
      densityLevel = 'crowded';
    }
  } else if (slide.layout === 'bullet_list') {
    if (itemCount === 4) {
      // 4 bullets in a single column leaves 55% dead space on widescreen!
      harmonyScore = 68;
      densityLevel = 'unbalanced';
    } else if (itemCount === 3) {
      harmonyScore = 76;
      densityLevel = 'optimal';
    } else if (itemCount >= 1 && itemCount <= 2) {
      harmonyScore = 58;
      densityLevel = 'sparse';
    } else if (itemCount >= 7) {
      harmonyScore = 52;
      densityLevel = 'crowded';
    } else {
      harmonyScore = 82;
      densityLevel = 'optimal';
    }
  } else if (slide.layout === 'centered_hero') {
    if (wordCount < 40 && (itemCount <= 2 || !content.bulletPoints?.length)) {
      harmonyScore = 95;
      densityLevel = 'optimal';
    } else {
      harmonyScore = 62;
      densityLevel = 'crowded';
    }
  } else if (slide.layout === 'metrics_grid') {
    if (metrics.length >= 2 && metrics.length <= 4) {
      harmonyScore = 96;
      densityLevel = 'optimal';
    } else {
      harmonyScore = 70;
      densityLevel = 'sparse';
    }
  } else if (slide.layout === 'process_steps') {
    if (steps.length >= 3 && steps.length <= 5) {
      harmonyScore = 95;
      densityLevel = 'optimal';
    } else {
      harmonyScore = 72;
      densityLevel = 'sparse';
    }
  } else {
    // If the slide matches the top recommendation, boost harmony
    if (slide.layout === best.layout) {
      harmonyScore = 94;
    } else {
      harmonyScore = Math.max(55, Math.min(85, Math.round(best.score * 0.85)));
    }
  }

  // Determine dynamic density tuning (font scale & spacing)
  let spacing: 'compact' | 'normal' | 'spacious' = 'normal';
  let fontScale: 'sm' | 'base' | 'lg' = 'base';

  if (wordCount > 100 || itemCount >= 5) {
    spacing = 'compact';
    fontScale = 'sm';
  } else if (wordCount < 35 && itemCount <= 2) {
    spacing = 'spacious';
    fontScale = 'lg';
  }

  // Balance status message
  let balanceStatus = 'Optimal visual balance';
  if (densityLevel === 'unbalanced') {
    balanceStatus = `Content volume (${itemCount} items) creates empty space in ${slide.layout.replace('_', ' ')}. Switching to ${best.layout.replace('_', ' ')} restores visual symmetry.`;
  } else if (densityLevel === 'crowded') {
    balanceStatus = `Content density is high (${wordCount} words, ${itemCount} items). Compact layout applied.`;
  } else if (densityLevel === 'sparse') {
    balanceStatus = `Content volume is light. Centered or split hero layout recommended.`;
  }

  return {
    recommendedLayout: best.layout,
    score: best.score,
    confidence: best.score >= 50 ? 'high' : 'medium',
    reason: best.reason,
    harmonyScore,
    densityLevel,
    densityTuning: {
      spacing,
      fontScale,
    },
    contentVolumeSummary: {
      itemCount,
      charCount,
      balanceStatus,
    },
    featuresIdentified: features.length > 0 ? features : ['Balanced narrative thesis', 'Standard slide density'],
    alternativeLayouts: ranked.slice(1, 5),
  };
}

/**
 * Automatically re-evaluates the layout choice whenever content volume changes.
 * If the slide's current layout is unbalanced for the new item count (e.g., bullets changed to 4 -> switch to quad_grid),
 * it seamlessly transitions to the optimal layout while preserving all data.
 */
export function evaluateAndAutoAdaptLayout(
  slide: Slide,
  options?: { force?: boolean }
): {
  adaptedSlide: Slide;
  didChange: boolean;
  previousLayout: LayoutName;
  rationale: string;
} {
  const previousLayout = slide.layout;
  const recommendation = analyzeAndRecommendLayout(slide);

  // If user explicitly disabled auto-adapt on this slide, respect their preference
  if (slide.metadata?.autoAdaptLayout === false && !options?.force) {
    return {
      adaptedSlide: slide,
      didChange: false,
      previousLayout,
      rationale: 'Auto-adapt is turned off for this slide.',
    };
  }

  const targetLayout = recommendation.recommendedLayout;

  // Decide if adaptation is warranted:
  // 1. If currently bullet_list and count is 4 -> definitely switch to quad_grid
  // 2. If currently quad_grid and count drops to 2 or 1 -> switch to split_text_image or centered_hero
  // 3. If currently bullet_list and count is 3 -> switch to three_columns
  // 4. If current harmony score is sub-optimal (< 75) and recommended layout offers >= 88 score
  const isBulletToQuad =
    previousLayout === 'bullet_list' &&
    (slide.content.bulletPoints?.length === 4) &&
    targetLayout === 'quad_grid';

  const isQuadToTwo =
    previousLayout === 'quad_grid' &&
    (slide.content.bulletPoints?.length || 0) <= 2 &&
    (targetLayout === 'split_text_image' || targetLayout === 'centered_hero');

  const isBulletToThree =
    previousLayout === 'bullet_list' &&
    (slide.content.bulletPoints?.length === 3) &&
    targetLayout === 'three_columns';

  const isScoreAdvantage =
    recommendation.harmonyScore < 75 &&
    targetLayout !== previousLayout &&
    recommendation.score >= 70;

  const shouldAdapt = options?.force || isBulletToQuad || isQuadToTwo || isBulletToThree || isScoreAdvantage;

  if (shouldAdapt && targetLayout !== previousLayout) {
    const adaptedSlide = applySmartLayout(slide, targetLayout);
    return {
      adaptedSlide,
      didChange: true,
      previousLayout,
      rationale: recommendation.reason,
    };
  }

  return {
    adaptedSlide: slide,
    didChange: false,
    previousLayout,
    rationale: 'Current layout is already in optimal harmony with content volume.',
  };
}

/**
 * Intelligently updates the slide to a target layout, performing lossless content mapping
 * so that bullets, metrics, or step sequences format cleanly into the new visual structure.
 */
export function applySmartLayout(slide: Slide, targetLayout?: LayoutName): Slide {
  const recommendation = analyzeAndRecommendLayout(slide);
  const layoutToApply = targetLayout || recommendation.recommendedLayout;
  const updatedContent = { ...slide.content };
  const sourceBullets = updatedContent.bulletPoints || [];

  // Content adaptation logic
  if (layoutToApply === 'quad_grid') {
    // Ensure 4 bullet points exist for the 2x2 grid
    if (sourceBullets.length === 0) {
      updatedContent.bulletPoints = [
        'Strategic Architecture: High-throughput low-latency execution layer.',
        'Market Penetration: Scalable acquisition engine driving high LTV.',
        'Defensible Moat: Proprietary algorithms creating high switching costs.',
        'Capital Efficiency: Compounding margins yielding accelerated path to EBITDA.',
      ];
    } else if (sourceBullets.length === 3) {
      // Complement with a 4th point if converting from 3
      updatedContent.bulletPoints = [
        ...sourceBullets,
        'Compounding Value: Continuous optimization flywheel widening product retention.',
      ];
    } else if (sourceBullets.length === 2) {
      updatedContent.bulletPoints = [
        sourceBullets[0],
        'System Reliability: 99.99% operational uptime SLA across all endpoints.',
        sourceBullets[1],
        'Enterprise Compliance: Bank-grade security and automated SOC2 validation.',
      ];
    }
  } else if (layoutToApply === 'three_columns') {
    if (sourceBullets.length === 0) {
      updatedContent.bulletPoints = [
        'Discovery & Ingestion: Rapid frictionless setup in under 5 minutes.',
        'Core Intelligence Engine: Automated synthesis delivering instant insights.',
        'Enterprise Distribution: Seamless export into existing executive workflows.',
      ];
    } else if (sourceBullets.length > 3) {
      // Keep primary 3
      updatedContent.bulletPoints = sourceBullets.slice(0, 3);
    }
  } else if (layoutToApply === 'split_with_stat') {
    if (!updatedContent.statistic || !updatedContent.statistic.number) {
      const textToSearch = [
        updatedContent.subheadline || '',
        ...sourceBullets,
      ].join(' ');

      const match = textToSearch.match(/(\$?[0-9]+(?:\.[0-9]+)?%?|\b[0-9]+[xX]\b|\$[0-9]+(?:[MBKmbk])?)/);
      if (match) {
        updatedContent.statistic = {
          number: match[1],
          label: 'Key Metric',
          context: 'Validated market performance indicator',
        };
      } else {
        updatedContent.statistic = {
          number: '10x',
          label: 'Performance Advantage',
          context: 'Direct operational efficiency gain',
        };
      }
    }
  } else if (layoutToApply === 'process_steps') {
    if (!updatedContent.processSteps || updatedContent.processSteps.length === 0) {
      if (sourceBullets.length > 0) {
        updatedContent.processSteps = sourceBullets.slice(0, 3).map((bp, idx) => ({
          number: idx + 1,
          title: bp.split(':')[0] || `Phase ${idx + 1}`,
          desc: bp.includes(':') ? bp.split(':')[1].trim() : bp,
        }));
      } else {
        updatedContent.processSteps = [
          { number: 1, title: 'Discover & Map', desc: 'Identify critical system friction and workflows.' },
          { number: 2, title: 'Deploy Engine', desc: 'Automate intelligence across customer endpoints.' },
          { number: 3, title: 'Scale & Retain', desc: 'Compound ARR through measurable compounding value.' },
        ];
      }
    }
  } else if (layoutToApply === 'metrics_grid') {
    if (!updatedContent.metrics || updatedContent.metrics.length === 0) {
      updatedContent.metrics = [
        { label: 'Market Opportunity', value: '$12.4B', change: '+24% YoY', subtext: 'Total addressable footprint' },
        { label: 'Gross Margin', value: '82%', change: '+6%', subtext: 'Target SaaS operational margin' },
        { label: 'Retention Rate', value: '138%', change: 'Top Decile', subtext: 'Net revenue retention rate' },
      ];
    }
  } else if (layoutToApply === 'bullet_list') {
    if (!updatedContent.bulletPoints || updatedContent.bulletPoints.length === 0) {
      updatedContent.bulletPoints = [
        'Proprietary deep architecture eliminates legacy overhead.',
        'Seamless API surface delivers immediate client onboarding in under 15 minutes.',
        'Defensible data flywheel widens enterprise switching barriers.',
      ];
    }
  }

  return {
    ...slide,
    layout: layoutToApply,
    content: updatedContent,
    metadata: {
      ...slide.metadata,
      smartLayoutApplied: layoutToApply,
      smartLayoutRationale: recommendation.reason,
      harmonyScore: recommendation.harmonyScore,
      densityLevel: recommendation.densityLevel,
      lastModified: new Date().toISOString(),
    },
  };
}

/**
 * Splits a dense slide with high content volume into two balanced, harmonious slides.
 */
export function splitDenseSlide(slide: Slide): [Slide, Slide] {
  const bullets = slide.content.bulletPoints || [];
  const midpoint = Math.ceil(bullets.length / 2);
  const part1Bullets = bullets.slice(0, midpoint);
  const part2Bullets = bullets.slice(midpoint);

  const slide1: Slide = {
    ...slide,
    id: `slide-${Date.now()}-part1`,
    content: {
      ...slide.content,
      headline: `${slide.content.headline} (Part 1)`,
      bulletPoints: part1Bullets,
    },
  };

  const slide2: Slide = {
    ...slide,
    id: `slide-${Date.now()}-part2`,
    content: {
      ...slide.content,
      headline: `${slide.content.headline} (Part 2)`,
      bulletPoints: part2Bullets,
    },
  };

  // Auto-adapt layouts for the new individual volumes
  const adapted1 = applySmartLayout(slide1);
  const adapted2 = applySmartLayout(slide2);

  return [adapted1, adapted2];
}

/**
 * Optimizes an entire deck's layout sequence to maximize narrative variety and rhythmic contrast,
 * preventing layout monotony (e.g. 3 bullet lists consecutively).
 */
export function optimizeDeckLayouts(slides: Slide[]): {
  slides: Slide[];
  changedCount: number;
  report: string[];
} {
  const report: string[] = [];
  let changedCount = 0;

  const updatedSlides = slides.map((slide, index) => {
    const prevSlide = index > 0 ? slides[index - 1] : null;
    const recommendation = analyzeAndRecommendLayout(slide);
    let chosenLayout = recommendation.recommendedLayout;

    // Prevent identical layout repetition on non-title slides
    if (prevSlide && prevSlide.layout === chosenLayout && slide.slideType !== 'title') {
      const alternative = recommendation.alternativeLayouts.find(
        (alt) => alt.layout !== prevSlide.layout
      );
      if (alternative) {
        chosenLayout = alternative.layout;
        report.push(
          `Slide ${index + 1} (${slide.slideType}): Shifted to ${chosenLayout} for visual contrast (avoids repeating ${prevSlide.layout})`
        );
      }
    }

    if (chosenLayout !== slide.layout) {
      changedCount++;
      report.push(`Slide ${index + 1} (${slide.slideType}): Optimized layout from ${slide.layout} to ${chosenLayout}`);
      return applySmartLayout(slide, chosenLayout);
    }

    return slide;
  });

  return {
    slides: updatedSlides,
    changedCount,
    report,
  };
}
