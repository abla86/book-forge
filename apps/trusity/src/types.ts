export type ThemeName =
  | 'startup'
  | 'corporate'
  | 'academic'
  | 'creative'
  | 'minimal'
  | 'dark_mode'
  | 'modern';

export type ToneType =
  | 'persuasive'
  | 'professional'
  | 'inspirational'
  | 'technical'
  | 'concise';

export type SlideType =
  | 'title'
  | 'problem'
  | 'solution'
  | 'market_opportunity'
  | 'business_model'
  | 'comparison'
  | 'timeline'
  | 'process_flow'
  | 'statistics'
  | 'swot'
  | 'roadmap'
  | 'call_to_action'
  | 'team'
  | 'pricing';

export type LayoutName =
  | 'centered_hero'
  | 'split_with_stat'
  | 'bullet_list'
  | 'split_text_image'
  | 'process_steps'
  | 'metrics_grid'
  | 'comparison_table'
  | 'timeline_horizontal'
  | 'swot_grid'
  | 'roadmap_horizontal'
  | 'pricing_table'
  | 'team_cards'
  | 'business_detail'
  | 'full_bleed_statement'
  | 'fallback_layout'
  | 'quad_grid'
  | 'three_columns';

export interface ThemeConfig {
  id: ThemeName;
  name: string;
  vibe: string;
  bg: string;
  cardBg: string;
  cardBorder: string;
  primary: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  fontFamily: string;
  isDark: boolean;
}

export interface MetricItem {
  label: string;
  value: string;
  change?: string;
  subtext?: string;
  icon?: string;
}

export interface ComparisonRow {
  feature: string;
  us: boolean | string;
  competitors: boolean | string;
  notes?: string;
}

export interface TimelineStep {
  step: string;
  title: string;
  description: string;
  dateOrPhase?: string;
  status?: 'completed' | 'current' | 'future';
}

export interface SwotQuadrant {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface PricingTier {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  ctaText?: string;
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  priorCompany?: string;
  avatarInitials?: string;
}

export interface SlideContent {
  headline: string;
  subheadline?: string;
  badge?: string;
  bulletPoints?: string[];
  statistic?: {
    number: string;
    label: string;
    context?: string;
  };
  metrics?: MetricItem[];
  comparisonRows?: ComparisonRow[];
  competitorNames?: string[];
  timelineSteps?: TimelineStep[];
  processSteps?: Array<{ number: number; title: string; desc: string }>;
  swot?: SwotQuadrant;
  pricingTiers?: PricingTier[];
  teamMembers?: TeamMember[];
  businessStreams?: Array<{ name: string; share: string; desc: string }>;
  ctaAction?: {
    primaryText: string;
    askAmount?: string;
    useOfFunds?: Array<{ category: string; percentage: number }>;
    contactEmail?: string;
  };
  speakerNotes: string;
  visualAsset?: SlideVisualAsset;
}

export type VisualPlacement = 'hero_background' | 'side_card' | 'split_media' | 'header_accent';
export type VisualSource = 'ai_generated' | 'stock_photo' | 'custom_svg' | 'upload';

export interface SlideVisualAsset {
  id: string;
  url: string;
  source: VisualSource;
  alt: string;
  caption?: string;
  placement: VisualPlacement;
  aspectRatio?: '16:9' | '4:3' | '1:1' | 'banner';
  authorName?: string;
  authorUrl?: string;
  opacity?: number; // 0.05 to 1.0 (default ~0.25 for background, 1.0 for cards)
  blur?: number; // 0 to 10px
  svgContent?: string;
  promptUsed?: string;
  stylePreset?: string;
}

export interface StockPhotoItem {
  id: string;
  title: string;
  category: string;
  url: string;
  thumbnailUrl: string;
  author: string;
  authorUrl?: string;
  aspectRatio: '16:9' | '4:3' | '1:1';
  tags: string[];
}

export interface VisualContextAnalysis {
  keywords: string[];
  recommendedStyle: string;
  recommendedPlacement: VisualPlacement;
  aiPrompt: string;
  colorMood: string;
  conceptSummary: string;
}

export interface VisualGenerationRequest {
  prompt: string;
  stylePreset?: string;
  aspectRatio?: '16:9' | '4:3' | '1:1' | 'banner';
  themePrimary?: string;
  themeSecondary?: string;
  headline?: string;
}

export type StickyNoteColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple';

export interface DrawingPoint {
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
}

export interface DrawingStroke {
  id: string;
  points: DrawingPoint[];
  color: string;
  width: number;
  isHighlighter?: boolean;
  createdAt: number;
}

export interface StickyNote {
  id: string;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  text: string;
  color: StickyNoteColor;
  author?: string;
  createdAt: string;
  resolved?: boolean;
  isMinimized?: boolean;
}

export interface SlideAnnotations {
  drawings: DrawingStroke[];
  stickyNotes: StickyNote[];
}

export type SlideBackgroundStyle = 'default' | 'mesh' | 'dots' | 'gradient' | 'minimal';

export interface SlideMetadata {
  annotations?: SlideAnnotations;
  smartLayoutApplied?: LayoutName;
  smartLayoutRationale?: string;
  autoAdaptLayout?: boolean;
  harmonyScore?: number;
  densityLevel?: 'optimal' | 'sparse' | 'crowded' | 'unbalanced';
  backgroundStyle?: SlideBackgroundStyle;
  visualAsset?: SlideVisualAsset;
  lastModified?: string;
  tags?: string[];
}

export interface SmartLayoutRecommendation {
  recommendedLayout: LayoutName;
  score: number;
  confidence: 'high' | 'medium';
  reason: string;
  harmonyScore: number;
  densityLevel: 'optimal' | 'sparse' | 'crowded' | 'unbalanced';
  densityTuning: {
    spacing: 'compact' | 'normal' | 'spacious';
    fontScale: 'sm' | 'base' | 'lg';
  };
  contentVolumeSummary: {
    itemCount: number;
    charCount: number;
    balanceStatus: string;
  };
  featuresIdentified: string[];
  alternativeLayouts: {
    layout: LayoutName;
    score: number;
    reason: string;
  }[];
}

export type SlideTransition = 'fade' | 'slide' | 'zoom' | 'none';

export interface DeckSnapshot {
  id: string;
  timestamp: string;
  label: string;
  slideCount: number;
  theme?: ThemeName;
  plan: PresentationPlan;
}

export interface Slide {
  id: string;
  slideType: SlideType;
  layout: LayoutName;
  content: SlideContent;
  metadata?: SlideMetadata;
}

export interface BusinessAnalysis {
  companyName: string;
  tagline: string;
  coreProblem: string;
  solutionSummary: string;
  targetAudience: string;
  marketSizeEstimate: string;
  monetizationModel: string;
  keyDifferentiator: string;
}

export interface PresentationPlan {
  id: string;
  title: string;
  subtitle: string;
  presenter: string;
  theme: ThemeName;
  tone: ToneType;
  createdAt: string;
  analysis: BusinessAnalysis;
  slides: Slide[];
}

export interface GenerationRequest {
  idea: string;
  theme?: ThemeName;
  tone?: ToneType;
  presenterName?: string;
  companyName?: string;
  targetAudience?: string;
  slideCount?: number;
}

export interface PolishOptions {
  targetTone?: ToneType;
  focusAreas?: string[];
  customInstruction?: string;
  styleArchetype?: string;
  primaryFocus?: string;
}

export interface PolishResult {
  plan: PresentationPlan;
  changelog: string[];
  polishedCount: number;
  polishedPlan?: PresentationPlan;
  stats?: {
    totalSlidesPolished: number;
    overallTone: string;
  };
}

export interface RemoteCursor {
  x: number; // 0 - 100 percentage of slide canvas
  y: number; // 0 - 100 percentage of slide canvas
  slideIndex: number;
  lastActive: number;
  name?: string;
  color?: string;
}

export interface Participant {
  id: string;
  name: string;
  color: string;
  avatar: string;
  isHost: boolean;
  activeSlideIndex: number;
  cursor?: RemoteCursor;
  joinedAt: string;
  lastActive: number;
}

export interface LiveReaction {
  id: string;
  emoji: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  userName: string;
  color: string;
  timestamp: number;
}

export interface CollaborationMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: string;
  slideIndex?: number;
}

