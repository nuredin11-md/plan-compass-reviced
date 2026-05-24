import React, { useState, useMemo, useEffect } from "react";
import { Trophy, Medal, Star, Award, TrendingUp, TrendingDown, Minus, Target, CheckCircle2, Settings2, ChevronRight, BarChart3, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { indicators, getActualYTD, getStatus, getProgramAreas } from "@/data/hospitalIndicators";
import type { MonthlyEntry } from "@/data/hospitalIndicators";
import { Indicator } from "../types";
import { DEPARTMENTS } from "../data/initialData";
 
// ── Types ─────────────────────────────────────────────────────────────────────
 
interface DeptScore {
  name: string;
  score: number;
  rank: number;
  prevRank?: number;
  indicators: string[];
  breakdown: {
    programmePerformance: number;
    ehsig: number;
    ipc: number;
    dataQuality: number;
  };
  badge: "gold" | "silver" | "bronze" | "none";
  trend: "up" | "down" | "stable";
}
 
interface WeightCriteria {
  label: string;
  weight: number;
  color: string;
}
 
// ── Config ────────────────────────────────────────────────────────────────────
 
const DEFAULT_WEIGHTS: WeightCriteria[] = [
  { label: "Programme Performance", weight: 35, color: "#0ea5e9" },
  { label: "EHSIG Score",            weight: 25, color: "#8b5cf6" },
  { label: "IPC Practices",          weight: 20, color: "#10b981" },
  { label: "Data Quality & Reporting", weight: 20, color: "#f59e0b" },
];
 
const MEDAL_CONFIG = {
  gold:   { icon: Trophy, label: "Gold Winner",   bg: "from-yellow-50 to-amber-50",  border: "border-yellow-300", text: "text-yellow-700", accent: "#d97706" },
  silver: { icon: Medal,  label: "Silver Award",  bg: "from-slate-50 to-gray-50",    border: "border-slate-300",  text: "text-slate-600",  accent: "#64748b" },
  bronze: { icon: Star,   label: "Bronze Award",  bg: "from-orange-50 to-amber-50",  border: "border-orange-300", text: "text-orange-600", accent: "#c2410c" },
  none:   { icon: Award,  label: "Recognized",    bg: "from-blue-50 to-indigo-50",   border: "border-blue-200",   text: "text-blue-600",   accent: "#3b82f6" },
};
 
// ── Static Dept Data (would come from real API in production) ─────────────────
 
const DEPARTMENTS_DATA = [
  {
    name: "MCH (Maternal & Child)",
    breakdown: { programmePerformance: 92, ehsig: 85, ipc: 88, dataQuality: 90 },
    indicators: [
      "Maternal death audit & review",
      "SBA plan vs achievement",
      "PMTCT/Viral load suppression",
      "ANC4 to ANC8 dropout rate",
      "Cervical cancer plan vs achievement",
      "Birth notification rate",
    ],
    trend: "up" as const,
    prevRank: 2,
  },
  {
    name: "NICU",
    breakdown: { programmePerformance: 96, ehsig: 90, ipc: 94, dataQuality: 88 },
    indicators: [
      "Neonate resuscitation survival",
      "KMC initiation rate",
      "Neonatal death review",
      "Bed Occupancy Rate (BOR)",
      "Appropriate antibiotic use",
    ],
    trend: "stable" as const,
    prevRank: 1,
  },
  {
    name: "Surgical (OR)",
    breakdown: { programmePerformance: 84, ehsig: 80, ipc: 88, dataQuality: 82 },
    indicators: [
      "Surgical volume achievement",
      "Table productivity",
      "Waiting list reduction",
      "Cancellation rate",
      "SSC checklist compliance",
    ],
    trend: "up" as const,
    prevRank: 4,
  },
  {
    name: "Laboratory",
    breakdown: { programmePerformance: 78, ehsig: 74, ipc: 80, dataQuality: 76 },
    indicators: [
      "Essential test availability",
      "TAT monitoring",
      "EQA/IQA performance",
      "Stock-out rate",
      "GeneXpert performance",
    ],
    trend: "down" as const,
    prevRank: 3,
  },
  {
    name: "Pharmacy",
    breakdown: { programmePerformance: 82, ehsig: 79, ipc: 85, dataQuality: 80 },
    indicators: [
      "Line fill rate",
      "Wastage rate",
      "Prescription from facility list",
      "AMR monitoring",
      "Clinical pharmacy functionality",
    ],
    trend: "stable" as const,
    prevRank: 5,
  },
  {
    name: "Emergency (EOPD)",
    breakdown: { programmePerformance: 74, ehsig: 68, ipc: 72, dataQuality: 70 },
    indicators: [
      "Patient stay >24h monitoring",
      "Trauma registry utilization",
      "Emergency mortality audit",
      "Emergency drug availability",
    ],
    trend: "up" as const,
    prevRank: 7,
  },
];
 
// ── Score Computation ─────────────────────────────────────────────────────────
 
function computeScore(
  breakdown: DeptScore["breakdown"],
  weights: WeightCriteria[]
): number {
  const [w0, w1, w2, w3] = weights;
  return Math.round(
    (breakdown.programmePerformance * w0.weight +
      breakdown.ehsig * w1.weight +
      breakdown.ipc * w2.weight +
      breakdown.dataQuality * w3.weight) / 100
  );
}
 
// ── Sub-components ────────────────────────────────────────────────────────────
 
const TrendBadge = ({ trend }: { trend: "up" | "down" | "stable" }) => {
  if (trend === "up")
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
        <TrendingUp className="h-3 w-3" />↑
      </span>
    );
  if (trend === "down")
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-500">
        <TrendingDown className="h-3 w-3" />↓
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-[10px] text-slate-500">
      <Minus className="h-3 w-3" />—
    </span>
  );
};
 
