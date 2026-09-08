import React, { useState } from "react";
import {
  Users,
  Sparkles,
  HeartHandshake,
  Flame,
  TrendingUp,
  Brain,
  Shield,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  X,
  Compass,
  Zap,
} from "lucide-react";
import { Character, CharacterRelationship } from "../types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface CharacterDevelopmentModalProps {
  characters: Character[];
  bookTitle: string;
  genre: string;
  tone: string;
  onUpdateCharacter: (updated: Character) => void;
  onAddCharacter: (newChar: Character) => void;
  onClose: () => void;
  initialCharacterId?: string;
}

export const CharacterDevelopmentModal: React.FC<CharacterDevelopmentModalProps> = ({
  characters,
  bookTitle,
  genre,
  tone,
  onUpdateCharacter,
  onAddCharacter,
  onClose,
  initialCharacterId,
}) => {
  const [selectedId, setSelectedId] = useState<string>(
    initialCharacterId || characters[0]?.id || ""
  );
  const [activeTab, setActiveTab] = useState<string>("drivers");
  const [isGeneratingJourney, setIsGeneratingJourney] = useState(false);
  const [newRelTarget, setNewRelTarget] = useState("");
  const [newRelType, setNewRelType] = useState("");
  const [newRelDynamic, setNewRelDynamic] = useState("");
  const [newRelTension, setNewRelTension] = useState(5);
  const [saveToast, setSaveToast] = useState(false);

  const selectedChar = characters.find((c) => c.id === selectedId) || characters[0];

  const handleFieldChange = (field: keyof Character, value: any) => {
    if (!selectedChar) return;
    const updated = { ...selectedChar, [field]: value };
    onUpdateCharacter(updated);
    showToast();
  };

  const handleEvolutionChange = (actKey: "act1" | "act2" | "act3" | "act4", value: string) => {
    if (!selectedChar) return;
    const updatedEvolution = {
      ...(selectedChar.personalityEvolution || {
        act1: "",
        act2: "",
        act3: "",
        act4: "",
      }),
      [actKey]: value,
    };
    handleFieldChange("personalityEvolution", updatedEvolution);
  };

  const handleAddRelationship = () => {
    if (!selectedChar || !newRelTarget.trim() || !newRelType.trim()) return;
    const existing = selectedChar.relationships || [];
    const newRel: CharacterRelationship = {
      targetCharacterName: newRelTarget.trim(),
      relationType: newRelType.trim(),
      dynamic: newRelDynamic.trim() || "Spenningsfylt samarbeid.",
      tensionLevel: Number(newRelTension),
    };
    handleFieldChange("relationships", [...existing, newRel]);
    setNewRelTarget("");
    setNewRelType("");
    setNewRelDynamic("");
    setNewRelTension(5);
  };

  const handleRemoveRelationship = (index: number) => {
    if (!selectedChar || !selectedChar.relationships) return;
    const nextRels = selectedChar.relationships.filter((_, idx) => idx !== index);
    handleFieldChange("relationships", nextRels);
  };

  const handleCreateNewCharacter = () => {
    const newId = `char-${Date.now()}`;
    const newChar: Character = {
      id: newId,
      name: "Ny Karakter",
      role: "Bibirolle",
      archetype: "Vandrer",
      goal: "Definer karakterens overordnede mål",
      background: "Kort bakgrunnshistorie...",
      voice: "Stemme og talemåte...",
      secrets: "Skjult hemmelighet...",
      arc: "Fra ukjent til forandret.",
      motivationInternal: "Søken etter identitet eller forsoning.",
      motivationExternal: "Et håndfast mål i den ytre verden.",
      internalConflict: "Tvil, frykt eller moralsk dilemma.",
      externalConflict: "Ytre motstandere, tidsnød eller samfunn.",
      relationships: [],
      personalityEvolution: {
        act1: "Starttilstand i akt 1...",
        act2: "Press og forandring i akt 2...",
        act3: "Klimaks og vendepunkt i akt 3...",
        act4: "Ny likevekt i akt 4...",
      },
      journeySummary: "",
    };
    onAddCharacter(newChar);
    setSelectedId(newId);
  };

  const handleGenerateJourney = async () => {
    if (!selectedChar) return;
    setIsGeneratingJourney(true);
    try {
      const res = await fetch("/api/book/generate-character-journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character: selectedChar,
          bookTitle,
          genre,
          tone,
        }),
      });
      const data = await res.json();
      if (data.journeySummary) {
        handleFieldChange("journeySummary", data.journeySummary);
      }
    } catch (err) {
      console.error("Failed to generate character journey:", err);
    } finally {
      setIsGeneratingJourney(false);
    }
  };

  const showToast = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  if (!selectedChar) return null;

  return (
    <div
      id="character-development-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
    >
      <div className="flex flex-col h-[90vh] w-full max-w-6xl rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Karakterutvikling & Psykologisk Profil
                </h2>
                <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10">
                  Bokbibel Modul
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Kartlegg indre og ytre drivkrefter, relasjonsspenninger og personlighetsendring gjennom aktene
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saveToast && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800 animate-pulse">
                <Check className="h-3.5 w-3.5" /> Endringer lagret
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateNewCharacter}
              className="border-slate-700 hover:bg-slate-800 text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1 text-amber-400" /> Ny karakter
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar: Character Selector */}
          <div className="w-64 border-r border-slate-800 bg-slate-950/40 p-4 flex flex-col gap-2 overflow-y-auto">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-2 mb-1">
              Bokens Galleri ({characters.length})
            </div>
            {characters.map((c) => {
              const isSelected = c.id === selectedId;
              const hasFullData = Boolean(
                c.motivationInternal && c.relationships && c.relationships.length > 0
              );
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`flex flex-col items-start p-3 rounded-lg text-left transition-all border ${
                    isSelected
                      ? "bg-amber-500/15 border-amber-500/50 text-white shadow-sm"
                      : "border-transparent hover:bg-slate-800/60 text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-sm truncate">{c.name}</span>
                    {hasFullData && (
                      <span className="h-2 w-2 rounded-full bg-emerald-400" title="Profil komplett" />
                    )}
                  </div>
                  <span className="text-xs text-slate-400 truncate mt-0.5">{c.role}</span>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-slate-800 text-slate-300">
                      {c.archetype || "Udefinert"}
                    </Badge>
                    {c.relationships && c.relationships.length > 0 && (
                      <span className="text-[10px] text-slate-400">
                        {c.relationships.length} relasjoner
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Main Content Panel */}
          <div className="flex-1 flex flex-col overflow-y-auto p-6 bg-slate-900/60">
            {/* Character Header Info */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800">
              <div className="flex-1 min-w-[280px]">
                <div className="flex items-center gap-3">
                  <Input
                    value={selectedChar.name}
                    onChange={(e) => handleFieldChange("name", e.target.value)}
                    className="text-2xl font-bold bg-transparent border-none px-0 h-auto focus-visible:ring-0 focus-visible:border-amber-500 text-white"
                    placeholder="Karakterens navn"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="text-slate-400 font-medium">Rolle:</span>
                    <Input
                      value={selectedChar.role}
                      onChange={(e) => handleFieldChange("role", e.target.value)}
                      className="h-7 text-xs bg-slate-950/60 border-slate-700 w-36"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="text-slate-400 font-medium">Arketype:</span>
                    <Input
                      value={selectedChar.archetype}
                      onChange={(e) => handleFieldChange("archetype", e.target.value)}
                      className="h-7 text-xs bg-slate-950/60 border-slate-700 w-36"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleGenerateJourney}
                  disabled={isGeneratingJourney}
                  className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-semibold shadow-md text-xs h-9"
                >
                  {isGeneratingJourney ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Analyserer bue...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Generer karakterreise med AI
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-5 flex-1 flex flex-col">
              <TabsList className="bg-slate-950/60 border border-slate-800 p-1 w-full justify-start gap-1">
                <TabsTrigger
                  value="drivers"
                  className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 text-xs flex items-center gap-1.5"
                >
                  <Flame className="h-3.5 w-3.5 text-amber-400" />
                  Motivasjoner & Konflikter
                </TabsTrigger>
                <TabsTrigger
                  value="relationships"
                  className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 text-xs flex items-center gap-1.5"
                >
                  <HeartHandshake className="h-3.5 w-3.5 text-rose-400" />
                  Relasjonsnettverk ({selectedChar.relationships?.length || 0})
                </TabsTrigger>
                <TabsTrigger
                  value="evolution"
                  className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 text-xs flex items-center gap-1.5"
                >
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                  Personlighetsendring (Aktene)
                </TabsTrigger>
                <TabsTrigger
                  value="journey"
                  className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 text-xs flex items-center gap-1.5"
                >
                  <Brain className="h-3.5 w-3.5 text-indigo-400" />
                  Karakterens Reise & Sammendrag
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Motivasjoner & Konflikter */}
              <TabsContent value="drivers" className="space-y-6 pt-4 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Indre Motivasjon */}
                  <Card className="border-slate-800 bg-slate-950/40">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-400">
                          <Flame className="h-3.5 w-3.5" />
                        </div>
                        <Label className="text-sm font-semibold text-amber-300">
                          Indre Motivasjon (Hva hjertet lengter etter)
                        </Label>
                      </div>
                      <p className="text-xs text-slate-400">
                        Det emosjonelle eller psykologiske behovet: Tilhørighet, anerkjennelse, tilgivelse eller frihet.
                      </p>
                      <Textarea
                        rows={3}
                        value={selectedChar.motivationInternal || ""}
                        onChange={(e) => handleFieldChange("motivationInternal", e.target.value)}
                        placeholder="F.eks. Gjenopprette æren til slekten og finne forsoning etter familiens tap..."
                        className="bg-slate-900 border-slate-700 text-xs text-slate-200"
                      />
                    </CardContent>
                  </Card>

                  {/* Ytre Motivasjon */}
                  <Card className="border-slate-800 bg-slate-950/40">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-400">
                          <Zap className="h-3.5 w-3.5" />
                        </div>
                        <Label className="text-sm font-semibold text-blue-300">
                          Ytre Motivasjon (Håndfast oppdrag)
                        </Label>
                      </div>
                      <p className="text-xs text-slate-400">
                        Det fysiske, målbare målet i handlingen: Finne en gjenstand, redde et hus, stoppe en fiende.
                      </p>
                      <Textarea
                        rows={3}
                        value={selectedChar.motivationExternal || ""}
                        onChange={(e) => handleFieldChange("motivationExternal", e.target.value)}
                        placeholder="F.eks. Avverge tvangssalg av Strangehagen 14 og forsegle portalen før springflo..."
                        className="bg-slate-900 border-slate-700 text-xs text-slate-200"
                      />
                    </CardContent>
                  </Card>

                  {/* Indre Konflikt */}
                  <Card className="border-slate-800 bg-slate-950/40">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-md bg-rose-500/10 flex items-center justify-center text-rose-400">
                          <Shield className="h-3.5 w-3.5" />
                        </div>
                        <Label className="text-sm font-semibold text-rose-300">
                          Indre Konflikt (Frykt & Tvilen)
                        </Label>
                      </div>
                      <p className="text-xs text-slate-400">
                        Karakterens interne sperre: Feilaktig overbevisning, traumer eller frykten for å feile.
                      </p>
                      <Textarea
                        rows={3}
                        value={selectedChar.internalConflict || ""}
                        onChange={(e) => handleFieldChange("internalConflict", e.target.value)}
                        placeholder="F.eks. Frykten for å arve familiens påståtte galskap kontra dragningen mot dypet..."
                        className="bg-slate-900 border-slate-700 text-xs text-slate-200"
                      />
                    </CardContent>
                  </Card>

                  {/* Ytre Konflikt */}
                  <Card className="border-slate-800 bg-slate-950/40">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-md bg-purple-500/10 flex items-center justify-center text-purple-400">
                          <Compass className="h-3.5 w-3.5" />
                        </div>
                        <Label className="text-sm font-semibold text-purple-300">
                          Ytre Konflikt (Motstanderne & Tidsfristen)
                        </Label>
                      </div>
                      <p className="text-xs text-slate-400">
                        De ytre kreftene som kjemper mot karakteren: Antagonister, naturkrefter, lover eller tidspress.
                      </p>
                      <Textarea
                        rows={3}
                        value={selectedChar.externalConflict || ""}
                        onChange={(e) => handleFieldChange("externalConflict", e.target.value)}
                        placeholder="F.eks. Henrik Castbergs utbyggingskonsortium og stigende vannmasser i de underjordiske gangene..."
                        className="bg-slate-900 border-slate-700 text-xs text-slate-200"
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Overordnet karakterbue og hemmelighet */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">
                      Overordnet Utviklingsbue (Arc)
                    </Label>
                    <Input
                      value={selectedChar.arc || ""}
                      onChange={(e) => handleFieldChange("arc", e.target.value)}
                      placeholder="Fra distansert tilskuer til bevisst vokter..."
                      className="bg-slate-950/60 border-slate-700 text-xs text-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">
                      Skjult Hemmelighet / Nøkkelopplysning
                    </Label>
                    <Input
                      value={selectedChar.secrets || ""}
                      onChange={(e) => handleFieldChange("secrets", e.target.value)}
                      placeholder="Et hemmelig brev, en skjult arv eller et glemt løfte..."
                      className="bg-slate-950/60 border-slate-700 text-xs text-slate-200"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Tab 2: Relasjonsnettverk */}
              <TabsContent value="relationships" className="space-y-5 pt-4 flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">
                      Aktive relasjoner for {selectedChar.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Følg hvordan relasjonenes dynamikk og spenningsnivå driver handlingen fremover
                    </p>
                  </div>
                </div>

                {/* Relasjonsliste */}
                <div className="space-y-3">
                  {(!selectedChar.relationships || selectedChar.relationships.length === 0) && (
                    <div className="p-8 rounded-lg border border-dashed border-slate-800 text-center text-slate-400 text-xs">
                      Ingen relasjoner registrert ennå for denne karakteren. Legg til en relasjon nedenfor.
                    </div>
                  )}

                  {selectedChar.relationships?.map((rel, idx) => {
                    const tensionColor =
                      rel.tensionLevel >= 8
                        ? "text-rose-400 bg-rose-950/50 border-rose-800"
                        : rel.tensionLevel >= 5
                        ? "text-amber-400 bg-amber-950/50 border-amber-800"
                        : "text-emerald-400 bg-emerald-950/50 border-emerald-800";

                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-lg border border-slate-800 bg-slate-950/40 flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-white">
                              {rel.targetCharacterName}
                            </span>
                            <Badge variant="outline" className="text-xs border-slate-700 text-slate-300">
                              {rel.relationType}
                            </Badge>
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded border font-medium ${tensionColor}`}
                            >
                              Spenning: {rel.tensionLevel}/10
                            </span>
                          </div>
                          <p className="text-xs text-slate-300">{rel.dynamic}</p>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveRelationship(idx)}
                          className="h-8 w-8 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20"
                          title="Fjern relasjon"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {/* Form for å legge til ny relasjon */}
                <div className="p-4 rounded-lg border border-slate-800 bg-slate-950/60 space-y-3">
                  <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Knytt relasjon til en annen karakter
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-[11px] text-slate-400">Motkarakter</Label>
                      <select
                        value={newRelTarget}
                        onChange={(e) => setNewRelTarget(e.target.value)}
                        className="w-full h-8 text-xs bg-slate-900 border border-slate-700 rounded px-2 text-slate-200"
                      >
                        <option value="">Velg karakter...</option>
                        {characters
                          .filter((c) => c.name !== selectedChar.name)
                          .map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name} ({c.role})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-[11px] text-slate-400">Relasjonstype</Label>
                      <Input
                        value={newRelType}
                        onChange={(e) => setNewRelType(e.target.value)}
                        placeholder="F.eks. Erkefiende, Alliert, Søster"
                        className="h-8 text-xs bg-slate-900 border-slate-700"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] text-slate-400">
                        Spenningsnivå (1 rolig – 10 eksplosivt): {newRelTension}
                      </Label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={newRelTension}
                        onChange={(e) => setNewRelTension(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-[11px] text-slate-400">
                      Underliggende dynamikk & hemmelig friksjon
                    </Label>
                    <Input
                      value={newRelDynamic}
                      onChange={(e) => setNewRelDynamic(e.target.value)}
                      placeholder="Beskriv hva som skaper spenning eller tiltrekning mellom dem..."
                      className="h-8 text-xs bg-slate-900 border-slate-700"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      onClick={handleAddRelationship}
                      disabled={!newRelTarget || !newRelType}
                      className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-xs h-7"
                    >
                      Legg til relasjon
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 3: Personlighetsendring (Aktene) */}
              <TabsContent value="evolution" className="space-y-4 pt-4 flex-1">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">
                    Karakterens forvandling gjennom aktstrukturen
                  </h3>
                  <p className="text-xs text-slate-400">
                    Definer hvordan karakterens adferd, verdier og emosjonelle tilstand skifter underveis
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Akt 1 */}
                  <Card className="border-slate-800 bg-slate-950/40">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                          Akt 1: Status Quo & Åpning
                        </span>
                        <Badge variant="outline" className="text-[10px] border-slate-700">
                          Kapittel 1–8
                        </Badge>
                      </div>
                      <Textarea
                        rows={3}
                        value={selectedChar.personalityEvolution?.act1 || ""}
                        onChange={(e) => handleEvolutionChange("act1", e.target.value)}
                        placeholder="Hvordan reagerer karakteren i begynnelsen? Forsvarsmekanismer, skepsis, trygghetssøking..."
                        className="bg-slate-900 border-slate-700 text-xs text-slate-200"
                      />
                    </CardContent>
                  </Card>

                  {/* Akt 2 */}
                  <Card className="border-slate-800 bg-slate-950/40">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                          Akt 2: Prøvelser & Press
                        </span>
                        <Badge variant="outline" className="text-[10px] border-slate-700">
                          Kapittel 9–20
                        </Badge>
                      </div>
                      <Textarea
                        rows={3}
                        value={selectedChar.personalityEvolution?.act2 || ""}
                        onChange={(e) => handleEvolutionChange("act2", e.target.value)}
                        placeholder="Mister fotfestet; tvunget ut av komfortsonen. Begynner å utfordre sine gamle overbevisninger..."
                        className="bg-slate-900 border-slate-700 text-xs text-slate-200"
                      />
                    </CardContent>
                  </Card>

                  {/* Akt 3 */}
                  <Card className="border-slate-800 bg-slate-950/40">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                          Akt 3: Sjelens mørke natt & Klimaks
                        </span>
                        <Badge variant="outline" className="text-[10px] border-slate-700">
                          Kapittel 21–28
                        </Badge>
                      </div>
                      <Textarea
                        rows={3}
                        value={selectedChar.personalityEvolution?.act3 || ""}
                        onChange={(e) => handleEvolutionChange("act3", e.target.value)}
                        placeholder="Gjør et moralsk valg og ofrer noe vesentlig. Viser ny besluttsomhet..."
                        className="bg-slate-900 border-slate-700 text-xs text-slate-200"
                      />
                    </CardContent>
                  </Card>

                  {/* Akt 4 */}
                  <Card className="border-slate-800 bg-slate-950/40">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                          Akt 4: Ny Likevekt & Sluttilstand
                        </span>
                        <Badge variant="outline" className="text-[10px] border-slate-700">
                          Kapittel 29–32
                        </Badge>
                      </div>
                      <Textarea
                        rows={3}
                        value={selectedChar.personalityEvolution?.act4 || ""}
                        onChange={(e) => handleEvolutionChange("act4", e.target.value)}
                        placeholder="Hvordan fremstår karakteren etter at konflikten er løst? Hva er ugjenkallelig endret?"
                        className="bg-slate-900 border-slate-700 text-xs text-slate-200"
                      />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Tab 4: Karakterens Reise & AI Sammendrag */}
              <TabsContent value="journey" className="space-y-4 pt-4 flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">
                      Psykologisk & Narrativ Karakterreise
                    </h3>
                    <p className="text-xs text-slate-400">
                      En sammenhengende dramaturgisk oppsummering av hele karakterens transformasjon
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleGenerateJourney}
                    disabled={isGeneratingJourney}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8"
                  >
                    {isGeneratingJourney ? (
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Generer med AI
                  </Button>
                </div>

                <Card className="border-slate-800 bg-slate-950/60">
                  <CardContent className="p-5 space-y-3">
                    <Textarea
                      rows={9}
                      value={selectedChar.journeySummary || ""}
                      onChange={(e) => handleFieldChange("journeySummary", e.target.value)}
                      placeholder="Klikk 'Generer med AI' for å analysere karakterens motivasjoner, relasjoner og personlighetsendringer, eller skriv inn ditt eget sammendrag her..."
                      className="bg-slate-900/90 border-slate-700 text-sm leading-relaxed text-slate-100 resize-y"
                    />

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                      <span>
                        Tips: Dette sammendraget mates automatisk inn i kontinuitetskontrollen og kapittelskrivingen.
                      </span>
                      <span>
                        {(selectedChar.journeySummary || "").trim().split(/\s+/).filter(Boolean).length} ord
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-3 bg-slate-950/60">
          <div className="text-xs text-slate-400">
            Aktiv profil: <strong className="text-white">{selectedChar.name}</strong> • Alle endringer oppdateres automatisk i bokprosjektet
          </div>
          <Button onClick={onClose} className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs">
            Ferdig
          </Button>
        </div>
      </div>
    </div>
  );
};
