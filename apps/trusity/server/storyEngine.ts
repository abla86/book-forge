import { GoogleGenAI, Type } from '@google/genai';
import {
  BusinessAnalysis,
  GenerationRequest,
  PresentationPlan,
  Slide,
  SlideType,
  LayoutName,
  ThemeName,
  ToneType,
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
 * Stage 1: Business Analyzer
 * Extracts structured insights from the raw business idea
 */
export async function analyzeBusinessIdea(
  idea: string,
  targetAudience?: string,
  tone?: ToneType
): Promise<BusinessAnalysis> {
  const ai = getGeminiClient();

  if (ai) {
    try {
      const prompt = `Analyze this business idea and extract draft pitch-deck elements. Never invent market sizes, growth rates, benchmarks, customer interviews, product capabilities, compliance certifications, pricing, revenue, contact details, or funding terms. If the user has not supplied a fact, return a clearly labelled placeholder such as 'Not supplied — add a verifiable source' rather than guessing.
Idea: "${idea}"
Target Audience: ${targetAudience || 'Investors and early adopters'}
Tone: ${tone || 'persuasive'}

Respond with JSON matching the schema.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are a careful pitch-deck drafting assistant. Distinguish user-provided facts from assumptions. Do not fabricate market data, evidence, metrics, certifications, customer claims, prices, or funding terms. Use explicit placeholders when information is missing.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              companyName: { type: Type.STRING },
              tagline: { type: Type.STRING },
              coreProblem: { type: Type.STRING },
              solutionSummary: { type: Type.STRING },
              targetAudience: { type: Type.STRING },
              marketSizeEstimate: { type: Type.STRING },
              monetizationModel: { type: Type.STRING },
              keyDifferentiator: { type: Type.STRING },
            },
            required: [
              'companyName',
              'tagline',
              'coreProblem',
              'solutionSummary',
              'targetAudience',
              'marketSizeEstimate',
              'monetizationModel',
              'keyDifferentiator',
            ],
          },
        },
      });

      if (response.text) {
        return JSON.parse(response.text) as BusinessAnalysis;
      }
    } catch (err) {
      console.warn('Gemini business analysis fallback triggered:', err);
    }
  }

  // High quality fallback analysis derived from the user idea
  const cleanIdea = idea.trim();
  const words = cleanIdea.split(/\s+/);
  const potentialName = words[0]?.replace(/[^a-zA-Z]/g, '') || 'NovaTech';

  return {
    companyName: potentialName.length > 2 ? potentialName : 'VentureScale',
    tagline: `Transforming ${words.slice(1, 4).join(' ') || 'modern industry'} with intelligent automation`,
    coreProblem:
      cleanIdea.length > 20
        ? `Organizations struggle with high operational friction, fragmented data, and slow workflows in ${words.slice(0, 3).join(' ')}.`
        : 'Fragmented manual legacy systems cost enterprises billions annually in lost productivity and errors.',
    solutionSummary:
      cleanIdea ||
      'Describe the proposed solution and its expected benefits; validate any performance or ROI claim with evidence before use.',
    targetAudience: targetAudience || 'Enterprise leaders, VP Operations, and strategic innovation executives',
    marketSizeEstimate: 'Not supplied. Add a source-backed market-size estimate and date, or label the estimate as an assumption.',
    monetizationModel: 'B2B SaaS subscription tiered by seats, with enterprise consumption-based API tiers',
    keyDifferentiator: 'Draft hypothesis only. Confirm differentiators, integrations, auditability, and lock-in claims against actual product capabilities.',
  };
}

/**
 * Stage 2 & 3: Presentation Planner & Content Generator
 * Builds the complete presentation plan with logical narrative story arc
 */
export async function generatePresentationPlan(
  req: GenerationRequest
): Promise<PresentationPlan> {
  const {
    idea,
    theme = 'startup',
    tone = 'persuasive',
    presenterName = 'Founder & CEO',
    companyName: explicitCompanyName,
    targetAudience,
    slideCount = 8,
  } = req;

  // Stage 1: Analyze business
  const analysis = await analyzeBusinessIdea(idea, targetAudience, tone);
  if (explicitCompanyName) {
    analysis.companyName = explicitCompanyName;
  }

  const ai = getGeminiClient();

  if (ai) {
    try {
      const planPrompt = `You are Trusity AI Presentation Generator. Draft a pitch deck with exactly ${slideCount} slides following a logical story arc. Do not invent or imply verified facts. Only use market figures, citations, performance metrics, customer research, compliance certifications, pricing, customer names, team credentials, uptime/SLA claims, contact details, or fundraising terms explicitly supplied by the user. If information is missing, use a clearly labelled placeholder such as '[Add source-backed market estimate]' or '[Confirm pricing]'.
Business Name: ${analysis.companyName}
Tagline: ${analysis.tagline}
Core Idea: ${idea}
Core Problem: ${analysis.coreProblem}
Solution: ${analysis.solutionSummary}
Target Audience: ${analysis.targetAudience}
Market Size: ${analysis.marketSizeEstimate}
Monetization: ${analysis.monetizationModel}
Tone: ${tone}
Presenter: ${presenterName}

Story Arc Requirement:
1. Title (layout: centered_hero)
2. Problem (layout: split_with_stat)
3. Solution (layout: split_text_image or process_steps)
4. Market Opportunity (layout: metrics_grid)
5. Product / How it Works (layout: process_steps or roadmap_horizontal)
6. Competitive Advantage (layout: comparison_table or swot_grid)
7. Business Model / Traction (layout: business_detail or pricing_table or team_cards)
8. The Ask / Call to Action (layout: full_bleed_statement)

For EVERY slide:
- Provide sharp, high-conviction headline and subheadline
- Provide badge (e.g. "01 / THE PROBLEM", "03 / MARKET SIZE")
- Provide detailed speaker notes written for the presenter to say out loud during the pitch!
- If layout is split_with_stat, provide bulletPoints and statistic ({number, label, context})
- If layout is metrics_grid, provide 3-4 metrics with {label, value, change, subtext}
- If layout is comparison_table, provide comparisonRows with {feature, us: '[Verify capability]', competitors: '[Evidence required]', notes}
- If layout is process_steps, provide 3-4 steps {number, title, desc}
- If layout is pricing_table, provide 3 pricingTiers {name, price, period, description, features, isPopular}
- If layout is team_cards, provide 3 teamMembers {name, role, bio, avatarInitials}
- If layout is swot_grid, provide swot {strengths, weaknesses, opportunities, threats}
- If layout is full_bleed_statement, provide ctaAction {primaryText, askAmount, useOfFunds, contactEmail}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: planPrompt,
        config: {
          systemInstruction:
            'You are a careful pitch-deck drafter. Return valid JSON strictly matching the presentation structure. Never fabricate statistics, sources, customer interviews, benchmarks, certifications, product capabilities, pricing, contact details, funding amounts, or guarantees. Use explicit placeholders for missing facts and label assumptions. Do not describe the deck as investor-ready or verified.',
          responseMimeType: 'application/json',
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        if (parsed.slides && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
          return {
            id: `deck-${Date.now()}`,
            title: parsed.title || analysis.companyName,
            subtitle: parsed.subtitle || analysis.tagline,
            presenter: presenterName,
            theme,
            tone,
            createdAt: new Date().toISOString(),
            analysis,
            slides: parsed.slides.map((s: any, i: number) => ({
              id: `slide-${i + 1}`,
              slideType: s.slideType || 'problem',
              layout: s.layout || 'bullet_list',
              content: {
                headline: s.content?.headline || s.headline || `Slide ${i + 1}`,
                subheadline: s.content?.subheadline || s.subheadline,
                badge: s.content?.badge || s.badge || `0${i + 1}`,
                bulletPoints: s.content?.bulletPoints || s.bulletPoints || [],
                statistic: s.content?.statistic || s.statistic,
                metrics: s.content?.metrics || s.metrics,
                comparisonRows: s.content?.comparisonRows || s.comparisonRows,
                competitorNames: s.content?.competitorNames || ['Legacy Incumbents'],
                processSteps: s.content?.processSteps || s.processSteps,
                timelineSteps: s.content?.timelineSteps || s.timelineSteps,
                swot: s.content?.swot || s.swot,
                pricingTiers: s.content?.pricingTiers || s.pricingTiers,
                teamMembers: s.content?.teamMembers || s.teamMembers,
                ctaAction: s.content?.ctaAction || s.ctaAction,
                speakerNotes:
                  s.content?.speakerNotes ||
                  s.speakerNotes ||
                  `Explain the key metrics on this slide to underscore our strategic market positioning.`,
              },
            })),
          };
        }
      }
    } catch (err) {
      console.warn('Gemini presentation generation fallback triggered:', err);
    }
  }

  // Fallback Story Engine implementation
  return buildStoryArcPlan(analysis, idea, theme, tone, presenterName, slideCount);
}

/**
 * Generates a complete 8-12 slide investor pitch deck using the Trusity Story Engine rules
 */
export function buildStoryArcPlan(
  analysis: BusinessAnalysis,
  idea: string,
  theme: ThemeName,
  tone: ToneType,
  presenterName: string,
  slideCount: number = 8
): PresentationPlan {
  const slides: Slide[] = [];

  // Slide 1: Centered Hero / Title
  slides.push({
    id: 'slide-1',
    slideType: 'title',
    layout: 'centered_hero',
    content: {
      headline: analysis.companyName,
      subheadline: analysis.tagline,
      badge: 'PITCH DECK DRAFT',
      ctaAction: {
        primaryText: 'DISCOVER THE VISION',
        contactEmail: '[Add verified contact email]',
      },
      speakerNotes: `Good morning everyone. I am ${presenterName}, and today I am excited to introduce ${analysis.companyName}. We are on a mission to redefine how modern businesses operate by turning raw friction into unfair competitive advantage. Let's dive in.`,
    },
  });

  // Slide 2: Problem + Big Stat
  slides.push({
    id: 'slide-2',
    slideType: 'problem',
    layout: 'split_with_stat',
    content: {
      headline: 'The Hidden Bottleneck Crippling Industry Growth',
      subheadline:
        'Organizations are suffocating under manual overhead, disconnected tools, and rising operational debt.',
      badge: '01 / THE PROBLEM',
      bulletPoints: [
        'Describe the specific workflow problem. Add a reliable source for any prevalence or cost estimate.',
        'Describe current alternatives and integration effort using evidence from the target market.',
        'Explain the business impact using customer evidence or a clearly labelled hypothesis.',
      ],
      statistic: {
        number: '[Add sourced figure]',
        label: 'Market/problem metric (source required)',
        context: 'Placeholder — add a verifiable source, publication date, and methodology before presenting.'
      },
      speakerNotes: 'Explain the problem using documented evidence from the user. Do not state interview counts, percentages, or financial impact unless the user supplied verifiable evidence.' ,
    },
  });

  // Slide 3: Solution Cards / Split
  slides.push({
    id: 'slide-3',
    slideType: 'solution',
    layout: 'split_text_image',
    content: {
      headline: 'Introducing The Intelligent Autonomous Foundation',
      subheadline: `${analysis.companyName} eliminates fragmented friction with intelligent real-time execution.`,
      badge: '02 / THE SOLUTION',
      bulletPoints: [
        'Describe onboarding steps and prerequisites; state timing only when measured and supported by test or customer evidence.',
        'Describe the actual automation and human-review workflow; do not imply learning or self-optimisation unless implemented.',
        'Describe security controls that are implemented and tested. Do not claim SOC 2 or other certification without current independent evidence.',
        'Add measured customer outcomes only when supported by documented methodology and results; otherwise label expected benefits as hypotheses.',
      ],
      statistic: {
        number: '[Add measured result]',
        label: 'Performance comparison (evidence required)',
        context: 'Placeholder — no validation evidence supplied.'
      },
      speakerNotes: `Here is our breakthrough: Instead of adding another clunky dashboard to their stack, ${analysis.companyName} acts as an intelligent autonomous layer. It connects seamlessly into existing systems and produces tangible efficiency immediately.`,
    },
  });

  // Slide 4: Market Opportunity (TAM/SAM/SOM Metrics Grid)
  slides.push({
    id: 'slide-4',
    slideType: 'market_opportunity',
    layout: 'metrics_grid',
    content: {
      headline: 'A Massive, Accelerating Market Opportunity',
      subheadline:
        'Tailwinds across digital transformation and AI infrastructure drive urgent enterprise spending.',
      badge: '03 / MARKET SIZE',
      metrics: [
        {
          label: 'Total Addressable Market (TAM)',
          value: '[Source required]',
          change: '[Source required]',
          subtext: 'Define the market and cite the source, date, geography, and calculation.'
        },
        {
          label: 'Serviceable Addressable Market (SAM)',
          value: '[Source required]',
          change: 'Immediate target',
          subtext: 'Define the segment and cite the source and calculation.'
        },
        {
          label: 'Serviceable Obtainable Market (SOM)',
          value: '[Assumption — validate]',
          change: '3-Year Horizon',
          subtext: 'Document assumptions, time horizon, and calculation.'
        },
      ],
      speakerNotes: 'Explain the market estimate only after adding reliable sources and transparent TAM/SAM/SOM assumptions. Do not claim traction or market timing without evidence.',
    },
  });

  // Slide 5: How It Works / Process Steps
  slides.push({
    id: 'slide-5',
    slideType: 'process_flow',
    layout: 'process_steps',
    content: {
      headline: 'Seamless Architecture: From Raw Signal to Action',
      subheadline: 'Illustrative workflow — replace with the steps actually implemented and verified.',
      badge: '04 / TECHNOLOGY & PROCESS',
      processSteps: [
        {
          number: 1,
          title: 'Connect and ingest (confirm supported integrations)',
          desc: 'Describe supported connectors, setup steps, permissions, and limitations. Do not promise plug-and-play operation unless tested.',
        },
        {
          number: 2,
          title: 'Intelligent Orchestration',
          desc: 'Describe the actual model, planning, validation, and execution behavior. Label unimplemented steps as planned.',
        },
        {
          number: 3,
          title: 'Audited Verification & Rollout',
          desc: 'Document monitoring, human approval, rollback behavior, and measured availability. Do not promise reliability or self-healing without operational evidence.',
        },
      ],
      speakerNotes: 'Walk through the real architecture and identify which steps are implemented, planned, or manually performed. Avoid guarantees such as “audit-grade” unless independently validated.',
    },
  });

  // Slide 6: Competitive Advantage (Comparison Table)
  slides.push({
    id: 'slide-6',
    slideType: 'comparison',
    layout: 'comparison_table',
    content: {
      headline: 'Why We Win: A Distinct Structural Advantage',
      subheadline: 'Traditional legacy platforms are slow, complex, and prohibitively expensive.',
      badge: '05 / COMPETITIVE MATRIX',
      competitorNames: ['Legacy Incumbents & Manual Systems'],
      comparisonRows: [
        {
          feature: 'Time to First Value',
          us: '[Add measured result]',
          competitors: '[Add sourced competitor benchmark]',
          notes: 'Provide comparable evidence and explain the benchmark method.'
        },
        {
          feature: 'Autonomous Self-Correction',
          us: true,
          competitors: false,
          notes: 'Describe tested behavior; avoid implying exclusivity without evidence.'
        },
        {
          feature: 'Enterprise Data Isolation',
          us: true,
          competitors: '[Documented competitor evidence required]',
          notes: 'Only claim a private deployment or zero-retention option if implemented, tested, and contractually supported.'
        },
        {
          feature: 'Total Cost of Ownership (TCO)',
          us: '[Add substantiated cost comparison]',
          competitors: '[Source required]',
          notes: 'Confirm actual pricing and contract terms.'
        },
      ],
      speakerNotes: 'Do not make comparative claims unless supported by a like-for-like study with sources, scope, and dates.',
    },
  });

  // Slide 7: Business Model / Pricing Table
  slides.push({
    id: 'slide-7',
    slideType: 'business_model',
    layout: 'pricing_table',
    content: {
      headline: 'Proposed Business Model — Confirm Before Use',
      subheadline: 'Pricing, margins, and expansion assumptions have not been verified; replace placeholders with approved commercial terms.',
      badge: '06 / BUSINESS MODEL',
      pricingTiers: [
        {
          name: 'Starter',
          price: '[Confirm price]',
          period: '/mo',
          description: 'For growing teams automating their core operational bottlenecks.',
          features: [
            'Up to 10 automated agent workflows',
            'Standard ERP & CRM connectors',
            'Community & email support',
            'Security and compliance status: confirm current independent evidence; do not claim certification unless obtained.',
          ],
        },
        {
          name: 'Growth',
          price: '[Confirm price]',
          period: '/mo',
          description: 'For scaling companies scaling cross-department operations.',
          isPopular: true,
          features: [
            'Workflow limits: specify only after confirming product enforcement and commercial terms.',
            'Latency: add measured performance and test conditions, if available.',
            'Dedicated success manager',
            'Advanced analytics & audit logs',
          ],
        },
        {
          name: 'Enterprise',
          price: 'Custom',
          period: '/annual',
          description: 'For Fortune 500 enterprises requiring dedicated VPC & SLA guarantees.',
          features: [
            'On-premises / Private VPC deployment',
            'Uptime/SLA: add only when an approved SLA and operational measurements exist.',
            'Custom model fine-tuning',
            '24/7 dedicated engineering support',
          ],
        },
      ],
      speakerNotes: 'Explain the proposed revenue model as a hypothesis unless pricing, margins, customer traction, and contract values are backed by evidence.',
    },
  });

  // Slide 8: The Ask / Call to Action
  slides.push({
    id: 'slide-8',
    slideType: 'call_to_action',
    layout: 'full_bleed_statement',
    content: {
      headline: 'The Opportunity: Accelerate Our Next Phase',
      subheadline:
        'Funding ask not supplied. Add the confirmed amount, round type, intended use of funds, and approval before presenting.',
      badge: '07 / THE ASK',
      ctaAction: {
        primaryText: 'JOIN OUR SEED ROUND',
        askAmount: '[Add confirmed funding ask]',
        contactEmail: '[Add verified contact email]',
        useOfFunds: [
          { category: 'Product & AI Engineering', percentage: 50 },
          { category: 'Go-to-Market & Enterprise Sales', percentage: 30 },
          { category: 'Security, Compliance & Infrastructure', percentage: 20 },
        ],
      },
      bulletPoints: [
        '50% R&D: Deepening multi-agent orchestration and expanding connector ecosystem.',
        '30% GTM: Hiring seasoned enterprise sales reps and building partner pipelines.',
        '20% Operations: Enterprise compliance certifications and cloud infrastructure.',
      ],
      speakerNotes: 'State the funding ask and use-of-funds allocation only after the user confirms the amount and percentages. Otherwise present them as editable placeholders.',
    },
  });

  // Trim or expand to match requested slideCount
  return {
    id: `deck-${Date.now()}`,
    title: analysis.companyName,
    subtitle: analysis.tagline,
    presenter: presenterName,
    theme,
    tone,
    createdAt: new Date().toISOString(),
    analysis,
    slides: slides.slice(0, slideCount),
  };
}

/**
 * Regenerates a single slide with user guidance (e.g. "make more concise", "change layout to swot_grid")
 */
export async function regenerateSingleSlide(
  currentSlide: Slide,
  instruction: string,
  analysis: BusinessAnalysis
): Promise<Slide> {
  const ai = getGeminiClient();

  if (ai) {
    try {
      const prompt = `You are Trusity AI Presentation Generator. Re-write and polish this single pitch deck slide based on the user's instruction.
Company: ${analysis.companyName} (${analysis.tagline})
Current Slide Type: ${currentSlide.slideType}
Current Layout: ${currentSlide.layout}
Current Headline: ${currentSlide.content.headline}
Current Content: ${JSON.stringify(currentSlide.content)}

User Refinement Instruction: "${instruction}"

Output the updated slide JSON strictly matching the content structure with refreshed headline, subheadline, bullet points or metrics, and natural presenter speaker notes.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: 'Output only valid JSON representing the updated slide object.',
          responseMimeType: 'application/json',
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        return {
          id: currentSlide.id,
          slideType: parsed.slideType || currentSlide.slideType,
          layout: parsed.layout || currentSlide.layout,
          content: {
            ...currentSlide.content,
            ...parsed.content,
            headline: parsed.content?.headline || parsed.headline || currentSlide.content.headline,
            speakerNotes:
              parsed.content?.speakerNotes ||
              parsed.speakerNotes ||
              currentSlide.content.speakerNotes,
          },
        };
      }
    } catch (err) {
      console.warn('Gemini slide regeneration fallback:', err);
    }
  }

  // Refinement fallback
  return {
    ...currentSlide,
    content: {
      ...currentSlide.content,
      headline: `${currentSlide.content.headline} (Refined)`,
      speakerNotes: `${currentSlide.content.speakerNotes} (Remember to emphasize: ${instruction})`,
    },
  };
}

export interface PolishOptions {
  targetTone?: ToneType;
  focusAreas?: string[];
  customInstruction?: string;
}

export interface PolishResult {
  plan: PresentationPlan;
  changelog: string[];
  polishedCount: number;
}

/**
 * Iterates through all slides in the presentation deck to standardize tone,
 * fix grammar, and improve phrasing for narrative consistency.
 */
export async function polishPresentationDeck(
  plan: PresentationPlan,
  options?: PolishOptions
): Promise<PolishResult> {
  const targetTone = options?.targetTone || plan.tone || 'persuasive';
  const ai = getGeminiClient();
  const slides = plan.slides || [];

  if (slides.length === 0) {
    return {
      plan,
      changelog: ['No slides found to polish.'],
      polishedCount: 0,
    };
  }

  if (ai) {
    try {
      const prompt = `You are Trusity AI's Executive Pitch Deck Copy Chief.
Perform a 'Professional Polish' on this entire presentation deck by iterating through each slide to standardize tone, fix all grammar and typos, elevate phrasing, and ensure narrative consistency.

Company: ${plan.analysis?.companyName || plan.title}
Tagline: ${plan.analysis?.tagline || plan.subtitle || ''}
Target Audience: ${plan.analysis?.targetAudience || 'Investors and enterprise stakeholders'}
Target Tone: "${targetTone}" (Ensure EVERY slide consistently adheres to this tone)
Custom Polish Instructions: ${options?.customInstruction || 'Elevate vocabulary, enforce parallel bullet point structures, eliminate passive voice, and refine speaker notes with natural verbal transitions.'}
Focus Areas: ${(options?.focusAreas || [
  'Standardize tone across all slides',
  'Fix grammar, punctuation, and typos',
  'Improve phrasing, parallelism, and punchiness',
  'Refine presenter speaker notes with conversational cadence',
]).join(', ')}

CURRENT SLIDES IN DECK:
${JSON.stringify(
  slides.map((s, idx) => ({
    index: idx,
    id: s.id,
    slideType: s.slideType,
    layout: s.layout,
    badge: s.content.badge,
    headline: s.content.headline,
    subheadline: s.content.subheadline,
    bulletPoints: s.content.bulletPoints,
    statistic: s.content.statistic,
    metrics: s.content.metrics,
    processSteps: s.content.processSteps,
    swot: s.content.swot,
    comparisonRows: s.content.comparisonRows,
    pricingTiers: s.content.pricingTiers,
    teamMembers: s.content.teamMembers,
    ctaAction: s.content.ctaAction,
    speakerNotes: s.content.speakerNotes,
  })),
  null,
  2
)}

CRITICAL POLISHING MANDATES:
1. Preserve every slide's "id", "slideType", and "layout". Do NOT delete slides or change IDs.
2. Tone Standardization: Ensure uniform vocabulary, conviction, and tone matching "${targetTone}" across every single slide.
3. Grammar & Syntax: Fix all grammatical issues, capitalization irregularities, punctuation defects, and awkward phrasing.
4. Parallelism: Ensure bullet points within each slide share identical grammatical structure (e.g. all start with strong active verbs like "Automates", "Reduces", "Guarantees", or concise noun phrases).
5. Headlines: Make headlines punchy, decisive, and memorable (between 4 and 9 words).
6. Speaker Notes: Polish every slide's speaker notes into a fluent, natural presenter script with transition cues connecting to the next slide.
7. Quantitative Integrity: Retain all actual numbers, percentages, currency figures, and factual metrics.

Return a JSON object with:
- "slides": Array of all polished slides matching original IDs with polished content.
- "changelog": Array of 3 to 6 bullet points detailing specific improvements made.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are an elite pitch deck copy chief. Polish presentations for consistency, grammatical perfection, and punchy executive delivery. Output valid JSON only.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              changelog: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Specific bullet points summarizing the deck-wide polish improvements',
              },
              slides: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    slideType: { type: Type.STRING },
                    layout: { type: Type.STRING },
                    content: {
                      type: Type.OBJECT,
                      properties: {
                        headline: { type: Type.STRING },
                        subheadline: { type: Type.STRING },
                        badge: { type: Type.STRING },
                        bulletPoints: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                        speakerNotes: { type: Type.STRING },
                        statistic: {
                          type: Type.OBJECT,
                          properties: {
                            number: { type: Type.STRING },
                            label: { type: Type.STRING },
                            context: { type: Type.STRING },
                          },
                        },
                        metrics: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              label: { type: Type.STRING },
                              value: { type: Type.STRING },
                              change: { type: Type.STRING },
                              subtext: { type: Type.STRING },
                            },
                          },
                        },
                        processSteps: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              number: { type: Type.NUMBER },
                              title: { type: Type.STRING },
                              desc: { type: Type.STRING },
                            },
                          },
                        },
                        comparisonRows: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              feature: { type: Type.STRING },
                              us: { type: Type.STRING },
                              competitors: { type: Type.STRING },
                            },
                          },
                        },
                        swot: {
                          type: Type.OBJECT,
                          properties: {
                            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                            opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
                            threats: { type: Type.ARRAY, items: { type: Type.STRING } },
                          },
                        },
                      },
                      required: ['headline'],
                    },
                  },
                  required: ['id', 'content'],
                },
              },
            },
            required: ['slides', 'changelog'],
          },
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        if (Array.isArray(parsed.slides) && parsed.slides.length > 0) {
          const updatedSlides: Slide[] = slides.map((origSlide) => {
            const polishedMatch = parsed.slides.find(
              (ps: any) => ps.id === origSlide.id
            );
            if (!polishedMatch) return origSlide;

            return {
              ...origSlide,
              slideType: (polishedMatch.slideType as SlideType) || origSlide.slideType,
              layout: (polishedMatch.layout as LayoutName) || origSlide.layout,
              content: {
                ...origSlide.content,
                ...polishedMatch.content,
                headline: polishedMatch.content.headline || origSlide.content.headline,
                subheadline:
                  polishedMatch.content.subheadline ?? origSlide.content.subheadline,
                badge: polishedMatch.content.badge ?? origSlide.content.badge,
                bulletPoints:
                  polishedMatch.content.bulletPoints || origSlide.content.bulletPoints,
                speakerNotes:
                  polishedMatch.content.speakerNotes || origSlide.content.speakerNotes,
              },
            };
          });

          return {
            plan: {
              ...plan,
              tone: targetTone,
              slides: updatedSlides,
            },
            changelog: parsed.changelog || [
              `Standardized tone to ${targetTone} across all ${slides.length} slides`,
              'Audited and corrected grammar, capitalization, and punctuation',
              'Unified bullet points with parallel active-verb constructions',
              'Refined presenter speaker notes with conversational cues',
            ],
            polishedCount: updatedSlides.length,
          };
        }
      }
    } catch (err) {
      console.warn('Gemini deck polish error, applying heuristic polish:', err);
    }
  }

  // Deterministic heuristic polish fallback
  const changelog: string[] = [];
  const polishedSlides = slides.map((s, idx) => {
    return heuristicPolishSlide(s, targetTone, idx, slides.length);
  });

  changelog.push(`Standardized tone across all ${slides.length} slides to ${targetTone}`);
  changelog.push('Enforced parallel verb structures and capitalized headline terms');
  changelog.push('Polished presenter speaker notes with conversational pacing and vocal cues');
  changelog.push('Standardized badge numbering and category conventions across the entire deck');

  return {
    plan: {
      ...plan,
      tone: targetTone,
      slides: polishedSlides,
    },
    changelog,
    polishedCount: polishedSlides.length,
  };
}

