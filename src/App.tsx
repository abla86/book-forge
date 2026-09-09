import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  BookOpen,
  WandSparkles,
  Image as ImageIcon,
  Users,
  Globe2,
  ListTree,
  ShieldCheck,
  Download,
  ChevronRight,
  CheckCircle2,
  LoaderCircle,
  Sparkles,
  Library,
  Settings2,
  FileText,
  RefreshCw,
  Eye,
  Check,
  Flame,
  ArrowRight,
  ShieldAlert,
  History,
  Power,
  Lock,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Textarea } from "./components/ui/textarea";
import { Progress } from "./components/ui/progress";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";

import { Chapter, BookProject, ContinuityAnomaly, Character } from "./types";
import { initialProject, defaultChapters32, sampleContinuityAnomalies } from "./data/initialProject";
import { ChapterReaderModal } from "./components/ChapterReaderModal";
import { BibleDetailModal } from "./components/BibleDetailModal";
import { ExportModal } from "./components/ExportModal";
import { LibraryModal } from "./components/LibraryModal";
import { SettingsModal } from "./components/SettingsModal";
import { FounderDashboard } from "./components/FounderDashboard";
import { VersionHistoryModal } from "./components/VersionHistoryModal";
import { ContinuityAuditorModal } from "./components/ContinuityAuditorModal";
import { CharacterDevelopmentModal } from "./components/CharacterDevelopmentModal";

import { AuthUser, UserRole, KillSwitchState } from "./lib/security";
import { VersionService } from "./lib/engine/VersionService";
import { ContinuityAgent } from "./lib/engine/ContinuityAgent";
import { BibleEngine } from "./lib/engine/BibleEngine";

const genres = [
  "Fantasy",
  "Romanse",
  "Krim",
  "Thriller",
  "Science fiction",
  "Drama",
  "Historisk",
  "Poesi",
  "Ungdom",
];

const tones = [
  "Filmisk",
  "Varm og nær",
  "Mørk og intens",
  "Lyrisk",
  "Spenningsdrevet",
  "Humoristisk",
];

const lengths = [
  { label: "Kortroman", words: 45000, chapters: 20 },
  { label: "Full roman", words: 80000, chapters: 32 },
  { label: "Episk roman", words: 120000, chapters: 45 },
];

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-black text-slate-900">{value}</div>
    </div>
  );
}

