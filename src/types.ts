export type ProjectPhase = "setup" | "planned" | "writing" | "complete";

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
  score: number;
  verdict: string;
  analyzedAt: string;
  anomalies: ContinuityAnomaly[];
  strengths: string[];
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

export interface BookCover {
  id: string;
  title: string;
  author: string;
  tagline: string;
  gradient: string;
  style: string;
  badge: string;
  fontStyle: "cinzel" | "serif" | "modern";
}

export interface BookProject {
  id: string;
  title: string;
  idea: string;
  genre: string;
  tone: string;
  lengthLabel: string;
  targetWords: number;
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
  createdAt: string;
  updatedAt: string;
}
