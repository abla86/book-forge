// =====================================================================
// BookForge AI - BibleEngine (Canonical Story Knowledge Engine)
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

export class BibleEngine {
  private data: CanonicalBibleData;

  constructor(project: Partial<BookProject>) {
    this.data = {
      bookTitle: project.title || "Uten tittel",
      genre: project.genre || "Roman",
      tone: project.tone || "Filmisk",
      characters: project.characters || [],
      locations: project.locations || [],
      timeline: project.timeline || [],
      continuityRules: project.continuityRules || [],
      plotThreads: [
        {
          id: "thread-1",
          title: "Miras messingnøkkel og den underjordiske porten",
          introducedInChapter: 1,
          status: "open",
          notes: "Nøkkelen reagerer magnetisk på slusene under Bergen.",
        },
        {
          id: "thread-2",
          title: "Elias Bergs hemmelige oppdragsgiver",
          introducedInChapter: 3,
          status: "open",
          notes: "Elias bærer en forseglet pakt fra forrige århundre.",
        },
      ],
      foreshadowing: [
        {
          id: "fore-1",
          clue: "Støvete timeglass der sanden virvler oppover",
          placedInChapter: 1,
          payoffChapter: 28,
          resolved: false,
        },
        {
          id: "fore-2",
          clue: "Ankertatoveringen på Elias' underarm",
          placedInChapter: 3,
          payoffChapter: 16,
          resolved: false,
        },
      ],
    };
  }

  getData(): CanonicalBibleData {
    return JSON.parse(JSON.stringify(this.data));
  }

  // Character operations
  getCharacters(): Character[] {
    return this.data.characters;
  }

  getCharacterByName(name: string): Character | undefined {
    return this.data.characters.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
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
    return this.data.locations;
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
    return this.data.timeline;
  }

  addTimelineEvent(event: TimelineEvent): void {
    this.data.timeline.push(event);
  }

  // Continuity rules
  getRules(): ContinuityRule[] {
    return this.data.continuityRules;
  }

  addRule(rule: ContinuityRule): void {
    this.data.continuityRules.push(rule);
  }

  // Plot threads
  getOpenPlotThreads(): PlotThread[] {
    return this.data.plotThreads.filter((t) => t.status === "open");
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

  /**
   * Generates a context package injected into AI prompts when drafting a specific chapter.
   */
  buildContextForChapter(chapterNumber: number, povName?: string): string {
    const povChar = povName ? this.getCharacterByName(povName) : undefined;
    const openThreads = this.getOpenPlotThreads().map((t) => `- ${t.title}: ${t.notes}`).join("\n");
    const activeRules = this.data.continuityRules.map((r) => `- [${r.category}] ${r.rule}`).join("\n");

    let text = `=== BOKBIBEL KONTEKST FOR KAPITTEL ${chapterNumber} ===\n`;
    text += `TITTEL: ${this.data.bookTitle} (${this.data.genre}, ${this.data.tone})\n\n`;

    if (povChar) {
      text += `HOVEDKARAKTER: ${povChar.name} (${povChar.role})\n`;
      text += `MÅL: ${povChar.goal}\n`;
      text += `INDRE MOTIVASJON: ${povChar.motivationInternal || "Uavklart"}\n`;
      text += `INDRE KONFLIKT: ${povChar.internalConflict || "Uavklart"}\n`;
      text += `HEMMELIGHET: ${povChar.secrets}\n\n`;
    }

    text += `AKTIVE KONTINUITETSREGLER:\n${activeRules || "Ingen eksplisitte regler satt."}\n\n`;
    text += `ULØSTE PLOTTRÅDER:\n${openThreads || "Ingen åpne tråder registrert."}\n`;

    return text;
  }
}
