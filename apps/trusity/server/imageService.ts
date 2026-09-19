import { GoogleGenAI, Type } from '@google/genai';
import {
  Slide,
  VisualContextAnalysis,
  StockPhotoItem,
  VisualGenerationRequest,
  SlideVisualAsset,
} from '../src/types';

// Lazy client initialization with proper User-Agent header
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Curated high-resolution stock photo catalog across all business pitch domains
 * Using reliable, high-resolution direct Unsplash CDN URLs with proper photographer attribution
 */
export const STOCK_PHOTOS: StockPhotoItem[] = [
  // Technology & AI
  {
    id: 'tech-ai-server-rack',
    title: 'High-Density Cloud Data Center & Fiber Optic Matrix',
    category: 'Technology & AI',
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80',
    author: 'Taylor Vick',
    authorUrl: 'https://unsplash.com/@tvick',
    aspectRatio: '16:9',
    tags: ['ai', 'cloud', 'servers', 'technology', 'infrastructure', 'data', 'security'],
  },
  {
    id: 'tech-neural-chip',
    title: 'Advanced Microprocessor & AI Quantum Compute Circuit',
    category: 'Technology & AI',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
    author: 'Alexandre Debiève',
    authorUrl: 'https://unsplash.com/@alexandre_debieve',
    aspectRatio: '16:9',
    tags: ['semiconductor', 'chip', 'hardware', 'compute', 'silicon', 'ai', 'processor'],
  },
  {
    id: 'tech-abstract-code',
    title: 'Developer Engineering Matrix & Software Architecture',
    category: 'Technology & AI',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
    author: 'Markus Spiske',
    authorUrl: 'https://unsplash.com/@markusspiske',
    aspectRatio: '16:9',
    tags: ['code', 'software', 'cybersecurity', 'algorithm', 'developer', 'matrix'],
  },
  {
    id: 'tech-robotics-arm',
    title: 'Autonomous Precision Robotics & Automation Assembly',
    category: 'Technology & AI',
    url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=600&q=80',
    author: 'Alex Knight',
    authorUrl: 'https://unsplash.com/@agk42',
    aspectRatio: '16:9',
    tags: ['robotics', 'automation', 'hardware', 'future', 'manufacturing', 'innovation'],
  },

  // Business & Leadership
  {
    id: 'biz-modern-boardroom',
    title: 'Executive Glass Boardroom & Strategic Governance',
    category: 'Business & Leadership',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
    author: 'Nastuh Abootalebi',
    authorUrl: 'https://unsplash.com/@nastuh',
    aspectRatio: '16:9',
    tags: ['executive', 'boardroom', 'leadership', 'strategy', 'corporate', 'meeting'],
  },
  {
    id: 'biz-collaborative-team',
    title: 'Cross-Functional Agile Team Strategic Planning',
    category: 'Business & Leadership',
    url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
    author: 'Annie Spratt',
    authorUrl: 'https://unsplash.com/@anniespratt',
    aspectRatio: '16:9',
    tags: ['team', 'collaboration', 'startup', 'founders', 'people', 'culture'],
  },
  {
    id: 'biz-product-design-workshop',
    title: 'Design Sprint & Product Innovation Architecture',
    category: 'Business & Leadership',
    url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80',
    author: 'Alvaro Reyes',
    authorUrl: 'https://unsplash.com/@alvarordesign',
    aspectRatio: '16:9',
    tags: ['product', 'design', 'ux', 'wireframe', 'innovation', 'workshop'],
  },

  // Finance & Markets
  {
    id: 'fin-analytics-dashboard',
    title: 'Financial Analytics & Market Quantitative Data Display',
    category: 'Finance & Markets',
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80',
    author: 'Luke Chesser',
    authorUrl: 'https://unsplash.com/@lukechesser',
    aspectRatio: '16:9',
    tags: ['finance', 'analytics', 'charts', 'revenue', 'growth', 'metrics', 'kpi'],
  },
  {
    id: 'fin-stock-market-ticker',
    title: 'Capital Markets & Trading Liquidity Exchange',
    category: 'Finance & Markets',
    url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80',
    author: 'Maxim Hopman',
    authorUrl: 'https://unsplash.com/@maximhopman',
    aspectRatio: '16:9',
    tags: ['investing', 'venture capital', 'equity', 'stocks', 'ipo', 'valuation'],
  },
  {
    id: 'fin-fintech-cryptocurrency',
    title: 'Next-Gen Decentralized Ledger & FinTech Rails',
    category: 'Finance & Markets',
    url: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=600&q=80',
    author: 'Kanchanara',
    authorUrl: 'https://unsplash.com/@kanchanara',
    aspectRatio: '16:9',
    tags: ['fintech', 'crypto', 'blockchain', 'payments', 'banking', 'wallet'],
  },

  // Abstract & Shapes
  {
    id: 'abs-neon-wave-mesh',
    title: 'Luminescent Fluid Wave & Digital Gradient Horizon',
    category: 'Abstract & Shapes',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    author: 'Milad Fakurian',
    authorUrl: 'https://unsplash.com/@fakurian',
    aspectRatio: '16:9',
    tags: ['abstract', 'gradient', 'mesh', 'modern', '3d', 'minimal', 'vibrant'],
  },
  {
    id: 'abs-dark-geometric-glass',
    title: 'Dark Monolith Prisms & Refractive Glass Crystals',
    category: 'Abstract & Shapes',
    url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=600&q=80',
    author: 'Fakurian Design',
    authorUrl: 'https://unsplash.com/@fakurian',
    aspectRatio: '16:9',
    tags: ['glassmorphism', 'crystals', 'monolith', 'geometric', 'dark mode', 'luxury'],
  },
  {
    id: 'abs-cyan-purple-fluid',
    title: 'Quantum Energy Particle Flow & Neon Atmosphere',
    category: 'Abstract & Shapes',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=600&q=80',
    author: 'Pawel Czerwinski',
    authorUrl: 'https://unsplash.com/@pawel_czerwinski',
    aspectRatio: '16:9',
    tags: ['particles', 'energy', 'fluid', 'indigo', 'purple', 'wallpaper'],
  },

  // Architecture & Minimal
  {
    id: 'arch-modern-skyscraper',
    title: 'Architectural Geometric Facade & Corporate Enterprise',
    category: 'Architecture & Minimal',
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
    author: 'Sean Pollock',
    authorUrl: 'https://unsplash.com/@seanpollock',
    aspectRatio: '16:9',
    tags: ['skyscraper', 'architecture', 'enterprise', 'scale', 'growth', 'urban', 'modern'],
  },
  {
    id: 'arch-minimalist-spiral',
    title: 'Symmetrical Spiral Curves & Precision Engineering',
    category: 'Architecture & Minimal',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80',
    author: 'Nick Fewings',
    authorUrl: 'https://unsplash.com/@jannerboy62',
    aspectRatio: '16:9',
    tags: ['minimalist', 'curves', 'monochrome', 'clean', 'structure', 'art'],
  },

  // Green & Sustainable Climate
  {
    id: 'eco-solar-wind-grid',
    title: 'Renewable Clean Energy Wind Turbine & Solar Generation',
    category: 'Green & Sustainable',
    url: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=600&q=80',
    author: 'Karsten Würth',
    authorUrl: 'https://unsplash.com/@karsten_wuerth',
    aspectRatio: '16:9',
    tags: ['cleantech', 'climate', 'solar', 'wind', 'sustainability', 'esg', 'green'],
  },

  // Healthcare & Science
  {
    id: 'health-biotech-lab',
    title: 'High-Precision Molecular Bio-Analytics & Medical Science',
    category: 'Healthcare & Science',
    url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80',
    author: 'National Cancer Institute',
    authorUrl: 'https://unsplash.com/@nci',
    aspectRatio: '16:9',
    tags: ['biotech', 'healthcare', 'science', 'research', 'lab', 'medicine', 'dna'],
  },
];