export interface CollaborationSessionState {
  sessionId: string;
  title: string;
  createdAt: string;
  hostId: string;
  participants: Participant[];
  currentSlideIndex: number;
  plan?: PresentationPlan;
  messages: CollaborationMessage[];
}

export type CollaborationWsClientMessage =
  | { type: 'join'; sessionId: string; user: { id: string; name: string; color: string; avatar: string; isHost?: boolean }; initialPlan?: PresentationPlan; activeSlideIndex?: number }
  | { type: 'cursor_move'; x: number; y: number; slideIndex: number }
  | { type: 'change_slide'; slideIndex: number; isBroadcast?: boolean }
  | { type: 'sync_deck'; plan: PresentationPlan; activeSlideIndex: number }
  | { type: 'live_reaction'; emoji: string; x: number; y: number; slideIndex: number }
  | { type: 'chat_message'; text: string; slideIndex?: number }
  | { type: 'heartbeat' }
  | { type: 'leave' };

export type CollaborationWsServerMessage =
  | { type: 'session_state'; session: CollaborationSessionState; yourId: string }
  | { type: 'participant_joined'; participant: Participant; message?: string }
  | { type: 'participant_left'; participantId: string; message?: string }
  | { type: 'participants_updated'; participants: Participant[] }
  | { type: 'cursor_update'; userId: string; name: string; color: string; x: number; y: number; slideIndex: number }
  | { type: 'deck_updated'; plan: PresentationPlan; activeSlideIndex: number; senderId: string; senderName: string }
  | { type: 'slide_changed'; activeSlideIndex: number; senderId: string; senderName: string; isBroadcast: boolean }
  | { type: 'reaction_received'; reaction: LiveReaction }
  | { type: 'chat_received'; message: CollaborationMessage }
  | { type: 'error'; message: string };

// Video Recording & Export Types
export type VideoTransitionStyle = 'fade' | 'slide' | 'zoom' | 'wipe';
export type VideoResolution = '1080p' | '720p';

export interface VideoExportSettings {
  resolution: VideoResolution;
  slideDuration: number; // seconds per slide (e.g. 4.0)
  transitionStyle: VideoTransitionStyle;
  transitionDuration: number; // seconds for transition (e.g. 0.8)
  audioCues: boolean; // slide transition sound effects
  introOutroAudio: boolean; // opening fanfare and closing resolution chord
  ambientMusic: boolean; // subtle background ambient presentation pad
  audioVolume: number; // 0.0 to 1.0
  showCaptions: boolean; // overlay presenter speaker notes as subtitles
  showProgressBar: boolean; // sleek progress bar along the bottom of the video
  enableAudioMonitor: boolean; // play audio through speakers while recording
}

export interface VideoExportProgress {
  phase: 'idle' | 'capturing' | 'recording' | 'finalizing' | 'completed' | 'error';
  currentSlide: number;
  totalSlides: number;
  percent: number;
  elapsedSeconds: number;
  totalEstimatedSeconds: number;
  message: string;
  error?: string;
}

export interface VideoExportResult {
  blob: Blob;
  url: string;
  mimeType: string;
  fileSizeBytes: number;
  durationSeconds: number;
  fileName: string;
}


