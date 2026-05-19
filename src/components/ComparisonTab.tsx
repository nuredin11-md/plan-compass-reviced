import React, { useState, useMemo } from "react";
import { UserProfile, Indicator, MonthlyEntry } from "../types";
import { 
  GitCompare, ArrowUpRight, ArrowDownRight, RefreshCw, BarChart4, TrendingUp, Sparkles, Sliders
} from "lucide-react";

interface ComparisonTabProps {
  indicators: Indicator[];
  monthlyData: MonthlyEntry[];
  profile: UserProfile;
}

export default function ComparisonTab({ indicators, monthlyData, profile }: ComparisonTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = useMemo(() => {
    const list = new Set(indicators.map(ind => ind.category));
    return ["All", ...Array.from(list)];
  }, [indicators]);

  const departmentIndicators = useMemo(() => {
    return indicators.filter(ind => profile.department === "All" || ind.department === profile.department);
  }, [indicators, profile]);

  const comparisonData = useMemo(() => {
    return departmentIndicators
      .filter(ind => selectedCategory === "All" || ind.category === selectedCategory)
      .map(ind => {
        const reports = monthlyData.filter(e => e.code === ind.code && e.actual !== null);
        const sumVal = reports.reduce((acc, curr) => acc + (curr.actual || 0), 0);
        const actualAvg = reports.length > 0 ? Math.round(sumVal / reports.length) : null;
        
        const deltaTarget = ind.target2016 - ind.baseline2015;
        const deltaActual = actualAvg !== null ? (actualAvg - ind.baseline2015) : 0;
        const progressPct = actualAvg !== null 
          ? Math.round(((actualAvg - ind.baseline2015) / (ind.target2016 - ind.baseline2015 || 1)) * 100)
          : null;

        return {
          ...ind,
          actualAvg,
          deltaTarget,
          deltaActual,
          progressPct
        };
      });
  }, [departmentIndicators, monthlyData, selectedCategory]);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Tab controls */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
        
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 text-indigo-400 p-1.5 rounded-lg">
              <GitCompare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-950">Year-over-Year Strategic Alignment</h2>
              <p className="text-[11px] text-slate-400 font-medium">Compares EFY 2015 national baselines against strategic targets and cumulative reporting actuals</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Sliders className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-450">Category Filter:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-8 px-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-850 font-bold focus:outline-none"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Outer comparison grid */}
        <div className="grid grid-cols-1 gap-6 pt-5">
          {comparisonData.length === 0 ? (
            <div className="text-center p-8 text-xs font-semibold text-slate-400 bg-slate-50 border border-dashed rounded-xl">
              No matching indicator plans found for {profile.department} under {selectedCategory}.
            </div>
          ) : (
            comparisonData.map((ind) => {
              const matchesBaseline = ind.actualAvg !== null;
              const hasGrowth = matchesBaseline && ind.actualAvg! > ind.baseline2015;
              const hasTargetMet = matchesBaseline && ind.actualAvg! >= ind.target2016;

              return (
                <div key={ind.code} className="border border-slate-200 p-5 rounded-xl bg-slate-50/50 flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                  
                  {/* Info */}
                  <div className="space-y-1 max-w-sm lg:max-w-md">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-extrabold px-1.5 py-0.5 bg-indigo-50 border border-indigo-150 rounded text-indigo-700">{ind.code}</span>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">{ind.category}</span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">{ind.name}</h4>
                    <p className="text-[11px] text-slate-400 font-medium leading-normal">
                      Baseline: {ind.baseline2015}% | Target: {ind.target2016}% | Department: {ind.department}
                    </p>
                  </div>

                  {/* High Contrast Visual comparative bars */}
                  <div className="flex-1 max-w-xl space-y-2">
                    
                    {/* Baseline Bar */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-500 font-mono">
                        <span>EFY 2015 Baseline</span>
                        <span>{ind.baseline2015}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="bg-slate-500 h-full rounded-full transition-all" style={{ width: `${ind.baseline2015}%` }}></div>
                      </div>
                    </div>

                    {/* Actual Average Bar */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[11px] font-bold text-slate-950 font-mono">
                        <span className="flex items-center gap-1.5">
                          <span>EFY 2016 Reporting Actual</span>
                          {matchesBaseline && (
                            hasGrowth 
                              ? <span className="text-xs text-emerald-600 font-bold flex items-center gap-0.5 font-sans">
                                  <ArrowUpRight className="h-3 w-3" />+{ind.deltaActual}% YoY uplift
                                </span> 
                              : <span className="text-xs text-rose-600 font-bold flex items-center gap-0.5 font-sans">
                                  <ArrowDownRight className="h-3 w-3" />{ind.deltaActual}% YoY change
                                </span>
                          )}
                        </span>
                        <span>{matchesBaseline ? `${ind.actualAvg}%` : "No submissions logged"}</span>
                      </div>
                      <div className="h-2.5 bg-slate-205 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            hasTargetMet ? "bg-emerald-600" : matchesBaseline && ind.actualAvg! >= ind.baseline2015 ? "bg-indigo-600" : "bg-rose-650"
                          }`} 
                          style={{ width: `${ind.actualAvg || 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Target Bar */}
                    <div className="space-y-0.5 opacity-65">
                      <div className="flex justify-between text-[11px] font-semibold text-indigo-950 font-mono">
                        <span>EFY 2016 Aim Target</span>
                        <span>{ind.target2016}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="bg-indigo-600/65 h-full rounded-full transition-all" style={{ width: `${ind.target2016}%` }}></div>
                      </div>
                    </div>

                  </div>

                  {/* Summary evaluation badges */}
                  <div className="flex items-center justify-end flex-shrink-0 w-32">
                    {matchesBaseline ? (
                      hasTargetMet ? (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center w-full space-y-0.5">
                          <span className="text-[10px] font-mono font-extrabold uppercase text-emerald-800 block">TARGET REALIZED</span>
                          <span className="text-lg font-bold font-mono text-emerald-950">{ind.actualAvg}%</span>
                        </div>
                      ) : (
                        <div className="p-3 bg-indigo-50 border border-indigo-150 rounded-xl text-center w-full space-y-0.5">
                          <span className="text-[10px] font-mono font-extrabold uppercase text-indigo-800 block">GROWTH CAP</span>
                          <span className="text-lg font-bold font-mono text-indigo-950">{ind.progressPct !== null ? `${ind.progressPct}%` : "0%"}</span>
                        </div>
                      )
                    ) : (
                      <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center w-full space-y-0.5">
                        <span className="text-[9px] font-mono font-extrabold uppercase text-slate-400 block">EMPTY METRICS</span>
                        <span className="text-sm font-sans font-bold text-slate-400">PENDING</span>
                      </div>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
