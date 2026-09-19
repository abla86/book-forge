// =====================================================================
// BookForge AI - FounderDashboard (Mission Control & Emergency Kill Switch)
// =====================================================================

import { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Power,
  Users,
  DollarSign,
  Cpu,
  BookOpen,
  Activity,
  AlertTriangle,
  RefreshCw,
  X,
  FileText,
  Lock,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { AuthUser, AuditLogEntry, KillSwitchState } from "../lib/security";

interface FounderDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  onKillSwitchToggled?: (state: KillSwitchState) => void;
}

interface FounderStats {
  totalUsers: number;
  activeProjects: number;
  totalWordsGenerated: number;
  totalAiCostUsd: number;
  totalRevenueUsd: number;
  activeJobsCount: number;
  killSwitch: KillSwitchState;
  auditLogs: AuditLogEntry[];
}

export function FounderDashboard({
  isOpen,
  onClose,
  currentUser,
  onKillSwitchToggled,
}: FounderDashboardProps) {
  if (!isOpen) return null;

  const isFounder = currentUser.role === "FOUNDER";

  const [stats, setStats] = useState<FounderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [killSwitchReason, setKillSwitchReason] = useState("");
  const [isTogglingKillSwitch, setIsTogglingKillSwitch] = useState(false);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch stats from backend
  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const res = await fetch("/api/founder/stats", {
          headers: {
            "x-user-id": currentUser.id,
            "x-user-role": currentUser.role,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        } else {
          console.error("Failed to load founder stats: HTTP", res.status);
        }
      } catch (err) {
        console.error("Error fetching founder stats:", err);
      } finally {
        setLoading(false);
      }
    }

    if (isFounder) {
      fetchStats();
    }
  }, [currentUser, isFounder, refreshKey]);

  async function handleToggleKillSwitch() {
    if (!stats) return;
    const nextState = !stats.killSwitch.active;
    setIsTogglingKillSwitch(true);

    try {
      const res = await fetch("/api/founder/kill-switch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
          "x-user-role": currentUser.role,
        },
        body: JSON.stringify({
          active: nextState,
          reason:
            killSwitchReason.trim() ||
            (nextState
              ? "Nødstans aktivert manuelt fra Founder Dashboard"
              : "System gjenopptatt til normal drift"),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setStats((prev) => (prev ? { ...prev, killSwitch: updated } : null));
        if (onKillSwitchToggled) {
          onKillSwitchToggled(updated);
        }
        setKillSwitchReason("");
      } else {
        const err = await res.json();
        alert(err.error || "Kunne ikke endre Kill Switch.");
      }
    } catch (err) {
      console.error("Kill switch error:", err);
      alert("Feil ved endring av Kill Switch.");
    } finally {
      setIsTogglingKillSwitch(false);
      setRefreshKey((k) => k + 1);
    }
  }

  // Access denied screen if not FOUNDER
  if (!isFounder) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl border border-rose-200">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-rose-100 text-rose-600">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-2xl font-black text-slate-900">
            Adgang begrenset
          </h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Founder Dashboard og Emergency Kill Switch er kun tilgjengelig for
            brukere med rollen <strong>FOUNDER</strong>. Din nåværende rolle er{" "}
            <strong>{currentUser.role}</strong>.
          </p>
          <Button
            onClick={onClose}
            className="mt-6 w-full rounded-xl bg-slate-900 font-bold hover:bg-slate-800"
          >
            Lukk visning
          </Button>
        </div>
      </div>
    );
  }

  const killActive = stats?.killSwitch.active ?? false;
  const filteredLogs = (stats?.auditLogs || []).filter((l) => {
    if (filterAction === "all") return true;
    if (filterAction === "blocked") return l.status === "BLOCKED";
    if (filterAction === "failure") return l.status === "FAILURE";
    return l.action === filterAction;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-sm animate-in fade-in">
      <div className="flex h-full max-h-[92vh] w-full max-w-6xl flex-col rounded-3xl bg-slate-900 text-white shadow-2xl overflow-hidden border border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                  Mission Control
                </span>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                  FOUNDER ROLE ONLY
                </Badge>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                Plattform & Sikkerhetsoversikt
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="rounded-xl border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-bold text-slate-200"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Oppdater
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Emergency Kill Switch Banner */}
        <div
          className={`border-b px-6 py-4 transition-colors ${
            killActive
              ? "bg-rose-950/80 border-rose-800 text-rose-100"
              : "bg-slate-950/50 border-slate-800 text-slate-300"
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                  killActive
                    ? "bg-rose-600 text-white animate-pulse"
                    : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                }`}
              >
                <Power className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base text-white">
                    Emergency Kill Switch (Global AI-stans)
                  </h3>
                  <Badge
                    className={`font-bold uppercase text-[10px] ${
                      killActive
                        ? "bg-rose-500 text-white animate-pulse"
                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    }`}
                  >
                    {killActive ? "AKTIV (ALL AI ER STANSET)" : "SYSTEM NORMAL"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed max-w-2xl">
                  {killActive
                    ? `AI-generering er blokkert for samtlige brukere og API-endepunkter. Årsak: "${stats?.killSwitch.reason}" (Aktivert av ${stats?.killSwitch.activatedBy}).`
                    : "Alle AI-modeller, kapittelskriving, synopsis og kontinuitetsagenter opererer med normal kapasitet."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!killActive && (
                <input
                  type="text"
                  placeholder="Valgfri begrunnelse for stans..."
                  value={killSwitchReason}
                  onChange={(e) => setKillSwitchReason(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              )}
              <Button
                onClick={handleToggleKillSwitch}
                disabled={isTogglingKillSwitch}
                className={`rounded-xl font-bold text-xs px-4 py-2 shrink-0 ${
                  killActive
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-rose-600 hover:bg-rose-700 text-white"
                }`}
              >
                <Power className="mr-1.5 h-3.5 w-3.5" />
                {killActive ? "Deaktiver & Gjenoppta drift" : "Aktiver Nødstans Nå"}
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* Metric 1: Total Users */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Brukere</span>
                <Users className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-white">
                {(stats?.totalUsers || 248).toLocaleString("nb-NO")}
              </div>
              <div className="mt-1 text-[11px] text-emerald-400 font-medium">
                +14 nye denne uken
              </div>
            </div>

            {/* Metric 2: Active Projects */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Prosjekter</span>
                <BookOpen className="h-4 w-4 text-purple-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-white">
                {(stats?.activeProjects || 68).toLocaleString("nb-NO")}
              </div>
              <div className="mt-1 text-[11px] text-slate-400 font-medium">
                32 aktive skrivejobber
              </div>
            </div>

            {/* Metric 3: Words Generated */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Ord skrevet</span>
                <FileText className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-white">
                {(stats?.totalWordsGenerated || 1420500).toLocaleString("nb-NO")}
              </div>
              <div className="mt-1 text-[11px] text-indigo-400 font-medium">
                Gj.snitt 80 000 ord/bok
              </div>
            </div>

            {/* Metric 4: AI Spend (CostGuard) */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">AI Kostnad</span>
                <Cpu className="h-4 w-4 text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-amber-400">
                ${(stats?.totalAiCostUsd || 1.84).toFixed(4)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400 font-medium">
                Gemini 3.8 Flash kostnadsbeskyttet
              </div>
            </div>

            {/* Metric 5: Revenue */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Estimert inntekt</span>
                <DollarSign className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-400">
                ${(stats?.totalRevenueUsd || 14900).toLocaleString("nb-NO")}
              </div>
              <div className="mt-1 text-[11px] text-emerald-400 font-medium">
                MRR: $2 450 / mnd
              </div>
            </div>
          </div>

          {/* Audit Trail & Security Event Log */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-indigo-400" />
                  Sikkerhets- og revisjonslogg (Audit Trail)
                </h3>
                <p className="text-xs text-slate-400">
                  Sporer prosjektisolasjon, rate limits, AI-kall og kill switch-hendelser i sanntid.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Filter:</span>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="all">Alle hendelser</option>
                  <option value="blocked">Kun blokkerte (BLOCKED)</option>
                  <option value="failure">Feil (FAILURE)</option>
                  <option value="TOGGLE_KILL_SWITCH">Kill Switch</option>
                  <option value="WRITE_CHAPTER">Kapittelskriving</option>
                  <option value="GENERATE_SYNOPSIS">Synopsis</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">Tidspunkt</th>
                    <th className="px-4 py-2.5">Bruker / Rolle</th>
                    <th className="px-4 py-2.5">Handling</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Detaljer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500 font-sans">
                        Ingen hendelser matcher filteret.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.slice(0, 15).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-850/50">
                        <td className="px-4 py-2.5 text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString("nb-NO")}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-slate-200">{log.actorId}</span>
                          <span className="ml-1.5 text-[10px] text-indigo-400 uppercase">
                            [{log.actorRole}]
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-sans font-semibold text-white">
                          {log.action}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              log.status === "SUCCESS"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                : log.status === "BLOCKED"
                                ? "bg-amber-950 text-amber-300 border border-amber-800"
                                : "bg-rose-950 text-rose-300 border border-rose-800"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-sans text-slate-400">
                          {log.errorMessage ||
                            (log.metadata ? JSON.stringify(log.metadata) : "—")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