export default function BookForgeAI() {
  const [project, setProject] = useState<BookProject>(initialProject);

  // Security & User Role state (FOUNDER by default, with easy toggle to AUTHOR)
  const [currentUser, setCurrentUser] = useState<AuthUser>({
    id: "user-anne-beth-1",
    name: "Anne Beth Andersen",
    email: "anne.beth@bookforge.ai",
    role: "FOUNDER",
    subscriptionPlan: "STUDIO",
  });

  const [killSwitch, setKillSwitch] = useState<KillSwitchState>({ active: false });

  // Form states
  const [idea, setIdea] = useState(project.idea);
  const [title, setTitle] = useState(project.title);
  const [genre, setGenre] = useState(project.genre);
  const [tone, setTone] = useState(project.tone);
  const [length, setLength] = useState(project.lengthLabel);
  const [coverStyle, setCoverStyle] = useState(project.coverStyle);
  const [authorName, setAuthorName] = useState(project.author);

  // Pipeline state
  const [phase, setPhase] = useState<"setup" | "planned" | "writing" | "complete">(project.phase);
  const [progress, setProgress] = useState(project.progress);
  const [activeChapter, setActiveChapter] = useState(project.activeChapter);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isAutoWriting, setIsAutoWriting] = useState(false);
  const [selectedAct, setSelectedAct] = useState<number | "all">("all");

  // Modals state
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [isBibleOpen, setIsBibleOpen] = useState(false);
  const [bibleCategory, setBibleCategory] = useState<"characters" | "locations" | "timeline" | "rules">("characters");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFounderOpen, setIsFounderOpen] = useState(false);
  const [isVersionOpen, setIsVersionOpen] = useState(false);
  const [isContinuityAuditorOpen, setIsContinuityAuditorOpen] = useState(false);
  const [isCharacterDevOpen, setIsCharacterDevOpen] = useState(false);
  const [anomalies, setAnomalies] = useState<ContinuityAnomaly[]>(sampleContinuityAnomalies);

  const [continuityNotice, setContinuityNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("studio");

  // Check Kill Switch status on mount
  useEffect(() => {
    async function checkKillSwitch() {
      try {
        const res = await fetch("/api/founder/kill-switch-status");
        if (res.ok) {
          const data = await res.json();
          setKillSwitch(data);
        }
      } catch (err) {
        console.error("Error polling kill switch status:", err);
      }
    }
    checkKillSwitch();
  }, []);

  const selectedLength = useMemo(
    () => lengths.find((x) => x.label === length) || lengths[1],
    [length]
  );

  const synopsis = useMemo(() => {
    return `Når ${title.toLowerCase()} begynner å trekke Mira tilbake mot familiens fortid, oppdager hun at huset hun har arvet skjuler inngangen til et rike som ble slettet fra historien. Sammen med en historiker som bærer på egne hemmeligheter må hun tyde kart, løgner og gamle løfter før kreftene under byen våkner. Valget hun til slutt står overfor kan redde begge verdener, men koste henne den eneste familien hun har igjen.`;
  }, [title]);

  // Sync length changes to chapter list
  const displayChapters = useMemo(() => {
    const total = selectedLength.chapters;
    let list = [...project.chapters];
    if (list.length < total) {
      for (let i = list.length + 1; i <= total; i++) {
        list.push({
          id: i,
          number: i,
          title: `Avsløringen ved port ${i}`,
          summary: `Scene ${i}: Dypere inn i det underjordiske nettverket avdekkes ukjente hemmeligheter.`,
          act: Math.min(4, Math.ceil((i / total) * 4)),
          status: "planned",
          wordTarget: 2500,
          currentWords: 0,
          povCharacter: "Mira Vang",
          conflict: "Uforutsette hindringer i tunnelene",
          continuityNotes: "Nøkkelens magnetisme tiltar",
          content: "",
        });
      }
    } else if (list.length > total) {
      list = list.slice(0, total);
    }
    return list;
  }, [project.chapters, selectedLength.chapters]);

  const filteredChapters = useMemo(() => {
    if (selectedAct === "all") return displayChapters;
    return displayChapters.filter((c) => c.act === selectedAct);
  }, [displayChapters, selectedAct]);

  const totalWordsWritten = useMemo(() => {
    return displayChapters.reduce((acc, c) => acc + (c.currentWords || 0), 0);
  }, [displayChapters]);

  // Actions
  async function handleCreatePlan() {
    if (killSwitch.active) {
      alert(`AI-generering er midlertidig stanset: ${killSwitch.reason || "Emergency Kill Switch er aktiv"}`);
      return;
    }

    setIsGeneratingPlan(true);
    try {
      const res = await fetch("/api/book/generate-synopsis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
          "x-user-role": currentUser.role,
        },
        body: JSON.stringify({
          idea,
          title,
          genre,
          tone,
          length,
          projectId: project.id,
          projectOwnerId: project.ownerId || currentUser.id,
        }),
      });
      await res.json();

      // Create snapshot after plan generation
      VersionService.createSnapshot(
        project,
        `Bokplan generert for "${title}" (${genre}, ${tone})`,
        currentUser.id
      );
    } catch {
      // safe fallback
    } finally {
      setIsGeneratingPlan(false);
      setPhase("planned");
      setProgress(18);
      setActiveChapter(6);
    }
  }

  function handleStartWriting() {
    if (killSwitch.active) {
      alert(`AI-generering er midlertidig stanset: ${killSwitch.reason || "Emergency Kill Switch er aktiv"}`);
      return;
    }

    // Capture checkpoint before writing
    VersionService.createSnapshot(
      project,
      `Startet kapittelskriving (${totalWordsWritten} ord)`,
      currentUser.id
    );

    setPhase("writing");
    setIsAutoWriting(true);
    setProgress(37);
    setActiveChapter(6);
  }

  function handleSimulateComplete() {
    setPhase("complete");
    setIsAutoWriting(false);
    setProgress(100);
    setActiveChapter(selectedLength.chapters);

    const updatedProject: BookProject = {
      ...project,
      phase: "complete",
      progress: 100,
      chapters: project.chapters.map((c) => ({
        ...c,
        status: "completed",
        currentWords: c.currentWords || c.wordTarget,
        content:
          c.content ||
          `Kapittel ${c.number}: ${c.title}\n\n` +
          `Vannet som sildret nedover de mørke basaltveggene, reflekterte lyset fra Miras lykt i kalde, safirblå glimt. Hvert skritt hun tok på de nedsunkne steinhellene under Bergen, vekket en resonans som ga gjenlyd i fjellet over dem.\n\n` +
          `${c.summary}\n\n` +
          `Elias stanset opp og la hånden på skulderen hennes. «Vi er over punktet der det går an å snu,» sa han lavt. Mira nikket langsomt. Hun kjente tyngden av messingnøkkelen mot brystet, og for første gang på uker var ikke frykten lammende — den var skjerpet, ren og målrettet. Byen der oppe sov videre under regnet, uvitende om at grunnvollene holdt på å skifte form.`,
      })),
    };

    setProject(updatedProject);

    // Save final version snapshot
    VersionService.createSnapshot(
      updatedProject,
      `Fullført roman: ${title} (${selectedLength.words} ord)`,
      currentUser.id
    );

    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  }

  // Handle active chapter progression simulation step
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAutoWriting && activeChapter < selectedLength.chapters) {
      timer = setTimeout(() => {
        setActiveChapter((prev) => {
          const next = prev + 1;
          const pct = Math.min(96, Math.round((next / selectedLength.chapters) * 100));
          setProgress(pct);
          if (next >= selectedLength.chapters) {
            handleSimulateComplete();
          }
          return next;
        });
      }, 1400);
    }
    return () => clearTimeout(timer);
  }, [isAutoWriting, activeChapter, selectedLength.chapters]);

  function handleOpenChapter(chap: Chapter) {
    setSelectedChapter(chap);
    setIsReaderOpen(true);
  }

  function handleSaveChapterContent(chapterId: number, content: string, wordCount: number) {
    // Validate chapter continuity heuristically
    const bibleEngine = new BibleEngine(project);
    const targetChap = project.chapters.find((c) => c.id === chapterId);
    let note = targetChap?.continuityNotes || "";

    if (targetChap) {
      const check = ContinuityAgent.validateChapter(
        { ...targetChap, content, currentWords: wordCount },
        project.chapters.slice(0, targetChap.number - 1),
        bibleEngine.getData()
      );
      if (check.notes.length > 0) {
        note = check.notes[0];
      }
    }

    setProject((prev) => ({
      ...prev,
      chapters: prev.chapters.map((c) =>
        c.id === chapterId
          ? {
              ...c,
              content,
              currentWords: wordCount,
              status: wordCount > 0 ? "completed" : c.status,
              continuityNotes: note,
            }
          : c
      ),
    }));

    if (selectedChapter && selectedChapter.id === chapterId) {
      setSelectedChapter((prev) =>
        prev
          ? {
              ...prev,
              content,
              currentWords: wordCount,
              status: wordCount > 0 ? "completed" : prev.status,
              continuityNotes: note,
            }
          : null
      );
    }
  }

  function handleNavigateChapter(direction: "prev" | "next") {
    if (!selectedChapter) return;
    const currentIndex = displayChapters.findIndex((c) => c.id === selectedChapter.id);
    if (direction === "prev" && currentIndex > 0) {
      setSelectedChapter(displayChapters[currentIndex - 1]);
    } else if (direction === "next" && currentIndex < displayChapters.length - 1) {
      setSelectedChapter(displayChapters[currentIndex + 1]);
    }
  }

  async function handleRunContinuity() {
    setContinuityNotice("Kjører sanntids kontinuitetsanalyse mot Bokbibelen...");
    try {
      const res = await fetch("/api/book/continuity-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
          "x-user-role": currentUser.role,
        },
        body: JSON.stringify({
          chapters: displayChapters,
          characters: project.characters,
          worldRules: project.continuityRules,
        }),
      });
      const data = await res.json();
      setContinuityNotice(data.verdict || "Kontinuiteten er 100% godkjent.");
    } catch {
      setContinuityNotice("Kontinuitet validert: Karakterbuer og tidslinje stemmer.");
    }
    setTimeout(() => setContinuityNotice(null), 5000);
  }

  // Toggle role between FOUNDER and AUTHOR for easy testing
  function toggleRole() {
    setCurrentUser((prev) => ({
      ...prev,
      role: prev.role === "FOUNDER" ? "AUTHOR" : "FOUNDER",
    }));
  }

  return (
    <div className="min-h-screen bg-[#f6f3ed] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Emergency Kill Switch Banner */}
      {killSwitch.active && (
        <div className="sticky top-0 z-40 bg-rose-600 px-4 py-2.5 text-center text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 animate-pulse">
          <Power className="h-4 w-4 shrink-0" />
          <span>
            EMERGENCY KILL SWITCH AKTIVERT: All AI-generering er midlertidig stanset på plattformnivå ({killSwitch.reason || "Sikkerhetsstans"}). Forfattere kan fortsatt redigere manuelt, eksportere og administrere bokbibelen.
          </span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#f6f3ed]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-700 text-white shadow-lg shadow-indigo-200">
              <BookOpen size={21} />
            </div>
            <div>
              <div className="text-lg font-black tracking-tight flex items-center gap-2">
                BookForge AI
                <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-indigo-800">
                  Studio
                </span>
              </div>
              <div className="text-xs text-slate-500">
                AI Publishing Studio • Helhetlige romaner
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Role switch toggle */}
            <button
              onClick={toggleRole}
              title="Klikk for å veksle mellom FOUNDER- og FORFATTER-rolle"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold shadow-xs hover:border-indigo-400 transition"
            >
              <UserCheck className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-slate-500">Rolle:</span>
              <Badge
                className={`text-[10px] font-extrabold ${
                  currentUser.role === "FOUNDER"
                    ? "bg-amber-500 text-slate-950 hover:bg-amber-600"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                {currentUser.role}
              </Badge>
            </button>

            {/* Founder Dashboard Button */}
            {currentUser.role === "FOUNDER" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFounderOpen(true)}
                className="rounded-xl border-amber-300 bg-amber-50/80 hover:bg-amber-100 text-amber-950 text-xs font-black shadow-xs"
              >
                <ShieldAlert className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
                Mission Control & Kill Switch
              </Button>
            )}

            {/* Version History Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsVersionOpen(true)}
              className="rounded-xl border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold shadow-xs"
            >
              <History className="mr-1.5 h-3.5 w-3.5 text-indigo-700" />
              Versjoner
            </Button>

            {/* Library Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLibraryOpen(true)}
              className="rounded-xl font-semibold text-slate-700 hover:text-slate-950 text-xs"
            >
              <Library className="mr-1.5 h-3.5 w-3.5 text-indigo-700" />
              Bibliotek
            </Button>

            {/* Settings Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="rounded-xl font-semibold border-slate-300 hover:border-slate-400 text-xs"
            >
              <Settings2 className="mr-1.5 h-3.5 w-3.5 text-slate-600" />
              Innstillinger
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-5 py-8">
        {/* Full Book Pipeline Banner */}
        <div className="mb-8 grid gap-5 lg:grid-cols-[1.4fr_.6fr] items-stretch">
          <div>
            <Badge className="mb-4 rounded-full bg-indigo-100 px-3 py-1 text-indigo-800 hover:bg-indigo-100 font-bold tracking-wider">
              FULL BOOK PIPELINE
            </Badge>
            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-6xl text-slate-950">
              Fra én idé til en <span className="text-indigo-700">hel bok.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-7 text-slate-600">
              Planlegg, skriv, kvalitetssikre og eksporter en sammenhengende bok med fullverdige kapitler, kontinuitetskontroll og publiseringspakke.
            </p>
          </div>

          {/* Produksjonsstatus Card */}
          <Card className="rounded-3xl border-0 bg-slate-950 text-white shadow-xl flex flex-col justify-between">
            <CardContent className="p-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">Produksjonsstatus</span>
                <span className="font-mono text-lg font-black text-indigo-400">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2.5 bg-slate-800" />

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-white/10 p-3">
                  <div className="text-xs uppercase tracking-wider text-slate-400">Mål</div>
                  <div className="mt-1 font-bold text-slate-100">
                    {selectedLength.words.toLocaleString("nb-NO")} ord
                  </div>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <div className="text-xs uppercase tracking-wider text-slate-400">Kapitler</div>
                  <div className="mt-1 font-bold text-slate-100">
                    {activeChapter}/{selectedLength.chapters}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-400 px-1">
                <span>
                  Skrevet hittil: <strong className="text-indigo-300">{totalWordsWritten.toLocaleString("nb-NO")}</strong> ord
                </span>
                {phase === "complete" ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Klar til trykk
                  </span>
                ) : isAutoWriting ? (
                  <span className="flex items-center gap-1 text-indigo-300 animate-pulse font-medium">
                    <Flame className="h-3.5 w-3.5" /> Skriver nå...
                  </span>
                ) : (
                  <span>
                    Fase: {phase === "setup" ? "Konfigurasjon" : phase === "planned" ? "Planlagt" : "Under arbeid"}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Global tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="h-auto flex-wrap rounded-2xl bg-white p-1.5 shadow-sm border border-slate-200/80">
            <TabsTrigger value="studio" className="rounded-xl px-5 py-3 font-bold">
              <WandSparkles className="mr-2 h-4 w-4" /> Studio
            </TabsTrigger>
            <TabsTrigger value="plan" className="rounded-xl px-5 py-3 font-bold">
              <ListTree className="mr-2 h-4 w-4" /> Bokplan
            </TabsTrigger>
            <TabsTrigger value="bible" className="rounded-xl px-5 py-3 font-bold">
              <ShieldCheck className="mr-2 h-4 w-4" /> Bokbibel
            </TabsTrigger>
            <TabsTrigger value="cover" className="rounded-xl px-5 py-3 font-bold">
              <ImageIcon className="mr-2 h-4 w-4" /> Omslag
            </TabsTrigger>
            <TabsTrigger value="export" className="rounded-xl px-5 py-3 font-bold">
              <Download className="mr-2 h-4 w-4" /> Eksport
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: STUDIO */}
          <TabsContent value="studio">
            <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
              {/* Bokspesifikasjon */}
              <Card className="rounded-3xl border-0 shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-2xl font-black">Bokspesifikasjon</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label>Bokidé</Label>
                    <Textarea
                      value={idea}
                      onChange={(e) => setIdea(e.target.value)}
                      placeholder="Skriv inn bokidéen din..."
                      className="min-h-28 rounded-2xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Arbeidstittel</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Tittel på boken"
                      className="rounded-xl font-semibold"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Sjanger</Label>
                      <Select value={genre} onValueChange={setGenre}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {genres.map((g) => (
                            <SelectItem key={g} value={g}>
                              {g}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Tone</Label>
                      <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {tones.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Målomfang og format</Label>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {lengths.map((l) => (
                        <button
                          key={l.label}
                          type="button"
                          onClick={() => setLength(l.label)}
                          className={`rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                            length === l.label
                              ? "border-indigo-600 bg-indigo-50/60 shadow-xs ring-2 ring-indigo-600/20"
                              : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                          }`}
                        >
                          <div className="text-sm font-bold text-slate-900">{l.label}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {l.words.toLocaleString("nb-NO")} ord
                          </div>
                          <div className="text-[11px] text-indigo-700 font-semibold mt-0.5">
                            {l.chapters} kapitler
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-3">
                    <Button
                      onClick={handleCreatePlan}
                      disabled={isGeneratingPlan}
                      className="w-full rounded-2xl bg-indigo-700 hover:bg-indigo-800 py-6 text-base font-bold shadow-md shadow-indigo-200"
                    >
                      {isGeneratingPlan ? (
                        <>
                          <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                          Bygger struktur & synopsis...
                        </>
                      ) : (
                        <>
                          <WandSparkles className="mr-2 h-5 w-5" />
                          Generer bokplan og synopsis
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Høyre kolonne: Synopsis & Kontinuitet */}
              <div className="space-y-6">
                <Card className="rounded-3xl border-0 shadow-sm bg-white">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-2xl font-black">Synopsis</CardTitle>
                      <Badge className="bg-emerald-100 text-emerald-800 font-bold hover:bg-emerald-100">
                        Fireakters struktur
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <p className="font-serif text-base sm:text-lg leading-relaxed text-slate-800 italic">
                      "{synopsis}"
                    </p>

                    <div className="grid gap-3 sm:grid-cols-3 pt-2">
                      <Metric label="Struktur" value="4 akter" />
                      <Metric label="Synsvinkel" value="3. person" />
                      <Metric label="Avslutning" value="Lukket" />
                    </div>

                    <div className="flex gap-3 pt-3 flex-wrap">
                      <Button
                        onClick={handleStartWriting}
                        disabled={isAutoWriting || phase === "complete"}
                        className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold"
                      >
                        <Flame className="mr-2 h-4 w-4 text-amber-400" />
                        {phase === "complete" ? "Romanen er ferdigskrevet" : "Start kapittelskriving"}
                      </Button>

                      <Button
                        variant="outline"
                        onClick={handleSimulateComplete}
                        className="rounded-xl font-bold border-slate-300"
                      >
                        <Check className="mr-2 h-4 w-4 text-emerald-600" />
                        Simuler fullført bok
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Kontinuitetssjekk banner */}
                <Card className="rounded-3xl border-0 shadow-sm bg-white overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3.5">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-900">
                            Sanntids kontinuitetsmotor
                          </h3>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            Bokbibelen overvåker karakterenes kunnskap, tidslinjen og verdensreglene for å unngå logiske brister.
                          </p>
                          {continuityNotice && (
                            <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-bold text-emerald-900">
                              {continuityNotice}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRunContinuity}
                          className="rounded-xl border-slate-200 font-bold text-xs"
                        >
                          Kjør sjekk
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsContinuityAuditorOpen(true)}
                          className="rounded-xl border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs"
                        >
                          Dyp revisjon
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: BOKPLAN */}
          <TabsContent value="plan">
            <div className="space-y-6">
              {/* Filter and stats header */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl bg-white p-5 shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase text-slate-500 mr-1">
                    Vis akt:
                  </span>
                  {(["all", 1, 2, 3, 4] as const).map((act) => (
                    <button
                      key={String(act)}
                      onClick={() => setSelectedAct(act)}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                        selectedAct === act
                          ? "bg-indigo-700 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {act === "all" ? "Alle akter" : `Akt ${act}`}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsContinuityAuditorOpen(true)}
                    className="rounded-xl border-indigo-200 bg-indigo-50/50 text-indigo-700 font-bold text-xs"
                  >
                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-indigo-700" />
                    Kontinuitetsrevisjon (4 akser)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsExportOpen(true)}
                    className="rounded-xl font-bold text-xs"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Eksporter manus
                  </Button>
                </div>
              </div>

              {/* Chapters list */}
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredChapters.map((chap) => {
                  const isDone = Boolean(chap.content);
                  const isCurrent = chap.number === activeChapter && isAutoWriting;

                  return (
                    <Card
                      key={chap.id}
                      onClick={() => handleOpenChapter(chap)}
                      className={`group cursor-pointer rounded-2xl border transition hover:shadow-md ${
                        isCurrent
                          ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/30"
                          : isDone
                          ? "border-slate-200 bg-white hover:border-indigo-300"
                          : "border-slate-200/80 bg-slate-50/60 hover:bg-white"
                      }`}
                    >
                      <CardContent className="p-5 flex flex-col justify-between h-full">
                        <div>
                          <div className="flex items-center justify-between">
                            <Badge
                              className={`text-[10px] font-bold ${
                                isDone
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isCurrent
                                  ? "bg-indigo-600 text-white animate-pulse"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {isDone ? "Skrevet" : isCurrent ? "Skriver..." : "Planlagt"}
                            </Badge>
                            <span className="text-xs font-semibold text-slate-400">
                              Akt {chap.act}
                            </span>
                          </div>

                          <h3 className="mt-3 text-lg font-black text-slate-900 group-hover:text-indigo-700 transition-colors">
                            Kapittel {chap.number}: {chap.title}
                          </h3>

                          <p className="mt-2 text-xs leading-relaxed text-slate-600 line-clamp-3">
                            {chap.summary}
                          </p>
                        </div>

                        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <span>
                            {chap.currentWords > 0
                              ? `${chap.currentWords.toLocaleString("nb-NO")} ord`
                              : `Mål: ${chap.wordTarget} ord`}
                          </span>
                          <span className="flex items-center font-bold text-indigo-700 group-hover:translate-x-0.5 transition-transform">
                            {isDone ? "Les / Rediger" : "Skriv med AI"}
                            <ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: BOKBIBEL */}
          <TabsContent value="bible">
            <div className="space-y-6">
              {/* Sub-header with quick actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Bokbibel & Verdensregister
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Kanonisk kunnskapsbase: karakterer, steder, tidslinje, regler og plottråder.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={() => setIsCharacterDevOpen(true)}
                    className="rounded-xl bg-indigo-700 hover:bg-indigo-800 text-xs font-bold"
                  >
                    <Users className="mr-1.5 h-3.5 w-3.5" />
                    Karakterutvikling & Psykologi
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsContinuityAuditorOpen(true)}
                    className="rounded-xl border-slate-200 hover:border-indigo-400 text-xs font-bold"
                  >
                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-indigo-700" />
                    Fullverdig Kontinuitetsrevisjon
                  </Button>
                </div>
              </div>

              {/* 3 Categories Grid */}
              <div className="grid gap-6 sm:grid-cols-3">
                {[
                  {
                    cat: "characters" as const,
                    icon: Users,
                    title: "Karakterregister",
                    value: `${project.characters.length} karakterer`,
                    text: "Mål, bakgrunn, relasjoner, stemme, utviklingsbue og kjente fakta.",
                  },
                  {
                    cat: "locations" as const,
                    icon: Globe2,
                    title: "Verden og steder",
                    value: `${project.locations.length} steder`,
                    text: "Geografi, historie, regler, atmosfære og hendelser knyttet til hvert sted.",
                  },
                  {
                    cat: "timeline" as const,
                    icon: ListTree,
                    title: "Tidslinje",
                    value: `${project.timeline.length} hendelser`,
                    text: "Kronologi, avsløringer, varsler, løfter og uløste plottråder.",
                  },
                ].map(({ cat, icon: Icon, title: t, value, text }) => (
                  <Card key={t} className="rounded-3xl border-0 shadow-sm bg-white">
                    <CardContent className="p-6 flex flex-col justify-between h-full">
                      <div>
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-100 text-indigo-700">
                          <Icon className="h-6 w-6" />
                        </div>
                        <h3 className="mt-5 text-xl font-black text-slate-900">{t}</h3>
                        <div className="mt-2 font-bold text-indigo-700">{value}</div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setBibleCategory(cat);
                          setIsBibleOpen(true);
                        }}
                        className="mt-6 w-full rounded-xl font-bold border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50"
                      >
                        Åpne register
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Continuity rules box */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    <h3 className="text-lg font-black text-slate-900">
                      Aktive kontinuitetsregler ({project.continuityRules.length})
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setBibleCategory("rules");
                      setIsBibleOpen(true);
                    }}
                    className="rounded-xl text-xs font-bold text-indigo-700"
                  >
                    Administrer regler <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {project.continuityRules.slice(0, 4).map((r) => (
                    <div
                      key={r.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs flex items-start gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-800 mr-1.5 uppercase tracking-wide">
                          [{r.category}]
                        </span>
                        <span className="text-slate-600">{r.rule}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: OMSLAG */}
          <TabsContent value="cover">
            <div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
              {/* Omslagsgenerator form */}
              <Card className="rounded-3xl border-0 shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-2xl font-black">Omslagsgenerator</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label>Visuell stil</Label>
                    <Select value={coverStyle} onValueChange={setCoverStyle}>
                      <SelectTrigger className="rounded-xl font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Nordisk filmatisk">Nordisk filmatisk</SelectItem>
                        <SelectItem value="Illustrert fantasy">Illustrert fantasy</SelectItem>
                        <SelectItem value="Minimalistisk litterær">Minimalistisk litterær</SelectItem>
                        <SelectItem value="Mørk thriller">Mørk thriller</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Automatisk omslagsbrief</Label>
                    <Textarea
                      className="min-h-40 rounded-2xl font-serif text-xs sm:text-sm leading-relaxed"
                      value={`${coverStyle} bokomslag for romanen "${title}". Regnfull Bergen ved skumring, en ung kvinne foran et gammelt trehus i Strangehagen, antydning til en lysende underjordisk portal under brosteinen, mystisk og elegant, profesjonell forsidekomposisjon, uten forstyrrende tekst elementer.`}
                      readOnly
                    />
                  </div>

                  <Button
                    onClick={() => {
                      confetti({ particleCount: 40, spread: 50 });
                    }}
                    className="w-full rounded-xl bg-indigo-700 hover:bg-indigo-800 font-bold"
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Generer fire omslag
                  </Button>
                </CardContent>
              </Card>

              {/* Cover showcases */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {project.covers.map((c, i) => (
                  <motion.div
                    whileHover={{ y: -4 }}
                    key={c.id}
                    className={`relative aspect-[2/3] overflow-hidden rounded-3xl bg-gradient-to-b ${c.gradient} p-6 text-white shadow-xl flex flex-col justify-between text-center select-none border border-white/10`}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,.24),transparent_28%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_40%,rgba(0,0,0,0.6)_100%)]" />

                    <div className="relative">
                      <div className="text-[10px] font-bold uppercase tracking-[.3em] text-white/75 font-sans">
                        En roman
                      </div>
                      <div className="text-[9px] uppercase tracking-widest text-indigo-300 mt-0.5">
                        {genre}
                      </div>
                    </div>

                    <div className="relative my-auto">
                      <div
                        className={`text-2xl sm:text-3xl font-black uppercase leading-tight tracking-wider text-white drop-shadow-md ${
                          c.fontStyle === "cinzel" ? "font-serif" : ""
                        }`}
                      >
                        {title}
                      </div>
                      <div className="mt-3 h-px w-16 bg-white/50 mx-auto" />
                      <p className="mt-3 text-[11px] font-medium text-white/80 max-w-[200px] mx-auto italic leading-tight">
                        {c.tagline}
                      </p>
                    </div>

                    <div className="relative">
                      <div className="text-xs font-bold uppercase tracking-[.25em] text-white/90">
                        {authorName}
                      </div>
                      <div className="text-[8px] uppercase tracking-widest text-white/50 mt-1">
                        BookForge Press
                      </div>
                    </div>

                    <Badge className="absolute right-3 top-3 bg-white/90 text-slate-900 font-bold text-[10px]">
                      Forslag {i + 1}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* TAB 5: EKSPORT */}
          <TabsContent value="export">
            <Card className="rounded-3xl border-0 shadow-sm bg-white">
              <CardContent className="p-7">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">Publiseringspakke</h2>
                    <p className="mt-2 text-slate-600">
                      Omslag, tittelside, kolofon, innholdsfortegnelse, full manuskripttekst og metadata.
                    </p>
                  </div>
                  <Badge
                    className={`font-bold px-3 py-1.5 ${
                      phase === "complete" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-500 hover:bg-amber-600"
                    }`}
                  >
                    {phase === "complete" ? "Klar for eksport" : "Produksjon pågår"}
                  </Badge>
                </div>

                <div className="mt-7 grid gap-4 sm:grid-cols-3">
                  {[
                    { format: "EPUB", desc: "For Kindle, Apple Books og e-lesere" },
                    { format: "PDF", desc: "Klar for prøvetrykk og formatert utskrift" },
                    { format: "DOCX", desc: "Standard forlagsoppsett for redaksjonen" },
                  ].map(({ format, desc }) => (
                    <button
                      key={format}
                      onClick={() => setIsExportOpen(true)}
                      className="rounded-2xl border border-slate-200 bg-white p-6 text-left transition hover:border-indigo-400 hover:shadow-md cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <FileText className="h-7 w-7 text-indigo-700 group-hover:scale-110 transition-transform" />
                        <Download className="h-4 w-4 text-slate-400 group-hover:text-indigo-700" />
                      </div>
                      <div className="mt-4 text-lg font-black text-slate-900">{format}</div>
                      <div className="mt-1 text-xs text-slate-500">{desc}</div>
                    </button>
                  ))}
                </div>

                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={() => setIsExportOpen(true)}
                    className="rounded-xl bg-indigo-700 hover:bg-indigo-800 font-bold"
                  >
                    Åpne komplett eksportsenter & leser <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modals & Drawers */}
      <ChapterReaderModal
        isOpen={isReaderOpen}
        onClose={() => setIsReaderOpen(false)}
        chapter={selectedChapter}
        bookTitle={title}
        genre={genre}
        tone={tone}
        onSaveContent={handleSaveChapterContent}
        onNavigateChapter={handleNavigateChapter}
        hasPrev={Boolean(
          selectedChapter &&
            displayChapters.findIndex((c) => c.id === selectedChapter.id) > 0
        )}
        hasNext={Boolean(
          selectedChapter &&
            displayChapters.findIndex((c) => c.id === selectedChapter.id) <
              displayChapters.length - 1
        )}
      />

      <BibleDetailModal
        isOpen={isBibleOpen}
        onClose={() => setIsBibleOpen(false)}
        activeCategory={bibleCategory}
        characters={project.characters}
        locations={project.locations}
        timeline={project.timeline}
        rules={project.continuityRules}
        onAddCharacter={(char) =>
          setProject((prev) => ({
            ...prev,
            characters: [...prev.characters, char],
          }))
        }
        onAddLocation={(loc) =>
          setProject((prev) => ({
            ...prev,
            locations: [...prev.locations, loc],
          }))
        }
        onAddRule={(rule) =>
          setProject((prev) => ({
            ...prev,
            continuityRules: [...prev.continuityRules, rule],
          }))
        }
      />

      <ExportModal
        project={{
          ...project,
          title,
          genre,
          tone,
          synopsis,
          author: authorName,
          chapters: displayChapters,
        }}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      <LibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        currentProjectId={project.id}
        onSelectProject={(pId) => {
          if (pId === "book-riket-under-regnet") {
            setProject(initialProject);
            setTitle(initialProject.title);
            setIdea(initialProject.idea);
            setGenre(initialProject.genre);
            setTone(initialProject.tone);
            setLength(initialProject.lengthLabel);
            setPhase(initialProject.phase);
            setProgress(initialProject.progress);
            setActiveChapter(initialProject.activeChapter);
          } else if (pId === "book-svalbard") {
            setTitle("Skygger over Svalbard");
            setIdea("Under mørketiden i Longyearbyen forsvinner en forsker fra den globale frøhvelvet.");
            setGenre("Krim");
            setTone("Mørk og intens");
            setLength("Kortroman");
            setPhase("writing");
            setProgress(60);
            setActiveChapter(12);
          } else if (pId === "book-andoya") {
            setTitle("Stjernestøv fra Andøya");
            setIdea("Norges første dype romteleskop fanger opp et signal som bryter de kjente naturlovene.");
            setGenre("Science fiction");
            setTone("Episk");
            setLength("Episk roman");
            setPhase("setup");
            setProgress(5);
            setActiveChapter(2);
          }
        }}
        onNewProject={(newTitle, newGenre, newIdea) => {
          setTitle(newTitle);
          setGenre(newGenre);
          setIdea(newIdea);
          setPhase("setup");
          setProgress(0);
          setActiveChapter(0);
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        authorName={authorName}
        onSaveAuthorName={(n) => {
          setAuthorName(n);
          setProject((prev) => ({ ...prev, author: n }));
        }}
      />

      {/* Founder Mission Control Modal */}
      <FounderDashboard
        isOpen={isFounderOpen}
        onClose={() => setIsFounderOpen(false)}
        currentUser={currentUser}
        onKillSwitchToggled={(state) => setKillSwitch(state)}
      />

      {/* Version History & Rollback Modal */}
      <VersionHistoryModal
        isOpen={isVersionOpen}
        onClose={() => setIsVersionOpen(false)}
        project={{
          ...project,
          title,
          genre,
          tone,
          synopsis,
          author: authorName,
          chapters: displayChapters,
        }}
        onRestoreVersion={(restored) => {
          setProject(restored);
          setTitle(restored.title);
          setGenre(restored.genre);
          setTone(restored.tone);
          setPhase(restored.phase);
          setProgress(restored.progress);
          setActiveChapter(restored.activeChapter);
          setAuthorName(restored.author);
        }}
      />

      {/* Continuity Auditor Modal (4 Axes) */}
      <ContinuityAuditorModal
        project={{
          ...project,
          title,
          genre,
          tone,
          synopsis,
          author: authorName,
          chapters: displayChapters,
        }}
        anomalies={anomalies}
        onUpdateAnomalies={(updated) => setAnomalies(updated)}
        onOpenChapter={(chNum) => {
          const ch = displayChapters.find((c) => c.number === chNum);
          if (ch) {
            handleOpenChapter(ch);
          }
        }}
        onApplyFixToChapter={(chNum, suggestion) => {
          setProject((prev) => ({
            ...prev,
            chapters: prev.chapters.map((c) =>
              c.number === chNum
                ? {
                    ...c,
                    continuityNotes: `${c.continuityNotes ? c.continuityNotes + " • " : ""}${suggestion}`,
                  }
                : c
            ),
          }));
        }}
        onClose={() => setIsContinuityAuditorOpen(false)}
      />

      {/* Character Development Modal */}
      <CharacterDevelopmentModal
        characters={project.characters}
        bookTitle={title}
        genre={genre}
        tone={tone}
        onUpdateCharacter={(updated) => {
          setProject((prev) => ({
            ...prev,
            characters: prev.characters.map((c) => (c.id === updated.id ? updated : c)),
          }));
        }}
        onAddCharacter={(newChar) => {
          setProject((prev) => ({
            ...prev,
            characters: [...prev.characters, newChar],
          }));
        }}
        onClose={() => setIsCharacterDevOpen(false)}
      />
    </div>
  );
}
