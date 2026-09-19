import { useState } from "react";
import { Character, LocationItem, TimelineEvent, ContinuityRule } from "../types";
import {
  X,
  Users,
  Globe2,
  ListTree,
  ShieldCheck,
  Plus,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

interface BibleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCategory: "characters" | "locations" | "timeline" | "rules";
  characters: Character[];
  locations: LocationItem[];
  timeline: TimelineEvent[];
  rules: ContinuityRule[];
  onAddCharacter: (c: Character) => void;
  onAddLocation: (l: LocationItem) => void;
  onAddRule: (r: ContinuityRule) => void;
  onOpenCharacterDevelopment?: (charId?: string) => void;
}

export function BibleDetailModal({
  isOpen,
  onClose,
  activeCategory: initialCategory,
  characters,
  locations,
  timeline,
  rules,
  onAddCharacter,
  onAddLocation,
  onAddRule,
  onOpenCharacterDevelopment,
}: BibleDetailModalProps) {
  if (!isOpen) return null;

  const [tab, setTab] = useState<"characters" | "locations" | "timeline" | "rules">(initialCategory);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [goal, setGoal] = useState("");
  const [background, setBackground] = useState("");
  const [voice, setVoice] = useState("");
  const [secrets, setSecrets] = useState("");
  const [rulesText, setRulesText] = useState("");
  const [ruleCat, setRuleCat] = useState<ContinuityRule["category"]>("Karakter");

  function handleSaveNew() {
    if (tab === "characters") {
      if (!name) return;
      onAddCharacter({
        id: `char-${Date.now()}`,
        name,
        role: role || "Viktig birolle",
        archetype: "Arketype",
        goal: goal || "Ukjent mål",
        background: background || "Ukjent bakgrunn",
        voice: voice || "Nøytral",
        secrets: secrets || "Ingen kjente hemmeligheter",
        arc: "Gjennomgår forandring i andre akt",
      });
    } else if (tab === "locations") {
      if (!name) return;
      onAddLocation({
        id: `loc-${Date.now()}`,
        name,
        type: role || "Lokasjon",
        geography: background || "Bergen omegn",
        history: "Eldgamle røtter",
        atmosphere: voice || "Mystisk og fuktig",
        rules: rulesText || "Standard fysiske lover",
        notableEvents: "Knyttet til romanens hendelser",
      });
    } else if (tab === "rules") {
      if (!rulesText) return;
      onAddRule({
        id: `rule-${Date.now()}`,
        rule: rulesText,
        category: ruleCat,
        verified: true,
      });
    }

    setName("");
    setRole("");
    setGoal("");
    setBackground("");
    setVoice("");
    setSecrets("");
    setRulesText("");
    setShowAddForm(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6 backdrop-blur-sm animate-in fade-in">
      <div className="flex h-full max-h-[90vh] w-full max-w-5xl flex-col rounded-3xl bg-white text-slate-900 shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/70">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              Bokbibel & Kontinuitetsregister
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Verdensbygging og faktaark
            </h2>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-xl text-slate-500 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Sub-nav tabs */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 px-6 py-3 bg-white gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTab("characters");
                setShowAddForm(false);
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                tab === "characters"
                  ? "bg-indigo-700 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Users className="h-4 w-4" /> Karakterer ({characters.length})
            </button>
            <button
              onClick={() => {
                setTab("locations");
                setShowAddForm(false);
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                tab === "locations"
                  ? "bg-indigo-700 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Globe2 className="h-4 w-4" /> Steder & Geografi ({locations.length})
            </button>
            <button
              onClick={() => {
                setTab("timeline");
                setShowAddForm(false);
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                tab === "timeline"
                  ? "bg-indigo-700 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ListTree className="h-4 w-4" /> Tidslinje ({timeline.length})
            </button>
            <button
              onClick={() => {
                setTab("rules");
                setShowAddForm(false);
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                tab === "rules"
                  ? "bg-indigo-700 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ShieldCheck className="h-4 w-4" /> Kontinuitetsregler ({rules.length})
            </button>
          </div>

          {tab !== "timeline" && (
            <Button
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              className="rounded-xl bg-indigo-700 hover:bg-indigo-800"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {showAddForm ? "Avbryt" : "Legg til"}
            </Button>
          )}
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6">
          {showAddForm && (
            <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5">
              <h3 className="text-base font-bold text-indigo-950 mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-700" />
                {tab === "characters"
                  ? "Ny karakter"
                  : tab === "locations"
                  ? "Nytt sted"
                  : "Ny kontinuitetsregel"}
              </h3>

              {tab === "characters" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Navn</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="F.eks. Johan Vang"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Rolle / Funksjon</Label>
                      <Input
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="F.eks. Oldefar / Vokter"
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Karakterens drivkraft / Mål</Label>
                    <Input
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      placeholder="Hva ønsker karakteren mest av alt?"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Bakgrunn & Stemme</Label>
                    <Textarea
                      value={background}
                      onChange={(e) => setBackground(e.target.value)}
                      placeholder="Beskriv alder, oppvekst, væremåte og særtrekk..."
                      className="rounded-xl min-h-20"
                    />
                  </div>
                  <Button onClick={handleSaveNew} className="rounded-xl bg-indigo-700">
                    Lagre karakter
                  </Button>
                </div>
              )}

              {tab === "locations" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Stedsnavn</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="F.eks. Brønnen i Vågen"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Type</Label>
                      <Input
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="F.eks. Portal, Kammer, Festning"
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Atmosfære & Sanseinntrykk</Label>
                    <Input
                      value={voice}
                      onChange={(e) => setVoice(e.target.value)}
                      placeholder="Lukt, lys, temperatur, materialer..."
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Spesielle regler & Magiske grenser</Label>
                    <Textarea
                      value={rulesText}
                      onChange={(e) => setRulesText(e.target.value)}
                      placeholder="Hva er mulig eller forbudt her?"
                      className="rounded-xl min-h-20"
                    />
                  </div>
                  <Button onClick={handleSaveNew} className="rounded-xl bg-indigo-700">
                    Lagre sted
                  </Button>
                </div>
              )}

              {tab === "rules" && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label>Kategori</Label>
                    <select
                      value={ruleCat}
                      onChange={(e) => setRuleCat(e.target.value as ContinuityRule["category"])}
                      className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                    >
                      <option value="Karakter">Karakter</option>
                      <option value="Verden">Verden</option>
                      <option value="Tidslinje">Tidslinje</option>
                      <option value="Gjenstand">Gjenstand</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Kontinuitetskrav som aldri må brytes</Label>
                    <Textarea
                      value={rulesText}
                      onChange={(e) => setRulesText(e.target.value)}
                      placeholder="F.eks. Mira kjenner ikke til nøkkelens opprinnelse før kapittel 5..."
                      className="rounded-xl min-h-20"
                    />
                  </div>
                  <Button onClick={handleSaveNew} className="rounded-xl bg-indigo-700">
                    Lagre regel
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Tab 1: Characters */}
          {tab === "characters" && (
            <div className="space-y-4">
              {onOpenCharacterDevelopment && (
                <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold">
                      <Sparkles className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Dyp Karakterutvikling & Psykologisk Profil
                      </h4>
                      <p className="text-xs text-slate-600">
                        Spor indre og ytre motivasjoner, relasjonsspenninger og personlighetsforvandling per akt.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => onOpenCharacterDevelopment()}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    Åpne karakterhub
                  </Button>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {characters.map((char) => (
                  <div
                    key={char.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-indigo-300 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-black text-slate-900">{char.name}</h3>
                          <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                            {char.role}
                          </div>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {char.archetype}
                        </span>
                      </div>
                      <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                        {char.background}
                      </p>

                      {/* Motivations & Conflicts if present */}
                      {(char.motivationInternal || char.internalConflict) && (
                        <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                          {char.motivationInternal && (
                            <div>
                              <span className="font-bold text-amber-700">Indre drivkraft:</span>{" "}
                              <span className="text-slate-700">{char.motivationInternal}</span>
                            </div>
                          )}
                          {char.internalConflict && (
                            <div>
                              <span className="font-bold text-rose-700">Indre konflikt:</span>{" "}
                              <span className="text-slate-700">{char.internalConflict}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
                        <div>
                          <span className="font-bold text-slate-800">Mål:</span>{" "}
                          <span className="text-slate-600">{char.goal}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-800">Hemmelighet:</span>{" "}
                          <span className="text-slate-600">{char.secrets}</span>
                        </div>
                        {char.relationships && char.relationships.length > 0 && (
                          <div className="flex items-center gap-1.5 pt-1">
                            <span className="font-bold text-slate-800">Relasjoner:</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700">
                              {char.relationships.length} aktive relasjoner
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {onOpenCharacterDevelopment && (
                      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenCharacterDevelopment(char.id)}
                          className="text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 rounded-xl"
                        >
                          Rediger dyp profil & bue →
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Locations */}
          {tab === "locations" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-indigo-300"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{loc.name}</h3>
                      <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                        {loc.type}
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                    {loc.geography}
                  </p>
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-800">Atmosfære:</span>{" "}
                      <span className="text-slate-600">{loc.atmosphere}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">Regler / Feller:</span>{" "}
                      <span className="text-slate-600">{loc.rules}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Timeline */}
          {tab === "timeline" && (
            <div className="space-y-4">
              {timeline.map((evt, i) => (
                <div
                  key={evt.id}
                  className="relative flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-xs font-black text-indigo-700">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-800">
                        {evt.timeframe}
                      </span>
                      <h4 className="font-bold text-slate-900">{evt.title}</h4>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                      {evt.description}
                    </p>
                    <div className="mt-2 text-xs text-indigo-900 font-medium">
                      Tråd i boken: {evt.plotThreads}
                    </div>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* Tab 4: Rules */}
          {tab === "rules" && (
            <div className="space-y-3">
              {rules.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="mr-2 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 uppercase">
                      {r.category}
                    </span>
                    <span className="text-sm font-medium text-slate-800">{r.rule}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
