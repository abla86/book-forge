import { useState } from "react";
import { Chapter } from "../types";
import {
  X,
  Sparkles,
  BookOpen,
  Edit3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Save,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface ChapterReaderModalProps {
  chapter: Chapter | null;
  bookTitle: string;
  genre: string;
  tone: string;
  isOpen: boolean;
  onClose: () => void;
  onSaveContent: (chapterId: number, content: string, wordCount: number) => void;
  onNavigateChapter: (direction: "prev" | "next") => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export function ChapterReaderModal({
  chapter,
  bookTitle,
  genre,
  tone,
  isOpen,
  onClose,
  onSaveContent,
  onNavigateChapter,
  hasPrev,
  hasNext,
}: ChapterReaderModalProps) {
  if (!isOpen || !chapter) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(chapter.content || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");

  const wordCount = editedContent
    ? editedContent.trim().split(/\s+/).filter(Boolean).length
    : 0;

  async function handleGenerateWithAI() {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/book/write-chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterNumber: chapter.number,
          chapterTitle: chapter.title,
          chapterSummary: chapter.summary,
          bookTitle,
          genre,
          tone,
          characters: chapter.povCharacter,
          previousSummary: `Kapittel ${chapter.number}: ${chapter.title}`,
        }),
      });
      const data = await res.json();
      if (data.content) {
        setEditedContent(data.content);
        const count = data.content.trim().split(/\s+/).filter(Boolean).length;
        onSaveContent(chapter.id, data.content, count);
      }
    } catch (err) {
      console.error("Failed to generate chapter text:", err);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleSave() {
    onSaveContent(chapter.id, editedContent, wordCount);
    setIsEditing(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(editedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const fontClass = {
    sm: "text-sm leading-7",
    base: "text-base leading-8",
    lg: "text-lg leading-9",
  }[fontSize];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6 backdrop-blur-sm animate-in fade-in">
      <div className="flex h-full max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl bg-[#FAF8F5] text-slate-900 shadow-2xl overflow-hidden border border-slate-300/80">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700 font-black">
              {chapter.number}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                  Akt {chapter.act} • Kapittel {chapter.number}
                </span>
                <Badge
                  variant={
                    chapter.status === "completed"
                      ? "success"
                      : chapter.status === "verified"
                      ? "default"
                      : "secondary"
                  }
                >
                  {chapter.status === "completed"
                    ? "Ferdigskrevet"
                    : chapter.status === "verified"
                    ? "Kvalitetssikret"
                    : "Planlagt"}
                </Badge>
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {chapter.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center rounded-xl bg-slate-100 p-1 text-xs">
              {(["sm", "base", "lg"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFontSize(s)}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                    fontSize === s ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {s === "sm" ? "A" : s === "base" ? "A+" : "A++"}
                </button>
              ))}
            </div>

            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (isEditing) handleSave();
                else setIsEditing(true);
              }}
              className="rounded-xl"
            >
              {isEditing ? (
                <>
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Lagre
                </>
              ) : (
                <>
                  <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Rediger
                </>
              )}
            </Button>

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

        {/* Continuity & metadata bar */}
        <div className="border-b border-slate-200/60 bg-amber-50/60 px-6 py-2.5 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0" />
            <span>
              <strong>Kontinuitetskrav:</strong> {chapter.continuityNotes}
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-600 font-medium">
            <span>POV: <strong className="text-slate-900">{chapter.povCharacter}</strong></span>
            <span>Ord: <strong className="text-slate-900">{wordCount.toLocaleString("nb-NO")}</strong> / {chapter.wordTarget.toLocaleString("nb-NO")}</span>
          </div>
        </div>

        {/* Content reader / editor area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10">
          {isEditing ? (
            <div className="flex flex-col h-full space-y-3">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Manuskripttekst (Redigeringsmodus)
              </label>
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                placeholder="Skriv inn eller generer kapittelets fulle tekst her..."
                className="w-full flex-1 min-h-[400px] resize-none rounded-2xl border border-slate-300 bg-white p-5 font-serif text-base leading-relaxed text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          ) : editedContent ? (
            <div className="mx-auto max-w-2xl font-serif text-slate-800">
              <div className="mb-8 text-center">
                <div className="text-xs uppercase tracking-[0.25em] text-slate-400 font-sans">
                  Kapittel {chapter.number}
                </div>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 font-serif">
                  {chapter.title}
                </h1>
                <div className="mx-auto mt-4 h-px w-12 bg-indigo-300" />
              </div>

              <div className={`space-y-6 ${fontClass} whitespace-pre-wrap`}>
                {editedContent}
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
                <BookOpen className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">
                Dette kapittelet er ennå ikke skrevet
              </h3>
              <p className="mt-2 max-w-md text-sm text-slate-600 leading-relaxed">
                <strong>Handling:</strong> {chapter.summary}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={handleGenerateWithAI}
                  disabled={isGenerating}
                  className="rounded-xl bg-indigo-700 hover:bg-indigo-800"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isGenerating ? "Forfatter kapittel..." : "Skriv kapittel med AI"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="rounded-xl"
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  Skriv selv
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer toolbar */}
        <div className="flex items-center justify-between border-t border-slate-200/80 bg-white px-6 py-3.5">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateChapter("prev")}
              disabled={!hasPrev}
              className="rounded-xl text-slate-600"
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Forrige
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateChapter("next")}
              disabled={!hasNext}
              className="rounded-xl text-slate-600"
            >
              Neste <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {editedContent && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="rounded-xl"
                >
                  {copied ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Kopiert
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3.5 w-3.5" /> Kopier tekst
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isGenerating}
                  onClick={handleGenerateWithAI}
                  className="rounded-xl"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 text-indigo-600" />
                  {isGenerating ? "Genererer..." : "Generer ny variant"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
