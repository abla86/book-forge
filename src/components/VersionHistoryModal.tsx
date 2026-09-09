// =====================================================================
// BookForge AI - VersionHistoryModal (Time Travel & Manuscript Rollback)
// =====================================================================

import { useState } from "react";
import { History, RotateCcw, Plus, CheckCircle2, Clock, X, Bookmark } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { VersionSnapshot, VersionService } from "../lib/engine/VersionService";
import { BookProject } from "../types";

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
      // Create initial baseline snapshot
      const init = VersionService.createSnapshot(
        project,
        "Opprinnelig prosjekttilstand (Baseline)",
        "system"
      );
      list = [init];
    }
    return list;
  });

  const [newSummary, setNewSummary] = useState("");
  const [restoredNotice, setRestoredNotice] = useState<string | null>(null);

  function handleCreateManualSnapshot() {
    if (!newSummary.trim()) return;
    const snap = VersionService.createSnapshot(project, newSummary.trim(), "user");
    setVersions(VersionService.getVersions(project.id));
    setNewSummary("");
    if (onSnapshotCreated) onSnapshotCreated();
  }

  function handleRollback(v: VersionSnapshot) {
    if (
      window.confirm(
        `Er du sikker på at du vil gjenopprette prosjektet til Versjon ${v.versionNumber} ("${v.summary}")? En sikkerhetskopi av nåværende tilstand blir automatisk lagret.`
      )
    ) {
      const restored = VersionService.rollback(project.id, v.versionNumber);
      onRestoreVersion(restored);
      setVersions(VersionService.getVersions(project.id));
      setRestoredNotice(`Gjenopprettet til Versjon ${v.versionNumber}!`);
      setTimeout(() => setRestoredNotice(null), 3000);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="flex h-full max-h-[85vh] w-full max-w-3xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-700 text-white font-bold">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Versjonshistorikk & Tidsreise
              </h2>
              <p className="text-xs text-slate-500">
                Uforanderlige øyeblikksbilder og trygg tilbakestilling av manuskriptet.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Create Snapshot Bar */}
        <div className="border-b border-slate-200 bg-white p-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Beskriv endringene for nytt øyeblikksbilde (f.eks. 'Revidert kapittel 3 dialog')..."
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <Button
              onClick={handleCreateManualSnapshot}
              disabled={!newSummary.trim()}
              className="rounded-xl bg-indigo-700 hover:bg-indigo-800 text-xs font-bold"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Lagre versjon
            </Button>
          </div>
        </div>

        {/* Notice */}
        {restoredNotice && (
          <div className="m-4 flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-sm font-bold text-emerald-800">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            {restoredNotice}
          </div>
        )}

        {/* Versions list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {versions.map((v, index) => (
            <div
              key={v.id}
              className={`rounded-2xl border p-4 transition ${
                index === 0
                  ? "border-indigo-200 bg-indigo-50/40"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`font-bold ${
                        index === 0
                          ? "bg-indigo-700 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      Versjon {v.versionNumber}
                    </Badge>
                    {index === 0 && (
                      <span className="text-[11px] font-bold text-indigo-700">
                        (Aktiv versjon)
                      </span>
                    )}
                    <span className="flex items-center text-xs text-slate-400 gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(v.createdAt).toLocaleString("nb-NO")}
                    </span>
                  </div>

                  <h4 className="mt-2 text-sm font-bold text-slate-900">
                    {v.summary}
                  </h4>

                  <div className="mt-2 flex gap-4 text-xs text-slate-500">
                    <span>
                      Ord: <strong>{v.wordCount.toLocaleString("nb-NO")}</strong>
                    </span>
                    <span>
                      Skrevne kapitler: <strong>{v.chapterCount}</strong>
                    </span>
                  </div>
                </div>

                {index !== 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRollback(v)}
                    className="rounded-xl border-slate-200 font-bold hover:bg-indigo-50 hover:text-indigo-700 text-xs"
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Gjenopprett
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