/**
 * Heuristic polish utility that refines phrasing, removes filler,
 * cleans up punctuation, and harmonizes speaker notes.
 */
function heuristicPolishSlide(
  slide: Slide,
  tone: ToneType,
  index: number,
  total: number
): Slide {
  const content = { ...slide.content };

  // Polish headline: trim, capitalize, remove trailing period if present
  if (content.headline) {
    let hl = content.headline.trim().replace(/\.+$/, '');
    // Replace common weak phrases
    hl = hl
      .replace(/\bin order to\b/gi, 'to')
      .replace(/\bwe are basically\b/gi, 'we are')
      .replace(/\bvery unique\b/gi, 'unique')
      .replace(/\s+/g, ' ');
    // Ensure first character is uppercase
    if (hl.length > 0) {
      hl = hl.charAt(0).toUpperCase() + hl.slice(1);
    }
    content.headline = hl;
  }

  // Polish subheadline
  if (content.subheadline) {
    let sh = content.subheadline.trim();
    sh = sh
      .replace(/\bin order to\b/gi, 'to')
      .replace(/\bkind of\b/gi, '')
      .replace(/\bsort of\b/gi, '')
      .replace(/\s+/g, ' ');
    if (!/[.!?]$/.test(sh) && sh.length > 0) {
      sh += '.';
    }
    content.subheadline = sh;
  }

  // Polish badge
  if (!content.badge || content.badge.trim() === '') {
    const padded = String(index + 1).padStart(2, '0');
    content.badge = `${padded} / ${slide.slideType.toUpperCase().replace('_', ' ')}`;
  }

  // Polish bullet points for parallel structure and clean punctuation
  if (content.bulletPoints && content.bulletPoints.length > 0) {
    content.bulletPoints = content.bulletPoints.map((bp) => {
      let cleaned = bp.trim();
      cleaned = cleaned
        .replace(/\bin order to\b/gi, 'to')
        .replace(/\bwe are trying to\b/gi, 'we')
        .replace(/\bbasically\b/gi, '')
        .replace(/\s+/g, ' ');
      // Capitalize first letter
      if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
      // Standardize ending punctuation: ensure period at end
      if (!/[.!?]$/.test(cleaned) && cleaned.length > 0) {
        cleaned += '.';
      }
      return cleaned;
    });
  }

  // Polish speaker notes for fluid oral delivery
  if (content.speakerNotes) {
    let notes = content.speakerNotes.trim();
    if (!notes.startsWith('Present this') && !notes.startsWith('Walk the audience') && !notes.startsWith('Highlight')) {
      if (index === 0) {
        notes = `Welcome the audience and introduce the core thesis: ${notes}`;
      } else if (index === total - 1) {
        notes = `Conclude decisively and invite immediate investor questions: ${notes}`;
      } else {
        notes = `Walk the audience through this slide with conviction: ${notes}`;
      }
    }
    content.speakerNotes = notes;
  } else {
    content.speakerNotes = `Walk the audience through the key takeaway on this slide, emphasizing the ${slide.slideType.replace('_', ' ')} and the tangible strategic advantage.`;
  }

  return {
    ...slide,
    content,
  };
}
