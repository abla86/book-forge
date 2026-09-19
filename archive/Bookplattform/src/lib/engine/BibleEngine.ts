// =====================================================================
// BookForge AI - BibleEngine (Canonical Story Knowledge Engine)
// Generic, Lore-Agnostic, and Fully Project-Driven
// =====================================================================

import {
  Character,
  LocationItem,
  TimelineEvent,
  ContinuityRule,
  BookProject,
} from "../../types";

export interface PlotThread {
  id: string;
  title: string;
  introducedInChapter: number;
  resolvedInChapter?: number;
  status: "open" | "resolved";
  notes: string;
}

export interface ForeshadowingItem {
  id: string;
  clue: string;
  placedInChapter: number;
  payoffChapter?: number;
  resolved: boolean;
}

export interface CanonicalBibleData {
  bookTitle: string;
  genre: string;
  tone: string;
  characters: Character[];
  locations: LocationItem[];
  timeline: TimelineEvent[];
  continuityRules: ContinuityRule[];
  plotThreads: PlotThread[];
  foreshadowing: ForeshadowingItem[];
}

export interface BibleEngineInput extends Partial<BookProject> {
  plotThreads?: PlotThread[];
  foreshadowing?: ForeshadowingItem[];
}

export class BibleEngine {
  private data: CanonicalBibleData;

  constructor(project: BibleEngineInput = {}) {
    this.data = {
      bookTitle: project.title || "Uten tittel",
      genre: project.genre || "Roman",
      tone: project.tone || "Nøytral",
      characters: project.characters ? [...project.characters] : [],
      locations: project.locations ? [...project.locations] : [],
      timeline: project.timeline ? [...project.timeline] : [],
      continuityRules: project.continuityRules ? [...project.continuityRules] : [],
      // Strictly project-driven; no hardcoded demo lore injected into books
      plotThreads: project.plotThreads ? [...project.plotThreads] : [],
      foreshadowing: project.foreshadowing ? [...project.foreshadowing] : [],
    };
  }

  getData(): CanonicalBibleData {
    return JSON.parse(JSON.stringify(this.data));
  }

  // Character operations
  getCharacters(): Character[] {
    return [...this.data.characters];
  }

  getCharacterByName(name: string): Character | undefined {
    if (!name) return undefined;
    const clean = name.trim().toLowerCase();
    return this.data.characters.find(
      (c) => c.name.toLowerCase() === clean || c.name.toLowerCase().includes(clean)
    );
  }

  addOrUpdateCharacter(char: Character): void {
    const idx = this.data.characters.findIndex((c) => c.id === char.id);
    if (idx >= 0) {
      this.data.characters[idx] = char;
    } else {
      this.data.characters.push(char);
    }
  }

  // Location operations
  getLocations(): LocationItem[] {
    return [...this.data.locations];
  }

  addOrUpdateLocation(loc: LocationItem): void {
    const idx = this.data.locations.findIndex((l) => l.id === loc.id);
    if (idx >= 0) {
      this.data.locations[idx] = loc;
    } else {
      this.data.locations.push(loc);
    }
  }

  // Timeline operations
  getTimeline(): TimelineEvent[] {
    return [...this.data.timeline];
  }

  addTimelineEvent(event: TimelineEvent): void {
    this.data.timeline.push(event);
  }

  // Continuity rules
  getRules(): ContinuityRule[] {
    return [...this.data.continuityRules];
  }

  addRule(rule: ContinuityRule): void {
    this.data.continuityRules.push(rule);
  }

  // Plot threads
  getOpenPlotThreads(): PlotThread[] {
    return this.data.plotThreads.filter((t) => t.status === "open");
  }

  getAllPlotThreads(): PlotThread[] {
    return [...this.data.plotThreads];
  }

  addPlotThread(thread: PlotThread): void {
    this.data.plotThreads.push(thread);
  }

  resolvePlotThread(threadId: string, chapterNumber: number): void {
    const t = this.data.plotThreads.find((x) => x.id === threadId);
    if (t) {
      t.status = "resolved";
      t.resolvedInChapter = chapterNumber;
    }
  }

  // Foreshadowing operations
  getForeshadowing(): ForeshadowingItem[] {
    return [...this.data.foreshadowing];
  }

  addForeshadowing(item: ForeshadowingItem): void {
    this.data.foreshadowing.push(item);
  }

  resolveForeshadowing(itemId: string, payoffChapter: number): void {
    const item = this.data.foreshadowing.find((x) => x.id === itemId);
    if (item) {
      item.resolved = true;
      item.payoffChapter = payoffChapter;
    }
  }

  /**
   * Generates a context package injected into AI prompts when drafting a specific chapter.
   */
  buildContextForChapter(chapterNumber: number, povName?: string): string {
    const povChar = povName ? this.getCharacterByName(povName) : undefined;
    const openThreads = this.getOpenPlotThreads().map((t) => `- ${t.title}: ${t.notes}`).join("\n");
    const activeRules = this.data.continuityRules.map((r) => `- [${r.category}] ${r.rule}`).join("\n");
    const keyLocations = this.data.locations
      .map((l) => `- ${l.name} (${l.type}): ${l.atmosphere || l.notableEvents || l.geography}`)
      .join("\n");

    let text = `=== BOKBIBEL KONTEKST FOR KAPITTEL ${chapterNumber} ===\n`;
    text += `TITTEL: ${this.data.bookTitle} (${this.data.genre}, ${this.data.tone})\n\n`;

    if (povChar) {
      text += `SYNSVINKELKARAKTER (POV): ${povChar.name} (${povChar.role})\n`;
      text += `MÅL: ${povChar.goal}\n`;
      if (povChar.motivationInternal) text += `INDRE MOTIVASJON: ${povChar.motivationInternal}\n`;
      if (povChar.internalConflict) text += `INDRE KONFLIKT: ${povChar.internalConflict}\n`;
      if (povChar.secrets) text += `HEMMELIGHET: ${povChar.secrets}\n\n`;
    }

    if (keyLocations) {
      text += `SENTRALE LOKASJONER:\n${keyLocations}\n\n`;
    }

    text += `AKTIVE KONTINUITETSREGLER:\n${activeRules || "Ingen eksplisitte regler satt."}\n\n`;
    text += `ULØSTE PLOTTRÅDER:\n${openThreads || "Ingen åpne tråder registrert."}\n`;

    return text;
  }
}
