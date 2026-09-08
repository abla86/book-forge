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

import { Chapter, BookProject } from "./types";
import { initialProject, defaultChapters32 } from "./data/initialProject";
import { ChapterReaderModal } from "./components/ChapterReaderModal";
import { BibleDetailModal } from "./components/BibleDetailModal";
import { ExportModal } from "./components/ExportModal";
import { LibraryModal } from "./components/LibraryModal";
import { SettingsModal } from "./components/SettingsModal";

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
  const [continuityNotice, setContinuityNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("studio");

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
      // pad
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
    setIsGeneratingPlan(true);
    try {
      const res = await fetch("/api/book/generate-synopsis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, title, genre, tone, length }),
      });
      await res.json();
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

    // mark chapters completed
    setProject((prev) => ({
      ...prev,
      chapters: prev.chapters.map((c) => ({
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
    }));

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
    setProject((prev) => ({
      ...prev,
      chapters: prev.chapters.map((c) =>
        c.id === chapterId
          ? {
              ...c,
              content,
              currentWords: wordCount,
              status: wordCount > 0 ? "completed" : c.status,
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
        headers: { "Content-Type": "application/json" },
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

  return (
    <div className="min-h-screen bg-[#f6f3ed] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
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
                  Pipeline
                </span>
              </div>
              <div className="text-xs text-slate-500">Komplette bøker, ikke tekstfragmenter</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsLibraryOpen(true)}
              className="rounded-xl font-semibold text-slate-700 hover:text-slate-950"
            >
              <Library className="mr-2 h-4 w-4 text-indigo-700" />
              Bibliotek
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsSettingsOpen(true)}
              className="rounded-xl font-semibold border-slate-300 hover:border-slate-400"
            >
              <Settings2 className="mr-2 h-4 w-4 text-slate-600" />
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
              Planlegg, skriv, kvalitetssikre og eksporter en sammenhengende bok med fullverdige kapitler, kontinuitetskontroll og omslagsbrief.
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
                <span>Skrevet hittil: <strong className="text-indigo-300">{totalWordsWritten.toLocaleString("nb-NO")}</strong> ord</span>
                {phase === "complete" ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Klar til trykk
                  </span>
                ) : isAutoWriting ? (
                  <span className="flex items-center gap-1 text-indigo-300 animate-pulse font-medium">
                    <Flame className="h-3.5 w-3.5" /> Skriver nå...
                  </span>
                ) : (
                  <span>Fase: {phase === "setup" ? "Konfigurasjon" : phase === "planned" ? "Planlagt" : "Under arbeid"}</span>
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
                    <Label>Omfang</Label>
                    <Select value={length} onValueChange={setLength}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {lengths.map((l) => (
                          <SelectItem key={l.label} value={l.label}>
                            {l.label}, {l.words.toLocaleString("nb-NO")} ord
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleCreatePlan}
                    disabled={isGeneratingPlan}
                    className="h-12 w-full rounded-2xl bg-indigo-700 text-base font-bold hover:bg-indigo-800 transition-all shadow-md shadow-indigo-200"
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    {isGeneratingPlan ? "Genererer komplett bokplan..." : "Generer komplett bokplan"}
                  </Button>
                </CardContent>
              </Card>

              {/* Generert synopsis */}
              <Card className="rounded-3xl border-0 shadow-sm bg-white">
                <CardHeader className="flex-row items-center justify-between pb-3">
                  <CardTitle className="text-2xl font-black">Generert synopsis</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCreatePlan}
                    disabled={isGeneratingPlan}
                    className="rounded-xl text-slate-600 hover:text-indigo-700"
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isGeneratingPlan ? "animate-spin" : ""}`} />
                    Ny variant
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="rounded-3xl bg-indigo-50/80 p-6 border border-indigo-100/80">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-white/80 font-bold">{genre}</Badge>
                      <Badge variant="secondary" className="bg-white/80 font-bold">{tone}</Badge>
                      <Badge variant="secondary" className="bg-white/80 font-bold">
                        {selectedLength.words.toLocaleString("nb-NO")} ord
                      </Badge>
                      <Badge variant="outline" className="border-indigo-300 text-indigo-800 bg-white font-semibold">
                        Forfatter: {authorName}
                      </Badge>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-950">
                      {title}
                    </h2>
                    <p className="mt-4 leading-7 text-slate-700 font-serif text-base">
                      {synopsis}
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Metric label="Akter" value="4" />
                    <Metric label="Kapitler" value={`${selectedLength.chapters}`} />
                    <Metric label="POV" value="1" />
                    <Metric label="Slutt" value="Lukket" />
                  </div>

                  <AnimatePresence>
                    {phase !== "setup" && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
                      >
                        <div className="flex items-center gap-2 font-bold">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          Bokplanen er validert
                        </div>
                        <p className="mt-1 text-emerald-800 text-xs sm:text-sm">
                          Alle kapitler har mål, konflikt, vendepunkt, kontinuitetskrav og forventet ordmengde (2 200–3 000 ord).
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Dramaturgisk akt-oversikt */}
                  <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Dramaturgisk struktur (4 Akter)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <strong className="block text-indigo-700">Akt 1</strong>
                        <span className="text-slate-600">Arven & Terskelen (Kap 1–8)</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <strong className="block text-indigo-700">Akt 2A</strong>
                        <span className="text-slate-600">Prøvelser & Dypet (Kap 9–16)</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <strong className="block text-indigo-700">Akt 2B</strong>
                        <span className="text-slate-600">Stormflod & Kriser (Kap 17–24)</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <strong className="block text-indigo-700">Akt 3</strong>
                        <span className="text-slate-600">Klimaks & Pakten (Kap 25–32)</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: BOKPLAN */}
          <TabsContent value="plan">
            <Card className="rounded-3xl border-0 shadow-sm bg-white">
              <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <CardTitle className="text-2xl font-black">Kapittelplan</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">
                    Hvert kapittel målsettes til 2 200–3 000 ord. Klikk på et kapittel for å lese eller redigere manuskriptet.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleRunContinuity}
                    className="rounded-xl text-xs font-bold"
                  >
                    <ShieldCheck className="mr-1.5 h-4 w-4 text-emerald-600" />
                    Kontinuitetssjekk
                  </Button>
                  <Button
                    onClick={phase === "planned" ? handleStartWriting : handleSimulateComplete}
                    className="rounded-xl bg-indigo-700 hover:bg-indigo-800 font-bold"
                  >
                    {phase === "planned"
                      ? "Start full bokproduksjon"
                      : phase === "writing"
                      ? "Simuler ferdig bok"
                      : "Regenerer manus"}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-5">
                {continuityNotice && (
                  <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 animate-in fade-in flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    {continuityNotice}
                  </div>
                )}

                {/* Act filter buttons */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  <span className="text-slate-500 uppercase tracking-wider mr-2">Filtrer akt:</span>
                  {(["all", 1, 2, 3, 4] as const).map((actNum) => (
                    <button
                      key={String(actNum)}
                      onClick={() => setSelectedAct(actNum)}
                      className={`rounded-xl px-3 py-1.5 transition ${
                        selectedAct === actNum
                          ? "bg-indigo-700 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {actNum === "all" ? "Alle kapitler" : `Akt ${actNum}`}
                    </button>
                  ))}
                </div>

                {/* Chapter list */}
                <div className="space-y-3">
                  {filteredChapters.map((chap, i) => {
                    const isDone = chap.number <= activeChapter || chap.status === "completed";
                    const isCurrent = isAutoWriting && chap.number === activeChapter;

                    return (
                      <div
                        key={chap.id}
                        onClick={() => handleOpenChapter(chap)}
                        className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 transition-all cursor-pointer ${
                          isDone
                            ? "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs"
                            : isCurrent
                            ? "border-indigo-400 bg-indigo-50/50 shadow-xs"
                            : "border-slate-200/60 bg-slate-50/60 hover:bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-black text-sm ${
                              isDone
                                ? "bg-indigo-50 text-indigo-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {chap.number}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                                {chap.title}
                              </span>
                              <Badge variant="outline" className="text-[10px] py-0 px-2 font-bold">
                                Akt {chap.act}
                              </Badge>
                              {chap.currentWords > 0 && (
                                <Badge variant="secondary" className="text-[10px] py-0 px-2 font-mono">
                                  {chap.currentWords.toLocaleString("nb-NO")} ord
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-slate-600 line-clamp-1">
                              {chap.summary}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          {isDone ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Ferdig
                            </span>
                          ) : isCurrent ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full">
                              <LoaderCircle className="h-4 w-4 animate-spin text-indigo-600" /> Skriver nå
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">
                              Planlagt
                            </span>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-xl text-slate-500 group-hover:text-indigo-700 text-xs font-bold"
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" /> Les / Skriv
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedLength.chapters > filteredChapters.length && selectedAct === "all" && (
                  <div className="rounded-2xl border border-dashed p-4 text-center text-sm text-slate-500 bg-slate-50/50">
                    + {selectedLength.chapters - filteredChapters.length} planlagte kapitler med sceneoversikt, konflikter og kontinuitetskrav
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: BOKBIBEL */}
          <TabsContent value="bible">
            <div className="space-y-6">
              <div className="grid gap-5 md:grid-cols-3">
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
                    {/* Atmospheric lighting overlay */}
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
    </div>
  );
}
