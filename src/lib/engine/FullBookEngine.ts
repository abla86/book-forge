// =====================================================================
// BookForge AI - FullBookEngine (Autonomous Novel Generation Orchestrator)
// Real, Non-Simulated, Full-Stack Autonomous Pipeline:
// Idea -> Specification -> Bible -> Blueprints -> Full Chapters
// (with Continuation Loop) -> Continuity Audit -> Verification -> Export
// =====================================================================

import { GoogleGenAI } from "@google/genai";
import {
  BookProject,
  BookSpecification,
  ChapterBlueprint,
  BookGenerationJob,
  ChapterGenerationState,
  Chapter,
} from "../../types";
import { AuthUser, AuditLogger, RateLimiter, EmergencyKillSwitch } from "../security";
import { CostGuard } from "./CostGuard";
import { BibleEngine } from "./BibleEngine";
import { ContinuityAgent } from "./ContinuityAgent";
import { VersionService } from "./VersionService";
import { db } from "../db";

export interface FullBookGenerationParams {
  projectId: string;
  idea: string;
  title?: string;
  author?: string;
  genre?: string;
  subgenre?: string;
  tone?: string;
  audience?: string;
  language?: string;
  pov?: string;
  targetWords?: number;
  targetChapters?: number;
  acts?: number;
  user: AuthUser;
}

