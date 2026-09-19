import React, { useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  X,
  FileText,
  Compass,
  Users,
  Layers,
  ArrowRight,
  BookOpen,
  Check,
  Filter,
} from "lucide-react";
import { BookProject, Chapter, ContinuityAnomaly, ContinuityReport } from "../types";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";

interface ContinuityAuditorModalProps {
  project: BookProject;
  anomalies: ContinuityAnomaly[];
  onUpdateAnomalies: (updated: ContinuityAnomaly[]) => void;
  onOpenChapter: (chapterNumber: number) => void;
  onApplyFixToChapter: (chapterNumber: number, suggestionText: string) => void;
  onClose: () => void;
}

export const ContinuityAuditorModal: React.FC<ContinuityAuditorModalProps> = ({
  project,
  anomalies,
  onUpdateAnomalies,
  onOpenChapter,
  onApplyFixToChapter,
  onClose,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>("Alle");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("Alle");
  const [showResolved, setShowResolved] = useState<boolean>(false);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditScore, setAuditScore] = useState<number>(96);
  const [verdictText, setVerdictText] = useState<string>(
    "Audit fullført: Verket har en gjennomgående sterk kontinuitet. Enkelte mindre tidslinje- og motivasjonsdetaljer krever presisering."
  );
  const [strengthsList, setStrengthsList] = useState<string[]>([
    "Messingnøkkelens mekanikk og Vang-familiens hundreårspakt er konsekvent fulgt opp gjennom samtlige kapitler.",
    "Miras psykologiske overgang fra rasjonell konservator til motvillig vokter henger logisk sammen med hennes oppdagelser.",
    "Vannstanden og tidevannstidene i Bergens underjordiske kanaler fungerer som en troverdig narrativ tidsfrist.",
    "Elias' skyldfølelse forfedrenes svik harmonerer med hans handlinger i Akt 1 og 2."
  ]);
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);

  const categories = ["Alle", "Plott", "Karakter", "Tidslinje", "Verdensbygging"];

  // Filter anomalies
  const filteredAnomalies = anomalies.filter((a) => {
    if (!showResolved && a.resolved) return false;
    if (activeCategory !== "Alle" && a.category !== activeCategory) return false;
    if (selectedSeverity !== "Alle" && a.severity !== selectedSeverity) return false;
    return true;
  });

  const unresolvedCount = anomalies.filter((a) => !a.resolved).length;
  const criticalCount = anomalies.filter((a) => !a.resolved && a.severity === "Kritisk").length;
  const moderateCount = anomalies.filter((a) => !a.resolved && a.severity === "Moderat").length;
  const minorCount = anomalies.filter((a) => !a.resolved && a.severity === "Mindre").length;

  const toggleResolved = (id: string) => {
    const updated = anomalies.map((a) =>
      a.id === id ? { ...a, resolved: !a.resolved } : a
    );
    onUpdateAnomalies(updated);
  };

  const handleApplyFix = (anomaly: ContinuityAnomaly) => {
    if (anomaly.chapterNumber) {
      onApplyFixToChapter(anomaly.chapterNumber, anomaly.suggestion);
      // Automatically mark as resolved
      const updated = anomalies.map((a) =>
        a.id === anomaly.id ? { ...a, resolved: true } : a
      );
      onUpdateAnomalies(updated);
      setAppliedNotification(`Forslag implementert i kapittel ${anomaly.chapterNumber}!`);
      setTimeout(() => setAppliedNotification(null), 3000);
    }
  };

  const handleRunFullAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await fetch("/api/book/deep-continuity-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapters: project.chapters,
          characters: project.characters,
          timeline: project.timeline,
          locations: project.locations,
          continuityRules: project.continuityRules,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.score) setAuditScore(data.score);
        if (data.verdict) setVerdictText(data.verdict);
        if (data.strengths && Array.isArray(data.strengths)) {
          setStrengthsList(data.strengths);
        }
        if (data.anomalies && Array.isArray(data.anomalies)) {
          // Merge with existing resolved states
          const newItems: ContinuityAnomaly[] = data.anomalies.map((item: any, idx: number) => ({
            id: item.id || `audit-${Date.now()}-${idx}`,
            category: item.category || "Plott",
            severity: item.severity || "Moderat",
            chapterNumber: item.chapterNumber,
            chapterTitle: item.chapterTitle,
            issue: item.issue,
            impact: item.impact,
            suggestion: item.suggestion,
            resolved: false,
          }));

          onUpdateAnomalies(newItems);
        }
      }
    } catch (err) {
      console.error("Failed deep continuity audit:", err);
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div
      id="continuity-auditor-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4"
    >
      <div className="flex flex-col h-[90vh] w-full max-w-6xl rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Kontinuitetskontroll & Redaksjonell Analyse
                </h2>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10">
                  4-Akser Verifikasjon
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Oppdager og korrigerer avvik i plott, karakterpsykologi, tidslinje og verdensbygging
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {appliedNotification && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-3 py-1 rounded-md animate-pulse">
                <Check className="h-3.5 w-3.5" /> {appliedNotification}
              </span>
            )}
            <Button
              onClick={handleRunFullAudit}
              disabled={isAuditing}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-bold text-xs h-9 shadow-md"
            >
              {isAuditing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Kjører 4-akser audit...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Kjør full kontinuitetsskanning med AI
                </>
              )}
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

        {/* Status Dashboard Row */}
        <div className="border-b border-slate-800 bg-slate-950/40 px-6 py-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          {/* Score */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900/60">
            <div className="text-3xl font-black text-emerald-400">{auditScore}%</div>
            <div>
              <div className="text-xs font-semibold text-slate-200">Kontinuitetsscore</div>
              <div className="text-[11px] text-emerald-400 font-medium">Høy integritet</div>
            </div>
          </div>

          {/* Uavhengige avvik */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900/60">
            <div className="text-2xl font-bold text-slate-100">{unresolvedCount}</div>
            <div>
              <div className="text-xs font-semibold text-slate-200">Aktive merknader</div>
              <div className="text-[11px] text-slate-400">Krever gjennomgang</div>
            </div>
          </div>

          {/* Kritiske */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900/60">
            <div className="text-2xl font-bold text-rose-400">{criticalCount}</div>
            <div>
              <div className="text-xs font-semibold text-rose-300">Kritiske avvik</div>
              <div className="text-[11px] text-slate-400">Bryter innlevelse</div>
            </div>
          </div>

          {/* Moderate */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900/60">
            <div className="text-2xl font-bold text-amber-400">{moderateCount}</div>
            <div>
              <div className="text-xs font-semibold text-amber-300">Moderate avvik</div>
              <div className="text-[11px] text-slate-400">Bør harmoniseres</div>
            </div>
          </div>

          {/* Mindre */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900/60">
            <div className="text-2xl font-bold text-blue-400">{minorCount}</div>
            <div>
              <div className="text-xs font-semibold text-blue-300">Mindre detaljer</div>
              <div className="text-[11px] text-slate-400">Tid & overganger</div>
            </div>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: Anomalies & Suggestions */}
          <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-4">
            {/* Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {categories.map((cat) => {
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`text-xs px-3 py-1 rounded-md transition-all font-medium border ${
                        isActive
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                          : "border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Severity & Resolved Toggle */}
              <div className="flex items-center gap-2 text-xs">
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="h-7 text-xs bg-slate-950/60 border border-slate-700 rounded px-2 text-slate-300"
                >
                  <option value="Alle">Alle alvorligheter</option>
                  <option value="Kritisk">Kritisk</option>
                  <option value="Moderat">Moderat</option>
                  <option value="Mindre">Mindre</option>
                </select>

                <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showResolved}
                    onChange={(e) => setShowResolved(e.target.checked)}
                    className="accent-emerald-500 rounded"
                  />
                  Vis løste ({anomalies.filter((a) => a.resolved).length})
                </label>
              </div>
            </div>

            {/* List of Anomalies */}
            <div className="space-y-4 flex-1">
              {filteredAnomalies.length === 0 && (
                <div className="p-12 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/20 text-slate-400 space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                  <p className="font-semibold text-white">Ingen kontinuitetsavvik i denne kategorien!</p>
                  <p className="text-xs">Alle regler, motiver og tidslinjer er konsistente.</p>
                </div>
              )}

              {filteredAnomalies.map((item) => {
                const isCritical = item.severity === "Kritisk";
                const isModerate = item.severity === "Moderat";

                const badgeBg = isCritical
                  ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                  : isModerate
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  : "bg-blue-500/15 text-blue-400 border-blue-500/30";

                const categoryIcon =
                  item.category === "Plott" ? (
                    <Layers className="h-3.5 w-3.5 text-indigo-400" />
                  ) : item.category === "Karakter" ? (
                    <Users className="h-3.5 w-3.5 text-rose-400" />
                  ) : item.category === "Tidslinje" ? (
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                  ) : (
                    <Compass className="h-3.5 w-3.5 text-emerald-400" />
                  );

                return (
                  <Card
                    key={item.id}
                    className={`border transition-all ${
                      item.resolved
                        ? "border-slate-800/60 bg-slate-950/20 opacity-60"
                        : isCritical
                        ? "border-rose-900/60 bg-rose-950/10"
                        : "border-slate-800 bg-slate-950/40"
                    }`}
                  >
                    <CardContent className="p-5 space-y-3">
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs flex items-center gap-1.5 ${badgeBg}`}>
                            {categoryIcon}
                            {item.category} • {item.severity}
                          </Badge>
                          {item.chapterNumber && (
                            <button
                              onClick={() => onOpenChapter(item.chapterNumber!)}
                              className="text-xs font-semibold text-slate-300 hover:text-amber-400 transition-colors flex items-center gap-1"
                            >
                              <BookOpen className="h-3.5 w-3.5" />
                              Kapittel {item.chapterNumber}: {item.chapterTitle}
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleResolved(item.id)}
                            className={`text-xs h-7 px-2 ${
                              item.resolved
                                ? "text-emerald-400 hover:text-emerald-300"
                                : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {item.resolved ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Løst
                              </>
                            ) : (
                              "Marker som løst"
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Issue Description */}
                      <div>
                        <h4 className="text-sm font-semibold text-white">{item.issue}</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          <strong className="text-slate-300">Leserkonsekvens:</strong> {item.impact}
                        </p>
                      </div>

                      {/* Actionable Suggestion Box */}
                      <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5" />
                            Forslag til forbedring
                          </span>
                          {item.chapterNumber && !item.resolved && (
                            <Button
                              size="sm"
                              onClick={() => handleApplyFix(item)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-[11px] h-6 px-2.5 shadow-sm"
                            >
                              <Check className="h-3 w-3 mr-1" /> Bruk forbedring i kapittel
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-emerald-100/90 leading-relaxed italic">
                          «{item.suggestion}»
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Right Column: Strengths & Audit Summary */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-800 bg-slate-950/50 p-6 flex flex-col gap-6 overflow-y-auto">
            {/* Verdict */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Redaksjonell Konklusjon
              </div>
              <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/80 text-xs text-slate-200 leading-relaxed">
                {verdictText}
              </div>
            </div>

            {/* Strengths */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Verifiserte Styrker & Konsistens
              </div>
              <div className="space-y-2.5">
                {strengthsList.map((strength, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-3 rounded-lg border border-slate-800 bg-slate-900/40 text-xs text-slate-300 leading-relaxed flex items-start gap-2"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <span>{strength}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Rules Reference */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Aktive Verdensregler ({project.continuityRules?.length || 0})
              </div>
              <div className="space-y-1.5">
                {project.continuityRules?.slice(0, 3).map((r) => (
                  <div key={r.id} className="text-[11px] text-slate-400 border-l-2 border-amber-500/50 pl-2 py-0.5">
                    {r.rule}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-3 bg-slate-950/70">
          <div className="text-xs text-slate-400">
            {unresolvedCount === 0
              ? "Alle kontinuitetsavvik er løst eller godkjent!"
              : `${unresolvedCount} åpne merknader identifisert i bokens plan og tekst.`}
          </div>
          <Button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-white text-xs">
            Lukk rapport
          </Button>
        </div>
      </div>
    </div>
  );
};
