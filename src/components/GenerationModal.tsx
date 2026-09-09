import React, { useState } from "react";
import { BookGenerationJob } from "../types";
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  X,
  StopCircle,
  FileText,
  ShieldCheck,
  Scroll,
  Layers,
  Flame,
} from "lucide-react";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";

interface GenerationModalProps {
  job: BookGenerationJob | null;
  isOpen: boolean;
  onClose: () => void;
  onCancel: (jobId: string) => Promise<void>;
  bookTitle: string;
}

export const GenerationModal: React.FC<GenerationModalProps> = ({
  job,
  isOpen,
  onClose,
  onCancel,
  bookTitle,
}) => {
  const [isCancelling, setIsCancelling] = useState(false);

  if (!isOpen || !job) return null;

  const totalWords = job.targetWords || job.totalWords || 80000;
  const currentWords = job.generatedWords || 0;
  const wordPercent = Math.min(100, Math.round((currentWords / totalWords) * 100));

  const totalChapters = job.totalChapters || 32;
  const completedChapters = job.completedChapters || 0;
  const chapterPercent = Math.min(100, Math.round((completedChapters / totalChapters) * 100));

  const chapterStatesList = job.chapterStates
    ? Array.isArray(job.chapterStates)
      ? job.chapterStates
      : Object.values(job.chapterStates)
    : [];

  // Elapsed time calculation
  const start = new Date(job.startedAt).getTime();
  const end = job.completedAt ? new Date(job.completedAt).getTime() : Date.now();
  const elapsedSec = Math.max(0, Math.floor((end - start) / 1000));
  const minutes = Math.floor(elapsedSec / 60);
  const seconds = elapsedSec % 60;
  const elapsedFormatted = `${minutes}m ${seconds.toString().padStart(2, "0")}s`;

  async function handleCancelClick() {
    if (!job) return;
    if (confirm("Er du sikker på at du vil stanse den autonome bokgenereringen? Allerede forfattede kapitler vil bli bevart.")) {
      setIsCancelling(true);
      try {
        await onCancel(job.id);
      } finally {
        setIsCancelling(false);
      }
    }
  }

  const phaseSteps = [
    { key: "specifying", label: "Spesifikasjon", desc: "Beriker idé og dramaturgisk fundament", icon: Scroll },
    { key: "bible", label: "Bokbibel", desc: "Karakterer, steder, tidslinje og regler", icon: ShieldCheck },
    { key: "blueprinting", label: "Kapittelplaner", desc: `Strukturerer alle ${totalChapters} kapitler`, icon: Layers },
    { key: "writing", label: "Kapittelskriving", desc: "Forfatter fullverdige kapitler med Gemini", icon: Flame },
    { key: "auditing", label: "Revisjon & Audit", desc: "Verifiserer kontinuitet og ordmål", icon: CheckCircle2 },
    { key: "complete", label: "Fullført", desc: "Klar for lesing og eksport", icon: BookOpen },
  ];

  function getStepStatus(stepKey: string): "completed" | "current" | "pending" {
    const order = ["queued", "specifying", "bible", "blueprinting", "writing", "auditing", "complete"];
    const currentIdx = order.indexOf(job?.phase || "queued");
    const stepIdx = order.indexOf(stepKey);

    if (job?.status === "completed") return "completed";
    if (stepIdx < currentIdx) return "completed";
    if (stepIdx === currentIdx) return "current";
    return "pending";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6 backdrop-blur-sm animate-in fade-in">
      <div className="flex h-full max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl bg-white text-slate-900 shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-700 text-white shadow-md shadow-indigo-200">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">Autonom Bokgenerering</h2>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                    job.status === "running"
                      ? "bg-amber-100 text-amber-900 animate-pulse"
                      : job.status === "completed"
                      ? "bg-emerald-100 text-emerald-900"
                      : job.status === "failed"
                      ? "bg-rose-100 text-rose-900"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {job.status === "running"
                    ? "Kjører i bakgrunnen"
                    : job.status === "completed"
                    ? "Fullført"
                    : job.status === "failed"
                    ? "Feilet"
                    : "Avbrutt"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                «{bookTitle || "Uten tittel"}» • Ekte AI-prosa uten simulering
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            title="Lukk vindu (generering fortsetter i bakgrunnen)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* Error Banner */}
          {job.error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Genereringen støtte på et problem</div>
                <div className="text-xs mt-1 text-rose-800 leading-relaxed">{job.error}</div>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {job.status === "completed" && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Hele romanen er ferdig forfattet!</div>
                <div className="text-xs mt-1 text-emerald-800 leading-relaxed">
                  Alle {totalChapters} kapitler og {currentWords.toLocaleString("nb-NO")} ord er skrevet, auditert og lagret i prosjektets database. Du kan nå åpne lesemodus eller eksportere til EPUB, DOCX og PDF.
                </div>
              </div>
            </div>
          )}

          {/* Metrics summary */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ord skrevet</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {currentWords.toLocaleString("nb-NO")}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">av {totalWords.toLocaleString("nb-NO")} ord</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kapitler</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {completedChapters} <span className="text-sm font-normal text-slate-500">/ {totalChapters}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {job.currentChapter ? `Aktivt: Kapittel ${job.currentChapter}` : "Fullført"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fremdrift</div>
              <div className="text-2xl font-black text-indigo-700 mt-1">{chapterPercent}%</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{wordPercent}% av ordmål</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Clock className="h-3 w-3" /> Medgått tid
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">{elapsedFormatted}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {job.status === "running" ? "Kjører kontinuerlig" : "Ferdig"}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                {job.status === "running" && <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />}
                Total fremdrift for romanen
              </span>
              <span>
                {currentWords.toLocaleString("nb-NO")} / {totalWords.toLocaleString("nb-NO")} ord ({wordPercent}%)
              </span>
            </div>
            <Progress value={wordPercent} className="h-3 rounded-full bg-slate-100" />
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>{completedChapters} av {totalChapters} kapitler fullført ({chapterPercent}%)</span>
              <span>Gemini 3.8 Flash • Server-Side API</span>
            </div>
          </div>

          {/* Pipeline Phases Stepper */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Autonom Produksjonslinje
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {phaseSteps.map((step) => {
                const status = getStepStatus(step.key);
                const IconComponent = step.icon;
                return (
                  <div
                    key={step.key}
                    className={`flex items-start gap-3 rounded-2xl border p-3.5 transition ${
                      status === "completed"
                        ? "border-emerald-200 bg-emerald-50/50 text-emerald-950"
                        : status === "current"
                        ? "border-indigo-400 bg-indigo-50/60 ring-2 ring-indigo-500/20 text-indigo-950"
                        : "border-slate-200 bg-slate-50/40 opacity-60 text-slate-600"
                    }`}
                  >
                    <div
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                        status === "completed"
                          ? "bg-emerald-600 text-white"
                          : status === "current"
                          ? "bg-indigo-600 text-white animate-pulse"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : status === "current" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <IconComponent className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold">{step.label}</div>
                      <div className="text-[11px] leading-tight text-slate-500 mt-0.5">
                        {step.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chapter Status Grid / List */}
          {chapterStatesList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Kapittelfremdrift ({completedChapters}/{totalChapters})
                </h3>
                <span className="text-[11px] text-slate-500">
                  Gjennomsnitt: {completedChapters > 0 ? Math.round(currentWords / completedChapters) : 0} ord/kapittel
                </span>
              </div>
              <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/50 p-3 sm:grid-cols-4">
                {chapterStatesList.map((chap) => (
                  <div
                    key={chap.chapterNumber}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs transition ${
                      chap.status === "completed"
                        ? "border-emerald-200 bg-white text-emerald-950 shadow-xs"
                        : chap.status === "writing"
                        ? "border-indigo-400 bg-indigo-50 font-bold text-indigo-950 animate-pulse"
                        : "border-slate-200 bg-white/60 text-slate-500"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      {chap.status === "completed" ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                      ) : chap.status === "writing" ? (
                        <Flame className="h-3 w-3 text-indigo-600 shrink-0" />
                      ) : (
                        <FileText className="h-3 w-3 text-slate-400 shrink-0" />
                      )}
                      Kap. {chap.chapterNumber}
                    </span>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {chap.currentWords > 0 ? `${chap.currentWords} ord` : "Planlagt"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/90 px-6 py-4">
          <div className="text-xs text-slate-500">
            {job.status === "running" ? (
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Generering kjører på serveren. Du kan trygt lukke dette vinduet.
              </span>
            ) : job.status === "completed" ? (
              <span className="text-emerald-700 font-bold">
                ✓ Alle kapitler er forfattet og lagret i prosjektet.
              </span>
            ) : (
              <span>Genereringen er avsluttet.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {job.status === "running" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelClick}
                disabled={isCancelling}
                className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold"
              >
                <StopCircle className="mr-1.5 h-3.5 w-3.5" />
                {isCancelling ? "Avbryter..." : "Stans generering"}
              </Button>
            )}

            <Button
              onClick={onClose}
              className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold px-4"
            >
              {job.status === "completed" ? "Se boken" : "Lukk vindu"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
