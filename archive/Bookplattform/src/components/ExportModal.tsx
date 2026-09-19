// =====================================================================
// BookForge AI - ExportModal (Professional Publishing & Manuscript Export)
// =====================================================================

import { useState } from "react";
import { BookProject } from "../types";
import {
  X,
  Download,
  BookOpen,
  Printer,
  FileCode,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "./ui/button";
import { ExportEngine, ExportResult } from "../lib/engine/ExportEngine";

interface ExportModalProps {
  project: BookProject;
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ project, isOpen, onClose }: ExportModalProps) {
  if (!isOpen) return null;

  const [activeView, setActiveView] = useState<"export" | "read">("export");
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingFormat, setLoadingFormat] = useState<string | null>(null);

  const completedChapters = project.chapters.filter((c) => c.content && c.content.trim().length > 0);
  const unwrittenChapters = project.chapters.filter((c) => !c.content || c.content.trim().length === 0);
  const isComplete = project.chapters.length > 0 && unwrittenChapters.length === 0;

  const totalWrittenWords = project.chapters.reduce(
    (acc, c) => acc + (c.currentWords || 0),
    0
  );

  function assertCanExport(): boolean {
    if (project.chapters.length === 0) {
      setErrorMessage("Eksport blokkert: Prosjektet har ingen kapitler registrert.");
      return false;
    }
    if (!isComplete) {
      const missingList = unwrittenChapters.slice(0, 4).map((c) => `Kapittel ${c.number}`).join(", ");
      const extraCount = unwrittenChapters.length > 4 ? ` og ${unwrittenChapters.length - 4} til` : "";
      setErrorMessage(
        `Eksport blokkert: Manuskriptet er ufullstendig. ${unwrittenChapters.length} av ${project.chapters.length} kapitler mangler forfattet innhold (${missingList}${extraCount}). Alle kapitler må være forfattet og verifisert før eksport kan tillates.`
      );
      return false;
    }
    return true;
  }

  function triggerDownload(res: ExportResult) {
    const url = URL.createObjectURL(res.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  async function handleExportEPUB() {
    setErrorMessage(null);
    setDownloadSuccess(null);
    if (!assertCanExport()) return;

    setLoadingFormat("EPUB");
    try {
      const res = await ExportEngine.generateEPUB(project);
      triggerDownload(res);
      setDownloadSuccess(`EPUB e-bok generert og lastet ned (${formatBytes(res.sizeBytes)})!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Kunne ikke generere EPUB.";
      setErrorMessage(`Feil under EPUB-generering: ${msg}`);
    } finally {
      setLoadingFormat(null);
    }
  }

  async function handleExportDOCX() {
    setErrorMessage(null);
    setDownloadSuccess(null);
    if (!assertCanExport()) return;

    setLoadingFormat("DOCX");
    try {
      const res = await ExportEngine.generateDOCX(project);
      triggerDownload(res);
      setDownloadSuccess(`Microsoft Word (DOCX) forlagspakke lastet ned (${formatBytes(res.sizeBytes)})!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Kunne ikke generere DOCX.";
      setErrorMessage(`Feil under DOCX-generering: ${msg}`);
    } finally {
      setLoadingFormat(null);
    }
  }

  async function handleExportPDF() {
    setErrorMessage(null);
    setDownloadSuccess(null);
    if (!assertCanExport()) return;

    setLoadingFormat("PDF");
    try {
      const res = await ExportEngine.generatePDF(project);
      triggerDownload(res);
      setDownloadSuccess(`PDF-manuskript generert og lastet ned (${formatBytes(res.sizeBytes)})!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Kunne ikke generere PDF.";
      setErrorMessage(`Feil under PDF-generering: ${msg}`);
    } finally {
      setLoadingFormat(null);
    }
  }

  function handleExportJSON() {
    setErrorMessage(null);
    setDownloadSuccess(null);
    if (!assertCanExport()) return;

    setLoadingFormat("JSON");
    try {
      const res = ExportEngine.generateJSON(project);
      triggerDownload(res);
      setDownloadSuccess(`Komplett prosjektarkiv (JSON) lastet ned (${formatBytes(res.sizeBytes)})!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Kunne ikke eksportere JSON.";
      setErrorMessage(`Feil under JSON-eksport: ${msg}`);
    } finally {
      setLoadingFormat(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6 backdrop-blur-sm animate-in fade-in">
      <div className="flex h-full max-h-[90vh] w-full max-w-5xl flex-col rounded-3xl bg-white text-slate-900 shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-700 text-white font-bold">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                Publisering og eksport
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {project.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-xl text-slate-500 hover:text-slate-900"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3 bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView("export")}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                activeView === "export"
                  ? "bg-indigo-700 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Download className="mr-1.5 inline h-4 w-4" /> Eksportformater
            </button>
            <button
              onClick={() => setActiveView("read")}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                activeView === "read"
                  ? "bg-indigo-700 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <BookOpen className="mr-1.5 inline h-4 w-4" /> Komplett manuskript-leser
            </button>
          </div>

          <div className="text-xs font-semibold text-slate-500">
            {completedChapters.length} av {project.chapters.length} kapitler skrevet (
            {totalWrittenWords.toLocaleString("nb-NO")} ord)
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          {downloadSuccess && (
            <div className="mb-6 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900 animate-in fade-in">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>{downloadSuccess}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-900 animate-in fade-in">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!isComplete && (
            <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm">Eksport sperret – Ufullstendig manuskript</div>
                <div className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Dette bokprosjektet har {unwrittenChapters.length} uferdige kapitler ({completedChapters.length} av {project.chapters.length} skrevet). Før du kan eksportere fullverdige EPUB-, DOCX- eller PDF-filer, må alle kapitlene være forfattet og godkjent i skrivemodulen.
                </div>
              </div>
            </div>
          )}

          {activeView === "export" ? (
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Velg publiseringsformat
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Alle filer genereres i sanntid med reelt innhold, kolofon, kapitteloverskrifter og gyldig filstruktur.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {/* EPUB */}
                <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-indigo-400 hover:shadow-md">
                  <div>
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <h4 className="mt-4 text-xl font-black text-slate-900">EPUB 3.0</h4>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                      Standard e-bokfil med metadata, OEBPS-innhold og navigasjonsdokument for Apple Books, Kindle og Kobo.
                    </p>
                  </div>
                  <Button
                    onClick={handleExportEPUB}
                    disabled={Boolean(loadingFormat)}
                    className="mt-6 w-full rounded-xl bg-indigo-700 hover:bg-indigo-800"
                  >
                    {loadingFormat === "EPUB" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Genererer...
                      </>
                    ) : (
                      "Last ned EPUB"
                    )}
                  </Button>
                </div>

                {/* DOCX */}
                <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-indigo-400 hover:shadow-md">
                  <div>
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                      <FileText className="h-6 w-6" />
                    </div>
                    <h4 className="mt-4 text-xl font-black text-slate-900">Word (DOCX)</h4>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                      Standard forlagsformat med korrekt sideskift, innrykk, kolofon og avsnittsoppsett for forlagsredaksjonen.
                    </p>
                  </div>
                  <Button
                    onClick={handleExportDOCX}
                    disabled={Boolean(loadingFormat)}
                    className="mt-6 w-full rounded-xl bg-blue-700 hover:bg-blue-800"
                  >
                    {loadingFormat === "DOCX" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Genererer...
                      </>
                    ) : (
                      "Last ned DOCX"
                    )}
                  </Button>
                </div>

                {/* PDF */}
                <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-indigo-400 hover:shadow-md">
                  <div>
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-700">
                      <Printer className="h-6 w-6" />
                    </div>
                    <h4 className="mt-4 text-xl font-black text-slate-900">Utskrift / PDF</h4>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                      Ekte PDF-fil generert med Times Roman-typografi, forlagslayout, sidetall og innholdsfortegnelse.
                    </p>
                  </div>
                  <Button
                    onClick={handleExportPDF}
                    disabled={Boolean(loadingFormat)}
                    className="mt-6 w-full rounded-xl bg-rose-700 hover:bg-rose-800"
                  >
                    {loadingFormat === "PDF" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Genererer...
                      </>
                    ) : (
                      "Last ned PDF"
                    )}
                  </Button>
                </div>

                {/* JSON */}
                <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-indigo-400 hover:shadow-md">
                  <div>
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                      <FileCode className="h-6 w-6" />
                    </div>
                    <h4 className="mt-4 text-xl font-black text-slate-900">Bok-arkiv (JSON)</h4>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                      Fullstendig rådata-backup: bokplan, karakterbibel, kontinuitetsregler, tidslinje og hele manuskriptet.
                    </p>
                  </div>
                  <Button
                    onClick={handleExportJSON}
                    disabled={Boolean(loadingFormat)}
                    variant="outline"
                    className="mt-6 w-full rounded-xl"
                  >
                    {loadingFormat === "JSON" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Pakker...
                      </>
                    ) : (
                      "Lagre backup"
                    )}
                  </Button>
                </div>
              </div>

              {/* Package contents overview */}
              <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-6">
                <h4 className="font-bold text-slate-900 mb-3">
                  Inkludert i publiseringspakken:
                </h4>
                <div className="grid gap-3 sm:grid-cols-2 text-sm text-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Tittelside med forfatternavn ({project.author})
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Fullstendig kolofon og opphavsrettserklæring (2026)
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Strukturert innholdsfortegnelse for alle {project.chapters.length} kapitler
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Karakterer, steder og kontinuitet forankret fra bokbibelen
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Manuscript reader */
            <div className="mx-auto max-w-3xl bg-[#FAF8F5] p-8 sm:p-12 rounded-3xl border border-slate-200 font-serif shadow-sm">
              <div className="text-center mb-16">
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400 font-sans mb-3">
                  En roman i fire akter
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-slate-950 font-serif">
                  {project.title}
                </h1>
                <div className="mt-4 text-lg text-slate-600">Av {project.author}</div>
                <div className="mx-auto mt-6 h-px w-20 bg-indigo-300" />
              </div>

              <div className="space-y-16">
                {project.chapters.map((c) => (
                  <div key={c.id} className="border-b border-slate-200 pb-12">
                    <div className="text-center mb-6">
                      <div className="text-xs font-bold uppercase tracking-widest text-indigo-700 font-sans">
                        Kapittel {c.number}
                      </div>
                      <h2 className="mt-1 text-2xl font-bold text-slate-900">
                        {c.title}
                      </h2>
                    </div>

                    {c.content ? (
                      <div className="text-base leading-8 text-slate-800 whitespace-pre-wrap">
                        {c.content}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-sans text-slate-500">
                        <em>Kapittel {c.number} er planlagt: {c.summary}</em>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