/**
 * Stage 1: AI Visual Context Analyzer
 * Analyzes the slide's headline, subheadline, layout, and narrative to determine
 * optimal visual search keywords, artistic styles, placements, and custom generation prompts.
 */
export async function analyzeSlideVisualContext(
  slide: Slide,
  themeName?: string,
  fullPlanTitle?: string
): Promise<VisualContextAnalysis> {
  const ai = getGeminiClient();

  if (ai) {
    try {
      const prompt = `Analyze this presentation pitch slide and formulate precise visual media recommendations.
Presentation: "${fullPlanTitle || 'Venture Pitch Deck'}"
Theme: "${themeName || 'Modern High-Tech'}"
Slide Type: "${slide.slideType}"
Layout: "${slide.layout}"
Headline: "${slide.content.headline}"
Subheadline: "${slide.content.subheadline || ''}"
Key Points: ${JSON.stringify(slide.content.bulletPoints || [])}

Provide:
1. 4 to 6 specific, high-yield stock photo search keywords (e.g. "cloud server rack blue", "executive strategy glass boardroom")
2. Recommended artistic visual style (e.g. "Minimalist 3D Isometric", "Dark Editorial Photography", "Clean Vector Diagram")
3. Recommended layout placement: choose strictly one of: "hero_background", "side_card", "split_media", "header_accent"
4. An expansive, highly descriptive AI image generation prompt following best practices (photorealistic / 3D render, composition, lighting matching the theme)
5. Color mood description
6. 1-sentence strategic rationale explaining why this visual elevates this specific slide.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are an award-winning creative director and pitch deck visual design consultant. You select imagery that reinforces investor credibility and emotional resonance.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              keywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '4 to 6 relevant visual search terms',
              },
              recommendedStyle: { type: Type.STRING },
              recommendedPlacement: {
                type: Type.STRING,
                enum: ['hero_background', 'side_card', 'split_media', 'header_accent'],
              },
              aiPrompt: { type: Type.STRING },
              colorMood: { type: Type.STRING },
              conceptSummary: { type: Type.STRING },
            },
            required: [
              'keywords',
              'recommendedStyle',
              'recommendedPlacement',
              'aiPrompt',
              'colorMood',
              'conceptSummary',
            ],
          },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      if (parsed.keywords && parsed.keywords.length > 0) {
        return {
          keywords: parsed.keywords,
          recommendedStyle: parsed.recommendedStyle || 'Modern 3D Isometric & Glassmorphism',
          recommendedPlacement: parsed.recommendedPlacement || 'hero_background',
          aiPrompt: parsed.aiPrompt || fallbackAIPrompt(slide),
          colorMood: parsed.colorMood || 'Deep Indigo & Electric Cyan',
          conceptSummary: parsed.conceptSummary || 'Visual metaphor emphasizing scale and technological capability.',
        };
      }
    } catch (err) {
      console.warn('[analyzeSlideVisualContext] Gemini call fallback:', err);
    }
  }

  // Graceful rule-based heuristic fallback
  return fallbackContextAnalysis(slide, themeName);
}

function fallbackAIPrompt(slide: Slide): string {
  const headline = slide.content.headline;
  return `A high-end 3D isometric visualization depicting "${headline}", featuring translucent frosted glass structures, glowing circuit conduits in deep indigo and cyan, soft ambient volumetric lighting, minimalist studio backdrop, octane render, 8k resolution.`;
}

function fallbackContextAnalysis(slide: Slide, themeName?: string): VisualContextAnalysis {
  const text = `${slide.content.headline} ${slide.content.subheadline || ''} ${slide.slideType}`.toLowerCase();

  let keywords = ['technology', 'business', 'growth', 'innovation'];
  let recommendedPlacement: 'hero_background' | 'side_card' | 'split_media' = 'hero_background';
  let recommendedStyle = 'Modern Isometric & Minimalist Photography';

  if (slide.layout === 'split_with_stat' || slide.layout === 'split_text_image') {
    recommendedPlacement = 'split_media';
  } else if (slide.layout === 'three_columns' || slide.layout === 'quad_grid') {
    recommendedPlacement = 'hero_background';
  }

  if (text.includes('ai') || text.includes('intelligence') || text.includes('software') || text.includes('tech') || text.includes('platform')) {
    keywords = ['cloud infrastructure', 'artificial intelligence', 'quantum compute', 'cybersecurity', 'neural network'];
    recommendedStyle = 'High-Tech Dark Glassmorphism';
  } else if (text.includes('market') || text.includes('traction') || text.includes('growth') || text.includes('finance') || text.includes('revenue') || text.includes('tam')) {
    keywords = ['financial analytics', 'capital markets', 'revenue chart', 'stock market', 'venture capital'];
    recommendedStyle = 'Quantitative Financial Elegance';
  } else if (text.includes('team') || text.includes('founders') || text.includes('culture') || text.includes('leadership')) {
    keywords = ['executive leadership', 'agile startup team', 'collaborative meeting', 'boardroom'];
    recommendedStyle = 'Warm Corporate Editorial';
  } else if (text.includes('esg') || text.includes('climate') || text.includes('green') || text.includes('clean')) {
    keywords = ['clean energy', 'solar turbines', 'sustainability', 'green technology'];
    recommendedStyle = 'Natural Sustainable Modernism';
  }

  return {
    keywords,
    recommendedStyle,
    recommendedPlacement,
    aiPrompt: fallbackAIPrompt(slide),
    colorMood: themeName === 'midnight' ? 'Ultra Dark & Cyan Glow' : 'Refined Executive Slate & Indigo',
    conceptSummary: `Tailored imagery matching ${slide.slideType.replace('_', ' ')} layout for maximum investor persuasion.`,
  };
}

/**
 * Stage 2: Stock Photo Search Engine
 * Searches through the curated catalog and supports custom query searches
 */
export function searchStockPhotos(
  query?: string,
  category?: string,
  aspectRatio?: string,
  limit: number = 20
): StockPhotoItem[] {
  let results = [...STOCK_PHOTOS];

  // Category filter
  if (category && category !== 'All' && category !== 'all') {
    results = results.filter(
      (p) => p.category.toLowerCase() === category.toLowerCase()
    );
  }

  // Aspect ratio filter
  if (aspectRatio && aspectRatio !== 'All' && aspectRatio !== 'all') {
    results = results.filter((p) => p.aspectRatio === aspectRatio);
  }

  // Search query filter
  if (query && query.trim().length > 0) {
    const terms = query.toLowerCase().trim().split(/\s+/);
    results = results.filter((item) => {
      const haystack = `${item.title} ${item.category} ${item.tags.join(' ')} ${item.author}`.toLowerCase();
      return terms.some((term) => haystack.includes(term));
    });

    // If exact filter yielded zero items, construct high-res CDN items based on the search term
    if (results.length === 0) {
      const safeQuery = encodeURIComponent(query.trim());
      results = [
        {
          id: `unsplash-search-${Date.now()}-1`,
          title: `${query} (High Resolution Context Capture)`,
          category: category || 'Custom Search',
          url: `https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=85`,
          thumbnailUrl: `https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80`,
          author: 'NASA Earth',
          authorUrl: 'https://unsplash.com/@nasa',
          aspectRatio: '16:9',
          tags: [query, 'global', 'technology', 'scale'],
        },
        {
          id: `unsplash-search-${Date.now()}-2`,
          title: `${query} (Architectural Perspective)`,
          category: category || 'Custom Search',
          url: `https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=85`,
          thumbnailUrl: `https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80`,
          author: 'Sean Pollock',
          authorUrl: 'https://unsplash.com/@seanpollock',
          aspectRatio: '16:9',
          tags: [query, 'corporate', 'modern'],
        },
      ];
    }
  }

  return results.slice(0, limit);
}

/**
 * Stage 3: Procedural Vector & SVG Visual Generator
 * Synthesizes bespoke, ultra-crisp vector artworks tailored to the presentation theme
 */
export function generateProceduralVisual(req: VisualGenerationRequest): SlideVisualAsset {
  const primary = req.themePrimary || '#6366f1';
  const secondary = req.themeSecondary || '#ec4899';
  const preset = req.stylePreset || 'isometric_pipeline';
  const headline = req.headline || 'Strategic Breakthrough';

  let svgMarkup = '';

  if (preset === 'neural_mesh') {
    svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="100%" height="100%">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primary}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${secondary}" stop-opacity="0.9"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="800" height="450" fill="#090d16"/>
  <!-- Network Synapses -->
  <g stroke="url(#g1)" stroke-width="2" opacity="0.4" stroke-dasharray="4 4">
    <line x1="120" y1="225" x2="280" y2="120"/>
    <line x1="120" y1="225" x2="280" y2="330"/>
    <line x1="280" y1="120" x2="480" y2="150"/>
    <line x1="280" y1="330" x2="480" y2="300"/>
    <line x1="480" y1="150" x2="680" y2="225"/>
    <line x1="480" y1="300" x2="680" y2="225"/>
    <line x1="280" y1="120" x2="480" y2="300"/>
    <line x1="280" y1="330" x2="480" y2="150"/>
  </g>
  <!-- Glowing Nodes -->
  <circle cx="120" cy="225" r="16" fill="${primary}" filter="url(#glow)"/>
  <circle cx="280" cy="120" r="14" fill="${secondary}" filter="url(#glow)"/>
  <circle cx="280" cy="330" r="14" fill="${primary}" filter="url(#glow)"/>
  <circle cx="480" cy="150" r="18" fill="url(#g1)" filter="url(#glow)"/>
  <circle cx="480" cy="300" r="14" fill="${secondary}" filter="url(#glow)"/>
  <circle cx="680" cy="225" r="22" fill="url(#g1)" filter="url(#glow)"/>
  <!-- Floating Callout Badge -->
  <rect x="580" y="70" width="160" height="44" rx="10" fill="#111827" stroke="${secondary}" stroke-width="1.5"/>
  <text x="660" y="96" fill="#f9fafb" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">99.8% AI Precision</text>
</svg>`;
  } else if (preset === 'growth_infographic') {
    svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="100%" height="100%">
  <defs>
    <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${primary}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${primary}" stop-opacity="0.0"/>
    </linearGradient>
    <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${primary}"/>
      <stop offset="100%" stop-color="${secondary}"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="${primary}" flood-opacity="0.4"/>
    </filter>
  </defs>
  <rect width="800" height="450" fill="#080c14"/>
  <!-- Grid Lines -->
  <g stroke="#1f293d" stroke-width="1" stroke-dasharray="3 3">
    <line x1="80" y1="100" x2="720" y2="100"/>
    <line x1="80" y1="200" x2="720" y2="200"/>
    <line x1="80" y1="300" x2="720" y2="300"/>
    <line x1="80" y1="380" x2="720" y2="380"/>
  </g>
  <!-- Area Under Curve -->
  <path d="M 80 380 Q 240 360, 360 280 T 560 170 T 720 70 L 720 380 Z" fill="url(#areaGrad)"/>
  <!-- Exponential Growth Curve -->
  <path d="M 80 380 Q 240 360, 360 280 T 560 170 T 720 70" fill="none" stroke="url(#lineGrad)" stroke-width="5" stroke-linecap="round" filter="url(#shadow)"/>
  <!-- Milestones -->
  <circle cx="360" cy="280" r="8" fill="#ffffff" stroke="${primary}" stroke-width="4"/>
  <circle cx="560" cy="170" r="9" fill="#ffffff" stroke="${secondary}" stroke-width="4"/>
  <circle cx="720" cy="70" r="12" fill="${secondary}" stroke="#ffffff" stroke-width="3"/>
  <!-- Growth Badge -->
  <rect x="590" y="30" width="120" height="34" rx="8" fill="#111827" stroke="${secondary}" stroke-width="1.5"/>
  <text x="650" y="52" fill="#ffffff" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">+184% MoM</text>
</svg>`;
  } else if (preset === 'glass_quadrant') {
    svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="100%" height="100%">
  <defs>
    <linearGradient id="qg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primary}" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="${secondary}" stop-opacity="0.1"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="#0b0f19"/>
  <!-- 4 Translucent Cards -->
  <rect x="80" y="50" width="300" height="150" rx="14" fill="url(#qg)" stroke="#374151" stroke-width="1.5"/>
  <text x="105" y="90" fill="${primary}" font-family="sans-serif" font-size="12" font-weight="800" letter-spacing="1">01 • CORE ENGINE</text>
  <text x="105" y="125" fill="#f3f4f6" font-family="sans-serif" font-size="16" font-weight="bold">Proprietary IP Stack</text>

  <rect x="420" y="50" width="300" height="150" rx="14" fill="url(#qg)" stroke="#374151" stroke-width="1.5"/>
  <text x="445" y="90" fill="${secondary}" font-family="sans-serif" font-size="12" font-weight="800" letter-spacing="1">02 • NETWORK EFFECT</text>
  <text x="445" y="125" fill="#f3f4f6" font-family="sans-serif" font-size="16" font-weight="bold">Viral Distribution Loop</text>

  <rect x="80" y="230" width="300" height="150" rx="14" fill="url(#qg)" stroke="#374151" stroke-width="1.5"/>
  <text x="105" y="270" fill="${secondary}" font-family="sans-serif" font-size="12" font-weight="800" letter-spacing="1">03 • UNIT ECONOMICS</text>
  <text x="105" y="305" fill="#f3f4f6" font-family="sans-serif" font-size="16" font-weight="bold">82% Gross Margins</text>

  <rect x="420" y="230" width="300" height="150" rx="14" fill="url(#qg)" stroke="${primary}" stroke-width="2"/>
  <text x="445" y="270" fill="${primary}" font-family="sans-serif" font-size="12" font-weight="800" letter-spacing="1">04 • DEFENSIVE MOAT</text>
  <text x="445" y="305" fill="#ffffff" font-family="sans-serif" font-size="16" font-weight="bold">Multi-Year Head Start</text>
</svg>`;
  } else {
    // Default: isometric_pipeline
    svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="100%" height="100%">
  <defs>
    <linearGradient id="pGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primary}"/>
      <stop offset="100%" stop-color="${secondary}"/>
    </linearGradient>
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
  </defs>
  <rect width="800" height="450" fill="#070a12"/>
  <!-- Isometric Grid -->
  <g stroke="#1a2234" stroke-width="1" opacity="0.4">
    <line x1="100" y1="350" x2="400" y2="100"/>
    <line x1="250" y1="380" x2="550" y2="130"/>
    <line x1="400" y1="410" x2="700" y2="160"/>
    <line x1="100" y1="180" x2="700" y2="380"/>
  </g>
  <!-- Isometric Platform 1 -->
  <polygon points="200,220 320,160 440,220 320,280" fill="#1e293b" stroke="${primary}" stroke-width="2" filter="url(#dropShadow)"/>
  <polygon points="200,220 320,280 320,320 200,260" fill="#0f172a"/>
  <polygon points="440,220 320,280 320,320 440,260" fill="#1e293b"/>

  <!-- Isometric Platform 2 (Elevated Center) -->
  <polygon points="400,160 520,100 640,160 520,220" fill="url(#pGrad)" stroke="#ffffff" stroke-width="2" filter="url(#dropShadow)"/>
  <polygon points="400,160 520,220 520,270 400,210" fill="${primary}"/>
  <polygon points="640,160 520,220 520,270 640,210" fill="${secondary}"/>

  <!-- Laser Flow Beam -->
  <line x1="320" y1="210" x2="480" y2="140" stroke="#ffffff" stroke-width="3" stroke-dasharray="6 4"/>
  <circle cx="320" cy="210" r="6" fill="#38bdf8"/>
  <circle cx="480" cy="140" r="8" fill="#ffffff"/>

  <!-- Title Pill Overlay -->
  <rect x="60" y="40" width="220" height="38" rx="8" fill="#111827" stroke="${primary}" stroke-width="1.5"/>
  <text x="170" y="64" fill="#f8fafc" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Autonomous Core Architecture</text>
</svg>`;
  }

  // Convert to clean data URI
  const encoded = Buffer.from(svgMarkup).toString('base64');
  const dataUrl = `data:image/svg+xml;base64,${encoded}`;

  return {
    id: `custom-visual-${Date.now()}`,
    url: dataUrl,
    source: 'custom_svg',
    alt: `${headline} - AI Procedural Visual Graphic`,
    caption: `${preset.replace('_', ' ').toUpperCase()} • AI Generated Vector Visual`,
    placement: 'split_media',
    aspectRatio: '16:9',
    opacity: 1.0,
    blur: 0,
    svgContent: svgMarkup,
    promptUsed: req.prompt,
    stylePreset: preset,
  };
}
