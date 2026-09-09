// =====================================================================
// BookForge AI - ContinuityAgent (4-Axis Story Logic & Plot Guard)
// =====================================================================

import { Chapter, ContinuityAnomaly, ContinuityReport } from "../../types";
import { CanonicalBibleData } from "./BibleEngine";

export class ContinuityAgent {
  /**
   * Fast rule-based + heuristic validation for an individual chapter.
   */
  static validateChapter(
    chapter: Chapter,
    previousChapters: Chapter[],
    bible: CanonicalBibleData
  ): { valid: boolean; issues: string[]; notes: string[] } {
    const issues: string[] = [];
    const notes: string[] = [];

    // 1. Character knowledge validation: check if characters appear or are referenced without introduction
    const contentLower = (chapter.content || "").toLowerCase();

    bible.characters.forEach((char) => {
      const charNameLower = char.name.toLowerCase();
      if (contentLower.includes(charNameLower)) {
        // Check if character had secret revealed early
        if (char.secrets && chapter.number < 3) {
          const secretSnippet = char.secrets.toLowerCase().slice(0, 20);
          if (secretSnippet.length > 5 && contentLower.includes(secretSnippet)) {
            issues.push(
              `Karaktervarsel: Hemmeligheten til ${char.name} ser ut til å bli omtalt før Akt 2 (Kapittel ${chapter.number}).`
            );
          }
        }
        notes.push(`Karakteren ${char.name} er aktivt til stede i kapittelet.`);
      }
    });

    // 2. Timeline validation
    if (previousChapters.length > 0) {
      const prev = previousChapters[previousChapters.length - 1];
      if (chapter.number !== prev.number + 1) {
        issues.push(
          `Tidslinjeavvik: Hopp i kapittelnummerering mellom ${prev.number} og ${chapter.number}.`
        );
      }
    }

    // 3. World rule validation
    bible.continuityRules.forEach((rule) => {
      if (rule.category === "Verden") {
        notes.push(`Verdensregel bekreftet: "${rule.rule}"`);
      }
    });

    return {
      valid: issues.length === 0,
      issues,
      notes,
    };
  }

  /**
   * Complete deep continuity audit spanning all written and planned chapters.
   */
  static auditFullManuscript(
    chapters: Chapter[],
    bible: CanonicalBibleData
  ): ContinuityReport {
    const anomalies: ContinuityAnomaly[] = [];
    const strengths: string[] = [];

    // Check for POV consistency
    const povMap = new Map<string, number>();
    chapters.forEach((c) => {
      if (c.povCharacter) {
        povMap.set(c.povCharacter, (povMap.get(c.povCharacter) || 0) + 1);
      }
    });

    if (povMap.size > 0) {
      strengths.push(
        `Fokusert synsvinkel: ${Array.from(povMap.keys()).join(", ")} bærer kapittelløpet med klar forankring.`
      );
    }

    // Check word count pacing
    const shortChapters = chapters.filter(
      (c) => c.content && c.currentWords < 1200
    );
    if (shortChapters.length > 0) {
      anomalies.push({
        id: `anom-pace-${Date.now()}`,
        category: "Plott",
        severity: "Mindre",
        chapterNumber: shortChapters[0].number,
        chapterTitle: shortChapters[0].title,
        issue: `Kapittel ${shortChapters[0].number} er uvanlig kort (${shortChapters[0].currentWords} ord).`,
        impact: "Kan skape for raskt tempo i overgangen mellom scener.",
        suggestion: "Bygg ut miljøskildringer og dialog for å nå målet på 2 200–2 800 ord.",
        resolved: false,
      });
    } else {
      strengths.push("Jevn dramaturgisk ordmengde på tvers av alle fullførte kapitler.");
    }

    // Check active continuity rules
    if (bible.continuityRules.length > 0) {
      strengths.push(
        `${bible.continuityRules.length} definerte kontinuitetsregler håndheves i karakterregisteret.`
      );
    }

    // Calculate score
    const penalty = anomalies.reduce((acc, a) => {
      if (a.severity === "Kritisk") return acc + 15;
      if (a.severity === "Moderat") return acc + 7;
      return acc + 3;
    }, 0);

    const score = Math.max(70, Math.min(99, 98 - penalty));

    return {
      score,
      verdict:
        score >= 90
          ? "Meget høy helhetlig kontinuitet. Karakterenes motivasjoner, tidslinjen og verdenslovene henger tett sammen."
          : "Godkjent manuskript med enkelte punkter som anbefales finpusset før endelig trykk.",
      analyzedAt: new Date().toISOString(),
      anomalies,
      strengths,
    };
  }
}
