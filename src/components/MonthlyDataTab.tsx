import React, { useState, useMemo, useEffect } from "react";
import { Indicator, MonthlyEntry, UserProfile } from "../types";
import { ETHIOPIAN_MONTHS } from "../data/initialData";
import { localDb } from "../lib/supabaseClient";
import { Edit2, ShieldAlert, Sparkles, CheckCircle2, RefreshCw, Calendar, Eye, HelpCircle } from "lucide-react";

interface MonthlyDataTabProps {
  indicators: Indicator[];
  monthlyData: MonthlyEntry[];
  onMonthlyDataChange: (newData: MonthlyEntry[]) => void;
  profile: UserProfile;
}

export default function MonthlyDataTab({ indicators, monthlyData, onMonthlyDataChange, profile }: MonthlyDataTabProps) {
  // Select active indicator & month
  const [selectedIndCode, setSelectedIndCode] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("Meskerem");
  const [actualInput, setActualInput] = useState<string>("");
  const [remarksInput, setRemarksInput] = useState("");

  const [isSaved, setIsSaved] = useState(false);

  // Filter indicators that the current user has access to based on their department
  const accessibleIndicators = useMemo(() => {
    return indicators.filter((ind) => {
      // Admins and coordinators can access all. Other roles are restricted to their assigned department.
      if (profile.role === "admin" || profile.role === "regional_coordinator" || profile.role === "facility_head") {
        return true;
      }
      return ind.department === profile.department;
    });
  }, [indicators, profile]);

  // Set default selected indicator on load/shift of department
  useEffect(() => {
    if (accessibleIndicators.length > 0) {
      // Find matches if possible, or select first one
      if (!accessibleIndicators.some(ind => ind.code === selectedIndCode)) {
        setSelectedIndCode(accessibleIndicators[0].code);
      }
    } else {
      setSelectedIndCode("");
    }
  }, [accessibleIndicators]);

  // Load existing numeric value for the selected indicator & period
  const activeEntry = useMemo(() => {
    return monthlyData.find(
      (entry) => entry.code === selectedIndCode && entry.month === selectedMonth
    );
  }, [monthlyData, selectedIndCode, selectedMonth]);

  // Initialize input values from active entry
  useEffect(() => {
    if (activeEntry) {
      setActualInput(activeEntry.actual === null ? "" : String(activeEntry.actual));
      setRemarksInput(activeEntry.remarks || "");
    } else {
      setActualInput("");
      setRemarksInput("");
    }
    setIsSaved(false);
  }, [activeEntry, selectedIndCode, selectedMonth]);

  const activeIndicator = useMemo(() => {
    return indicators.find((ind) => ind.code === selectedIndCode);
  }, [indicators, selectedIndCode]);

  // Handle Submission / Update
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIndCode) return;

    // Check permissions
    if (profile.role === "viewer") {
      alert("Permission Denied: Your active role is 'Viewer'. Viewers have read-only access and cannot record performance actuals.");
      return;
    }

    let parsedActual: number | null = null;
    if (actualInput.trim() !== "") {
      parsedActual = Number(actualInput);
      if (isNaN(parsedActual) || parsedActual < 0) {
        alert("Error: Please enter a valid non-negative actual achievement number.");
        return;
      }
    }

    const entryToSave: MonthlyEntry = {
      code: selectedIndCode,
      month: selectedMonth,
      actual: parsedActual,
      remarks: remarksInput.trim(),
      updatedAt: new Date().toISOString()
    };

    localDb.saveMonthlyEntry(entryToSave);
    onMonthlyDataChange(localDb.getMonthlyEntries());
    setIsSaved(true);

    setTimeout(() => {
      setIsSaved(false);
    }, 2000);
  };

  const setExplicitZero = () => {
    setActualInput("0");
    setRemarksInput("Zero performance recorded explicitly. Needs review.");
  };

  const removeEntry = () => {
    setActualInput("");
    setRemarksInput("Data deleted / blanked.");
  };

  return (
    <div className="max-w-4xl mx-auto">
      
      {/* Introduction */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <span>Monthly Achievement Report & Performance Logging</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Select an indicator and record monthly performance metrics. Explicitly submit 0 to mark zero performance, or leave blank to denote unresolved / missing reports.
        </p>
      </div>

      {/* Role access warning banner */}
      <div className="bg-slate-950 text-white rounded-xl shadow-md p-4 border border-slate-800 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldAlert className="h-4 w-4" />
            <span>Active Security Context</span>
          </div>
          <p className="text-sm font-semibold text-white">
            Currently restricted as: <span className="underline decoration-indigo-500 text-indigo-300">{profile.role.replace("_", " ")}</span> 
            {profile.department !== "All" && ` within ${profile.department}`}
          </p>
          <p className="text-[10px] text-slate-400 leading-snug">
            {profile.role === "admin" 
              ? "Full permissions enabled. You can post data for any indicator." 
              : `You can only report entries representing details for ${profile.department}.`}
          </p>
        </div>
        
        <div className="text-xs font-mono bg-slate-800 py-1 px-3 border border-slate-700 rounded text-slate-300">
          Editable Indicators: <span className="font-bold text-emerald-400">{accessibleIndicators.length}</span> / {indicators.length}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        
        {/* Left Form controls */}
        <div className="md:col-span-3 bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <span>Active Record Entry</span>
          </h3>

          {accessibleIndicators.length === 0 ? (
            <div className="text-center py-10 text-slate-400 border border-dashed rounded-lg">
              <ShieldAlert className="h-8 w-8 mx-auto text-amber-500 mb-2" />
              <p className="font-semibold text-slate-700 text-sm">No Departmental Indicators Found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[250px] mx-auto leading-normal">
                Your currently emulated role limits you to "{profile.department}" in which no master plan indicators are mapped. Adjust your department above.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Select Indicator */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Select master indicator</label>
                <select
                  value={selectedIndCode}
                  onChange={(e) => setSelectedIndCode(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm bg-slate-50 font-medium text-slate-800"
                >
                  {accessibleIndicators.map((ind) => (
                    <option key={ind.code} value={ind.code}>
                      [{ind.code}] {ind.name.length > 55 ? ind.name.substring(0, 55) + "..." : ind.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Month */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Report Month (Ethiopian Calendar Months)</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {ETHIOPIAN_MONTHS.map((m) => {
                    const monthHasValue = monthlyData.some(
                      entry => entry.code === selectedIndCode && entry.month === m && entry.actual !== null
                    );
                    const isSelected = selectedMonth === m;
                    return (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setSelectedMonth(m)}
                        className={`h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                          isSelected 
                            ? "bg-slate-900 border-slate-900 text-white shadow-sm ring-1 ring-slate-900" 
                            : monthHasValue
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <Calendar className="h-3 w-3 opacity-60" />
                        <span>{m}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actuals Input */}
              <div className="space-y-1 pt-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Actual Achievement reached ({activeIndicator?.unit || "%"})
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={setExplicitZero}
                      className="text-[10px] text-orange-600 hover:text-orange-700 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded transition-colors font-medium cursor-pointer"
                    >
                      Explicit Zero
                    </button>
                    <button
                      type="button"
                      onClick={removeEntry}
                      className="text-[10px] text-slate-500 hover:text-slate-700 bg-slate-100 px-2 py-0.5 rounded transition-colors font-medium cursor-pointer"
                    >
                      Clear/Blank
                    </button>
                  </div>
                </div>
                
                <input
                  type="number"
                  placeholder="Leave completely empty if no data recorded"
                  value={actualInput}
                  onChange={(e) => setActualInput(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-300 rounded-lg text-sm bg-white font-mono text-lg font-bold"
                  min="0"
                  max="100000"
                />
                <p className="text-[10px] text-slate-400">
                  ⚠️ Note: Unrecorded values show as &quot;No Entry Recorded&quot; and degrade evaluation accuracy score. Use the &quot;Explicit Zero&quot; button to report zero performance.
                </p>
              </div>

              {/* Remarks Area */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Remarks / qualitative comments (Anomalies / roadblocks)</label>
                <textarea
                  placeholder="e.g. Explaining reasons for underperformance, medication shortages, community outreach progress, or facility challenges..."
                  value={remarksInput}
                  onChange={(e) => setRemarksInput(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-white"
                  rows={3}
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-between gap-4">
                <div className="text-xs text-slate-500">
                  {isSaved && (
                    <span className="text-emerald-600 font-bold flex items-center gap-1 border border-emerald-200 bg-emerald-50 px-3 py-1.5 rounded-lg animate-pulse">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Data Saved & Audit Log Recorded!</span>
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="h-10 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <RefreshCw className="h-4 w-4 animate-spin-slow" />
                    <span>Submit & Log Record</span>
                  </button>
                </div>
              </div>

            </form>
          )}

        </div>

        {/* Right Reference Meta Panel */}
        <div className="md:col-span-2 space-y-4">
          
          {/* Active Indicator details */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              <span>Reference Target & current State</span>
            </h4>

            {activeIndicator ? (
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold uppercase">
                    {activeIndicator.code}
                  </span>
                  <div className="font-bold text-slate-800 text-sm mt-1 sm:text-base leading-snug">
                    {activeIndicator.name}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-wider">Baseline (2017)</span>
                    <span className="text-sm font-extrabold text-slate-700 font-mono">
                      {activeIndicator.perf2017} {activeIndicator.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-wider">Plan (2018)</span>
                    <span className="text-sm font-extrabold text-indigo-700 font-mono">
                      {activeIndicator.plan2018} {activeIndicator.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-wider">Monthly Goal</span>
                    <span className="text-sm font-extrabold text-emerald-700 font-mono">
                      {Math.round(activeIndicator.plan2018 / 12)} {activeIndicator.unit}
                    </span>
                  </div>
                </div>

                {/* Actual vs Target status */}
                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                  <span className="text-xs text-slate-500 block">Current reported Status ({selectedMonth})</span>
                  
                  {activeEntry ? (
                    <div>
                      {activeEntry.actual === null ? (
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                          <span className="font-semibold text-slate-600 text-sm">No Entry Recorded</span>
                        </div>
                      ) : activeEntry.actual === 0 ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2 text-rose-600 font-bold">
                            <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping"></span>
                            <span className="text-sm">0 Achieved (Zero Performance)</span>
                          </div>
                          <span className="text-[10px] text-slate-400">Valid entry submitted but actual is 0</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-extrabold text-slate-800 font-mono">
                              {activeEntry.actual} {activeIndicator.unit}
                            </span>
                            {(() => {
                              const monthlyTarget = activeIndicator.plan2018 / 12;
                              const pct = monthlyTarget > 0 ? Math.round((activeEntry.actual / monthlyTarget) * 100) : 0;
                              return (
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono uppercase ${
                                  pct >= 90
                                    ? "bg-emerald-100 text-emerald-800"
                                    : pct >= 70
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-rose-100 text-rose-800"
                                }`}>
                                  {pct}% of monthly goal reached
                                </span>
                              );
                            })()}
                          </div>
                          {activeEntry.remarks && (
                            <p className="text-[11px] text-slate-500 leading-normal italic font-medium bg-slate-50 p-1.5 rounded">
                              &quot;{activeEntry.remarks}&quot;
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 bg-slate-400 rounded-full"></span>
                      <span className="font-medium text-slate-500 text-xs italic">No Entry Recorded (unreported)</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic block">No active indicator selected.</span>
            )}

          </div>

          {/* Zero Data separation guidelines */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <h5 className="text-xs font-bold text-amber-800 flex items-center gap-1">
              <HelpCircle className="h-4 w-4" />
              <span>Zero-Performance Enforcements</span>
            </h5>
            <p className="text-[11px] text-amber-700 leading-normal">
              <strong>Blank (Null) Value:</strong> Represents missing reports. System marks as unreported.
            </p>
            <p className="text-[11px] text-amber-700 leading-normal">
              <strong>0 Value:</strong> Represents actual zero achievement (e.g. drug shortages, service stoppage). System treats as complete reporting but flags performance failure, allowing planners to identify precise gaps versus reporting negligence.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
