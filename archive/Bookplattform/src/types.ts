export type ProjectPhase = "setup" | "planned" | "writing" | "complete" | "needs-review";

export interface Chapter {
  id: number;
  number: number;
  title: string;
  summary: string;
  act: number;
  status: "planned" | "writing" | "verified" | "completed";
  wordTarget: number;
  currentWords: number;
  content: string;
  povCharacter: string;
  conflict: string;
  continuityNotes: string;
}

export interface CharacterRelationship {
  targetCharacterName: string;
  relationType: string;
  dynamic: string;
  tensionLevel: number; // 1 to 10
}

export interface PersonalityEvolution {
  act1: string;
  act2: string;
  act3: string;
  act4?: string;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  archetype: string;
  goal: string;
  background: string;
  voice: string;
  secrets: string;
  arc: string;
  motivationInternal?: string;
  motivationExternal?: string;
  internalConflict?: string;
  externalConflict?: string;
  relationships?: CharacterRelationship[];
  personalityEvolution?: PersonalityEvolution;
  journeySummary?: string;
}

export interface ContinuityAnomaly {
  id: string;
  category: "Plott" | "Karakter" | "Tidslinje" | "Verdensbygging";
  severity: "Kritisk" | "Moderat" | "Mindre";
  chapterNumber?: number;
  chapterTitle?: string;
  issue: string;
  impact: string;
  suggestion: string;
  resolved: boolean;
}

export interface ContinuityReport {
  score: number | null;
  status?: "complete" | "insufficient_data";
  analysisType?: "rule_based" | "ai_assisted";
  verdict: string;
  analyzedAt: string;
  anomalies: ContinuityAnomaly[];
  strengths: string[];
  metrics?: {
    chaptersAnalyzed: number;
    writtenChaptersCount: number;
    totalWords: number;
    criticalAnomalies: number;
    moderateAnomalies: number;
    minorAnomalies: number;
  };
}

export interface LocationItem {
  id: string;
  name: string;
  type: string;
  geography: string;
  history: string;
  atmosphere: string;
  rules: string;
  notableEvents: string;
}

export interface TimelineEvent {
  id: string;
  timeframe: string;
  title: string;
  description: string;
  plotThreads: string;
  verified: boolean;
}

export interface ContinuityRule {
  id: string;
  rule: string;
  category: "Karakter" | "Verden" | "Tidslinje" | "Gjenstand";
  verified: boolean;
}

export type ContentType = "BOOK" | "SCREENPLAY" | "SERIES" | "SHORT_STORY";

export interface GenerationChunk {
  id: string;
  jobId: string;
  projectId: string;
  chapterNumber: number;
  chunkIndex: number;
  content: string;
  wordCount: number;
  tokensUsed?: { input: number; output: number };
  isContinuation: boolean;
  createdAt: string;
}

export interface CreativeAsset {
  id: string;
  projectId: string;
  type: "cover_front" | "cover_back" | "illustration" | "character_portrait" | "map";
  title: string;
  prompt: string;
  negativePrompt?: string;
  url?: string;
  svgData?: string;
  aspectRatio: string;
  status: "pending" | "ready" | "failed";
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface VisualBible {
  artStyle: string;
  colorPalette: string[];
  lightingMood: string;
  typographyFamily: string;
  characterVisualGuidelines: Record<string, string>;
  settingVisualGuidelines: Record<string, string>;
}

export interface BookCover {
  id: string;
  title: string;
  author: string;
  tagline: string;
  gradient: string;
  style: string;
  badge: string;
  fontStyle: "cinzel" | "serif" | "modern";
  assetId?: string;
  imageUrl?: string;
  prompt?: string;
}

export interface BookProject {
  id: string;
  contentType?: ContentType;
  ownerId?: string;
  universeId?: string;
  title: string;
  idea: string;
  genre: string;
  tone: string;
  lengthLabel: string;
  targetWords: number;
  currentWords?: number;
  targetChapters: number;
  synopsis: string;
  coverStyle: string;
  phase: ProjectPhase;
  progress: number;
  activeChapter: number;
  acts: number;
  pov: string;
  ending: string;
  author: string;
  chapters: Chapter[];
  characters: Character[];
  locations: LocationItem[];
  timeline: TimelineEvent[];
  continuityRules: ContinuityRule[];
  covers: BookCover[];
  assets?: CreativeAsset[];
  visualBible?: VisualBible;
  createdAt: string;
  updatedAt: string;
}

export interface BookSpecification {
  title: string;
  author: string;
  originalIdea: string;
  genre: string;
  subgenre: string;
  tone: string;
  audience: string;
  language: string;
  pov: string;
  targetWords: number;
  targetChapters: number;
  acts: number;
  synopsis: string;
  themes: string[];
  setting: string;
  timePeriod: string;
  chapterTargets: number[];
}

export interface ChapterBlueprint {
  number: number;
  title: string;
  act: number;
  purpose: string;
  summary: string;
  openingState: string;
  endingState: string;
  scenes: string[];
  pov: string;
  characters: string[];
  locations: string[];
  conflict: string;
  reveal: string;
  emotionalMovement: string;
  plotThreadsAdvanced: string[];
  foreshadowing: string[];
  continuityRequirements: string[];
  wordTarget: number;
}

export interface ChapterGenerationState {
  chapterNumber: number;
  status: "pending" | "writing" | "partial" | "validating" | "completed" | "failed";
  attempt: number;
  targetWords: number;
  currentWords: number;
  startedAt?: string;
  completedAt?: string;
  lastError?: string;
}

export interface BookGenerationJob {
  id: string;
  projectId: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  phase: "specification" | "bible" | "blueprints" | "writing" | "audit" | "repair" | "completed" | "failed";
  totalChapters: number;
  completedChapters: number;
  totalWords: number;
  targetWords?: number;
  generatedWords: number;
  currentChapter: number;
  currentChapterWords: number;
  currentChapterTarget: number;
  startedAt: string;
  completedAt?: string;
  elapsedMs: number;
  activeJobs: number;
  retrying: number;
  error?: string;
  retryCount: number;
  createdBy: string;
  chapterStates?: Record<number, ChapterGenerationState>;
  checkpoint?: {
    phase: string;
    lastSavedAt: string;
    completedChapterNumbers: number[];
    nextBatchStart: number;
    specification?: BookSpecification;
    blueprints?: ChapterBlueprint[];
  };
}
