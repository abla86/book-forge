// =====================================================================
// BookForge AI - VersionService (Manuscript Snapshots & Time-Travel)
// =====================================================================

import { BookProject } from "../../types";

export interface VersionSnapshot {
  id: string;
  projectId: string;
  versionNumber: number;
  createdAt: string;
  summary: string;
  authorId?: string;
  wordCount: number;
  chapterCount: number;
  snapshot: BookProject;
}

class VersionServiceImpl {
  private versionsByProject: Map<string, VersionSnapshot[]> = new Map();

  /**
   * Captures an immutable snapshot of the entire project state.
   */
  createSnapshot(
    project: BookProject,
    summary: string,
    authorId = "current-user"
  ): VersionSnapshot {
    const existing = this.versionsByProject.get(project.id) || [];
    const versionNumber = existing.length + 1;

    const totalWords = project.chapters.reduce(
      (acc, c) => acc + (c.currentWords || 0),
      0
    );

    const snapshot: VersionSnapshot = {
      id: `ver-${project.id}-v${versionNumber}`,
      projectId: project.id,
      versionNumber,
      createdAt: new Date().toISOString(),
      summary,
      authorId,
      wordCount: totalWords,
      chapterCount: project.chapters.filter((c) => c.content).length,
      snapshot: JSON.parse(JSON.stringify(project)),
    };

    existing.unshift(snapshot);
    this.versionsByProject.set(project.id, existing);
    return snapshot;
  }

  getVersions(projectId: string): VersionSnapshot[] {
    return this.versionsByProject.get(projectId) || [];
  }

  getVersion(projectId: string, versionNumber: number): VersionSnapshot | undefined {
    const list = this.getVersions(projectId);
    return list.find((v) => v.versionNumber === versionNumber);
  }

  /**
   * Restores a project state from an earlier version snapshot.
   */
  rollback(projectId: string, versionNumber: number): BookProject {
    const v = this.getVersion(projectId, versionNumber);
    if (!v) {
      throw new Error(`Fant ikke versjon ${versionNumber} for prosjekt ${projectId}.`);
    }

    // Clone restored state
    const restored = JSON.parse(JSON.stringify(v.snapshot)) as BookProject;
    restored.updatedAt = new Date().toISOString();

    // Auto-create a recovery checkpoint to protect history
    this.createSnapshot(
      restored,
      `Gjenopprettet fra versjon ${versionNumber} (${v.summary})`
    );

    return restored;
  }
}

export const VersionService = new VersionServiceImpl();
