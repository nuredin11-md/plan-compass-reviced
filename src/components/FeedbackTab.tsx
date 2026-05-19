import React, { useMemo, useState, useRef, useCallback } from "react";
import { indicators, getActualYTD, getStatus, getProgramAreas, MONTHS, type MonthlyEntry } from "@/data/hospitalIndicators";
import { getDepartmentFeedbackData, getPeriodicPerformanceFeedback } from "@/lib/exportUtils";
import { exportToPDF } from "@/lib/exportUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Target, MessageSquareText, AlertCircle, TrendingUpIcon, Info } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { EmptyDataState } from "@/components/EmptyDataState";
import { validateDepartmentData, shouldGenerateFeedback } from "@/lib/dataValidation";

interface Props {
  monthlyData: MonthlyEntry[];
  indicators?: any;
  profile?: any;
}

const STATUS_COLORS_HEX = {
  green: "#22895a",
  yellow: "#cc8000",
  red: "#dc2626",
};

export default function FeedbackTab({ monthlyData }: Props) {
  const [selectedArea, setSelectedArea] = useState("all");
  const [timePeriod, setTimePeriod] = useState<"monthly" | "quarterly" | "semiannual" | "annual">("quarterly");

  const feedbackData = useMemo(() => getDepartmentFeedbackData(monthlyData), [monthlyData]);
  const periodicFeedback = useMemo(() => getPeriodicPerformanceFeedback(monthlyData, timePeriod), [monthlyData, timePeriod]);

  // Validate data availability for feedback generation
  const dataValidation = useMemo(() => {
    if (selectedArea === "all") {
      const allAreas = getProgramAreas();
      const validations = new Map<string, ReturnType<typeof shouldGenerateFeedback>>();
      allAreas.forEach((area) => {
        const areaInds = indicators.filter((i) => i.programArea === area);
        const validation = shouldGenerateFeedback(areaInds, monthlyData, timePeriod, 0, 0.7);
        validations.set(area, validation);
      });
      return validations;
    } else {
      const areaInds = indicators.filter((i) => i.programArea === selectedArea);
      const validation = shouldGenerateFeedback(areaInds, monthlyData, timePeriod, 0, 0.7);
      return new Map([[selectedArea, validation]]);
    }
  }, [monthlyData, timePeriod, selectedArea]);

  const displayed = useMemo(
    () => (selectedArea === "all" ? feedbackData : feedbackData.filter((d) => d.area === selectedArea)),
    [feedbackData, selectedArea]
  );
  
  const displayedPeriodic = useMemo(
    () => (selectedArea === "all" ? periodicFeedback : periodicFeedback.filter((d) => d.area === selectedArea)),
    [periodicFeedback, selectedArea]
  );

  // Check if any data is available
  const hasAnyData = monthlyData.some((e) => e.actual !== null && e.actual !== undefined);

  const handleExportPDF = (areaData: ReturnType<typeof getDepartmentFeedbackData>[0]) => {
    const headers = ["Code", "Indicator", "Target", "Actual (YTD)", "% Achieved", "Status"];
    const rows = areaData.details.map((d) => [
      d.code,
      d.indicator,
      d.target,
      d.actual,
      `${d.percent}%`,
      d.status === "green" ? "On Track" : d.status === "yellow" ? "At Risk" : "Off Track",
    ]);
    exportToPDF(
      `Department Feedback: ${areaData.area} (Avg: ${areaData.avgPercent}%)`,
      headers,
      rows,
      `Feedback_${areaData.area.replace(/\s+/g, "_")}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters & Period Selector */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Select value={selectedArea} onValueChange={setSelectedArea}>
          <SelectTrigger className="w-full sm:w-[280px]">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {getProgramAreas().map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as typeof timePeriod)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="semiannual">Semi-annual</SelectItem>
            <SelectItem value="annual">Annual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs: Annual vs Periodic */}
      <Tabs defaultValue="annual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="annual" className="gap-1.5">Annual Feedback</TabsTrigger>
          <TabsTrigger value="periodic" className="gap-1.5">
            <AlertCircle className="h-4 w-4" /> {timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)} Performance
          </TabsTrigger>
        </TabsList>

        {/* ─── ANNUAL FEEDBACK TAB ─── */}
        <TabsContent value="annual" className="space-y-6 mt-6">
          {!hasAnyData ? (
            <EmptyDataState type="period" period="analysis" name="Annual Feedback" />
          ) : displayed.length === 0 ? (
            <EmptyDataState type="department" period="annual" />
          ) : (
            displayed.map((dept) => {
              const deptValidation = dataValidation.get(dept.area);
              const canShowFeedback = deptValidation?.shouldGenerate ?? false;

              const chartData = dept.details.map((d) => ({
                name: d.code,
                percent: d.percent,
                status: d.status,
              }));

              const onTrack = dept.details.filter((d) => d.status === "green").length;
              const atRisk = dept.details.filter((d) => d.status === "yellow").length;
              const offTrack = dept.details.filter((d) => d.status === "red").length;

              const topPerformer = [...dept.details].sort((a, b) => b.percent - a.percent)[0];
              const bottomPerformer = [...dept.details].sort((a, b) => a.percent - b.percent)[0];

              return (
                <div key={dept.area} className="rounded-lg border bg-card overflow-hidden">
                  {/* Header */}
                  <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquareText className="h-5 w-5 text-indigo-400" />
                      <div>
                        <h3 className="font-bold text-white">{dept.area}</h3>
                        <p className="text-xs text-slate-400">
                          Average Achievement: {dept.avgPercent}% • {dept.details.length} indicators
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        dept.status === "green" ? "bg-emerald-50 text-emerald-700" : dept.status === "yellow" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                      }`}>
                        {dept.status === "green" ? "On Track" : dept.status === "yellow" ? "At Risk" : "Needs Attention"}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => handleExportPDF(dept)} className="gap-1 bg-white hover:bg-slate-50 text-slate-700">
                        <FileDown className="h-3.5 w-3.5 text-indigo-600" /> PDF
                      </Button>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Data Completeness Warning */}
                    {!canShowFeedback && deptValidation && (
                      <div className="p-3 rounded-lg border-l-4 border-l-amber-500 bg-amber-50">
                        <p className="text-sm flex items-start gap-2 text-amber-900">
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
                          <span>{deptValidation.reason}</span>
                        </p>
                      </div>
                    )}

                    {/* Quick stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <MiniStat icon={<Target className="h-4 w-4 text-slate-500" />} label="Indicators" value={dept.details.length} />
                      <MiniStat icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="On Track" value={onTrack} />
                      <MiniStat icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} label="At Risk" value={atRisk} />
                      <MiniStat icon={<TrendingDown className="h-4 w-4 text-rose-600" />} label="Off Track" value={offTrack} />
                      <MiniStat icon={<TrendingUp className="h-4 w-4 text-indigo-600" />} label="Avg %" value={`${dept.avgPercent}%`} />
                    </div>

                    {/* Chart */}
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#64748b" angle={-45} textAnchor="end" height={50} />
                          <YAxis tick={{ fontSize: 10 }} stroke="#64748b" domain={[0, 100]} />
                          <Tooltip formatter={(v: number) => [`${v}%`, "Achievement"]} />
                          <Bar dataKey="percent" radius={[3, 3, 0, 0]}>
                            {chartData.map((d, i) => (
                              <Cell key={i} fill={STATUS_COLORS_HEX[d.status as keyof typeof STATUS_COLORS_HEX] || STATUS_COLORS_HEX.green} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Feedback narrative - Only show if data is sufficient */}
                    {canShowFeedback ? (
                      <div className="rounded-xl bg-slate-50 border border-slate-10 border-solid p-4 text-xs space-y-2 text-slate-700 leading-relaxed">
                        <h4 className="font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1.5 mb-2">
                          <MessageSquareText className="h-4 w-4 text-indigo-600" /> Performance Strategic Advice
                        </h4>
                        <p>
                          The <strong>{dept.area}</strong> department has achieved an average of <strong>{dept.avgPercent}%</strong> towards
                          annual targets. {onTrack > 0 && <>{onTrack} indicator{onTrack > 1 ? "s are" : " is"} on track. </>}
                          {offTrack > 0 && (
                            <span className="text-rose-600 font-bold">
                              {offTrack} indicator{offTrack > 1 ? "s require" : " requires"} immediate attention.
                            </span>
                          )}
                        </p>
                        {topPerformer && (
                          <p>
                            <strong className="text-emerald-700">Best performer:</strong> {topPerformer.indicator} ({topPerformer.percent}%)
                          </p>
                        )}
                        {bottomPerformer && (
                          <p>
                            <strong className="text-rose-600">Needs improvement:</strong> {bottomPerformer.indicator} ({bottomPerformer.percent}%)
                          </p>
                        )}
                        {dept.avgPercent < 50 && (
                          <p className="font-semibold text-rose-600">
                            ⚠ Recommendation: Conduct an urgent performance review meeting. Develop action plans for all off-track indicators.
                          </p>
                        )}
                        {dept.avgPercent >= 50 && dept.avgPercent < 70 && (
                          <p className="font-semibold text-amber-600">
                            ⚠ Recommendation: Schedule a departmental review to identify bottlenecks and reallocate resources to underperforming indicators.
                          </p>
                        )}
                        {dept.avgPercent >= 70 && dept.avgPercent < 90 && (
                          <p className="text-slate-550">
                            ✓ Good progress. Continue monitoring and maintain current strategies. Focus on pushing at-risk indicators above target.
                          </p>
                        )}
                        {dept.avgPercent >= 90 && (
                          <p className="font-semibold text-emerald-700">
                            ✓ Excellent performance! Document best practices and share with other departments.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                        <p className="text-xs text-slate-500 flex items-start gap-2">
                          <Info className="h-4.5 w-4.5 text-indigo-600 mt-0.5 flex-shrink-0" />
                          Feedback triggers once reporting completeness clears the 70% threshold.
                        </p>
                      </div>
                    )}

                    {/* Indicator table */}
                    <div className="rounded-xl border border-slate-200 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-slate-50 text-slate-700">
                            <th className="text-left p-2 font-semibold">Code</th>
                            <th className="text-left p-2 font-semibold">Indicator</th>
                            <th className="text-right p-2 font-semibold">Target</th>
                            <th className="text-right p-2 font-semibold">Actual</th>
                            <th className="text-right p-2 font-semibold">%</th>
                            <th className="text-center p-2 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dept.details.map((d, i) => (
                            <tr key={d.code} className={`border-b last:border-0 ${i % 2 ? "bg-slate-50/20" : ""}`}>
                              <td className="p-2 font-mono font-bold text-indigo-700">{d.code}</td>
                              <td className="p-2 text-[11px] font-medium text-slate-800">{d.indicator}</td>
                              <td className="p-2 text-right font-mono">{d.target}</td>
                              <td className="p-2 text-right font-mono font-bold">{d.actual}</td>
                              <td className="p-2 text-right font-mono font-extrabold text-slate-950">{d.percent}%</td>
                              <td className="p-2 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                  d.status === "green" ? "bg-emerald-50 text-emerald-700" : d.status === "yellow" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                                }`}>
                                  {d.status === "green" ? "On Track" : d.status === "yellow" ? "At Risk" : "Off Track"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        {/* ─── PERIODIC PERFORMANCE TAB ─── */}
        <TabsContent value="periodic" className="space-y-6 mt-6">
          {!hasAnyData ? (
            <EmptyDataState type="period" period={timePeriod} name={`${timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)} Performance`} />
          ) : displayedPeriodic.length === 0 ? (
            <EmptyDataState type="department" period={timePeriod} />
          ) : (
            displayedPeriodic.map((dept) => {
              const deptValidation = dataValidation.get(dept.area);
              const canShowAnalysis = deptValidation?.shouldGenerate ?? false;

              return (
                <Card key={dept.area} className={dept.hasIssue ? "border-l-4 border-l-amber-500" : "border-l-4 border-l-emerald-500"}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {dept.hasIssue && <AlertCircle className="h-5 w-5 text-amber-500" />}
                        {dept.area}
                      </CardTitle>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        dept.status === "green" ? "bg-emerald-50 text-emerald-700" : dept.status === "yellow" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                      }`}>
                        {dept.status === "green" ? "On Track" : dept.status === "yellow" ? "At Risk" : "Below Target"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{dept.period.charAt(0).toUpperCase() + dept.period.slice(1)} Performance Analysis Summary</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Data Completeness Warning */}
                    {!canShowAnalysis && deptValidation && (
                      <div className="p-3 rounded-lg border-l-4 border-l-amber-500 bg-amber-50">
                        <p className="text-sm flex items-start gap-2 text-amber-900">
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
                          <span>{deptValidation.reason}</span>
                        </p>
                      </div>
                    )}

                    {/* Performance Summary */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-center">
                        <p className="text-xs text-slate-500 font-medium">Target Avg</p>
                        <p className="text-xl font-extrabold font-mono text-slate-900">{Math.round(dept.target)}</p>
                      </div>
                      <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-center">
                        <p className="text-xs text-slate-500 font-medium">Actual Avg</p>
                        <p className="text-xl font-extrabold font-mono text-slate-900">{Math.round(dept.actual)}</p>
                      </div>
                      <div className={`p-3 rounded-xl border text-center ${dept.variancePercent < -20 ? "bg-rose-50 border-rose-200 text-rose-900" : dept.variancePercent > 20 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-slate-100 border-slate-200"}`}>
                        <p className="text-xs text-slate-550 font-medium">Variance</p>
                        <p className={`text-xl font-extrabold font-mono ${dept.variancePercent < -20 ? "text-rose-600" : dept.variancePercent > 20 ? "text-emerald-600" : "text-slate-800"}`}>
                          {dept.variancePercent > 0 ? "+" : ""}{dept.variancePercent}%
                        </p>
                      </div>
                    </div>

                    {/* Recommendation - Only show if data is sufficient */}
                    {canShowAnalysis ? (
                      <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                        dept.variancePercent < -20 
                          ? "bg-rose-50 border-rose-200 text-rose-900" 
                          : dept.variancePercent > 20 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                          : "bg-amber-50 border-amber-200 text-amber-900"
                      }`}>
                        <p className="font-bold flex items-center gap-1.5 border-b pb-1.5 mb-2 border-slate-200">📋 Performance Recommendation</p>
                        <p>{dept.recommendation}</p>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                        <p className="text-xs text-slate-500 flex items-start gap-2">
                          <Info className="h-4.5 w-4.5 text-indigo-600 mt-0.5 flex-shrink-0" />
                          Detailed recommendation will compile once sufficient reports satisfy baseline targets.
                        </p>
                      </div>
                    )}

                    {/* Critical Issues */}
                    {dept.criticalCount > 0 && canShowAnalysis && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-1.5">
                        <p className="font-bold text-rose-900 flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-rose-600" /> {dept.criticalCount} Clinical Objective Deficits Warning
                        </p>
                        <ul className="text-xs space-y-1 text-rose-800 pl-4 list-disc">
                          {dept.indicators
                            .filter((i) => i.severity === "critical")
                            .map((ind) => (
                              <li key={ind.code}>
                                <strong>{ind.code}:</strong> {ind.variancePercent > 0 ? "+" : ""}{ind.variancePercent}% variance deficit below clinical target.
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                    {/* Indicator Details Table */}
                    <div className="rounded-xl border border-slate-200 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-slate-50 text-slate-700">
                            <th className="text-left p-2 font-semibold">Code</th>
                            <th className="text-left p-2 font-semibold">Indicator</th>
                            <th className="text-right p-2 font-semibold">Target</th>
                            <th className="text-right p-2 font-semibold">Actual</th>
                            <th className="text-right p-2 font-semibold">Variance</th>
                            <th className="text-center p-2 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dept.indicators.map((ind, i) => (
                            <tr key={ind.code} className={`border-b last:border-0 ${ind.hasIssue ? "bg-amber-50/45 text-amber-950" : ""} ${i % 2 && !ind.hasIssue ? "bg-slate-50/20" : ""}`}>
                              <td className="p-2 font-mono font-bold text-indigo-700">{ind.code}</td>
                              <td className="p-2 text-[11px] font-medium text-slate-800">{ind.indicator}</td>
                              <td className="p-2 text-right font-mono">{Math.round(ind.target)}</td>
                              <td className="p-2 text-right font-mono font-bold">{Math.round(ind.actual)}</td>
                              <td className="p-2 text-right font-mono font-bold">
                                <span className={ind.variancePercent > 0 ? "text-emerald-700" : ind.variancePercent < 0 ? "text-rose-600" : "text-slate-500"}>
                                  {ind.variancePercent > 0 ? "+" : ""}{ind.variancePercent}%
                                </span>
                              </td>
                              <td className="p-2 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                  ind.status === "green" ? "bg-emerald-50 text-emerald-700" : ind.status === "yellow" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                                }`}>
                                  {ind.status === "green" ? "On Track" : ind.status === "yellow" ? "At Risk" : "Below Target"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center gap-2">
      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">{icon}</div>
      <div>
        <p className="font-extrabold text-base text-slate-900 leading-tight">{value}</p>
        <p className="text-[10px] text-slate-400 font-medium">{label}</p>
      </div>
    </div>
  );
}
