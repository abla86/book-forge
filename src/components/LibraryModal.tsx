import { useState } from "react";
import { BookProject } from "../types";
import { X, BookOpen, Plus, Sparkles, Check } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectId: string;
  onSelectProject: (projectId: string) => void;
  onNewProject: (title: string, genre: string, idea: string) => void;
}

export function LibraryModal({
  isOpen,
  onClose,
  currentProjectId,
  onSelectProject,
  onNewProject,
}: LibraryModalProps) {
  if (!isOpen) return null;

  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newGenre, setNewGenre] = useState("Krim");
  const [newIdea, setNewIdea] = useState("");

  const sampleLibrary = [
    {
      id: "book-riket-under-regnet",
      title: "Riket under regnet",
      genre: "Fantasy",
      tone: "Filmisk",
      author: "Anne Beth",
      progress: 18,
      words: "80 000 ord",
      desc: "En ung kvinne arver et hus i Bergen og finner spor etter et glemt rike under byen.",
    },
    {
      id: "book-svalbard",
      title: "Skygger over Svalbard",
      genre: "Krim",
      tone: "Mørk og intens",
      author: "Anne Beth",
      progress: 60,
      words: "45 000 ord",
      desc: "Under mørketiden i Longyearbyen forsvinner en forsker fra den globale frøhvelvet.",
    },
    {
      id: "book-andoya",
      title: "Stjernestøv fra Andøya",
      genre: "Science fiction",
      tone: "Episk",
      author: "Anne Beth",
      progress: 5,
      words: "120 000 ord",
      desc: "Norges første dype romteleskop fanger opp et signal som bryter de kjente naturlovene.",
    },
  ];

  function handleCreate() {
    if (!newTitle) return;
    onNewProject(newTitle, newGenre, newIdea || "En ny historie tar form.");
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
              <p className="text-xs text-slate-500">Administrer og bytt mellom bokprosjekter</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-5 space-y-4">
          {sampleLibrary.map((b) => {
            const isSelected = b.id === currentProjectId;
            return (
              <div
                key={b.id}
                onClick={() => {
                  onSelectProject(b.id);
                  onClose();
                }}
                className={`relative flex cursor-pointer items-start justify-between rounded-2xl border p-4 transition ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/40 shadow-xs ring-2 ring-indigo-500/20"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900">{b.title}</h3>
                    <Badge variant="secondary">{b.genre}</Badge>
                    <Badge variant="outline">{b.words}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">{b.desc}</p>
                </div>

                {isSelected && (
                  <div className="ml-3 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-700 text-white">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {showNewForm ? (
          <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3 animate-in fade-in">
            <h4 className="font-bold text-indigo-950 text-sm flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-700" /> Start ny bok
            </h4>
            <input
              type="text"
              placeholder="Boktittel (f.eks. Skygger i fjordene)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
            />
            <textarea
              placeholder="Kort bokidé..."
              value={newIdea}
              onChange={(e) => setNewIdea(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm min-h-16"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowNewForm(false)}>
                Avbryt
              </Button>
              <Button size="sm" onClick={handleCreate} className="bg-indigo-700">
                Opprett bok
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
