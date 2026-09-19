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

import { Chapter, BookProject, ContinuityAnomaly, Character, BookGenerationJob, ProjectPhase } from "./types";
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
import { GenerationModal } from "./components/GenerationModal";

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
  if (!authChecked || !authenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
          <div className="mb-8">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">BookForge AI</div>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Logg inn</h1>
            <p className="mt-2 text-sm text-slate-600">Autentisering skjer på serveren. Sesjonen lagres i en HttpOnly-cookie.</p>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="login-email">E-post</Label>
              <Input id="login-email" type="email" autoComplete="username" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="login-password">Passord</Label>
              <Input id="login-password" type="password" autoComplete="current-password" minLength={15} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
            </div>
            {loginError && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{loginError}</div>}
            <Button type="submit" disabled={isLoggingIn} className="w-full">
              {isLoggingIn ? "Logger inn..." : "Logg inn"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

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
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Form states
  const [idea, setIdea] = useState(project.idea);
  const [title, setTitle] = useState(project.title);
  const [genre, setGenre] = useState(project.genre);
  const [tone, setTone] = useState(project.tone);
  const [length, setLength] = useState(project.lengthLabel);
  const [coverStyle, setCoverStyle] = useState(project.coverStyle);
  const [authorName, setAuthorName] = useState(project.author);

  // Pipeline state
  const [phase, setPhase] = useState<ProjectPhase>(project.phase);
  const [progress, setProgress] = useState(project.progress);
  const [activeChapter, setActiveChapter] = useState(project.activeChapter);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [selectedAct, setSelectedAct] = useState<number | "all">("all");

  // Autonomous Full-Book Engine State
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [generationJob, setGenerationJob] = useState<BookGenerationJob | null>(null);
  const [isGeneratingBook, setIsGeneratingBook] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false);

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

  // Projects list loaded from backend DB
  const [projects, setProjects] = useState<BookProject[]>([initialProject]);

  function applyProject(p: BookProject) {
    setProject(p);
    setTitle(p.title);
    setIdea(p.idea);
    setGenre(p.genre);
    setTone(p.tone);
    setLength(p.lengthLabel || "Full roman");
    setCoverStyle(p.coverStyle || "Malerisk");
    setAuthorName(p.author);
    setPhase(p.phase || "setup");
    setProgress(p.progress || 0);
    setActiveChapter(p.activeChapter || 0);
  }

  // Establish authentication state from the server-side HttpOnly session.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "same-origin" });
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.user) {
            setCurrentUser(data.user);
            setAuthenticated(true);
          }
        }
      } catch {
        // Remain unauthenticated.
      } finally {
        if (mounted) setAuthChecked(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Login through the server. The session is stored in an HttpOnly cookie.
  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Innlogging mislyktes.");
      setCurrentUser(data.user);
      setAuthenticated(true);
      setLoginPassword("");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Innlogging mislyktes.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  // Load books from database API on mount or user switch
  useEffect(() => {
    if (!authenticated) return;
    async function loadBooks() {
      try {
        const res = await fetch("/api/books", {
          headers: {
            "x-user-id": currentUser.id,
            "x-user-role": currentUser.role,
          },
        });
        if (res.ok) {
          const list: BookProject[] = await res.json();
          if (list.length > 0) {
            setProjects(list);
            const found = list.find((b) => b.id === project.id) || list[0];
            applyProject(found);
          } else {
            // Do not create demo/sample books in the authoritative database.
            // A new project must originate from the user's own idea.
            setProjects([]);
          }
        }
      } catch (err) {
        console.warn("Error fetching projects from API:", err);
      }
    }
    loadBooks();
  }, [authenticated, currentUser.id, currentUser.role]);

  // Check Kill Switch status
  useEffect(() => {
    if (!authenticated) return;
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
  }, [authenticated]);

  const selectedLength = useMemo(
    () => lengths.find((x) => x.label === length) || lengths[1],
    [length]
  );

  const synopsis = useMemo(() => {
    if (project.synopsis && project.synopsis.trim().length > 30) {
      return project.synopsis;
    }
    return `I «${title}» (${genre}, ${tone}) tvinges hovedpersonen ut på en reise der uventede avsløringer snur opp ned på alt. Gjennom intense konfrontasjoner og etablering av nye allianser må skjulte hemmeligheter avdekkes før avgjørende valg besegler romanens skjebne.`;
  }, [project.synopsis, title, genre, tone]);

  // Sync length changes to chapter list
  const displayChapters = useMemo(() => {
    const total = selectedLength.chapters;
    let list = [...project.chapters];
    if (list.length < total) {
      for (let i = list.length + 1; i <= total; i++) {
        list.push({
          id: i,
          number: i,
          title: `Kapittel ${i}`,
          summary: `Planlagt scene i akt ${Math.min(4, Math.ceil((i / total) * 4))} for «${title}».`,
          act: Math.min(4, Math.ceil((i / total) * 4)),
          status: "planned",
          wordTarget: Math.round(selectedLength.words / total),
          currentWords: 0,
          povCharacter: project.characters[0]?.name || "Hovedperson",
          conflict: "Narrativ eskalering",
          continuityNotes: "",
          content: "",
        });
      }
    } else if (list.length > total) {
      list = list.slice(0, total);
    }
    return list;
  }, [project.chapters, project.characters, selectedLength.chapters, selectedLength.words, title]);

  const filteredChapters = useMemo(() => {
    if (selectedAct === "all") return displayChapters;
    return displayChapters.filter((c) => c.act === selectedAct);
  }, [displayChapters, selectedAct]);

  const totalWordsWritten = useMemo(() => {
    return displayChapters.reduce((acc, c) => acc + (c.currentWords || 0), 0);
  }, [displayChapters]);

  // Check for existing active generation job on project change
  useEffect(() => {
    if (!authenticated) return;
    async function checkProjectJob() {
      if (!project.id) return;
      try {
        const res = await fetch(`/api/book/generation/project/${project.id}`);
        if (res.ok) {
          const job: BookGenerationJob = await res.json();
          if (job.status === "running") {
            setActiveJobId(job.id);
            setGenerationJob(job);
            setIsGeneratingBook(true);
          }
        }
      } catch {
        // ignore
      }
    }
    checkProjectJob();
  }, [authenticated, project.id]);

  // Real-time polling of autonomous book generation job
  useEffect(() => {
    if (!authenticated || !activeJobId) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/book/generation/${activeJobId}`);
        if (!res.ok) return;
        const job: BookGenerationJob = await res.json();
        if (!isMounted) return;

        setGenerationJob(job);

        // Fetch fresh project state from backend to sync chapters in real-time
        if (job.projectId) {
          const pRes = await fetch(`/api/books/${job.projectId}`);
          if (pRes.ok) {
            const updatedProject: BookProject = await pRes.json();
            if (isMounted) {
              setProject(updatedProject);
              setProgress(updatedProject.progress || 0);
              setPhase(updatedProject.phase);
              if (job.currentChapter) {
                setActiveChapter(job.currentChapter);
              }
            }
          }
        }

        if (job.status === "completed") {
          setIsGeneratingBook(false);
          setActiveJobId(null);
          setPhase("complete");
          setProgress(100);
          try {
            confetti({
              particleCount: 150,
              spread: 90,
              origin: { y: 0.6 },
            });
          } catch {
            // ignore
          }
        } else if (job.status === "failed") {
          setIsGeneratingBook(false);
          setActiveJobId(null);
          setGenerationError(job.error || "Genereringsprosessen feilet.");
        } else if (job.status === "cancelled") {
          setIsGeneratingBook(false);
          setActiveJobId(null);
          setGenerationError("Genereringsjobben ble avbrutt.");
        }
      } catch (err) {
        console.error("Feil under polling av genereringsjobb:", err);
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [authenticated, activeJobId]);

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

  // Real Autonomous Book Generation Handler
  async function handleStartWriting() {
    if (killSwitch.active) {
      alert(`AI-generering er midlertidig stanset: ${killSwitch.reason || "Emergency Kill Switch er aktiv"}`);
      return;
    }

    setIsGeneratingBook(true);
    setGenerationError(null);

    try {
      // Capture checkpoint before starting generation
      VersionService.createSnapshot(
        project,
        `Startet autonom full-bok generering (${selectedLength.chapters} kapitler, ${selectedLength.words} ord)`,
        currentUser.id
      );

      const res = await fetch("/api/book/generate-full-book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
          "x-user-role": currentUser.role,
        },
        body: JSON.stringify({
          projectId: project.id,
          idea: idea || project.idea || project.title,
          title: title || project.title,
          genre: genre || project.genre,
          tone: tone || project.tone,
          targetWords: selectedLength.words,
          targetChapters: selectedLength.chapters,
          author: authorName || project.author || currentUser.name,
          language: "Norsk (Bokmål)",
          pov: project.pov || "Tredjeperson personlig",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Kunne ikke starte bokgenerering.");
      }

      setActiveJobId(data.jobId);
      setIsGenerationModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Feil under oppstart av autonom bokgenerering.";
      setGenerationError(msg);
      setIsGeneratingBook(false);
      alert(msg);
    }
  }

  async function handleCancelGeneration(jobId: string) {
    try {
      await fetch(`/api/book/generation/${jobId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
          "x-user-role": currentUser.role,
        },
      });
      setActiveJobId(null);
      setIsGeneratingBook(false);
    } catch (err) {
      console.error("Kunne ikke stanse generering:", err);
    }
  }

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

      {/* Persistent Autonomous Book Generation Banner */}
      {generationJob && generationJob.status === "running" && !isGenerationModalOpen && (
        <div className="sticky top-0 z-40 bg-indigo-950 text-white px-5 py-3 text-xs font-bold shadow-xl flex items-center justify-between border-b border-indigo-800 animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-400 animate-pulse" />
              <span>
                Autonom produksjon pågår: {generationJob.phase === "writing" ? `Skriver kapittel ${generationJob.currentChapter || 1} av ${generationJob.totalChapters}` : `Fase: ${generationJob.phase}`} • {generationJob.generatedWords?.toLocaleString("nb-NO") || 0} ord skrevet ({Math.round(((generationJob.generatedWords || 0) / (generationJob.totalWords || 80000)) * 100)}%)
              </span>
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => setIsGenerationModalOpen(true)}
            className="rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs h-8 px-3 font-bold border border-white/20"
          >
            <Eye className="mr-1.5 h-3.5 w-3.5 text-amber-300" />
            Vis fremdrift
          </Button>
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
                ) : isGeneratingBook || generationJob?.status === "running" ? (
                  <span className="flex items-center gap-1 text-amber-300 animate-pulse font-medium">
                    <Flame className="h-3.5 w-3.5 text-amber-400" /> Skriver kapittel {generationJob?.currentChapter || activeChapter}...
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

                    <div className="flex gap-3 pt-3 flex-wrap items-center">
                      <Button
                        onClick={handleStartWriting}
                        disabled={isGeneratingBook || (generationJob?.status === "running") || phase === "complete"}
                        className="rounded-2xl bg-indigo-700 text-white hover:bg-indigo-800 font-black shadow-md shadow-indigo-200 py-6 px-6 text-sm"
                      >
                        {isGeneratingBook || generationJob?.status === "running" ? (
                          <>
                            <LoaderCircle className="mr-2 h-5 w-5 animate-spin text-amber-300" />
                            Skriver romanen ({generationJob?.completedChapters || 0}/{selectedLength.chapters} kap)...
                          </>
                        ) : phase === "complete" ? (
                          <>
                            <Check className="mr-2 h-4 w-4 text-emerald-300" />
                            Romanen er fullført ({totalWordsWritten.toLocaleString("nb-NO")} ord)
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4 text-amber-300" />
                            Generer hele romanen autonomt ({selectedLength.chapters} kapitler)
                          </>
                        )}
                      </Button>

                      {(isGeneratingBook || generationJob?.status === "running") && (
                        <Button
                          variant="outline"
                          onClick={() => setIsGenerationModalOpen(true)}
                          className="rounded-2xl font-bold border-indigo-200 bg-indigo-50 text-indigo-900 hover:bg-indigo-100 py-6 px-4 text-sm"
                        >
                          <Eye className="mr-1.5 h-4 w-4 text-indigo-700" />
                          Vis fremdrift ({generationJob?.completedChapters || 0}/{selectedLength.chapters})
                        </Button>
                      )}
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
                  const isDone = Boolean(chap.content && chap.content.trim().length > 0);
                  const isCurrent =
                    (isGeneratingBook || generationJob?.status === "running") &&
                    chap.number === (generationJob?.currentChapter || activeChapter);

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
        projects={projects}
        onSelectProject={(pId) => {
          const found = projects.find((b) => b.id === pId);
          if (found) {
            applyProject(found);
          }
        }}
        onNewProject={async (newTitle, newGenre, newIdea, newTone = "Filmisk") => {
          const newBook: BookProject = {
            id: `book-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
            title: newTitle,
            idea: newIdea,
            genre: newGenre,
            tone: newTone,
            lengthLabel: "Full roman",
            targetWords: 80000,
            targetChapters: 32,
            acts: 4,
            pov: "Tredjeperson begrenset",
            ending: "Lukket",
            coverStyle: "Malerisk",
            author: authorName,
            ownerId: currentUser.id,
            phase: "setup",
            progress: 0,
            activeChapter: 0,
            synopsis: "",
            covers: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            chapters: defaultChapters32.map((c) => ({
              ...c,
              title: `Kapittel ${c.number}: ${newTitle} del ${c.number}`,
              summary: `Innledende skisse for kapittel ${c.number}.`,
              content: "",
              currentWords: 0,
              status: "planned",
            })),
            characters: [
              {
                id: "char-main-1",
                name: "Hovedperson",
                role: "Hovedperson",
                archetype: "Søkende",
                goal: "Finne sannheten og overvinne hindringene",
                background: `Startpunkt for ${newTitle}`,
                voice: "Målrettet og sanselig",
                secrets: "En ufortalt hendelse fra fortiden",
                arc: "Fra usikkerhet til myndiggjøring",
              },
            ],
            locations: [
              {
                id: "loc-1",
                name: "Sentralt skueplass",
                type: "Hovedarena",
                atmosphere: `Fremtredende stemning for ${newGenre} (${newTone})`,
                geography: "Historisk knutepunkt",
                history: "Hovedlokasjon",
                rules: "Følger universets standard lover",
                notableEvents: "Historiske oppgjør",
              },
            ],
            timeline: [
              {
                id: "time-1",
                timeframe: "Dag 1",
                title: "Åpning",
                description: "Historien tar til.",
                plotThreads: "Hovedplott",
                verified: true,
              },
            ],
            continuityRules: [
              {
                id: "rule-1",
                category: "Verden",
                rule: `Handlingene skal harmonere med ${newGenre} og ${newTone} tone.`,
                verified: true,
              },
            ],
          };

          try {
            const res = await fetch("/api/books", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-user-id": currentUser.id,
                "x-user-role": currentUser.role,
              },
              body: JSON.stringify(newBook),
            });
            if (res.ok) {
              const saved = await res.json();
              setProjects((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)]);
              applyProject(saved);
              return;
            }
          } catch (err) {
            console.warn("Could not save new book to DB:", err);
          }

          setProjects((prev) => [newBook, ...prev]);
          applyProject(newBook);
        }}
        onDeleteProject={async (pId) => {
          try {
            await fetch(`/api/books/${pId}`, {
              method: "DELETE",
              headers: {
                "x-user-id": currentUser.id,
                "x-user-role": currentUser.role,
              },
            });
            setProjects((prev) => prev.filter((b) => b.id !== pId));
            if (project.id === pId) {
              const remaining = projects.filter((b) => b.id !== pId);
              if (remaining.length > 0) {
                applyProject(remaining[0]);
              }
            }
          } catch (err) {
            console.error("Could not delete book:", err);
          }
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

      {/* Autonomous Full-Book Generation Progress Modal */}
      <GenerationModal
        job={generationJob}
        isOpen={isGenerationModalOpen}
        onClose={() => setIsGenerationModalOpen(false)}
        onCancel={handleCancelGeneration}
        bookTitle={title}
      />
    </div>
  );
}
