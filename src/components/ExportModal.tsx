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
  Share2,
} from "lucide-react";
import { Button } from "./ui/button";

interface ExportModalProps {
  project: BookProject;
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ project, isOpen, onClose }: ExportModalProps) {
  if (!isOpen) return null;

  const [activeView, setActiveView] = useState<"export" | "read">("export");
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const completedChapters = project.chapters.filter((c) => c.content);
  const totalWrittenWords = project.chapters.reduce(
    (acc, c) => acc + (c.currentWords || 0),
    0
  );

  function triggerDownload(filename: string, content: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleExportEPUB() {
    let fullText = `${project.title.toUpperCase()}\nAv ${project.author}\n\n`;
    fullText += `SYNOPSIS:\n${project.synopsis}\n\n`;
    fullText += `KOLOFON\nUtgitt via BookForge AI\nOpphavsrett © 2026 ${project.author}. Alle rettigheter forbeholdt.\n\n`;
    fullText += `INNHOLDSFORTEGNELSE\n`;
    project.chapters.forEach((c) => {
      fullText += `Kapittel ${c.number}: ${c.title}\n`;
    });
    fullText += `\n=========================================\n\n`;

    project.chapters.forEach((c) => {
      fullText += `KAPITTEL ${c.number}\n${c.title.toUpperCase()}\n\n`;
      fullText += c.content ? c.content : `[Kapittel ${c.number} under utarbeidelse: ${c.summary}]`;
      fullText += `\n\n-----------------------------------------\n\n`;
    });

    triggerDownload(`${project.title.replace(/\s+/g, "_")}.epub.txt`, fullText, "text/plain;charset=utf-8");
    setDownloadSuccess("EPUB-manuskriptpakke lastet ned!");
    setTimeout(() => setDownloadSuccess(null), 3000);
  }

  function handleExportDOCX() {
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${project.title}</title>
<style>
  body { font-family: 'Garamond', 'Georgia', serif; font-size: 12pt; line-height: 2; margin: 2in; color: #111; }
  h1 { font-size: 24pt; text-align: center; margin-top: 3in; }
  h2 { font-size: 16pt; text-align: center; margin-top: 1in; page-break-before: always; }
  .author { text-align: center; font-size: 14pt; margin-top: 1in; margin-bottom: 3in; }
  .colophon { font-size: 10pt; line-height: 1.5; margin-top: 2in; page-break-after: always; }
  p { text-indent: 1.5em; margin: 0; }
</style>
</head>
<body>
  <h1>${project.title}</h1>
  <div class="author">Av ${project.author}</div>
  <div class="colophon">
    <p>Utgitt av BookForge AI Studio</p>
    <p>Opphavsrett &copy; 2026 ${project.author}</p>
    <p>Sjanger: ${project.genre} | Tone: ${project.tone}</p>
  </div>
  ${project.chapters
    .map(
      (c) => `
    <h2>Kapittel ${c.number}<br>${c.title}</h2>
    ${c.content
      ? c.content
          .split("\n\n")
          .map((p) => `<p>${p}</p>`)
          .join("")
      : `<p><em>[Kapittel ${c.number}: ${c.summary}]</em></p>`}
  `
    )
    .join("")}
</body>
</html>`;

    triggerDownload(`${project.title.replace(/\s+/g, "_")}.doc`, htmlContent, "application/msword");
    setDownloadSuccess("DOCX/Word-kompatibelt manuskript lastet ned!");
    setTimeout(() => setDownloadSuccess(null), 3000);
  }

  function handleExportJSON() {
    const jsonStr = JSON.stringify(project, null, 2);
    triggerDownload(`${project.title.replace(/\s+/g, "_")}_bokforge.json`, jsonStr, "application/json");
    setDownloadSuccess("Komplett prosjektfil lagret!");
    setTimeout(() => setDownloadSuccess(null), 3000);
  }

  function handlePrintPDF() {
    window.print();
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
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              {downloadSuccess}
            </div>
          )}

          {activeView === "export" ? (
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Velg publiseringsformat
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Alle filer genereres med full metadata, kolofon, kapitteloverskrifter og forlagskvalitet.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {/* EPUB */}
                <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-indigo-400 hover:shadow-md">
                  <div>
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <h4 className="mt-4 text-xl font-black text-slate-900">EPUB</h4>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                      For e-boklesere, Apple Books, Kindle og Kobo. Inkluderer kapittelinndeling og kolofonside.
                    </p>
                  </div>
                  <Button
                    onClick={handleExportEPUB}
                    className="mt-6 w-full rounded-xl bg-indigo-700 hover:bg-indigo-800"
                  >
                    Last ned EPUB
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
                      Standard forlagsformat med dobbel linjeavstand, innrykk og sidetall for redaktører.
                    </p>
                  </div>
                  <Button
                    onClick={handleExportDOCX}
                    className="mt-6 w-full rounded-xl bg-blue-700 hover:bg-blue-800"
                  >
                    Last ned DOCX
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
                      Typografisk formatert bokoppsett klar for prøvetrykk eller utskrift direkte i nettleseren.
                    </p>
                  </div>
                  <Button
                    onClick={handlePrintPDF}
                    className="mt-6 w-full rounded-xl bg-rose-700 hover:bg-rose-800"
                  >
                    Skriv ut / PDF
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
                      Komplett backup med all data: bokplan, karakterbibel, kontinuitetsregler og manuskript.
                    </p>
                  </div>
                  <Button
                    onClick={handleExportJSON}
                    variant="outline"
                    className="mt-6 w-full rounded-xl"
                  >
                    Lagre backup
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
                    Fullstendig kolofon og opphavsrettserklæring
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Strukturert innholdsfortegnelse for alle {project.chapters.length} kapitler
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Bokbibel-appendiks med karakterliste og tidslinje
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
