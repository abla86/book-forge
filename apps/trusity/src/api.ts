import {
  GenerationRequest,
  PresentationPlan,
  Slide,
  ThemeConfig,
  BusinessAnalysis,
  PolishOptions,
  PolishResult,
  VisualContextAnalysis,
  StockPhotoItem,
  VisualGenerationRequest,
  SlideVisualAsset,
} from './types';

export async function fetchThemes(): Promise<ThemeConfig[]> {
  try {
    const res = await fetch('/api/themes');
    if (!res.ok) throw new Error('Failed to fetch themes');
    const data = await res.json();
    return data.themes;
  } catch (err) {
    console.warn('Using local themes fallback', err);
    return [];
  }
}

export async function generatePresentation(req: GenerationRequest): Promise<PresentationPlan> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate presentation.');
  }

  return await res.json();
}

export async function regenerateSlide(
  slide: Slide,
  instruction: string,
  analysis: BusinessAnalysis
): Promise<Slide> {
  const res = await fetch('/api/regenerate-slide', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ slide, instruction, analysis }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to regenerate slide.');
  }

  const data = await res.json();
  return data.slide;
}

export async function polishDeck(
  plan: PresentationPlan,
  options?: PolishOptions
): Promise<PolishResult> {
  const res = await fetch('/api/polish-deck', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan,
      targetTone: options?.targetTone,
      focusAreas: options?.focusAreas,
      customInstruction: options?.customInstruction,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to polish presentation deck.');
  }

  return await res.json();
}

export async function fetchCollaborationSession(sessionId: string): Promise<any> {
  const res = await fetch(`/api/collaboration/session/${encodeURIComponent(sessionId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch collaboration session.');
  }
  return await res.json();
}

export async function createCollaborationSession(
  sessionId?: string,
  plan?: PresentationPlan,
  hostName?: string
): Promise<any> {
  const res = await fetch('/api/collaboration/session/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, plan, hostName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to initialize collaboration session.');
  }
  return await res.json();
}

/**
 * AI-Powered Image Context Analysis
 * Analyzes the slide's headline, layout, and narrative to provide keyword recommendations,
 * placement strategy, and tailored AI generation prompts.
 */
export async function analyzeSlideVisualContext(
  slide: Slide,
  themeName?: string,
  fullPlanTitle?: string
): Promise<VisualContextAnalysis> {
  const res = await fetch('/api/images/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slide, themeName, fullPlanTitle }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to analyze slide visual context.');
  }

  return await res.json();
}

/**
 * Search Curated Stock Photos
 */
export async function searchStockPhotos(
  query?: string,
  category?: string,
  aspectRatio?: string,
  limit: number = 24
): Promise<{ results: StockPhotoItem[]; total: number }> {
  const res = await fetch('/api/images/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, category, aspectRatio, limit }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to search stock photos.');
  }

  return await res.json();
}

/**
 * Generate Procedural Vector / SVG Custom Visual
 */
export async function generateCustomVisual(
  req: VisualGenerationRequest
): Promise<SlideVisualAsset> {
  const res = await fetch('/api/images/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate custom visual.');
  }

  const data = await res.json();
  return data.visualAsset;
}

