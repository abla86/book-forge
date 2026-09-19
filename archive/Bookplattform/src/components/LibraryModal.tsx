import { useState } from "react";
import { BookProject } from "../types";
import { X, BookOpen, Plus, Sparkles, Check, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectId: string;
  projects?: BookProject[];
  onSelectProject: (projectId: string) => void;
  onNewProject: (title: string, genre: string, idea: string, tone?: string) => void;
  onDeleteProject?: (projectId: string) => void;
}

export function LibraryModal({
  isOpen,
  onClose,
  currentProjectId,
  projects = [],
  onSelectProject,
  onNewProject,
  onDeleteProject,
}: LibraryModalProps) {
  if (!isOpen) return null;

  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newGenre, setNewGenre] = useState("Krim");
  const [newTone, setNewTone] = useState("Mørk og intens");
  const [newIdea, setNewIdea] = useState("");

  const bookList = projects.length > 0 ? projects : [
    {
      id: "book-riket-under-regnet",
      title: "Riket under regnet",
      genre: "Fantasy",
      tone: "Filmisk",
      author: "Anne Beth Andersen",
      progress: 18,
      phase: "planned",
      lengthLabel: "Full roman",
      idea: "En ung kvinne arver et hus i Bergen og finner spor etter et glemt rike under byen.",
      chapters: [],
    } as unknown as BookProject,
  ];

  function handleCreate() {
    if (!newTitle.trim()) return;
    onNewProject(newTitle.trim(), newGenre, newIdea.trim() || "En ny historie tar form.", newTone);
    setShowNewForm(false);
    setNewTitle("");
    setNewIdea("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-700 text-white font-bold">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Ditt bokbibliotek</h2>
              <p className="text-xs text-slate-500">Administrer og bytt mellom persistente bokprosjekter ({bookList.length} bøker)</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-5 space-y-4 max-h-[50vh] overflow-y-auto pr-1">
          {bookList.map((b) => {
            const isSelected = b.id === currentProjectId;
            const wordsCount = b.chapters?.reduce((acc, c) => acc + (c.currentWords || 0), 0) || 0;
            return (
              <div
                key={b.id}
                onClick={() => {
                  onSelectProject(b.id);
                  onClose();
                }}
                className={`group relative flex cursor-pointer items-start justify-between rounded-2xl border p-4 transition ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/40 shadow-xs ring-2 ring-indigo-500/20"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex-1 mr-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900">{b.title}</h3>
                    <Badge variant="secondary">{b.genre}</Badge>
                    <Badge variant="outline">{b.tone || "Filmisk"}</Badge>
                    <span className="text-xs text-slate-500">{wordsCount > 0 ? `${wordsCount.toLocaleString("no-NO")} ord` : b.lengthLabel || "80 000 ord"}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">{b.idea || "Ingen beskrivelse registrert."}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onDeleteProject && bookList.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Er du sikker på at du vil slette «${b.title}»?`)) {
                          onDeleteProject(b.id);
                        }
                      }}
                      className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Slett prosjekt"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  {isSelected && (
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-indigo-700 text-white">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {showNewForm ? (
          <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3 animate-in fade-in">
            <h4 className="font-bold text-indigo-950 text-sm flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-700" /> Start ny bok
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Boktittel (f.eks. Skygger over Svalbard)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newGenre}
                  onChange={(e) => setNewGenre(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs"
                >
                  <option value="Fantasy">Fantasy</option>
                  <option value="Krim">Krim</option>
                  <option value="Thriller">Thriller</option>
                  <option value="Science fiction">Science fiction</option>
                  <option value="Romanse">Romanse</option>
                  <option value="Drama">Drama</option>
                  <option value="Historisk">Historisk</option>
                </select>
                <select
                  value={newTone}
                  onChange={(e) => setNewTone(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs"
                >
                  <option value="Filmisk">Filmisk</option>
                  <option value="Mørk og intens">Mørk og intens</option>
                  <option value="Varm og nær">Varm og nær</option>
                  <option value="Lyrisk">Lyrisk</option>
                  <option value="Spenningsdrevet">Spenningsdrevet</option>
                </select>
              </div>
            </div>
            <textarea
              placeholder="Kort bokidé eller premiss for historien..."
              value={newIdea}
              onChange={(e) => setNewIdea(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm min-h-16"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowNewForm(false)}>
                Avbryt
              </Button>
              <Button size="sm" onClick={handleCreate} className="bg-indigo-700">
                Opprett bok i databasen
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setShowNewForm(true)}
            variant="outline"
            className="mt-5 w-full rounded-2xl py-5 border-dashed"
          >
            <Plus className="mr-2 h-4 w-4" /> Opprett et nytt bokprosjekt
          </Button>
        )}
      </div>
    </div>
  );
}
