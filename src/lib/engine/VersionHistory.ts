// =====================================================================
// BookForge AI - VersionHistory & Granular Chapter Diff/Recovery Engine
// =====================================================================

import { BookProject, Chapter } from "../../types";

export type DiffChangeType = "added" | "removed" | "unchanged";

export interface DiffChangeChunk {
  type: DiffChangeType;
  value: string;
  lineNumber?: number;
}

export interface ChapterDiff {
  chapterNumber: number;
  chapterId: number;
  status: "added" | "removed" | "modified" | "unchanged";
  beforeTitle?: string;
  afterTitle?: string;
  beforeSummary?: string;
  afterSummary?: string;
  beforeWords: number;
  afterWords: number;
  wordDelta: number;
  addedWordsCount: number;
  removedWordsCount: number;
  lineDiff: DiffChangeChunk[];
  hasContentChanges: boolean;
  hasMetadataChanges: boolean;
}

export interface ProjectDiff {
  projectId: string;
  fromVersionNumber: number;
  toVersionNumber: number;
  fromTimestamp: string;
  toTimestamp: string;
  fromSummary?: string;
  toSummary?: string;
  totalWordDelta: number;
  chaptersChangedCount: number;
  chaptersUnchangedCount: number;
  chapterDiffs: ChapterDiff[];
  metadataChanges: {
    titleChanged: boolean;
    beforeTitle?: string;
    afterTitle?: string;
    genreChanged: boolean;
    toneChanged: boolean;
  };
}

export interface VersionSnapshot {
  id: string;
  projectId: string;
  versionNumber: number;
  createdAt: string;
  summary: string;
  authorId?: string;
  wordCount: number;
  chapterCount: number;
  tag?: "manual" | "auto" | "rollback" | "chapter-revert" | "baseline";
  revertedChapterNumber?: number;
  snapshot: BookProject;
}

export interface ChapterRecoveryResult {
  success: boolean;
  updatedProject: BookProject;
  revertedChapter: Chapter;
  previousChapterState?: Chapter;
  snapshot: VersionSnapshot;
  message: string;
  chapterDiff: ChapterDiff;
}

/**
 * Fast LCS-based (Longest Common Subsequence) diff engine for text and chapters.
 */
