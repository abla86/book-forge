import { useState } from "react";
import { X, Settings2, Sparkles, Check } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  authorName: string;
  onSaveAuthorName: (name: string) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  authorName,
  onSaveAuthorName,
}: SettingsModalProps) {
  if (!isOpen) return null;

  const [name, setName] = useState(authorName);
  const [language, setLanguage] = useState("Norsk bokmål");
  const [model, setModel] = useState("Gemini 3.8 Flash");
  const [continuityGuard, setContinuityGuard] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    onSaveAuthorName(name);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Innstillinger</h2>
              <p className="text-xs text-slate-500">Forfatterprofil og AI-skrivemotor</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Forfatternavn (vises på omslag og kolofon)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="F.eks. Anne Beth"
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Hovedspråk</Label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="Norsk bokmål">Norsk bokmål</option>
                <option value="Norsk nynorsk">Norsk nynorsk</option>
                <option value="English">English</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>AI-motor</Label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="Gemini 3.8 Flash">Gemini 3.8 Flash (Anbefalt)</option>
                <option value="Gemini 3.1 Pro">Gemini 3.1 Pro</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">
                  Aktiv kontinuitetsvakt
                </div>
                <div className="text-xs text-slate-500">
                  Kryssjekker karakterfakta og tidslinje under kapittelskriving
                </div>
              </div>
              <input
                type="checkbox"
                checked={continuityGuard}
                onChange={(e) => setContinuityGuard(e.target.checked)}
                className="h-5 w-5 rounded-md accent-indigo-700 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
              <div>
                <div className="text-sm font-bold text-slate-900">
                  Automatisk skylagring
                </div>
                <div className="text-xs text-slate-500">
                  Lagrer manuskriptendringer fortløpende
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
                className="h-5 w-5 rounded-md accent-indigo-700 cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} className="rounded-xl">
            Avbryt
          </Button>
          <Button onClick={handleSave} className="rounded-xl bg-indigo-700 hover:bg-indigo-800">
            {saved ? (
              <>
                <Check className="mr-1.5 h-4 w-4" /> Lagret
              </>
            ) : (
              "Lagre innstillinger"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
