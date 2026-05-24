import React, { useState, useMemo } from "react";
import { UserProfile, Indicator, MonthlyEntry } from "../types";
import { 
  GitCompare, ArrowUpRight, ArrowDownRight, RefreshCw, BarChart4, TrendingUp, Sparkles, Sliders, Calendar, ChevronRight, Activity, ArrowRight, Table
} from "lucide-react";

interface ComparisonTabProps {
  indicators: Indicator[];
  monthlyData: MonthlyEntry[];
  profile: UserProfile;
}

export default function ComparisonTab({ indicators, monthlyData, profile }: ComparisonTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [viewType, setViewType] = useState<"visual" | "table">("visual");

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
        // Historical Trends (2016 -> 2017)
        const pastGrowth = ind.perf2017 - ind.perf2016;
        const pastGrowthPct = ind.perf2016 > 0 ? Math.round((pastGrowth / ind.perf2016) * 100) : null;

        // Baseline 2017 -> Plan 2018 Targeted Growth
        const targetGrowth18 = ind.plan2018 - ind.perf2017;
        const targetGrowthPct18 = ind.perf2017 > 0 ? Math.round((targetGrowth18 / ind.perf2017) * 100) : null;

        // Active 2018 Plan vs 10-Month Performance
        const activeProgressPct = ind.plan2018 > 0 ? Math.round((ind.perf2018 / ind.plan2018) * 100) : 0;

        // Baseline 2018 Performance -> Plan 2019 Targets
        const targetGrowth19 = ind.plan2019 - ind.perf2018;
        const targetGrowthPct19 = ind.perf2018 > 0 ? Math.round((targetGrowth19 / ind.perf2018) * 100) : null;

        return {
          ...ind,
          pastGrowth,
          pastGrowthPct,
          targetGrowth18,
          targetGrowthPct18,
          activeProgressPct,
          targetGrowth19,
          targetGrowthPct19
        };
      });
  }, [departmentIndicators, selectedCategory]);

  // Overall Department-wide Insights
  const departmentStats = useMemo(() => {
    if (comparisonData.length === 0) return null;

    let avgActiveProgress = 0;
    let totalPathGrowth = 0;
    let count = comparisonData.length;

    comparisonData.forEach(ind => {
      avgActiveProgress += ind.activeProgressPct;
      if (ind.pastGrowthPct !== null) totalPathGrowth += ind.pastGrowthPct;
    });

    return {
      avgProgress: Math.round(avgActiveProgress / count),
      avgHistoricalGrowth: Math.round(totalPathGrowth / count),
      indicatorCount: count
    };
  }, [comparisonData]);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header Info Panel */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 text-indigo-400 p-2 rounded-xl">
              <GitCompare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-950">Multi-Year Baseline &amp; Planning Comparison</h2>
              <p className="text-[11px] text-slate-400 font-medium">Evaluate past results (2016-2017) and trace the baseline linkage across 2018 and 2019 planning loops</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewType(viewType === "visual" ? "table" : "visual")}
              className="h-8 px-3 border border-slate-250 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {viewType === "visual" ? <Table className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}
              <span>{viewType === "visual" ? "Switch to Table View" : "Switch to Visual Timeline"}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
          {/* Category Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-400">Filter Objective Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Department-wide Average Progress Stats */}
          {departmentStats && (
            <>
              <div className="bg-slate-50 border border-slate-205 rounded-xl px-4 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase font-mono font-bold text-slate-400">Avg active progress (2018)</p>
                  <p className="text-base font-extrabold text-slate-900 font-mono mt-0.5">{departmentStats.avgProgress}%</p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-205 rounded-xl px-4 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase font-mono font-bold text-slate-400">Avg Past Growth (2016-17)</p>
                  <p className="text-base font-extrabold text-indigo-750 font-mono mt-0.5">
                    {departmentStats.avgHistoricalGrowth > 0 ? `+${departmentStats.avgHistoricalGrowth}%` : `${departmentStats.avgHistoricalGrowth}%`}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Comparative View */}
      {comparisonData.length === 0 ? (
        <div className="text-center p-12 text-xs font-semibold text-slate-400 bg-white border border-slate-210 rounded-2xl shadow-sm">
          No matching indicators found for {profile.department} under category {selectedCategory}.
        </div>
      ) : viewType === "visual" ? (
        <div className="grid grid-cols-1 gap-6">
          {comparisonData.map((ind) => {
            return (
              <div key={ind.code} className="bg-white border border-slate-210 rounded-2xl shadow-sm hover:border-slate-300 transition-all p-5 space-y-5">
                
                {/* Upper Metadata & Title block */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3 border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 bg-indigo-50 border border-indigo-150 rounded text-indigo-700 tracking-wider">
                        {ind.code}
                      </span>
                      <span className="text-[9px] font-mono uppercase font-bold text-slate-400">
                        {ind.category}
                      </span>
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900 leading-snug">{ind.name}</h4>
                  </div>
                  
                  <div className="text-right flex sm:flex-col gap-2 sm:gap-0 h-full justify-between sm:justify-start items-center sm:items-end">
                    <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">unit: {ind.unit}</span>
                    <span className="text-[10px] text-gray-500 font-semibold bg-gray-100 px-2 py-0.5 rounded uppercase">{ind.department.split(' ')[0]}</span>
                  </div>
                </div>

                {/* The 3-Phase Strategic Planning Loop Timeline */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Phase 1: Real Past Performance (2016 -> 2017) */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase font-mono font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          Phase 1: Past Performance
                        </span>
                        {ind.pastGrowthPct !== null && (
                          <span className={`text-[10px] font-bold flex items-center gap-0.5 ${ind.pastGrowth >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                            {ind.pastGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {ind.pastGrowth >= 0 ? `+${ind.pastGrowthPct}%` : `${ind.pastGrowthPct}%`} grow
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-3 font-mono">Historical Comparative Loop</p>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-150">
                      <div className="text-center flex-1 bg-white p-2 border border-slate-200 rounded-lg">
                        <p className="text-[9px] uppercase font-mono text-slate-400">2016 Actual</p>
                        <p className="text-sm font-extrabold text-slate-900 font-mono mt-0.5">{ind.perf2016}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
                      <div className="text-center flex-1 bg-white p-2 border border-slate-200 rounded-lg">
                        <p className="text-[9px] uppercase font-mono text-slate-400">2017 Actual</p>
                        <p className="text-sm font-extrabold text-indigo-850 font-mono mt-0.5">{ind.perf2017}</p>
                      </div>
                    </div>
                  </div>

                  {/* Phase 2: Active Targeted Growth (2017 Baseline -> 2018 Plan) */}
                  <div className="bg-slate-50/50 rounded-xl p-4 border border-indigo-100 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase font-mono font-extrabold text-violet-750 bg-violet-50 px-2 py-0.5 rounded border border-violet-100">
                          Phase 2: Active Target
                        </span>
                        {ind.targetGrowthPct18 !== null && (
                          <span className="text-[10px] font-bold text-violet-700 flex items-center gap-0.5">
                            <Sparkles className="h-3 w-3" />
                            +{ind.targetGrowthPct18}% target
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-3 font-mono">2017 Performance as Baseline</p>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-indigo-100">
                      <div className="text-center flex-1 bg-indigo-50/30 p-2 border border-indigo-100 rounded-lg">
                        <p className="text-[9px] uppercase font-mono text-indigo-500 font-bold">2017 Perf (Base)</p>
                        <p className="text-sm font-extrabold text-indigo-900 font-mono mt-0.5">{ind.perf2017}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                      <div className="text-center flex-1 bg-white p-2 border border-slate-210 rounded-lg">
                        <p className="text-[9px] uppercase font-mono text-slate-400">2018 Plan Target</p>
                        <p className="text-sm font-extrabold text-slate-950 font-mono mt-0.5">{ind.plan2018}</p>
                      </div>
                    </div>
                  </div>

                  {/* Phase 3: Next Target Generation (2018 Performance -> 2019 Plan) */}
                  <div className="bg-slate-50/50 rounded-xl p-4 border border-emerald-100 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase font-mono font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          Phase 3: Next target
                        </span>
                        {ind.targetGrowthPct19 !== null && (
                          <span className="text-[10px] font-bold text-emerald-650 flex items-center gap-0.5">
                            <ArrowUpRight className="h-3 w-3" />
                            +{ind.targetGrowthPct19}% loop
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-3 font-mono">Full 2018 Performance as Baseline</p>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-emerald-100">
                      <div className="text-center flex-1 bg-emerald-50/30 p-2 border border-emerald-150 rounded-lg">
                        <p className="text-[9px] uppercase font-mono text-emerald-600 font-bold">2018 Perf (Base)</p>
                        <p className="text-sm font-extrabold text-emerald-900 font-mono mt-0.5">{ind.perf2018}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      <div className="text-center flex-1 bg-white p-2 border border-slate-210 rounded-lg">
                        <p className="text-[9px] uppercase font-mono text-slate-400">2019 Plan Target</p>
                        <p className="text-sm font-extrabold text-slate-950 font-mono mt-0.5">{ind.plan2019}</p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Progress Bar of Active Year 2018 */}
                {ind.plan2018 > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px] font-bold text-slate-750 font-mono">
                      <span>EFY 2018 Execution Progress (2018 Performance vs 2018 Plan)</span>
                      <span>{ind.perf2018} achieved / {ind.plan2018} planned ({ind.activeProgressPct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden border">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          ind.activeProgressPct >= 90 ? "bg-emerald-500" : ind.activeProgressPct >= 70 ? "bg-indigo-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${Math.min(100, ind.activeProgressPct)}%` }}
                      />
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-fadeIn">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-150 text-left text-xs font-sans">
              <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider text-[10px] border-b">
                <tr>
                  <th className="px-5 py-3 font-mono">Code</th>
                  <th className="px-5 py-3">Objective Description</th>
                  <th className="px-3 py-3 text-right">2016 Perf</th>
                  <th className="px-3 py-3 text-right">2017 Perf (Base 18)</th>
                  <th className="px-3 py-3 text-right">2018 Plan</th>
                  <th className="px-3 py-3 text-right">2018 Perf (Base 19)</th>
                  <th className="px-3 py-3 text-right">2018 EAP</th>
                  <th className="px-3 py-3 text-right">2019 Plan</th>
                  <th className="px-3 py-3 text-right">Execution %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {comparisonData.map(ind => (
                  <tr key={ind.code} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 font-mono text-slate-900 border-r">{ind.code}</td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-900">{ind.name}</div>
                      <div className="text-[9px] text-slate-400 font-mono uppercase mt-0.5">{ind.category}</div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-slate-550">{ind.perf2016}</td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-indigo-700 bg-indigo-50/5">{ind.perf2017}</td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-slate-900">{ind.plan2018}</td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/5">{ind.perf2018}</td>
                    <td className="px-3 py-3 text-right font-mono text-slate-500">{ind.eap2018}</td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-indigo-900">{ind.plan2019}</td>
                    <td className="px-3 py-3 text-right font-mono font-extrabold text-slate-800">
                      {ind.activeProgressPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
