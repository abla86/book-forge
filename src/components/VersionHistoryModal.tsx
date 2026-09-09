// =====================================================================
// BookForge AI - VersionHistoryModal (Time Travel, Chapter Diff & Recovery)
// =====================================================================

import { useState, useMemo } from "react";
import {
  History,
  RotateCcw,
  Plus,
  CheckCircle2,
  Clock,
  X,
  GitCompare,
  FileText,
  ChevronRight,
  Split,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  AlertCircle,
  Tag,
  BookOpen,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import {
  VersionSnapshot,
  VersionService,
  ChapterDiff,
  ProjectDiff,
  DiffEngine,
} from "../lib/engine/VersionHistory";
import { BookProject, Chapter } from "../types";

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: BookProject;
  onRestoreVersion: (restoredProject: BookProject) => void;
  onSnapshotCreated?: () => void;
}

export function VersionHistoryModal({
  isOpen,
  onClose,
  project,
  onRestoreVersion,
  onSnapshotCreated,
}: VersionHistoryModalProps) {
  if (!isOpen) return null;

  const [versions, setVersions] = useState<VersionSnapshot[]>(() => {
    let list = VersionService.getVersions(project.id);
    if (list.length === 0) {
      // Create initial baseline snapshot if none exists
      const init = VersionService.createSnapshot(
        project,
        "Opprinnelig prosjekttilstand (Baseline)",
        "system",
        "baseline"
      );
      list = [init];
    }
    return list;
  });

  const [activeTab, setActiveTab] = useState<"snapshots" | "diff">("snapshots");
  const [newSummary, setNewSummary] = useState("");
  const [restoredNotice, setRestoredNotice] = useState<string | null>(null);

  // Selected version for diff comparison (defaults to latest or second latest)
  const [compareTargetVersionNum, setCompareTargetVersionNum] = useState<number>(() => {
    if (versions.length > 1) return versions[1].versionNumber;
    return versions[0]?.versionNumber || 1;
  });

  // Selected chapter for detailed diff inspection
  const [selectedChapterNum, setSelectedChapterNum] = useState<number>(1);
  const [onlyShowChangedChapters, setOnlyShowChangedChapters] = useState(true);

  const selectedTargetVersion = useMemo(() => {
    return versions.find((v) => v.versionNumber === compareTargetVersionNum);
  }, [versions, compareTargetVersionNum]);

  // Compute live project diff between target snapshot and current project
  const projectDiff: ProjectDiff = useMemo(() => {
    if (!selectedTargetVersion) {
      return DiffEngine.computeProjectDiff(project, project, 1, 1);
    }
    return VersionService.compareWithCurrent(project, selectedTargetVersion.versionNumber);
  }, [project, selectedTargetVersion]);

  // Filtered chapters for the diff view
  const diffChapters = useMemo(() => {
    if (!onlyShowChangedChapters) return projectDiff.chapterDiffs;
    const changed = projectDiff.chapterDiffs.filter((c) => c.status !== "unchanged");
    return changed.length > 0 ? changed : projectDiff.chapterDiffs;
  }, [projectDiff, onlyShowChangedChapters]);

  const activeChapterDiff: ChapterDiff | undefined = useMemo(() => {
    return (
      projectDiff.chapterDiffs.find((c) => c.chapterNumber === selectedChapterNum) ||
      diffChapters[0] ||
      projectDiff.chapterDiffs[0]
    );
  }, [projectDiff, selectedChapterNum, diffChapters]);

  function handleCreateManualSnapshot() {
    if (!newSummary.trim()) return;
    VersionService.createSnapshot(project, newSummary.trim(), "user", "manual");
    setVersions(VersionService.getVersions(project.id));
    setNewSummary("");
    if (onSnapshotCreated) onSnapshotCreated();
  }

  function handleFullRollback(v: VersionSnapshot) {
    if (
      window.confirm(
        `Er du sikker på at du vil gjenopprette HELE prosjektet til Versjon ${v.versionNumber} («${v.summary}»)? En sikkerhetskopi av nåværende tilstand blir automatisk lagret.`
      )
    ) {
      const restored = VersionService.rollback(project.id, v.versionNumber);
      onRestoreVersion(restored);
      setVersions(VersionService.getVersions(project.id));
      setRestoredNotice(`Hele manuskriptet ble tilbakestilt til Versjon ${v.versionNumber}!`);
      setTimeout(() => setRestoredNotice(null), 3500);
    }
  }

  function handleRevertSpecificChapter(chapterNumber: number, fromVersionNumber: number) {
    const targetChap = selectedTargetVersion?.snapshot.chapters.find(
      (c) => c.number === chapterNumber
    );
    const chapTitle = targetChap?.title || `Kapittel ${chapterNumber}`;

    if (
      window.confirm(
        `Vil du gjenopprette KUN Kapittel ${chapterNumber} («${chapTitle}») fra Versjon ${fromVersionNumber}?\n\nAlle andre kapitler og data i manuskriptet forblir uendret. En ny sikkerhetskopi opprettes automatisk.`
      )
    ) {
      try {
        const result = VersionService.revertChapter(
          project.id,
          project,
          chapterNumber,
          fromVersionNumber
        );

        onRestoreVersion(result.updatedProject);
        setVersions(VersionService.getVersions(project.id));
        setRestoredNotice(
          `Vellykket: Kapittel ${chapterNumber} («${chapTitle}») ble gjenopprettet fra Versjon ${fromVersionNumber}!`
        );
        setTimeout(() => setRestoredNotice(null), 4000);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Kunne ikke gjenopprette kapittel";
        alert(msg);
      }
    }
  }

  function openDiffForVersion(v: VersionSnapshot) {
    setCompareTargetVersionNum(v.versionNumber);
    setActiveTab("diff");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-5 backdrop-blur-sm animate-in fade-in">
      <div className="flex h-full max-h-[90vh] w-full max-w-5xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-700 text-white font-bold shadow-md shadow-indigo-200">
              <History className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Versjonshistorikk & Kapittelgjenoppretting
                </h2>
                <Badge className="bg-indigo-100 text-indigo-800 text-[11px] font-extrabold hover:bg-indigo-100">
                  Time Travel & Diff
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Sammenlign endringer på kapittelnivå og gjenopprett nøyaktige versjoner med full sikkerhetskopi.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Action & Feedback Notice */}
        {restoredNotice && (
          <div className="mx-6 mt-4 flex items-center justify-between gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-sm font-bold text-emerald-900 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>{restoredNotice}</span>
            </div>
            <button
              onClick={() => setRestoredNotice(null)}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold"
            >
              Lukk
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 px-6 pt-3 bg-white flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("snapshots")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition cursor-pointer ${
                activeTab === "snapshots"
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <History className="h-4 w-4" />
              Øyeblikksbilder ({versions.length})
            </button>
            <button
              onClick={() => setActiveTab("diff")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition cursor-pointer ${
                activeTab === "diff"
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <GitCompare className="h-4 w-4" />
              Kapittel-diff & Presis gjenoppretting
              {projectDiff.chaptersChangedCount > 0 && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-black text-indigo-700">
                  {projectDiff.chaptersChangedCount} endret
                </span>
              )}
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <span>Aktivt manuskript:</span>
            <strong className="text-slate-900">
              {project.chapters.reduce((a, c) => a + (c.currentWords || 0), 0).toLocaleString("nb-NO")}{" "}
              ord
            </strong>
          </div>
        </div>

        {/* CONTENT TABS */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
          {activeTab === "snapshots" ? (
            /* TAB 1: SNAPSHOT LIST */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Manual snapshot input */}
              <div className="border-b border-slate-200 bg-white p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Beskriv endringene for et nytt øyeblikksbilde (f.eks. 'Revidert dialog i kapittel 3 før redaktørrunde')..."
                    value={newSummary}
                    onChange={(e) => setNewSummary(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateManualSnapshot()}
                    className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                  <Button
                    onClick={handleCreateManualSnapshot}
                    disabled={!newSummary.trim()}
                    className="rounded-xl bg-indigo-700 hover:bg-indigo-800 text-xs font-bold shrink-0"
                  >
                    <Plus className="mr-1.5 h-4 w-4" /> Lagre øyeblikksbilde
                  </Button>
                </div>
              </div>

              {/* Version Timeline */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {versions.map((v, index) => {
                  const isCurrent = index === 0;

                  return (
                    <div
                      key={v.id}
                      className={`rounded-2xl border p-5 transition shadow-xs ${
                        isCurrent
                          ? "border-indigo-200 bg-indigo-50/30 ring-1 ring-indigo-500/20"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              className={`font-black text-xs ${
                                isCurrent
                                  ? "bg-indigo-700 text-white hover:bg-indigo-700"
                                  : "bg-slate-200 text-slate-800 hover:bg-slate-200"
                              }`}
                            >
                              Versjon {v.versionNumber}
                            </Badge>

                            {isCurrent && (
                              <Badge className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold hover:bg-indigo-100">
                                Aktiv tilstand
                              </Badge>
                            )}

                            {v.tag === "chapter-revert" && (
                              <Badge className="bg-amber-100 text-amber-800 text-[10px] font-bold hover:bg-amber-100">
                                Kapittelgjenoppretting
                              </Badge>
                            )}

                            {v.tag === "rollback" && (
                              <Badge className="bg-rose-100 text-rose-800 text-[10px] font-bold hover:bg-rose-100">
                                Full tilbakestilling
                              </Badge>
                            )}

                            {v.tag === "baseline" && (
                              <Badge className="bg-slate-100 text-slate-700 text-[10px] font-bold hover:bg-slate-100">
                                Baseline
                              </Badge>
                            )}

                            <span className="flex items-center text-xs text-slate-400 gap-1 ml-1">
                              <Clock className="h-3 w-3" />
                              {new Date(v.createdAt).toLocaleString("nb-NO")}
                            </span>
                          </div>

                          <h4 className="text-base font-bold text-slate-900">{v.summary}</h4>

                          <div className="flex gap-4 text-xs text-slate-500 flex-wrap">
                            <span>
                              Totalt ord:{" "}
                              <strong className="text-slate-800">
                                {v.wordCount.toLocaleString("nb-NO")}
                              </strong>
                            </span>
                            <span>
                              Fullførte kapitler:{" "}
                              <strong className="text-slate-800">{v.chapterCount}</strong>
                            </span>
                            <span>
                              Opprettet av: <strong className="text-slate-800">{v.authorId}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons for Snapshot */}
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDiffForVersion(v)}
                            className="rounded-xl border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-700 text-xs font-bold"
                          >
                            <GitCompare className="mr-1.5 h-3.5 w-3.5 text-indigo-600" />
                            Sammenlign / Diff
                          </Button>

                          {!isCurrent && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFullRollback(v)}
                              className="rounded-xl border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 text-xs font-bold"
                            >
                              <RotateCcw className="mr-1.5 h-3.5 w-3.5 text-indigo-700" />
                              Rull tilbake alt
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* TAB 2: GRANULAR CHAPTER DIFF & RECOVERY */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Diff Control Bar */}
              <div className="border-b border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-bold uppercase text-slate-500">
                    Sammenlign mot:
                  </span>
                  <select
                    value={compareTargetVersionNum}
                    onChange={(e) => setCompareTargetVersionNum(Number(e.target.value))}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-900 bg-slate-50 focus:outline-none focus:border-indigo-500"
                  >
                    {versions.map((v) => (
                      <option key={v.id} value={v.versionNumber}>
                        Versjon {v.versionNumber} ({new Date(v.createdAt).toLocaleTimeString("nb-NO")}) - {v.summary.slice(0, 38)}...
                      </option>
                    ))}
                  </select>

                  <div className="h-4 w-px bg-slate-200" />

                  {/* Summary Delta Badges */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-medium">Ordforskjell:</span>
                    <Badge
                      className={`text-xs font-bold ${
                        projectDiff.totalWordDelta > 0
                          ? "bg-emerald-100 text-emerald-800"
                          : projectDiff.totalWordDelta < 0
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {projectDiff.totalWordDelta >= 0 ? "+" : ""}
                      {projectDiff.totalWordDelta.toLocaleString("nb-NO")} ord
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <span>Endrede kapitler:</span>
                    <strong className="text-slate-900">
                      {projectDiff.chaptersChangedCount} av {projectDiff.chapterDiffs.length}
                    </strong>
                  </div>
                </div>

                {/* Filter toggle */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOnlyShowChangedChapters((prev) => !prev)}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-bold transition cursor-pointer ${
                      onlyShowChangedChapters
                        ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <Filter className="h-3 w-3" />
                    {onlyShowChangedChapters ? "Viser kun endrede" : "Viser alle kapitler"}
                  </button>
                </div>
              </div>

              {/* Diff Workspace: Left Sidebar (Chapters) + Right Canvas (Line Diff & Revert) */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Chapter List Column */}
                <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 bg-white overflow-y-auto p-3 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                    Kapitler i prosjektet
                  </div>

                  {diffChapters.map((c) => {
                    const isSelected = activeChapterDiff?.chapterNumber === c.chapterNumber;
                    const isModified = c.status !== "unchanged";

                    return (
                      <button
                        key={c.chapterNumber}
                        onClick={() => setSelectedChapterNum(c.chapterNumber)}
                        className={`w-full text-left rounded-xl p-3 transition flex flex-col gap-1 cursor-pointer border ${
                          isSelected
                            ? "bg-indigo-50/80 border-indigo-300 shadow-xs ring-1 ring-indigo-500/20"
                            : "bg-white border-slate-200/80 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">
                            Kapittel {c.chapterNumber}
                          </span>
                          <Badge
                            className={`text-[9px] font-extrabold ${
                              c.status === "added"
                                ? "bg-emerald-100 text-emerald-800"
                                : c.status === "removed"
                                ? "bg-rose-100 text-rose-800"
                                : c.status === "modified"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {c.status === "added"
                              ? "Lagt til"
                              : c.status === "removed"
                              ? "Fjernet"
                              : c.status === "modified"
                              ? "Endret"
                              : "Uendret"}
                          </Badge>
                        </div>

                        <div className="text-xs font-semibold text-slate-700 truncate">
                          {c.afterTitle || c.beforeTitle || `Kapittel ${c.chapterNumber}`}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                          <span>
                            {c.afterWords.toLocaleString("nb-NO")} ord nå
                          </span>
                          {c.wordDelta !== 0 && (
                            <span
                              className={`font-bold ${
                                c.wordDelta > 0 ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              {c.wordDelta > 0 ? "+" : ""}
                              {c.wordDelta} ord
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Right Diff Viewer Canvas */}
                <div className="flex-1 flex flex-col bg-white overflow-hidden">
                  {activeChapterDiff ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {/* Chapter Diff Header & Revert Bar */}
                      <div className="border-b border-slate-200 p-4 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-black text-slate-900">
                              Kapittel {activeChapterDiff.chapterNumber}:{" "}
                              {activeChapterDiff.afterTitle || activeChapterDiff.beforeTitle}
                            </h3>
                            <Badge className="bg-slate-200 text-slate-800 text-[10px] font-bold">
                              Status: {activeChapterDiff.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Før (v{compareTargetVersionNum}): {activeChapterDiff.beforeWords} ord • Nå (Aktiv):{" "}
                            {activeChapterDiff.afterWords} ord (Delta: {activeChapterDiff.wordDelta >= 0 ? "+" : ""}{activeChapterDiff.wordDelta} ord)
                          </div>
                        </div>

                        {/* Granular Chapter Revert Button */}
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() =>
                              handleRevertSpecificChapter(
                                activeChapterDiff.chapterNumber,
                                compareTargetVersionNum
                              )
                            }
                            className="rounded-xl bg-indigo-700 hover:bg-indigo-800 text-xs font-bold shadow-xs"
                          >
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                            Gjenopprett kun Kapittel {activeChapterDiff.chapterNumber}
                          </Button>
                        </div>
                      </div>

                      {/* Line Diff View */}
                      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-1 bg-slate-950/5 select-text">
                        {activeChapterDiff.lineDiff.length === 0 ? (
                          <div className="p-8 text-center text-slate-500 font-sans">
                            <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                            Ingen tekst finnes for dette kapittelet i den valgte versjonen.
                          </div>
                        ) : (
                          activeChapterDiff.lineDiff.map((chunk, idx) => {
                            if (chunk.type === "added") {
                              return (
                                <div
                                  key={idx}
                                  className="flex items-start gap-3 bg-emerald-50 text-emerald-950 px-3 py-1 rounded-md border-l-3 border-emerald-500 font-sans text-xs sm:text-sm"
                                >
                                  <span className="font-mono text-emerald-600 font-bold shrink-0 select-none">
                                    + {chunk.lineNumber || ""}
                                  </span>
                                  <span className="flex-1 whitespace-pre-wrap">{chunk.value}</span>
                                </div>
                              );
                            }

                            if (chunk.type === "removed") {
                              return (
                                <div
                                  key={idx}
                                  className="flex items-start gap-3 bg-rose-50 text-rose-900 px-3 py-1 rounded-md border-l-3 border-rose-500 font-sans text-xs sm:text-sm line-through opacity-85"
                                >
                                  <span className="font-mono text-rose-500 font-bold shrink-0 select-none">
                                    -
                                  </span>
                                  <span className="flex-1 whitespace-pre-wrap">{chunk.value}</span>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={idx}
                                className="flex items-start gap-3 text-slate-700 px-3 py-0.5 hover:bg-white/80 rounded-md font-sans text-xs sm:text-sm"
                              >
                                <span className="font-mono text-slate-400 text-[11px] shrink-0 select-none w-6 text-right">
                                  {chunk.lineNumber || ""}
                                </span>
                                <span className="flex-1 whitespace-pre-wrap">{chunk.value}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 grid place-items-center p-8 text-slate-400 font-sans">
                      Velg et kapittel fra listen til venstre for å se endringene.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