export function countWords(text: string): number {
  if (!text || typeof text !== "string") return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

export class FullBookEngineService {
  private activeJobs: Map<
    string,
    {
      cancelRequested: boolean;
      job: BookGenerationJob;
    }
  > = new Map();

  /**
   * Helper to execute Gemini with exponential backoff, jitter, and kill switch checks.
   */
  private async callGeminiWithRetry(
    ai: GoogleGenAI,
    model: string,
    prompt: string,
    systemInstruction?: string,
    maxRetries = 3
  ): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
    let attempt = 0;

    while (attempt <= maxRetries) {
      if (EmergencyKillSwitch.getState().active) {
        throw new Error("Emergency Kill Switch er aktivert. AI-generering avbrutt.");
      }

      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: systemInstruction
            ? {
                systemInstruction,
                temperature: 0.75,
              }
            : {
                temperature: 0.75,
              },
        });

        const text = response.text || "";
        const inputTokens = response.usageMetadata?.promptTokenCount || Math.ceil(prompt.length / 4);
        const outputTokens = response.usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4);

        return { text, inputTokens, outputTokens };
      } catch (err: unknown) {
        attempt++;
        const errMsg = err instanceof Error ? err.message : String(err);
        const isRateLimit = errMsg.includes("429") || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("rate");

        if (attempt > maxRetries) {
          throw new Error(`Gemini API-kall feilet etter ${maxRetries} forsøk: ${errMsg}`);
        }

        const baseDelay = isRateLimit ? 3000 : 1500;
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 800;
        console.warn(`[FullBookEngine] Forsøk ${attempt} feilet (${errMsg}). Venter ${Math.round(delay)}ms før nytt forsøk...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error("Uventet avbrudd i Gemini-kall.");
  }

  /**
   * Main entry point to launch an asynchronous background book generation job.
   */
  public async startGeneration(
    params: FullBookGenerationParams,
    aiClient: GoogleGenAI
  ): Promise<BookGenerationJob> {
    const { user, projectId } = params;

    // 1. Security & Governance Checks
    if (EmergencyKillSwitch.getState().active) {
      const state = EmergencyKillSwitch.getState();
      throw new Error(`Generering blokkert: Emergency Kill Switch er aktiv (${state.reason || "Sikkerhetsstans"}).`);
    }

    CostGuard.checkBudget(user, projectId);

    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const slotAcquired = RateLimiter.acquireJobSlot(user, jobId, "full_book_generation");
    if (!slotAcquired.success) {
      throw new Error(slotAcquired.error || "Kunne ikke reservere kapasitet for bokgenerering.");
    }

    const totalChapters = params.targetChapters || 32;
    const totalWords = params.targetWords || 80000;
    const targetWordsPerChap = Math.round(totalWords / totalChapters);

    const initialJob: BookGenerationJob = {
      id: jobId,
      projectId,
      status: "running",
      phase: "specification",
      totalChapters,
      completedChapters: 0,
      totalWords,
      generatedWords: 0,
      currentChapter: 1,
      currentChapterWords: 0,
      currentChapterTarget: targetWordsPerChap,
      startedAt: new Date().toISOString(),
      elapsedMs: 0,
      activeJobs: 1,
      retrying: 0,
      retryCount: 0,
      createdBy: user.id,
      chapterStates: {},
    };

    // Save job in memory and persistent DB
    this.activeJobs.set(jobId, { cancelRequested: false, job: initialJob });
    db.saveGenerationJob(initialJob);

    AuditLogger.log({
      actorId: user.id,
      actorRole: user.role,
      action: "FULL_BOOK_GENERATION_STARTED",
      status: "SUCCESS",
      projectId,
      metadata: { jobId, targetWords: totalWords, totalChapters, idea: params.idea },
    });

    // Run execution asynchronously in background so client receives jobId immediately
    this.runGenerationPipeline(jobId, params, aiClient).catch((err) => {
      console.error(`[FullBookEngine] Jobb ${jobId} feilet med ukritisk ufanget feil:`, err);
    });

    return initialJob;
  }

  /**
   * Background Execution Pipeline
   */
  private async runGenerationPipeline(
    jobId: string,
    params: FullBookGenerationParams,
    aiClient: GoogleGenAI
  ): Promise<void> {
    const tracker = this.activeJobs.get(jobId);
    if (!tracker) return;

    const { user, projectId } = params;
    const startTime = Date.now();

    try {
      // -------------------------------------------------------------
      // PHASE 1: Specification (Enrich Idea into full BookSpecification)
      // -------------------------------------------------------------
      this.updateJob(jobId, { phase: "specification", elapsedMs: Date.now() - startTime });

      let project = db.getProject(projectId);
      if (!project) {
        throw new Error(`Prosjekt med ID ${projectId} ble ikke funnet i databasen.`);
      }

      // Generate specification from user idea
      const spec = await this.generateSpecification(params, aiClient, user);
      if (tracker.cancelRequested) throw new Error("Generering avbrutt av bruker.");

      // Sync specification to project record
      project = {
        ...project,
        title: spec.title || project.title,
        author: spec.author || project.author || user.name || "Forfatter",
        genre: spec.genre || project.genre,
        tone: spec.tone || project.tone,
        targetWords: spec.targetWords,
        targetChapters: spec.targetChapters,
        acts: spec.acts,
        synopsis: spec.synopsis || project.synopsis,
        pov: spec.pov || project.pov,
        phase: "writing",
        updatedAt: new Date().toISOString(),
      };
      db.saveProject(project);

      this.updateJob(jobId, {
        totalChapters: spec.targetChapters,
        totalWords: spec.targetWords,
        currentChapterTarget: Math.round(spec.targetWords / spec.targetChapters),
        phase: "bible",
        elapsedMs: Date.now() - startTime,
      });

      // -------------------------------------------------------------
      // PHASE 2: Canonical Book Bible Generation
      // -------------------------------------------------------------
      const bibleData = await this.generateCanonicalBible(spec, aiClient, user, projectId);
      if (tracker.cancelRequested) throw new Error("Generering avbrutt av bruker.");

      db.saveBible(projectId, bibleData);
      const bibleEngine = new BibleEngine(bibleData);

      // -------------------------------------------------------------
      // PHASE 3: Chapter Blueprints for the Entire Book
      // -------------------------------------------------------------
      this.updateJob(jobId, { phase: "blueprints", elapsedMs: Date.now() - startTime });

      const blueprints = await this.generateChapterBlueprints(spec, bibleData, aiClient, user, projectId);
      if (tracker.cancelRequested) throw new Error("Generering avbrutt av bruker.");

      // Initialize all planned chapters in project
      const initializedChapters: Chapter[] = blueprints.map((bp) => ({
        id: bp.number,
        number: bp.number,
        title: bp.title,
        summary: bp.summary,
        act: bp.act,
        status: "planned",
        wordTarget: bp.wordTarget,
        currentWords: 0,
        povCharacter: bp.pov,
        conflict: bp.conflict,
        continuityNotes: bp.continuityRequirements.join("; "),
        content: "",
      }));

      project.chapters = initializedChapters;
      db.saveProject(project);

      VersionService.createSnapshot(
        project,
        `Komplett kapitteldisposisjon generert (${blueprints.length} kapitler)`,
        user.id
      );

      // -------------------------------------------------------------
      // PHASE 4: Full Chapter Generation with Continuation Loop
      // -------------------------------------------------------------
      this.updateJob(jobId, { phase: "writing", elapsedMs: Date.now() - startTime });

      let completedCount = 0;
      let totalGeneratedWords = 0;

      for (let i = 0; i < blueprints.length; i++) {
        if (tracker.cancelRequested) {
          throw new Error("Generering avbrutt av bruker.");
        }

        const bp = blueprints[i];
        const prevChapter = i > 0 ? project.chapters[i - 1] : undefined;

        this.updateJob(jobId, {
          currentChapter: bp.number,
          currentChapterTarget: bp.wordTarget,
          elapsedMs: Date.now() - startTime,
        });

        // Set chapter state to writing
        const chapterStates = tracker.job.chapterStates || {};
        chapterStates[bp.number] = {
          chapterNumber: bp.number,
          status: "writing",
          attempt: 1,
          targetWords: bp.wordTarget,
          currentWords: 0,
          startedAt: new Date().toISOString(),
        };
        this.updateJob(jobId, { chapterStates });

        // Generate full prose with continuation loop
        const { content, wordCount, continuityNotes } = await this.generateSingleChapterProse(
          spec,
          bp,
          prevChapter,
          bibleEngine,
          aiClient,
          user,
          projectId,
          (partialWords) => {
            this.updateJob(jobId, {
              currentChapterWords: partialWords,
              elapsedMs: Date.now() - startTime,
            });
          }
        );

        // Update chapter in project
        project.chapters[i] = {
          ...project.chapters[i],
          title: bp.title,
          summary: bp.summary,
          status: "completed",
          content,
          currentWords: wordCount,
          continuityNotes,
        };

        completedCount++;
        totalGeneratedWords += wordCount;

        // Mark chapter completed in job
        chapterStates[bp.number] = {
          chapterNumber: bp.number,
          status: "completed",
          attempt: 1,
          targetWords: bp.wordTarget,
          currentWords: wordCount,
          startedAt: chapterStates[bp.number]?.startedAt,
          completedAt: new Date().toISOString(),
        };

        project.currentWords = totalGeneratedWords;
        project.progress = Math.min(99, Math.round((completedCount / blueprints.length) * 100));
        db.saveProject(project);

        this.updateJob(jobId, {
          completedChapters: completedCount,
          generatedWords: totalGeneratedWords,
          currentChapterWords: wordCount,
          chapterStates,
          elapsedMs: Date.now() - startTime,
        });

        AuditLogger.log({
          actorId: user.id,
          actorRole: user.role,
          action: "CHAPTER_COMPLETED",
          status: "SUCCESS",
          projectId,
          metadata: { chapterNumber: bp.number, title: bp.title, wordCount, target: bp.wordTarget },
        });

        // Take snapshot every 4 chapters
        if (completedCount % 4 === 0 || completedCount === blueprints.length) {
          VersionService.createSnapshot(
            project,
            `Generert til og med kapittel ${bp.number} (${totalGeneratedWords.toLocaleString("nb-NO")} ord)`,
            user.id
          );
        }
      }

      // -------------------------------------------------------------
      // PHASE 5: Full Manuscript Audit
      // -------------------------------------------------------------
      this.updateJob(jobId, { phase: "audit", elapsedMs: Date.now() - startTime });

      const auditReport = ContinuityAgent.auditFullManuscript(
        project.chapters,
        bibleEngine.getData(),
        "ai_assisted"
      );

      // Check if any chapters are severely short or missing
      const severeAnomalies = auditReport.anomalies.filter((a) => a.severity === "Kritisk");
      const incompleteChapters = project.chapters.filter((c) => !c.content || (c.currentWords || 0) < 1000);

      if (incompleteChapters.length > 0) {
        // Run Phase 6: Targeted Repair
        this.updateJob(jobId, { phase: "repair", elapsedMs: Date.now() - startTime });
        for (const inc of incompleteChapters) {
          console.log(`[FullBookEngine] Reparerer kapittel ${inc.number} som har manglende eller utilstrekkelig innhold...`);
          const targetBp = blueprints.find((b) => b.number === inc.number);
          if (targetBp) {
            const repaired = await this.generateSingleChapterProse(
              spec,
              targetBp,
              project.chapters[inc.number - 2],
              bibleEngine,
              aiClient,
              user,
              projectId
            );
            inc.content = repaired.content;
            inc.currentWords = repaired.wordCount;
            inc.status = "completed";
          }
        }
        db.saveProject(project);
      }

      // -------------------------------------------------------------
      // PHASE 7: Final Validation & Project Completion
      // -------------------------------------------------------------
      const allDone = project.chapters.every((c) => c.content && (c.currentWords || 0) > 1000);

      if (allDone && severeAnomalies.length === 0) {
        project.phase = "complete";
        project.progress = 100;
        db.saveProject(project);

        VersionService.createSnapshot(
          project,
          `Komplett roman ferdigstilt og validert (${totalGeneratedWords.toLocaleString("nb-NO")} ord)`,
          user.id
        );

        this.updateJob(jobId, {
          status: "completed",
          phase: "completed",
          completedAt: new Date().toISOString(),
          elapsedMs: Date.now() - startTime,
        });

        AuditLogger.log({
          actorId: user.id,
          actorRole: user.role,
          action: "BOOK_GENERATION_COMPLETED",
          status: "SUCCESS",
          projectId,
          metadata: { totalWords: totalGeneratedWords, totalChapters: project.chapters.length },
        });
      } else {
        project.phase = "needs-review";
        db.saveProject(project);

        this.updateJob(jobId, {
          status: "completed",
          phase: "completed",
          completedAt: new Date().toISOString(),
          elapsedMs: Date.now() - startTime,
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[FullBookEngine] Jobb ${jobId} stoppet med feil:`, errMsg);

      const isCancelled = tracker.cancelRequested || errMsg.includes("avbrutt av bruker");

      this.updateJob(jobId, {
        status: isCancelled ? "cancelled" : "failed",
        phase: "failed",
        error: errMsg,
        completedAt: new Date().toISOString(),
        elapsedMs: Date.now() - startTime,
      });

      AuditLogger.log({
        actorId: user.id,
        actorRole: user.role,
        action: isCancelled ? "BOOK_GENERATION_CANCELLED" : "BOOK_GENERATION_FAILED",
        status: "FAILURE",
        projectId,
        errorMessage: errMsg,
      });
    } finally {
      RateLimiter.releaseJobSlot(user.id, jobId);
    }
  }

  /**
   * Helper to update job both in-memory and in persistent storage.
   */
  private updateJob(jobId: string, updates: Partial<BookGenerationJob>): void {
    const tracker = this.activeJobs.get(jobId);
    if (!tracker) return;

    tracker.job = {
      ...tracker.job,
      ...updates,
    };

    db.saveGenerationJob(tracker.job);
  }

  public getJob(jobId: string): BookGenerationJob | undefined {
    const inMem = this.activeJobs.get(jobId)?.job;
    if (inMem) return inMem;
    return db.getGenerationJob(jobId);
  }

  public cancelJob(jobId: string): boolean {
    const tracker = this.activeJobs.get(jobId);
    if (tracker) {
      tracker.cancelRequested = true;
      tracker.job.status = "cancelled";
      db.saveGenerationJob(tracker.job);
      return true;
    }
    const dbJob = db.getGenerationJob(jobId);
    if (dbJob && dbJob.status === "running") {
      dbJob.status = "cancelled";
      db.saveGenerationJob(dbJob);
      return true;
    }
    return false;
  }

  // ===================================================================
  // PIPELINE IMPLEMENTATION DETAILS
  // ===================================================================

  /**
   * Phase 1: Specification Deduction & Enrichment
   */
  private async generateSpecification(
    params: FullBookGenerationParams,
    aiClient: GoogleGenAI,
    user: AuthUser
  ): Promise<BookSpecification> {
    const totalWords = params.targetWords || 80000;
    const totalChapters = params.targetChapters || 32;
    const wordsPerChap = Math.round(totalWords / totalChapters);

    const prompt = `
Du er BookForge AI sin sjefsdramaturg og forlagskonsulent.
Din oppgave er å oversette forfatterens kjerneidé til en komplett, dyptgående BookSpecification for en fullverdig roman på ca. ${totalWords.toLocaleString("nb-NO")} ord fordelt på ${totalChapters} kapitler (ca. ${wordsPerChap} ord per kapittel).

FORFATTERENS IDÉ:
"${params.idea}"

VALGFRIE PARAMETERE OPPGITT AV BRUKER:
- Tittel: ${params.title || "Ikke oppgitt (finn på en fengende tittel)"}
- Sjanger: ${params.genre || "Ikke oppgitt (deduser beste sjanger)"}
- Tone: ${params.tone || "Ikke oppgitt (deduser passende tone)"}
- Synsvinkel: ${params.pov || "Ikke oppgitt (velg 1. person eller 3. person personlig)"}
- Forfatter: ${params.author || user.name || "Anne Beth Andersen"}

INSTRUKSJON:
Generer en robust spesifikasjon i form av et JSON-objekt med nøyaktig følgende felter:
{
  "title": "Romanens tittel",
  "author": "${params.author || user.name || "Anne Beth Andersen"}",
  "originalIdea": "${params.idea.replace(/"/g, "'")}",
  "genre": "Primærsjanger",
  "subgenre": "Undersjanger",
  "tone": "Litterær tone og atmosfære",
  "audience": "Målgruppe (f.eks. Voksne lesere av psykologiske thrillere)",
  "language": "Norsk (Bokmål)",
  "pov": "Synsvinkel (f.eks. Tredjeperson begrenset / personlig)",
  "targetWords": ${totalWords},
  "targetChapters": ${totalChapters},
  "acts": ${params.acts || 4},
  "synopsis": "En grundig 3-4 avsnitts synopsis som dekker innledning, opptrapping, vendepunkt, klimaks og oppløsning.",
  "themes": ["Tema 1", "Tema 2", "Tema 3", "Tema 4"],
  "setting": "Sentralt geografisk og miljømessig miljø",
  "timePeriod": "Tidsperiode (f.eks. Nåtid, senhøst 2026)",
  "chapterTargets": [${Array(totalChapters).fill(wordsPerChap).join(", ")}]
}

Svar KUN med gyldig JSON. Ingen introduksjon eller avslutning.
`;

    const { text, inputTokens, outputTokens } = await this.callGeminiWithRetry(
      aiClient,
      "gemini-3.8-flash",
      prompt,
      "Du er en prisvinnende forlagsredaktør og dramaturg. Returner kun valid JSON."
    );

    CostGuard.recordUsage({
      userId: user.id,
      projectId: params.projectId,
      action: "GENERATE_BOOK_SPECIFICATION",
      inputTokens,
      outputTokens,
    });

    try {
      const parsed = JSON.parse(cleanJsonString(text)) as BookSpecification;
      return {
        ...parsed,
        targetWords: totalWords,
        targetChapters: totalChapters,
        chapterTargets: parsed.chapterTargets || Array(totalChapters).fill(wordsPerChap),
      };
    } catch {
      // Safe fallback
      return {
        title: params.title || "Skyggenes arv",
        author: params.author || user.name || "Forfatter",
        originalIdea: params.idea,
        genre: params.genre || "Psykologisk thriller",
        subgenre: "Nordic Noir",
        tone: params.tone || "Mørk, intens og realistisk",
        audience: "Voksne lesere",
        language: "Norsk (Bokmål)",
        pov: params.pov || "Tredjeperson personlig",
        targetWords: totalWords,
        targetChapters: totalChapters,
        acts: params.acts || 4,
        synopsis: `I ${params.title || "romanen"} avdekkes lag på lag med hemmeligheter når uventede hendelser tvinger hovedpersonen til et oppgjør med fortiden.`,
        themes: ["Sannhet vs. løgn", "Fortielse", "Moralske dilemmaer"],
        setting: "Norge",
        timePeriod: "Nåtid",
        chapterTargets: Array(totalChapters).fill(wordsPerChap),
      };
    }
  }

  /**
   * Phase 2: Canonical Book Bible Generation
   */
  private async generateCanonicalBible(
    spec: BookSpecification,
    aiClient: GoogleGenAI,
    user: AuthUser,
    projectId: string
  ) {
    const prompt = `
Bygg en komplett, kanonisk BOKBIBEL for romanen "${spec.title}".
Sjanger: ${spec.genre} (${spec.subgenre})
Tone: ${spec.tone}
Synopsis: ${spec.synopsis}
Målgruppe: ${spec.audience}
Tidsperiode og miljø: ${spec.timePeriod}, ${spec.setting}

Opprett:
1. Karakterer (Minst 4-6 karakterer: Hovedperson, antagonist, sentrale bi-karakterer med rolle, arketyper, mål, hemmeligheter og bakhistorie).
2. Lokasjoner (Minst 3-5 distinkte steder med atmosfære, geografi og sanseinntrykk).
3. Tidslinje (Sentral hendelsesrekke fordelt over ${spec.acts} akter).
4. Kontinuitetsregler (Kritiske regler for verdenen, troverdighet, fysikk og relasjoner).
5. Plottråder (Minst 3 sentrale plottråder og relasjonstråder).
6. Foreshadowing (Minst 3 frampek/ledetråder).

Returner som et JSON-objekt med strukturen:
{
  "bookTitle": "${spec.title}",
  "genre": "${spec.genre}",
  "tone": "${spec.tone}",
  "characters": [
    {
      "id": "char-1",
      "name": "Karakternavn",
      "role": "Hovedperson",
      "archetype": "Protagonist",
      "age": 34,
      "appearance": "Fysisk beskrivelse",
      "goal": "Primært ytre mål",
      "motivationInternal": "Indre drivkraft",
      "internalConflict": "Hva river karakteren innvendig",
      "secrets": "Mørk eller avgjørende hemmelighet",
      "background": "Kort bakgrunnshistorie"
    }
  ],
  "locations": [
    {
      "id": "loc-1",
      "name": "Stedsnavn",
      "type": "Innvendig/Utvendig",
      "atmosphere": "Atmosfære og lukt/lys",
      "geography": "Geografisk plassering",
      "notableEvents": "Hva skjer her"
    }
  ],
  "timeline": [
    {
      "id": "time-1",
      "act": 1,
      "timeframe": "Dag 1, tidlig morgen",
      "event": "Beskrivelse av vendepunkt",
      "charactersInvolved": ["Karakternavn"]
    }
  ],
  "continuityRules": [
    {
      "id": "rule-1",
      "category": "Verdensregler / Troverdighet",
      "rule": "Eksplisitt regel for handlingen"
    }
  ],
  "plotThreads": [
    {
      "id": "pt-1",
      "title": "Hovedmysteriet",
      "introducedInChapter": 1,
      "resolvedInChapter": ${spec.targetChapters},
      "status": "open",
      "notes": "Trådens utvikling"
    }
  ],
  "foreshadowing": [
    {
      "id": "fs-1",
      "clue": "Ledetråd eller gjenstand",
      "placedInChapter": 2,
      "payoffChapter": ${Math.round(spec.targetChapters * 0.85)},
      "resolved": false
    }
  ]
}

Svar KUN med JSON.
`;

    const { text, inputTokens, outputTokens } = await this.callGeminiWithRetry(
      aiClient,
      "gemini-3.8-flash",
      prompt,
      "Du er en kanonisk kunnskapsarkitekt for skjønnlitteratur. Returner kun valid JSON."
    );

    CostGuard.recordUsage({
      userId: user.id,
      projectId,
      action: "GENERATE_BOOK_BIBLE",
      inputTokens,
      outputTokens,
    });

    try {
      return JSON.parse(cleanJsonString(text));
    } catch {
      return {
        bookTitle: spec.title,
        genre: spec.genre,
        tone: spec.tone,
        characters: [
          {
            id: "char-1",
            name: "Hovedpersonen",
            role: "Hovedperson",
            archetype: "Protagonist",
            age: 38,
            appearance: "Mørkt hår, skarpe observante øyne",
            goal: "Avdekke sannheten",
            motivationInternal: "Beskytte familien",
            internalConflict: "Tvil på egne minner",
            secrets: "Fortiet en hendelse for ti år siden",
            background: "Erfaren etterforsker og forfatter",
          },
        ],
        locations: [
          {
            id: "loc-1",
            name: "Hovedkvarteret / Åstedet",
            type: "Innvendig",
            atmosphere: "Kjølig, fuktig og preget av tidens tann",
            geography: "Sentralt i distriktet",
            notableEvents: "Her skjer den utløsende handlingen",
          },
        ],
        timeline: [
          {
            id: "time-1",
            act: 1,
            timeframe: "Dag 1",
            event: "Den utløsende hendelsen",
            charactersInvolved: ["Hovedpersonen"],
          },
        ],
        continuityRules: [
          {
            id: "rule-1",
            category: "Psykologi",
            rule: "Hovedpersonen kan aldri stole blindt på sekundærvitner.",
          },
        ],
        plotThreads: [
          {
            id: "pt-1",
            title: "Sannheten om fortiden",
            introducedInChapter: 1,
            resolvedInChapter: spec.targetChapters,
            status: "open",
            notes: "Eskalerer gjennom romanen",
          },
        ],
        foreshadowing: [
          {
            id: "fs-1",
            clue: "Et fotografi med feil datostempel",
            placedInChapter: 1,
            payoffChapter: spec.targetChapters - 2,
            resolved: false,
          },
        ],
      };
    }
  }

  /**
   * Phase 3: Chapter Blueprints for the Entire Book
   */
  private async generateChapterBlueprints(
    spec: BookSpecification,
    bibleData: Record<string, unknown>,
    aiClient: GoogleGenAI,
    user: AuthUser,
    projectId: string
  ): Promise<ChapterBlueprint[]> {
    const totalChapters = spec.targetChapters;
    const wordsPerChap = Math.round(spec.targetWords / totalChapters);

    // Generate blueprints in batches of 16 chapters to prevent token truncation
    const batchSize = 16;
    const blueprints: ChapterBlueprint[] = [];

    for (let start = 1; start <= totalChapters; start += batchSize) {
      const end = Math.min(totalChapters, start + batchSize - 1);

      const prompt = `
Lag detaljerte KAPITTELPLANER (Blueprints) for kapittel ${start} til og med ${end} (av totalt ${totalChapters}) for romanen "${spec.title}".
Sjanger: ${spec.genre} (${spec.subgenre})
Tone: ${spec.tone}
Synopsis: ${spec.synopsis}
Målord per kapittel: ca. ${wordsPerChap} ord.

Karakterer tilgjengelig: ${JSON.stringify((bibleData.characters as unknown[]) || [])}

For HVERT kapittel fra ${start} til ${end}, oppgi:
- number (tall)
- title (kapitteltittel på norsk)
- act (akt 1, 2, 3 eller 4)
- purpose (dramatisk funksjon)
- summary (detaljert handlingssammendrag på 100-150 ord)
- openingState (karakterens starttilstand og lokasjon)
- endingState (avslutning og cliffhanger/overgang)
- scenes (liste over 3-4 distinkte scener som skal utfoldes i kapittelet)
- pov (hvem sin synsvinkel kapittelet forfattes i)
- characters (karakterer som deltar)
- locations (steder)
- conflict (sentral motstand)
- reveal (ny informasjon som oppdages)
- emotionalMovement (emosjonell kurve)
- plotThreadsAdvanced (plottråder som drives fremover)
- foreshadowing (frampek som plantes eller utløses)
- continuityRequirements (regler som må overholdes)
- wordTarget (${wordsPerChap})

Returner KUN en JSON-array med objektene: [ { "number": ${start}, ... }, ... ]
`;

      const { text, inputTokens, outputTokens } = await this.callGeminiWithRetry(
        aiClient,
        "gemini-3.8-flash",
        prompt,
        "Du er en profesjonell romanforfatter og arkitekt for dramatisk struktur. Svar kun med valid JSON-array."
      );

      CostGuard.recordUsage({
        userId: user.id,
        projectId,
        action: `GENERATE_BLUEPRINTS_${start}_${end}`,
        inputTokens,
        outputTokens,
      });

      try {
        const parsed = JSON.parse(cleanJsonString(text)) as ChapterBlueprint[];
        if (Array.isArray(parsed)) {
          blueprints.push(...parsed);
        }
      } catch (err) {
        console.warn(`[FullBookEngine] Kunne ikke parse blueprint-batch ${start}-${end}, oppretter fallback-planer:`, err);
        for (let num = start; num <= end; num++) {
          const act = Math.min(4, Math.ceil((num / totalChapters) * 4));
          blueprints.push({
            number: num,
            title: `Kapittel ${num}: Skrittet over terskelen`,
            act,
            purpose: `Eskalering av konflikten i akt ${act}`,
            summary: `I kapittel ${num} intensiveres undersøkelsene idet nye spor fører handlingen dypere inn i historiens kjerne.`,
            openingState: "Hovedpersonen ankommer åstedet i en tilstand av usikkerhet.",
            endingState: "En overraskende oppdagelse endrer situasjonens alvor.",
            scenes: [
              "Scene 1: Ankomst og observasjon av omgivelsene",
              "Scene 2: Konfrontasjon med en uventet kilde",
              "Scene 3: Funn av en avgjørende gjenstand",
              "Scene 4: Beslutning om neste handling",
            ],
            pov: spec.pov || "Hovedpersonen",
            characters: ["Hovedpersonen"],
            locations: ["Distriktet"],
            conflict: "Tidsnød og motstridende opplysninger",
            reveal: "Et skjult motiv avdekkes delvis",
            emotionalMovement: "Fra engstelig forsiktighet til besluttsom beslutning",
            plotThreadsAdvanced: ["Hovedmysteriet"],
            foreshadowing: ["En detalj som peker frem mot klimaks"],
            continuityRequirements: ["Bevar troverdighet og sanselig nærvær"],
            wordTarget: wordsPerChap,
          });
        }
      }
    }

    return blueprints;
  }

  /**
   * Phase 4: Single Chapter Prose Generation with Continuation Loop
   */
  private async generateSingleChapterProse(
    spec: BookSpecification,
    blueprint: ChapterBlueprint,
    previousChapter: Chapter | undefined,
    bibleEngine: BibleEngine,
    aiClient: GoogleGenAI,
    user: AuthUser,
    projectId: string,
    onProgressUpdate?: (words: number) => void
  ): Promise<{ content: string; wordCount: number; continuityNotes: string }> {
    const targetWords = blueprint.wordTarget || Math.round(spec.targetWords / spec.targetChapters);
    const minAcceptableWords = Math.floor(targetWords * 0.85); // e.g. 2125 words for 2500 target

    const bibleContext = bibleEngine.buildContextForChapter(blueprint.number, blueprint.pov);

    let prevContext = "";
    if (previousChapter && previousChapter.content) {
      const prevTrimmed = previousChapter.content.trim();
      const prevEnding = prevTrimmed.slice(Math.max(0, prevTrimmed.length - 1200));
      prevContext = `
FORRIGE KAPITTEL (Kapittel ${previousChapter.number}: ${previousChapter.title}):
Sammendrag: ${previousChapter.summary}
Siste avsnitt fra forrige kapittel:
«...${prevEnding}»
Sluttilstand fra forrige kapittel: Karakterene beveger seg direkte inn i handlingen for kapittel ${blueprint.number}.
`;
    }

    // Step 1: Initial drafting
    const initialPrompt = `
Du er en prisvinnende norsk skjønnlitterær forfatter.
Skriv hele den fyldige, litterære teksten til KAPITTEL ${blueprint.number}: «${blueprint.title}» i romanen «${spec.title}».

ROMANENS SPESIFIKASJON:
- Sjanger: ${spec.genre} (${spec.subgenre})
- Tone: ${spec.tone}
- Synsvinkel: ${blueprint.pov}
- Mål for kapittelet: ca. ${targetWords} ord (minimum ${minAcceptableWords} ord).

KAPITTELPLAN (BLUEPRINT):
- Akt: ${blueprint.act}
- Formål: ${blueprint.purpose}
- Disposisjon og handling: ${blueprint.summary}
- Starttilstand: ${blueprint.openingState}
- Sluttilstand / Cliffhanger: ${blueprint.endingState}
- Scener som MÅ utfoldes i full lengde:
${blueprint.scenes.map((s, idx) => `  ${idx + 1}. ${s}`).join("\n")}
- Sentral konflikt: ${blueprint.conflict}
- Avsløring/Vendepunkt: ${blueprint.reveal}
- Karakterer til stede: ${blueprint.characters.join(", ")}
- Lokasjon: ${blueprint.locations.join(", ")}

${prevContext}

${bibleContext}

FORFATTERINSTRUKSJONER (STRENGT KRAV TIL LENGDE OG KVALITET):
1. Skriv på modent, litterært og sanselig norsk (Bokmål). Bruk variert setningsstruktur, dialoger med undertekst, indre monolog og levende miljøskildringer.
2. IKKE oppsummer eller hopp bukk over scener. Skriv ut hver eneste scene i sanselig sanntid med handling, replikker, reaksjoner og atmosfære.
3. Start DIREKTE i scenen. Ingen innledende kommentarer, ingen overskrifter som "Her er kapittelet", ingen metabemerkninger eller kulepunkter.
4. Dette er et fullverdig romankapittel for trykk. Skriv med maksimal fylde og dybde for å nå målet på ${targetWords} ord.

Start kapittelet nå:
`;

    let { text: currentProse, inputTokens, outputTokens } = await this.callGeminiWithRetry(
      aiClient,
      "gemini-3.8-flash",
      initialPrompt,
      "Du er en anerkjent skjønnlitterær forfatter. Skriv kun ren, uforkortet romantekst på norsk."
    );

    CostGuard.recordUsage({
      userId: user.id,
      projectId,
      action: `DRAFT_CHAPTER_${blueprint.number}_INITIAL`,
      inputTokens,
      outputTokens,
    });

    let currentWordCount = countWords(currentProse);
    if (onProgressUpdate) onProgressUpdate(currentWordCount);

    // Step 2: Continuation Loop if length is below minimum acceptable words
    let continuationAttempts = 0;
    const maxContinuations = 4;

    while (currentWordCount < minAcceptableWords && continuationAttempts < maxContinuations) {
      continuationAttempts++;

      // Take last 300 words of current prose for seamless stitch
      const wordsArray = currentProse.trim().split(/\s+/);
      const lastWords = wordsArray.slice(Math.max(0, wordsArray.length - 250)).join(" ");

      const continuationPrompt = `
Du er midt i forfatterskapet av KAPITTEL ${blueprint.number}: «${blueprint.title}» i romanen «${spec.title}».
Kapittelet er for øyeblikket ${currentWordCount} ord, men målet er ${targetWords} ord. Det gjenstår å fullføre de gjenstående scenene og nå kapittelets dramatiske vendepunkt og sluttilstand.

HER ER SLUTTEN PÅ TEKSTEN SÅ LANGT:
«...${lastWords}»

GJENSTÅENDE ELEMENTER SOM MÅ BYGGES UT OG FULLFØRES:
- Scener og hendelser: ${blueprint.scenes.slice(Math.floor(blueprint.scenes.length / 2)).join("; ")}
- Konflikt/Vendepunkt som må nås: ${blueprint.conflict} — ${blueprint.reveal}
- Sluttilstand og cliffhanger: ${blueprint.endingState}
- Tone: ${spec.tone}
- Synsvinkel: ${blueprint.pov}

KRITISK INSTRUKSJON:
Fortsett kapittelet DIREKTE fra siste setning.
IKKE gjenta tidligere setninger.
IKKE start på nytt eller skriv sammendrag.
Skriv videre med dyp innlevelse, dialog og sceniske detaljer til handlingen for dette kapittelet er fullendt.

Fortsett herfra:
`;

      const contResult = await this.callGeminiWithRetry(
        aiClient,
        "gemini-3.8-flash",
        continuationPrompt,
        "Fortsett teksten direkte uten repetisjoner. Skriv kun ren, skjønnlitterær prosa."
      );

      CostGuard.recordUsage({
        userId: user.id,
        projectId,
        action: `DRAFT_CHAPTER_${blueprint.number}_CONT_${continuationAttempts}`,
        inputTokens: contResult.inputTokens,
        outputTokens: contResult.outputTokens,
      });

      // Stitch seamlessly
      currentProse = `${currentProse.trim()}\n\n${contResult.text.trim()}`;
      currentWordCount = countWords(currentProse);
      if (onProgressUpdate) onProgressUpdate(currentWordCount);
    }

    // Step 3: Fast continuity check on this chapter
    const fakeChap: Chapter = {
      id: blueprint.number,
      number: blueprint.number,
      title: blueprint.title,
      summary: blueprint.summary,
      act: blueprint.act,
      status: "completed",
      wordTarget: targetWords,
      currentWords: currentWordCount,
      povCharacter: blueprint.pov,
      conflict: blueprint.conflict,
      continuityNotes: "",
      content: currentProse,
    };

    const continuityCheck = ContinuityAgent.validateChapter(
      fakeChap,
      previousChapter ? [previousChapter] : [],
      bibleEngine.getData()
    );

    let note = "";
    if (continuityCheck.issues.length > 0) {
      note = continuityCheck.issues.join("; ");
    } else if (continuityCheck.notes.length > 0) {
      note = continuityCheck.notes[0];
    } else {
      note = "Kontinuitet bekreftet mot bokbibel.";
    }

    return {
      content: currentProse,
      wordCount: currentWordCount,
      continuityNotes: note,
    };
  }
}

export const FullBookEngine = new FullBookEngineService();