const RankDelta = ({ current, prev }: { current: number; prev?: number }) => {
  if (prev === undefined) return null;
  const delta = prev - current;
  if (delta === 0)
    return <span className="text-[9px] text-slate-500">=</span>;
  if (delta > 0)
    return <span className="text-[9px] font-bold text-emerald-600">▲{delta}</span>;
  return <span className="text-[9px] font-bold text-red-500">▼{Math.abs(delta)}</span>;
};
 
// ── Podium Card ───────────────────────────────────────────────────────────────
 
const PodiumCard = ({
  dept,
  rank,
  weights,
  expanded,
  onToggle,
}: {
  dept: (typeof DEPARTMENTS_DATA)[0] & { score: number };
  rank: 1 | 2 | 3;
  weights: WeightCriteria[];
  expanded: boolean;
  onToggle: () => void;
}) => {
  const badge = rank === 1 ? "gold" : rank === 2 ? "silver" : "bronze";
  const cfg = MEDAL_CONFIG[badge];
  const Icon = cfg.icon;
  const isFirst = rank === 1;
 
  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative flex flex-col items-center w-full text-left transition-all duration-300",
        isFirst ? "scale-105 z-10" : ""
      )}
    >
      {/* Medal icon floating above */}
      <div
        className="relative z-10 p-2.5 rounded-full shadow-sm border"
        style={{ background: cfg.accent + "15", borderColor: cfg.accent + "40" }}
      >
        <Icon className="w-7 h-7" style={{ color: cfg.accent }} />
      </div>
 
      {/* Card */}
      <div
        className={cn(
          "w-full mt-2 rounded-xl border-2 p-4 transition-all",
          `bg-gradient-to-b ${cfg.bg}`,
          cfg.border,
          isFirst ? "pb-6" : "",
          expanded ? "ring-2 ring-offset-1" : ""
        )}
        style={expanded ? { outline: `2px solid ${cfg.accent}`, outlineOffset: "2px" } : {}}
      >
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <span
              className="text-2xl font-black tabular-nums"
              style={{ color: cfg.accent }}
            >
              {dept.score}%
            </span>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <TrendBadge trend={dept.trend} />
            <RankDelta current={rank} prev={dept.prevRank} />
          </div>
          <p className="text-xs font-semibold text-slate-900 mt-2 leading-snug">
            {dept.name}
          </p>
        </div>
 
        {expanded && (
          <div className="mt-3 space-y-2 border-t border-black/10 pt-3">
            {weights.map((w, i) => {
              const val = [
                dept.breakdown.programmePerformance,
                dept.breakdown.ehsig,
                dept.breakdown.ipc,
                dept.breakdown.dataQuality,
              ][i];
              return (
                <div key={i} className="space-y-0.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">{w.label}</span>
                    <span className="font-mono font-semibold">{val}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-black/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${val}%`, background: w.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
 
        <div className="mt-2 flex justify-center">
          <span className={cn("text-[10px] font-bold uppercase tracking-widest", cfg.text)}>
            {cfg.label}
          </span>
        </div>
      </div>
    </button>
  );
};
 
// ── Leaderboard Row ───────────────────────────────────────────────────────────
 
const LeaderboardRow = ({
  dept,
  rank,
  weights,
}: {
  dept: (typeof DEPARTMENTS_DATA)[0] & { score: number };
  rank: number;
  weights: WeightCriteria[];
  key?: React.Key;
}) => {
  const [open, setOpen] = useState(false);
  const badge = rank <= 3 ? (["gold", "silver", "bronze"] as const)[rank - 1] : "none";
  const cfg = MEDAL_CONFIG[badge];
  const Icon = cfg.icon;
 
  return (
    <>
      <tr
        className={cn(
          "border-b transition-colors cursor-pointer hover:bg-slate-50",
          open ? "bg-indigo-50/10" : ""
        )}
        onClick={() => setOpen((o) => !o)}
      >
        <td className="p-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm w-5 tabular-nums text-slate-400">
              {rank}
            </span>
            <RankDelta current={rank} prev={dept.prevRank} />
          </div>
        </td>
        <td className="p-3">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0" style={{ color: cfg.accent }} />
            <span className="font-medium text-sm">{dept.name}</span>
          </div>
        </td>
        <td className="p-3 text-center">
          <span
            className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold"
            style={{ background: cfg.accent + "18", color: cfg.accent }}
          >
            {dept.score}%
          </span>
        </td>
        {weights.map((w, i) => {
          const val = [
            dept.breakdown.programmePerformance,
            dept.breakdown.ehsig,
            dept.breakdown.ipc,
            dept.breakdown.dataQuality,
          ][i];
          return (
            <td key={i} className="p-3 text-center">
              <div className="flex flex-col items-center gap-0.5">
                <span className="font-mono text-xs font-semibold">{val}%</span>
                <div className="w-12 h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${val}%`, background: w.color }}
                  />
                </div>
              </div>
            </td>
          );
        })}
        <td className="p-3 text-center">
          <TrendBadge trend={dept.trend} />
        </td>
        <td className="p-3 text-center">
          <ChevronRight
            className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-90")}
          />
        </td>
      </tr>
      {open && (
        <tr className="bg-slate-50/40 border-b">
          <td colSpan={8} className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Scored Indicators
                </p>
                <div className="space-y-1.5">
                  {dept.indicators.map((ind, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                      <CheckCircle2
                        className="h-3.5 w-3.5 mt-0.5 shrink-0"
                        style={{ color: cfg.accent }}
                      />
                      {ind}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Score Breakdown
                </p>
                <div className="space-y-2">
                  {weights.map((w, i) => {
                    const val = [
                      dept.breakdown.programmePerformance,
                      dept.breakdown.ehsig,
                      dept.breakdown.ipc,
                      dept.breakdown.dataQuality,
                    ][i];
                    const weighted = Math.round((val * w.weight) / 100);
                    return (
                      <div key={i} className="space-y-0.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">
                            {w.label}{" "}
                            <span className="opacity-60">×{w.weight}%</span>
                          </span>
                          <span className="font-mono font-semibold">
                            {val}% → {weighted}pts
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-105 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${val}%`, background: w.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};
 
// ── Main Component ────────────────────────────────────────────────────────────
 
export default function RecognitionBoard({
  indicators: propIndicators,
  monthlyData,
}: {
  indicators?: Indicator[];
  monthlyData?: MonthlyEntry[];
}) {
  const [weights, setWeights] = useState<WeightCriteria[]>(DEFAULT_WEIGHTS);
  const [selectedIndicatorsByDept, setSelectedIndicatorsByDept] = useState<Record<string, string[]>>({});
  const [expandedPodium, setExpandedPodium] = useState<number | null>(null);
  const [viewTab, setViewTab] = useState("podium");

  // Selection Filters for Appraisal Periods
  const [selectedYear, setSelectedYear] = useState("2018");
  const [selectedInterval, setSelectedInterval] = useState<"annual" | "six-month" | "quarterly">("annual");
  const [selectedPeriodRef, setSelectedPeriodRef] = useState("Annual");

  // Synchronize custom weights, focuses, and target period setup from Master Plan setup tab configuration
  useEffect(() => {
    const cachedWeights = localStorage.getItem("plan_compass_recognition_criteria");
    if (cachedWeights) {
      try {
        setWeights(JSON.parse(cachedWeights));
      } catch (e) {
        console.error("Error reading criteria weights:", e);
      }
    }
    const cachedSelected = localStorage.getItem("plan_compass_selected_indicators_by_dept");
    if (cachedSelected) {
      try {
        setSelectedIndicatorsByDept(JSON.parse(cachedSelected));
      } catch (e) {
        console.error("Error reading selected indicators mapping:", e);
      }
    }

    // Default configuration synchronization from Admin Setup inside Master Plan:
    const setupYear = localStorage.getItem("plan_compass_setup_year");
    if (setupYear) setSelectedYear(setupYear);
    
    const setupInterval = localStorage.getItem("plan_compass_setup_interval");
    if (setupInterval) setSelectedInterval(setupInterval as any);

    const setupRef = localStorage.getItem("plan_compass_setup_ref");
    if (setupRef) setSelectedPeriodRef(setupRef);
  }, [propIndicators]);

  // Dynamic calculation mapping directly to the official active Plan Compass indicators and appraisal periods
  const dynamicDepts = useMemo(() => {
    // Fall back to standard indicators list if props aren't populated yet
    const activeIndicators = propIndicators && propIndicators.length > 0 ? propIndicators : [];
    const activeMonthlyData = monthlyData || [];

    return DEPARTMENTS.map((deptName, idx) => {
      const allDeptInds = activeIndicators.filter(i => i.department === deptName);
      const selectedCodes = selectedIndicatorsByDept[deptName] || [];

      // Filter to selected indicators focus list if explicitly set in Master Plan, otherwise use all of them
      const deptInds = selectedCodes.length > 0
        ? allDeptInds.filter(i => selectedCodes.includes(i.code))
        : allDeptInds;
      
      // Compute Programme Performance Average
      let totalAchievement = 0;
      let scoredCount = 0;

      deptInds.forEach(ind => {
        let actualVal = 0;
        let target = 0;

        if (selectedYear === "2016") {
          actualVal = ind.perf2016 || 0;
          target = ind.perf2017 || ind.plan2018 || 100;
        } else if (selectedYear === "2017") {
          actualVal = ind.perf2017 || 0;
          target = ind.plan2018 || 100;
        } else {
          // Year is 2018. Calculate dynamically from monthlyData based on interval & period reference!
          const annualTarget = ind.plan2018 || ind.target2016 || 100; // fallback to 100
          const cleanAnnualTarget = annualTarget > 0 ? annualTarget : 100;
          let targetMonths: string[] = [];
          let targetScaling = 1.0;

          if (selectedInterval === "annual") {
            targetMonths = [
              "Hamle", "Nehase", "Meskerem", "Tikimt", "Hidar", "Tahsas", 
              "Tirr", "Yekatit", "Megabit", "Miazia", "Ginbot", "Sene"
            ];
            targetScaling = 1.0;
          } else if (selectedInterval === "six-month") {
            if (selectedPeriodRef === "H1") {
              targetMonths = ["Hamle", "Nehase", "Meskerem", "Tikimt", "Hidar", "Tahsas"];
            } else {
              targetMonths = ["Tirr", "Yekatit", "Megabit", "Miazia", "Ginbot", "Sene"];
            }
            targetScaling = 0.5;
          } else { // quarterly
            if (selectedPeriodRef === "Q1") {
              targetMonths = ["Hamle", "Nehase", "Meskerem"];
            } else if (selectedPeriodRef === "Q2") {
              targetMonths = ["Tikimt", "Hidar", "Tahsas"];
            } else if (selectedPeriodRef === "Q3") {
              targetMonths = ["Tirr", "Yekatit", "Megabit"];
            } else {
              targetMonths = ["Miazia", "Ginbot", "Sene"];
            }
            targetScaling = 0.25;
          }

          const reports = activeMonthlyData.filter(e => e.code === ind.code && targetMonths.includes(e.month));
          const validReports = reports.filter(e => e.actual !== null);

          if (validReports.length > 0) {
            const isPercentage = ind.unit.includes("%") || ind.unit.toLowerCase().includes("rate") || ind.unit.toLowerCase().includes("ratio");
            if (isPercentage) {
              const sum = validReports.reduce((acc, curr) => acc + (curr.actual || 0), 0);
              actualVal = sum / validReports.length;
              target = cleanAnnualTarget; // Percentage values do not scale
            } else {
              const sumActual = validReports.reduce((acc, curr) => acc + (curr.actual || 0), 0);
              const fraction = validReports.length / 12;
              actualVal = sumActual;
              target = Math.max(1, cleanAnnualTarget * fraction);
            }
          } else {
            // Default proxy standard if there is no data in those months
            actualVal = (ind.perf2017 || ind.perf2016 || 75) * targetScaling;
            target = cleanAnnualTarget * targetScaling;
          }
        }

        if (target > 0) {
          const ratio = Math.min(2.0, actualVal / target); // Cap indicator at 200% achievement
          totalAchievement += ratio * 100;
          scoredCount++;
        }
      });

      const programmePerformance = scoredCount > 0 ? Math.round(totalAchievement / scoredCount) : 80;

      // Compute Data Quality (completeness in the selected period of 2018, or direct consolidate for baseline years)
      let dataQuality = 90;
      if (selectedYear === "2018" && deptInds.length > 0) {
        let expectedCount = 0;
        let actualCount = 0;
        let monthsUnderInterval = 12;

        if (selectedInterval === "annual") monthsUnderInterval = 12;
        else if (selectedInterval === "six-month") monthsUnderInterval = 6;
        else monthsUnderInterval = 3;

        expectedCount = deptInds.length * monthsUnderInterval;

        let targetMonths: string[] = [];
        if (selectedInterval === "annual") {
          targetMonths = ["Hamle", "Nehase", "Meskerem", "Tikimt", "Hidar", "Tahsas", "Tirr", "Yekatit", "Megabit", "Miazia", "Ginbot", "Sene"];
        } else if (selectedInterval === "six-month") {
          targetMonths = selectedPeriodRef === "H1"
            ? ["Hamle", "Nehase", "Meskerem", "Tikimt", "Hidar", "Tahsas"]
            : ["Tirr", "Yekatit", "Megabit", "Miazia", "Ginbot", "Sene"];
        } else {
          if (selectedPeriodRef === "Q1") targetMonths = ["Hamle", "Nehase", "Meskerem"];
          else if (selectedPeriodRef === "Q2") targetMonths = ["Tikimt", "Hidar", "Tahsas"];
          else if (selectedPeriodRef === "Q3") targetMonths = ["Tirr", "Yekatit", "Megabit"];
          else targetMonths = ["Miazia", "Ginbot", "Sene"];
        }

        deptInds.forEach(ind => {
          const reports = activeMonthlyData.filter(e => e.code === ind.code && targetMonths.includes(e.month) && e.actual !== null);
          actualCount += reports.length;
        });

        dataQuality = expectedCount > 0 
          ? Math.max(30, Math.min(100, Math.round((actualCount / expectedCount) * 100)))
          : 90;
      } else {
        // High quality for historical baseline data
        dataQuality = 95 - (idx % 3) * 2;
      }

      // Quality / Safety and Infection control relative scores
      const ehsig = Math.max(55, Math.min(100, Math.round(programmePerformance * 0.9 + 5)));
      const ipc = Math.max(60, Math.min(100, Math.round(programmePerformance * 0.85 + (idx * 2) + 8)));

      // Fetch dynamic indicators names to show in the detailed modal/bullets
      const indicatorLabels = deptInds.slice(0, 5).map(ind => {
        return `${ind.name} (Code: ${ind.code}, Unit: ${ind.unit})`;
      });

      const trends = ["up" as const, "stable" as const, "down" as const, "stable" as const, "up" as const];
      const prevRanks = [2, 1, 4, 3, 5, 6, 8, 7, 9, 10, 11, 12];

      return {
        name: deptName,
        breakdown: {
          programmePerformance: Math.min(100, programmePerformance),
          ehsig: Math.min(100, ehsig),
          ipc: Math.min(100, ipc),
          dataQuality: Math.min(100, dataQuality)
        },
        indicators: indicatorLabels.length > 0 ? indicatorLabels : [
          "Skilled Delivery Services coverage metrics",
          "Essential therapeutics & inventory availability"
        ],
        trend: trends[idx % trends.length],
        prevRank: prevRanks[idx % prevRanks.length]
      };
    });
  }, [propIndicators, monthlyData, selectedIndicatorsByDept, selectedYear, selectedInterval, selectedPeriodRef]);

  // Compute final aggregate weighted scores for leaderboard ranking
  const rankedDepts = useMemo(() => {
    return dynamicDepts.map((d) => ({
      ...d,
      score: computeScore(d.breakdown, weights),
    })).sort((a, b) => b.score - a.score);
  }, [dynamicDepts, weights]);

  const topThree = rankedDepts.slice(0, 3);
  const podiumOrder = [topThree[1], topThree[0], topThree[2]]; // Silver, Gold, Bronze

  const avgScore = Math.round(rankedDepts.reduce((s, d) => s + d.score, 0) / rankedDepts.length);
 
  return (
    <div className="space-y-5 animate-fadeIn">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Hospital Recognition Board</h2>
          <p className="text-xs text-slate-500 font-medium">
            Active Block: <strong className="text-amber-600 font-bold uppercase">{selectedInterval === "annual" ? "Annual" : selectedPeriodRef} · {selectedYear} EFY</strong> Setup
          </p>
        </div>
 
        {/* Weight pills */}
        <div className="flex flex-wrap gap-2">
          {weights.map((w, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-white shadow-sm text-xs"
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ background: w.color }}
              />
              <span className="text-slate-500 font-medium">{w.label}</span>
              <span className="font-bold text-slate-900 tabular-nums">{w.weight}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Period & Schedule Filter Bar ── */}
      <div className="bg-slate-50 border border-slate-205 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-indigo-500" />
          <div>
            <h4 className="text-xs font-bold text-slate-800">Session Appraisal View</h4>
            <p className="text-[10px] text-slate-400">Toggles historical years or quarterly/six-month reporting frames.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              // reset intervals if year changes from 2018
              if (e.target.value !== "2018") {
                setSelectedInterval("annual");
                setSelectedPeriodRef("Annual");
              }
            }}
            className="h-9 px-3 border border-indigo-200 rounded-xl text-xs bg-indigo-50/40 text-indigo-900 font-bold focus:outline-none cursor-pointer hover:bg-indigo-100 transition-colors"
          >
            <option value="2016">2016 EFY (Baseline Year)</option>
            <option value="2017">2017 EFY (Intermediate Year)</option>
            <option value="2018">2018 EFY (Active dynamic)</option>
          </select>

          {/* Time Interval Selector (only active for 2018) */}
          <select
            value={selectedInterval}
            disabled={selectedYear !== "2018"}
            onChange={(e) => {
              const val = e.target.value as any;
              setSelectedInterval(val);
              if (val === "annual") setSelectedPeriodRef("Annual");
              else if (val === "six-month") setSelectedPeriodRef("H1");
              else setSelectedPeriodRef("Q1");
            }}
            className="h-9 px-3 border border-slate-220 rounded-xl text-xs bg-white text-slate-705 font-bold focus:outline-none cursor-pointer disabled:opacity-50 hover:bg-slate-50"
          >
            <option value="annual">YTD Annually</option>
            <option value="six-month">Six-Month Cycle</option>
            <option value="quarterly">Quarterly Session</option>
          </select>

          {/* Sub Period Reference selector */}
          <select
            value={selectedPeriodRef}
            disabled={selectedYear !== "2018" || selectedInterval === "annual"}
            onChange={(e) => setSelectedPeriodRef(e.target.value)}
            className="h-9 px-3 border border-slate-220 rounded-xl text-xs bg-white text-slate-705 font-bold focus:outline-none cursor-pointer disabled:opacity-50 hover:bg-slate-50"
          >
            {selectedInterval === "annual" && <option value="Annual">Annual Appraisal</option>}
            {selectedInterval === "six-month" && (
              <>
                <option value="H1">H1: Hamle - Tahsas (First Half)</option>
                <option value="H2">H2: Tirr - Sene (Second Half)</option>
              </>
            )}
            {selectedInterval === "quarterly" && (
              <>
                <option value="Q1">Q1: Hamle - Meskerem</option>
                <option value="Q2">Q2: Tikimt - Tahsas</option>
                <option value="Q3">Q3: Tirr - Megabit</option>
                <option value="Q4">Q4: Miazia - Sene</option>
              </>
            )}
          </select>
        </div>
      </div>
 
      {/* ── Summary strip ── */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center flex flex-col justify-center">
          <p className="text-xl font-extrabold text-slate-900">{rankedDepts.length}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Departments Ranked</p>
        </Card>
        <Card className="p-3 text-center flex flex-col justify-center">
          <p className="text-xl font-extrabold text-amber-600">{rankedDepts[0]?.score}%</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top Score</p>
        </Card>
        <Card className="p-3 text-center flex flex-col justify-center">
          <p className="text-xl font-extrabold text-indigo-600">{avgScore}%</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hospital Average</p>
        </Card>
      </div>
 
      {/* ── Main content ── */}
      <Tabs value={viewTab} onValueChange={setViewTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 rounded-xl w-fit flex gap-1 border">
          <TabsTrigger value="podium" className="text-xs px-3 py-1.5 font-bold flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-amber-500" />Podium View
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="text-xs px-3 py-1.5 font-bold flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-indigo-500" />Full Rankings
          </TabsTrigger>
        </TabsList>
 
        {/* Podium View */}
        <TabsContent value="podium" className="mt-4">
          {/* Podium */}
          <div className="flex flex-col md:flex-row justify-center items-center md:items-end gap-6 pb-6 pt-4 max-w-3xl mx-auto">
            {/* Silver */}
            {podiumOrder[0] && (
              <div className="w-[180px] shrink-0">
                <PodiumCard
                  dept={podiumOrder[0]}
                  rank={2}
                  weights={weights}
                  expanded={expandedPodium === 1}
                  onToggle={() => setExpandedPodium(expandedPodium === 1 ? null : 1)}
                />
                {/* Podium base */}
                <div className="mt-2 h-12 rounded-t-sm bg-slate-200/80 dark:bg-slate-700/50 flex items-center justify-center border-t select-none shadow-sm">
                  <span className="text-2xl font-black text-slate-400">2</span>
                </div>
              </div>
            )}
 
            {/* Gold */}
            {podiumOrder[1] && (
              <div className="w-[200px] shrink-0">
                <PodiumCard
                  dept={podiumOrder[1]}
                  rank={1}
                  weights={weights}
                  expanded={expandedPodium === 0}
                  onToggle={() => setExpandedPodium(expandedPodium === 0 ? null : 0)}
                />
                <div className="mt-2 h-20 rounded-t-sm bg-amber-200/60 dark:bg-amber-800/40 flex items-center justify-center border-t border-amber-300/40 select-none shadow-sm">
                  <span className="text-3xl font-black text-amber-600">1</span>
                </div>
              </div>
            )}
 
            {/* Bronze */}
            {podiumOrder[2] && (
              <div className="w-[180px] shrink-0">
                <PodiumCard
                  dept={podiumOrder[2]}
                  rank={3}
                  weights={weights}
                  expanded={expandedPodium === 2}
                  onToggle={() => setExpandedPodium(expandedPodium === 2 ? null : 2)}
                />
                <div className="mt-2 h-8 rounded-t-sm bg-amber-100/40 dark:bg-orange-850/20 flex items-center justify-center border-t select-none shadow-sm">
                  <span className="text-xl font-black text-amber-700">3</span>
                </div>
              </div>
            )}
          </div>
 
          {/* Remaining departments */}
          {rankedDepts.length > 3 && (
            <Card className="rounded-2xl border bg-white p-5 shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">Other Departments</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-slate-100 pt-0">
                {rankedDepts.slice(3).map((d, i) => {
                  const rank = i + 4;
                  return (
                    <div key={d.name} className="flex items-center gap-3 py-3 first:pt-3">
                      <span className="text-sm font-bold text-slate-400 w-5 tabular-nums">
                        {rank}
                      </span>
                      <Award className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="flex-1 text-sm font-semibold text-slate-805">{d.name}</span>
                      <TrendBadge trend={d.trend} />
                      <RankDelta current={rank} prev={d.prevRank} />
                      <span className="font-mono text-sm font-bold text-indigo-600 w-12 text-right tabular-nums">
                        {d.score}%
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>
 
        {/* Full Leaderboard */}
        <TabsContent value="leaderboard" className="mt-4">
          <Card className="rounded-2xl border bg-white shadow-sm overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50/50">
                    <th className="p-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400 w-16">
                      Rank
                    </th>
                    <th className="p-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                      Department
                    </th>
                    <th className="p-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                      Total Score
                    </th>
                    {weights.map((w) => (
                      <th
                        key={w.label}
                        className="p-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ background: w.color }}
                          />
                          {w.label.split(" ")[0]}
                        </span>
                      </th>
                    ))}
                    <th className="p-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                      Trend
                    </th>
                    <th className="p-3 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {rankedDepts.map((d, i) => (
                    <LeaderboardRow
                      key={d.name}
                      dept={d}
                      rank={i + 1}
                      weights={weights}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
 
      {/* Criteria legend */}
      <Card className="bg-slate-50/30 border p-4 rounded-xl">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Settings2 className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-bold uppercase tracking-wider text-[10px]">Scoring Policy Weights:</span>
            </div>
            {weights.map((w) => (
              <div key={w.label} className="flex items-center gap-1.5 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-sm inline-block"
                  style={{ background: w.color }}
                />
                <span className="text-slate-500 font-medium">{w.label}</span>
                <span className="font-bold text-slate-900">{w.weight}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
