import React, { useState, useMemo } from "react";
import { Indicator, MonthlyEntry, UserProfile } from "../types";
import { ETHIOPIAN_MONTHS, DEPARTMENTS } from "../data/initialData";
import { 
  Building, CheckCircle2, AlertTriangle, XCircle, TrendingUp, Filter, Calendar, 
  HelpCircle, Sparkles, Layers, ListFilter, ArrowRightLeft, ShieldAlert
} from "lucide-react";

interface DashboardTabProps {
  indicators: Indicator[];
  monthlyData: MonthlyEntry[];
  profile: UserProfile;
}

export default function DashboardTab({ indicators, monthlyData, profile }: DashboardTabProps) {
  // Selector Filters
  const [selectedTimeframe, setSelectedTimeframe] = useState<"monthly" | "quarterly" | "annual">("quarterly");
  const [timeframeRef, setTimeframeRef] = useState<string>("Q1"); // Q1, Q2, Q3, Q4, or Hamle, Nehase, etc.
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedIndicatorCode, setSelectedIndicatorCode] = useState("All");

  // Filter Ethiopian months based on selected timeframe & reference
  const activeMonths = useMemo(() => {
    if (selectedTimeframe === "annual") {
      return ETHIOPIAN_MONTHS;
    }
    if (selectedTimeframe === "quarterly") {
      switch (timeframeRef) {
        case "Q1": return ["Hamle", "Nehase", "Meskerem"];
        case "Q2": return ["Tikimt", "Hidar", "Tahsas"];
        case "Q3": return ["Tirr", "Yekatit", "Megabit"];
        case "Q4": return ["Miazia", "Ginbot", "Sene"];
        default: return ["Hamle", "Nehase", "Meskerem"];
      }
    }
    // Monthly
    return [timeframeRef];
  }, [selectedTimeframe, timeframeRef]);

  // Adjust timeframeRef options based on chosen selectedTimeframe
  const timeframeOptions = useMemo(() => {
    if (selectedTimeframe === "quarterly") {
      return [
        { value: "Q1", label: "Q1: Hamle - Meskerem" },
        { value: "Q2", label: "Q2: Tikimt - Tahsas" },
        { value: "Q3", label: "Q3: Tirr - Megabit" },
        { value: "Q4", label: "Q4: Miazia - Sene" }
      ];
    }
    if (selectedTimeframe === "monthly") {
      return ETHIOPIAN_MONTHS.map(m => ({ value: m, label: m }));
    }
    return [{ value: "Annual", label: "EFY 2018 Entire Year" }];
  }, [selectedTimeframe]);

  // Automatically adjust default reference when selectedTimeframe changes
  const handleTimeframeChange = (val: "monthly" | "quarterly" | "annual") => {
    setSelectedTimeframe(val);
    if (val === "quarterly") {
      setTimeframeRef("Q1");
    } else if (val === "monthly") {
      setTimeframeRef("Hamle");
    } else {
      setTimeframeRef("Annual");
    }
  };

  // Filtered indicators based on department and indicator selection
  const deptIndicators = useMemo(() => {
    return indicators.filter(ind => {
      const matchesDept = selectedDept === "All" || ind.department === selectedDept;
      const matchesIndicator = selectedIndicatorCode === "All" || ind.code === selectedIndicatorCode;
      return matchesDept && matchesIndicator;
    });
  }, [indicators, selectedDept, selectedIndicatorCode]);

  // Performance calculations for each indicator in active timeframe
  const indicatorsStatus = useMemo(() => {
    const list: Array<{
      indicator: Indicator;
      reportingMonths: string[];
      hasReport: boolean;
      actualSum: number;
      targetSum: number;
      percentage: number | null;
      status: "On Track" | "At Risk" | "Off Track" | "No Data";
      statusColor: string;
      rawValues: Array<{ month: string; actual: number | null }>;
    }> = [];

    deptIndicators.forEach(ind => {
      let reportedCount = 0;
      let actualSum = 0;
      let targetSum = 0;
      const raw: Array<{ month: string; actual: number | null }> = [];

      activeMonths.forEach(m => {
        const found = monthlyData.find(entry => entry.code === ind.code && entry.month === m);
        const actVal = found ? found.actual : null;
        raw.push({ month: m, actual: actVal });

        if (actVal !== null) {
          reportedCount++;
          actualSum += actVal;
          targetSum += (ind.plan2018 / 12);
        }
      });

      const hasReport = reportedCount > 0;
      // Average percentage achieved across reporting months
      let percentage: number | null = null;
      let status: "On Track" | "At Risk" | "Off Track" | "No Data" = "No Data";
      let statusColor = "bg-slate-100 text-slate-600 border-slate-200";

      if (hasReport) {
        // Prevent division by zero
        percentage = targetSum > 0 ? Math.round((actualSum / targetSum) * 100) : 0;
        
        if (percentage >= 90) {
          status = "On Track";
          statusColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
        } else if (percentage >= 70) {
          status = "At Risk";
          statusColor = "bg-amber-100 text-amber-800 border-amber-200";
        } else {
          status = "Off Track";
          statusColor = "bg-rose-100 text-rose-800 border-rose-200";
        }
      }

      list.push({
        indicator: ind,
        reportingMonths: activeMonths.filter((_, i) => raw[i].actual !== null),
        hasReport,
        actualSum,
        targetSum,
        percentage,
        status,
        statusColor,
        rawValues: raw
      });
    });

    return list;
  }, [deptIndicators, monthlyData, activeMonths]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalCount = indicatorsStatus.length;
    const reportedCount = indicatorsStatus.filter(i => i.hasReport).length;
    const completenessStr = totalCount > 0 ? Math.round((reportedCount / totalCount) * 100) : 0;

    const itemsWithData = indicatorsStatus.filter(i => i.hasReport && i.percentage !== null);
    const avgPerformance = itemsWithData.length > 0
      ? Math.round(itemsWithData.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / itemsWithData.length)
      : null;

    const onTrackCount = indicatorsStatus.filter(i => i.status === "On Track").length;
    const atRiskCount = indicatorsStatus.filter(i => i.status === "At Risk").length;
    const offTrackCount = indicatorsStatus.filter(i => i.status === "Off Track").length;
    const noDataCount = indicatorsStatus.filter(i => i.status === "No Data").length;

    return {
      totalCount,
      reportedCount,
      completenessStr,
      avgPerformance,
      onTrackCount,
      atRiskCount,
      offTrackCount,
      noDataCount
    };
  }, [indicatorsStatus]);

  // Data endpoints for custom SVG line chart (over all 12 months)
  const chartMonthlyPoints = useMemo(() => {
    return ETHIOPIAN_MONTHS.map((m) => {
      const activeEntries = monthlyData.filter(entry => entry.month === m);
      
      let totalPrc = 0;
      let count = 0;

      activeEntries.forEach((entry) => {
        const ind = indicators.find(i => i.code === entry.code);
        if (ind && entry.actual !== null && ind.plan2018 > 0) {
          totalPrc += (entry.actual / (ind.plan2018 / 12)) * 100;
          count++;
        }
      });

      return {
        month: m,
        score: count > 0 ? Math.round(totalPrc / count) : null,
      };
    });
  }, [monthlyData, indicators]);

  return (
    <div className="space-y-6">
      
      {/* Top filter control bar */}
      <div className="bg-slate-900 text-white rounded-xl shadow-md p-4 flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-800">
        
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-600/30 border border-indigo-500/20 text-indigo-400">
            <Building className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 leading-none">
              <span>{profile.facility}</span>
            </h3>
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold">
              Region Authority: {profile.region}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full md:w-auto items-center">
          
          {/* Timeframe Scope Selector */}
          <div className="flex h-9 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => handleTimeframeChange("monthly")}
              className={`flex-1 px-3 text-[10px] font-bold rounded-md uppercase cursor-pointer transition-colors ${selectedTimeframe === "monthly" ? "bg-indigo-600 text-white font-extrabold" : "text-slate-400 hover:text-white"}`}
            >
              Month
            </button>
            <button
              onClick={() => handleTimeframeChange("quarterly")}
              className={`flex-1 px-3 text-[10px] font-bold rounded-md uppercase cursor-pointer transition-colors ${selectedTimeframe === "quarterly" ? "bg-indigo-600 text-white font-extrabold" : "text-slate-400 hover:text-white"}`}
            >
              Quarter
            </button>
            <button
              onClick={() => handleTimeframeChange("annual")}
              className={`flex-1 px-3 text-[10px] font-bold rounded-md uppercase cursor-pointer transition-colors ${selectedTimeframe === "annual" ? "bg-indigo-600 text-white font-extrabold" : "text-slate-400 hover:text-white"}`}
            >
              Annual
            </button>
          </div>

          {/* Reference Time selector */}
          <select
            value={timeframeRef}
            onChange={(e) => setTimeframeRef(e.target.value)}
            disabled={selectedTimeframe === "annual"}
            className="h-9 px-3 border border-slate-700 rounded-lg text-xs bg-slate-800 text-white font-bold cursor-pointer focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {timeframeOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="text-slate-900 bg-white">{opt.label}</option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setSelectedIndicatorCode("All");
            }}
            className="h-9 px-3 border border-slate-700 rounded-lg text-xs bg-slate-800 text-white font-bold cursor-pointer focus:ring-1 focus:ring-indigo-500"
          >
            <option value="All" className="text-slate-900 bg-white">All Departments</option>
            {DEPARTMENTS.map(d => (
              <option key={d} value={d} className="text-slate-900 bg-white">{d}</option>
            ))}
          </select>

          {/* Indicator Focus selector */}
          <select
            value={selectedIndicatorCode}
            onChange={(e) => setSelectedIndicatorCode(e.target.value)}
            className="h-9 px-3 border border-slate-705 rounded-lg text-xs bg-slate-800 text-white font-bold cursor-pointer focus:ring-1 focus:ring-indigo-505 max-w-[210px]"
          >
            <option value="All" className="text-slate-900 bg-white">All Indicators</option>
            {indicators
              .filter(i => selectedDept === "All" || i.department === selectedDept)
              .map(i => (
                <option key={i.code} value={i.code} className="text-slate-900 bg-white">
                  [{i.code}] {i.name.length > 25 ? `${i.name.slice(0, 25)}...` : i.name}
                </option>
              ))}
          </select>

        </div>

      </div>

      {/* KPI Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Data Completeness */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="space-y-1 z-10">
            <span className="text-xs text-slate-400 uppercase font-mono tracking-wider font-semibold block">Reporting Completeness</span>
            <div className="text-2xl font-extrabold text-slate-950 font-mono tracking-tight leading-none">
              {stats.completenessStr}%
            </div>
            <span className="text-[10px] text-slate-500 font-semibold block pt-1 leading-normal">
              {stats.reportedCount} are reported out of {stats.totalCount} indices
            </span>
          </div>
          <div className="p-3.5 rounded-full bg-indigo-50 text-indigo-600 z-10">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="absolute right-0 bottom-0 h-1/2 w-1/3 bg-indigo-50/20 rounded-tl-full pointer-events-none"></div>
        </div>

        {/* KPI 2: Overall average performance score */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="space-y-1 z-10">
            <span className="text-xs text-slate-400 uppercase font-mono tracking-wider font-semibold block">Average Target Met</span>
            <div className="text-2xl font-extrabold text-slate-950 font-mono tracking-tight leading-none flex items-baseline gap-1">
              <span>{stats.avgPerformance !== null ? `${stats.avgPerformance}%` : "Incomplete"}</span>
            </div>
            <span className="text-[10px] text-slate-500 font-semibold block pt-1 leading-normal">
              {stats.avgPerformance !== null ? `Average of reported metrics` : "No entries submitted in timeframe"}
            </span>
          </div>
          <div className="p-3.5 rounded-full bg-emerald-50 text-emerald-600 z-10">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div className="absolute right-0 bottom-0 h-1/2 w-1/3 bg-emerald-50/20 rounded-tl-full pointer-events-none"></div>
        </div>

        {/* KPI 3: Status On Track vs At Risk */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden sm:col-span-2 lg:col-span-2">
          <div className="space-y-2 z-10 w-full">
            <span className="text-xs text-slate-400 uppercase font-mono tracking-wider font-semibold block">Objectives Status Distribution</span>
            
            <div className="grid grid-cols-3 gap-2">
              
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">ON TRACK</span>
                  <span className="text-sm font-extrabold font-mono text-emerald-900 leading-none">{stats.onTrackCount}</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">AT RISK</span>
                  <span className="text-sm font-extrabold font-mono text-amber-900 leading-none">{stats.atRiskCount}</span>
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-100 rounded-lg p-2 flex items-center gap-1.5">
                <XCircle className="h-4 w-4 text-rose-600" />
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">OFF-TRACK</span>
                  <span className="text-sm font-extrabold font-mono text-rose-900 leading-none">{stats.offTrackCount}</span>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* Main Graphs & Critical Alerts Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Side: Modern custom SVG 12-Month Performance Trend Chart */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                <span>12-Month Hospital Performance Trend</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Line Graph tracks average target realization rate (Hamle 2015 to Sene 2016)</p>
            </div>
            
            <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-slate-300"></span>
                <span>Unpopulated Months</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
                <span>Achievement Trend</span>
              </div>
            </div>
          </div>

          {/* Line Chart Grid rendered with raw SVGs for 100% React 19 safety */}
          <div className="h-64 relative pt-4 pr-4 pl-8">
            
            {/* Background Grid Lines & Y-Axis Labels */}
            {[100, 75, 50, 25, 0].map((lbl, idx) => (
              <div key={lbl} className="absolute left-0 right-0 border-t border-slate-100 flex items-center justify-between" style={{ top: `${(idx * 25) + 16}px` }}>
                <span className="text-[10px] font-mono font-bold text-slate-400 -ml-8">{lbl}%</span>
              </div>
            ))}

            {/* Target 100% Goal line marker */}
            <div className="absolute left-8 right-0 border-t-2 border-dashed border-rose-300 z-10" style={{ top: `16px` }} title="100% Target Matchline">
              <span className="text-[9px] bg-rose-50 border border-rose-200 text-rose-800 font-bold px-1.5 py-0.5 rounded-full absolute right-2 -top-3">
                Target Threshold
              </span>
            </div>

            {/* Rendered SVG Path */}
            <svg className="w-full h-full overflow-visible z-20 position-relative" viewBox="0 0 540 180" preserveAspectRatio="none">
              
              {/* Grid area coordinates mapping */}
              {(() => {
                // Find point coordinates
                const width = 540;
                const height = 180;
                const points = chartMonthlyPoints.map((pt, idx) => {
                  const x = (idx / (ETHIOPIAN_MONTHS.length - 1)) * width;
                  const y = pt.score !== null ? height - (pt.score / 100) * height : null;
                  return { x, y, month: pt.month, score: pt.score };
                });

                // Generate path string for achievement line
                const reportedPoints = points.filter(p => p.y !== null) as Array<{ x: number; y: number; score: number }>;
                let pathString = "";
                if (reportedPoints.length > 0) {
                  pathString = `M ${reportedPoints[0].x} ${reportedPoints[0].y} ` + 
                    reportedPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
                }

                // Generates area fill path string from same reported points
                let areaPathString = "";
                if (reportedPoints.length > 0) {
                  const pathStart = reportedPoints[0];
                  const pathEnd = reportedPoints[reportedPoints.length - 1];
                  areaPathString = `M ${pathStart.x} ${height} L ${pathStart.x} ${pathStart.y} ` +
                    reportedPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ") +
                    ` L ${pathEnd.x} ${height} Z`;
                }

                return (
                  <>
                    {/* Shaded Area Fill */}
                    {areaPathString && (
                      <path d={areaPathString} fill="url(#blueGrad)" fillOpacity="0.1" />
                    )}

                    {/* Performance Line Path */}
                    {pathString && (
                      <path d={pathString} fill="none" stroke="rgb(79, 70, 229)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    )}

                    {/* Gradient Definition */}
                    <defs>
                      <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(79, 70, 229)" />
                        <stop offset="100%" stopColor="rgb(255, 255, 255)" />
                      </linearGradient>
                    </defs>

                    {/* Dots / Plots circles */}
                    {points.map((pt, idx) => {
                      if (pt.y === null) return null;
                      return (
                        <g key={pt.month}>
                          <circle 
                            cx={pt.x} 
                            cy={pt.y} 
                            r="5" 
                            className="fill-indigo-600 stroke-white stroke-2 hover:r-7 transition-all cursor-pointer"
                          />
                          {/* Floating Values bubble (only on top points) */}
                          <text 
                            x={pt.x} 
                            y={pt.y - 10} 
                            className="fill-slate-700 font-mono text-[9px] font-extrabold"
                            textAnchor="middle"
                          >
                            {pt.score}%
                          </text>
                        </g>
                      );
                    })}

                    {/* Virtual unsubmitted guidelines */}
                    {points.map((pt, idx) => {
                      if (pt.y !== null) return null;
                      const x = pt.x;
                      return (
                        <circle 
                          key={`empty-${idx}`}
                          cx={x} 
                          cy={180} 
                          r="3" 
                          className="fill-slate-300 stroke-none" 
                        />
                      );
                    })}
                  </>
                );
              })()}

            </svg>

            {/* X-axis months labels placement */}
            <div className="absolute bottom-[-16px] left-[32px] right-0 flex justify-between">
              {ETHIOPIAN_MONTHS.map((m) => (
                <span key={m} className="text-[9px] font-mono leading-none text-slate-400 font-semibold">{m.substring(0, 3)}</span>
              ))}
            </div>

          </div>

          <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between text-xs text-indigo-950 mt-4 leading-normal">
            <span className="font-semibold flex items-center gap-1">
              <Sparkles className="h-4 w-4 text-indigo-500 flex-shrink-0" />
              <span>Interactive Data Validation Info:</span>
            </span>
            <span>
              Unsubmitted values for future weeks are ignored in calculations rather than assumed as 0. This preserves the reporting integrity.
            </span>
          </div>
        </div>

        {/* Right Side: Critical alerts with off-track metrics list */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-rose-500" />
              <span>Performance Alerts & Roadblocks</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Critical indicators performing under target thresholds</p>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            
            {/* Filter indicatorsStatus to show only At Risk and Off Track */}
            {indicatorsStatus.filter(i => i.status === "At Risk" || i.status === "Off Track" || i.status === "No Data").length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
                <p className="text-xs font-semibold text-slate-700">All Metrics Safe & On Track!</p>
                <p className="text-[10px] text-slate-400 mt-0.5">No critical warnings reported.</p>
              </div>
            ) : (
              indicatorsStatus
                .filter(i => i.status === "At Risk" || i.status === "Off Track" || i.status === "No Data")
                .map((item) => {
                  const isOffTrack = item.status === "Off Track";
                  const isNoData = item.status === "No Data";

                  return (
                    <div 
                      key={item.indicator.code} 
                      className={`p-3 rounded-lg border flex flex-col gap-1.5 leading-snug ${
                        isNoData 
                          ? "bg-slate-50 border-slate-200 text-slate-700"
                          : isOffTrack 
                            ? "bg-rose-50 border-rose-100 text-rose-950" 
                            : "bg-amber-50 border-amber-100 text-amber-950"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase leading-none bg-white border border-slate-200">
                          {item.indicator.code}
                        </span>
                        
                        <span className={`text-[10px] font-bold ${isNoData ? "text-slate-500" : isOffTrack ? "text-rose-700" : "text-amber-700"}`}>
                          {isNoData ? "UNREPORTED" : `${item.percentage}% REACHED`}
                        </span>
                      </div>

                      <div className="text-xs font-bold leading-tight">{item.indicator.name}</div>
                      
                      <div className="text-[10px] text-slate-500 font-semibold uppercase font-mono flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        <span>{item.indicator.department}</span>
                      </div>

                      {/* Display the remarks comment if exists */}
                      {item.rawValues.map(v => {
                        const commentsFound = monthlyData.find(m => m.code === item.indicator.code && m.month === v.month && m.remarks);
                        if (commentsFound && commentsFound.remarks) {
                          return (
                            <div key={v.month} className="text-[9px] p-2 bg-white/70 border border-slate-200 rounded leading-normal italic text-slate-600 mt-1">
                              <strong>{v.month}:</strong> &quot;{commentsFound.remarks}&quot;
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  );
                })
            )}

          </div>

          <div className="text-[10px] text-slate-400 text-center italic">
            KPI classification: On Track (&gt;=90%) | At Risk (70%-89%) | Off Track (&lt;70%)
          </div>

        </div>

      </div>

    </div>
  );
}