export class DiffEngine {
  /**
   * Performs an efficient line-level diff between two text blocks.
   */
  static diffLines(textA = "", textB = ""): DiffChangeChunk[] {
    const linesA = textA ? textA.split("\n") : [];
    const linesB = textB ? textB.split("\n") : [];

    if (linesA.length === 0 && linesB.length === 0) {
      return [];
    }
    if (linesA.length === 0) {
      return linesB.map((line, idx) => ({ type: "added", value: line, lineNumber: idx + 1 }));
    }
    if (linesB.length === 0) {
      return linesA.map((line, idx) => ({ type: "removed", value: line, lineNumber: idx + 1 }));
    }

    // Standard LCS DP Table (optimized for typical chapter lengths)
    const n = linesA.length;
    const m = linesB.length;

    // Fast-path for exact match
    if (textA === textB) {
      return linesA.map((line, idx) => ({ type: "unchanged", value: line, lineNumber: idx + 1 }));
    }

    // For very long texts (>1500 lines), perform chunked or trimmed diff to prevent O(N*M) memory spikes
    const maxLines = 1500;
    const trimmedA = linesA.slice(0, maxLines);
    const trimmedB = linesB.slice(0, maxLines);

    const dp: number[][] = Array.from({ length: trimmedA.length + 1 }, () =>
      new Array(trimmedB.length + 1).fill(0)
    );

    for (let i = 1; i <= trimmedA.length; i++) {
      for (let j = 1; j <= trimmedB.length; j++) {
        if (trimmedA[i - 1] === trimmedB[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack to build diff
    const result: DiffChangeChunk[] = [];
    let i = trimmedA.length;
    let j = trimmedB.length;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && trimmedA[i - 1] === trimmedB[j - 1]) {
        result.push({ type: "unchanged", value: trimmedA[i - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        result.push({ type: "added", value: trimmedB[j - 1] });
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        result.push({ type: "removed", value: trimmedA[i - 1] });
        i--;
      }
    }

    result.reverse();

    // Assign 1-indexed line numbers to output
    let currentLine = 1;
    for (const chunk of result) {
      if (chunk.type !== "removed") {
        chunk.lineNumber = currentLine++;
      }
    }

    return result;
  }

  /**
   * Word-level diff for granular inspection of a paragraph or sentence.
   */
  static diffWords(textA = "", textB = ""): DiffChangeChunk[] {
    const wordsA = textA ? textA.split(/(\s+)/).filter(Boolean) : [];
    const wordsB = textB ? textB.split(/(\s+)/).filter(Boolean) : [];

    if (wordsA.length === 0 && wordsB.length === 0) return [];
    if (wordsA.length === 0) {
      return wordsB.map((w) => ({ type: "added", value: w }));
    }
    if (wordsB.length === 0) {
      return wordsA.map((w) => ({ type: "removed", value: w }));
    }

    const n = Math.min(wordsA.length, 1200);
    const m = Math.min(wordsB.length, 1200);

    const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (wordsA[i - 1] === wordsB[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const result: DiffChangeChunk[] = [];
    let i = n;
    let j = m;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && wordsA[i - 1] === wordsB[j - 1]) {
        result.push({ type: "unchanged", value: wordsA[i - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        result.push({ type: "added", value: wordsB[j - 1] });
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        result.push({ type: "removed", value: wordsA[i - 1] });
        i--;
      }
    }

    return result.reverse();
  }

  /**
   * Computes a comprehensive comparison between two states of a single chapter.
   */
  static computeChapterDiff(beforeChap?: Chapter, afterChap?: Chapter): ChapterDiff {
    const chapterNumber = afterChap?.number ?? beforeChap?.number ?? 1;
    const chapterId = afterChap?.id ?? beforeChap?.id ?? 1;

    if (!beforeChap && !afterChap) {
      return {
        chapterNumber,
        chapterId,
        status: "unchanged",
        beforeWords: 0,
        afterWords: 0,
        wordDelta: 0,
        addedWordsCount: 0,
        removedWordsCount: 0,
        lineDiff: [],
        hasContentChanges: false,
        hasMetadataChanges: false,
      };
    }

    if (!beforeChap && afterChap) {
      const words = afterChap.currentWords || countWords(afterChap.content || "");
      const lines = this.diffLines("", afterChap.content || "");
      return {
        chapterNumber,
        chapterId,
        status: "added",
        afterTitle: afterChap.title,
        afterSummary: afterChap.summary,
        beforeWords: 0,
        afterWords: words,
        wordDelta: words,
        addedWordsCount: words,
        removedWordsCount: 0,
        lineDiff: lines,
        hasContentChanges: Boolean(afterChap.content),
        hasMetadataChanges: true,
      };
    }

    if (beforeChap && !afterChap) {
      const words = beforeChap.currentWords || countWords(beforeChap.content || "");
      const lines = this.diffLines(beforeChap.content || "", "");
      return {
        chapterNumber,
        chapterId,
        status: "removed",
        beforeTitle: beforeChap.title,
        beforeSummary: beforeChap.summary,
        beforeWords: words,
        afterWords: 0,
        wordDelta: -words,
        addedWordsCount: 0,
        removedWordsCount: words,
        lineDiff: lines,
        hasContentChanges: Boolean(beforeChap.content),
        hasMetadataChanges: true,
      };
    }

    // Both exist -> compare content & metadata
    const b = beforeChap!;
    const a = afterChap!;

    const beforeWords = b.currentWords || countWords(b.content || "");
    const afterWords = a.currentWords || countWords(a.content || "");
    const wordDelta = afterWords - beforeWords;

    const hasContentChanges = (b.content || "").trim() !== (a.content || "").trim();
    const hasMetadataChanges =
      b.title !== a.title ||
      b.summary !== a.summary ||
      b.act !== a.act ||
      b.povCharacter !== a.povCharacter;

    let lineDiff: DiffChangeChunk[] = [];
    let addedWords = 0;
    let removedWords = 0;

    if (hasContentChanges) {
      lineDiff = this.diffLines(b.content || "", a.content || "");
      for (const chunk of lineDiff) {
        if (chunk.type === "added") addedWords += countWords(chunk.value);
        if (chunk.type === "removed") removedWords += countWords(chunk.value);
      }
    } else {
      lineDiff = (a.content || "").split("\n").map((line, idx) => ({
        type: "unchanged",
        value: line,
        lineNumber: idx + 1,
      }));
    }

    let status: "added" | "removed" | "modified" | "unchanged" = "unchanged";
    if (hasContentChanges || hasMetadataChanges) {
      status = "modified";
    }

    return {
      chapterNumber,
      chapterId,
      status,
      beforeTitle: b.title,
      afterTitle: a.title,
      beforeSummary: b.summary,
      afterSummary: a.summary,
      beforeWords,
      afterWords,
      wordDelta,
      addedWordsCount: addedWords,
      removedWordsCount: removedWords,
      lineDiff,
      hasContentChanges,
      hasMetadataChanges,
    };
  }

  /**
   * Computes a full project-level diff comparing all chapters and metadata.
   */
  static computeProjectDiff(
    beforeProj: BookProject,
    afterProj: BookProject,
    fromVersion = 1,
    toVersion = 2,
    fromSummary = "",
    toSummary = ""
  ): ProjectDiff {
    const maxChapters = Math.max(beforeProj.chapters.length, afterProj.chapters.length);
    const chapterDiffs: ChapterDiff[] = [];

    let totalWordDelta = 0;
    let changedCount = 0;
    let unchangedCount = 0;

    for (let i = 1; i <= maxChapters; i++) {
      const beforeC = beforeProj.chapters.find((c) => c.number === i);
      const afterC = afterProj.chapters.find((c) => c.number === i);

      const cDiff = this.computeChapterDiff(beforeC, afterC);
      chapterDiffs.push(cDiff);

      totalWordDelta += cDiff.wordDelta;
      if (cDiff.status !== "unchanged") {
        changedCount++;
      } else {
        unchangedCount++;
      }
    }

    return {
      projectId: afterProj.id,
      fromVersionNumber: fromVersion,
      toVersionNumber: toVersion,
      fromTimestamp: beforeProj.updatedAt || new Date().toISOString(),
      toTimestamp: afterProj.updatedAt || new Date().toISOString(),
      fromSummary,
      toSummary,
      totalWordDelta,
      chaptersChangedCount: changedCount,
      chaptersUnchangedCount: unchangedCount,
      chapterDiffs,
      metadataChanges: {
        titleChanged: beforeProj.title !== afterProj.title,
        beforeTitle: beforeProj.title,
        afterTitle: afterProj.title,
        genreChanged: beforeProj.genre !== afterProj.genre,
        toneChanged: beforeProj.tone !== afterProj.tone,
      },
    };
  }
}

function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

export interface VersionPersistenceAdapter {
  saveSnapshot(snapshot: VersionSnapshot): void;
  getSnapshots(projectId: string): VersionSnapshot[];
}

/**
 * VersionService: Core engine for immutable snapshots, time-travel, granular chapter recovery and diffing.
 */
export class VersionServiceImpl {
  private versionsByProject: Map<string, VersionSnapshot[]> = new Map();
  private persistenceAdapter: VersionPersistenceAdapter | null = null;

  setPersistenceAdapter(adapter: VersionPersistenceAdapter): void {
    this.persistenceAdapter = adapter;
  }

  /**
   * Captures an immutable snapshot of the entire project state.
   */
  createSnapshot(
    project: BookProject,
    summary: string,
    authorId = "current-user",
    tag: VersionSnapshot["tag"] = "manual",
    revertedChapterNumber?: number
  ): VersionSnapshot {
    const existing = this.getVersions(project.id);
    const versionNumber = existing.length + 1;

    const totalWords = project.chapters.reduce(
      (acc, c) => acc + (c.currentWords || countWords(c.content || "")),
      0
    );

    const snapshot: VersionSnapshot = {
      id: `ver-${project.id}-v${versionNumber}-${Date.now().toString(36)}`,
      projectId: project.id,
      versionNumber,
      createdAt: new Date().toISOString(),
      summary,
      authorId,
      wordCount: totalWords,
      chapterCount: project.chapters.filter((c) => Boolean(c.content && c.content.trim())).length,
      tag,
      revertedChapterNumber,
      snapshot: JSON.parse(JSON.stringify(project)),
    };

    existing.unshift(snapshot);
    this.versionsByProject.set(project.id, existing);

    if (this.persistenceAdapter) {
      try {
        this.persistenceAdapter.saveSnapshot(snapshot);
      } catch (err) {
        console.error("[VersionService] Failed to persist snapshot:", err);
      }
    }

    return snapshot;
  }

  getVersions(projectId: string): VersionSnapshot[] {
    if (this.persistenceAdapter) {
      try {
        const persisted = this.persistenceAdapter.getSnapshots(projectId);
        if (persisted && persisted.length > 0) {
          this.versionsByProject.set(projectId, persisted);
          return persisted;
        }
      } catch {
        // Fallback to memory
      }
    }
    return this.versionsByProject.get(projectId) || [];
  }

  getVersion(projectId: string, versionNumber: number): VersionSnapshot | undefined {
    const list = this.getVersions(projectId);
    return list.find((v) => v.versionNumber === versionNumber);
  }

  getLatestVersion(projectId: string): VersionSnapshot | undefined {
    const list = this.getVersions(projectId);
    return list[0];
  }

  /**
   * Full project rollback to a previous version snapshot.
   */
  rollback(projectId: string, versionNumber: number, authorId = "current-user"): BookProject {
    const target = this.getVersion(projectId, versionNumber);
    if (!target) {
      throw new Error(`Fant ikke versjon ${versionNumber} for prosjekt ${projectId}.`);
    }

    // Clone restored state safely
    const restored = JSON.parse(JSON.stringify(target.snapshot)) as BookProject;
    restored.updatedAt = new Date().toISOString();

    // Auto-create a recovery checkpoint to protect history
    this.createSnapshot(
      restored,
      `Full tilbakestilling til versjon ${versionNumber}: «${target.summary}»`,
      authorId,
      "rollback"
    );

    return restored;
  }

  /**
   * Granular Chapter Reversion: Reverts ONLY a specific chapter from a target snapshot
   * into the current active manuscript, keeping all other chapters and bible data intact.
   */
  revertChapter(
    projectId: string,
    currentProject: BookProject,
    chapterNumber: number,
    targetVersionNumber: number,
    authorId = "current-user"
  ): ChapterRecoveryResult {
    const targetVersion = this.getVersion(projectId, targetVersionNumber);
    if (!targetVersion) {
      throw new Error(`Fant ikke versjon ${targetVersionNumber} for prosjekt ${projectId}.`);
    }

    const targetChapter = targetVersion.snapshot.chapters.find((c) => c.number === chapterNumber);
    if (!targetChapter) {
      throw new Error(
        `Kapittel ${chapterNumber} fantes ikke i versjon ${targetVersionNumber} av «${currentProject.title}».`
      );
    }

    const currentChapter = currentProject.chapters.find((c) => c.number === chapterNumber);

    // Compute diff before applying
    const chapterDiff = DiffEngine.computeChapterDiff(currentChapter, targetChapter);

    // Clone the updated project
    const updatedChapters = currentProject.chapters.map((chap) => {
      if (chap.number === chapterNumber) {
        return {
          ...chap,
          title: targetChapter.title,
          summary: targetChapter.summary,
          content: targetChapter.content,
          currentWords: targetChapter.currentWords || countWords(targetChapter.content || ""),
          wordTarget: targetChapter.wordTarget,
          status: targetChapter.status,
          conflict: targetChapter.conflict,
          povCharacter: targetChapter.povCharacter,
          continuityNotes: `[Gjenopprettet fra Versjon ${targetVersionNumber}] ${targetChapter.continuityNotes || ""}`.trim(),
        };
      }
      return chap;
    });

    const updatedProject: BookProject = {
      ...currentProject,
      chapters: updatedChapters,
      updatedAt: new Date().toISOString(),
    };

    // Calculate new total word count
    const totalWords = updatedChapters.reduce(
      (acc, c) => acc + (c.currentWords || countWords(c.content || "")),
      0
    );
    updatedProject.currentWords = totalWords;

    // Create an immutable snapshot of this recovery action
    const snapshot = this.createSnapshot(
      updatedProject,
      `Gjenopprettet Kapittel ${chapterNumber} («${targetChapter.title}») fra Versjon ${targetVersionNumber}`,
      authorId,
      "chapter-revert",
      chapterNumber
    );

    return {
      success: true,
      updatedProject,
      revertedChapter: JSON.parse(JSON.stringify(targetChapter)),
      previousChapterState: currentChapter ? JSON.parse(JSON.stringify(currentChapter)) : undefined,
      snapshot,
      message: `Kapittel ${chapterNumber} ble vellykket gjenopprettet fra Versjon ${targetVersionNumber}.`,
      chapterDiff,
    };
  }

  /**
   * Compares two snapshot versions of the project.
   */
  compareVersions(projectId: string, fromVersionNum: number, toVersionNum: number): ProjectDiff {
    const fromV = this.getVersion(projectId, fromVersionNum);
    const toV = this.getVersion(projectId, toVersionNum);

    if (!fromV) throw new Error(`Fra-versjon ${fromVersionNum} finnes ikke.`);
    if (!toV) throw new Error(`Til-versjon ${toVersionNum} finnes ikke.`);

    return DiffEngine.computeProjectDiff(
      fromV.snapshot,
      toV.snapshot,
      fromVersionNum,
      toVersionNum,
      fromV.summary,
      toV.summary
    );
  }

  /**
   * Compares current manuscript state against a specific historical snapshot.
   */
  compareWithCurrent(currentProject: BookProject, targetVersionNum: number): ProjectDiff {
    const targetV = this.getVersion(currentProject.id, targetVersionNum);
    if (!targetV) {
      throw new Error(`Versjon ${targetVersionNum} finnes ikke.`);
    }

    return DiffEngine.computeProjectDiff(
      targetV.snapshot,
      currentProject,
      targetVersionNum,
      0, // 0 denotes "Nåværende tilstand"
      targetV.summary,
      "Nåværende manuskript"
    );
  }

  /**
   * Tags a version with an easy to remember name (e.g. "Draft 1", "Ferdig Redaktørrunde")
   */
  updateVersionSummary(projectId: string, versionNumber: number, newSummary: string): boolean {
    const v = this.getVersion(projectId, versionNumber);
    if (!v) return false;
    v.summary = newSummary.trim();
    return true;
  }
}

// Global Singleton instance
export const VersionService = new VersionServiceImpl();
