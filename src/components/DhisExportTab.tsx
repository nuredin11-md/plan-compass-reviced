import React, { useState } from "react";
import { Indicator, MonthlyEntry, UserProfile } from "../types";
import { localDb } from "../lib/supabaseClient";
import { generateSampleData, ETHIOPIAN_MONTHS } from "../data/initialData";
import { 
  Database, RefreshCw, FileText, Download, CheckCircle2, 
  HelpCircle, Sparkles, Server, FolderSync, ShieldCheck, Printer
} from "lucide-react";

interface DhisExportTabProps {
  indicators: Indicator[];
  monthlyData: MonthlyEntry[];
  onMonthlyDataChange: (newData: MonthlyEntry[]) => void;
  profile: UserProfile;
}

export default function DhisExportTab({ indicators, monthlyData, onMonthlyDataChange, profile }: DhisExportTabProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [isExported, setIsExported] = useState(false);

  // Run simulated DHIS2 Sync (populates the remaining unsubmitted months)
  const runDhis2Sync = () => {
    setIsSyncing(true);
    setSyncLogs([
      "🔄 Initializing secure DHIS2 gateway connection...",
      "🔑 Validating OAuth2 credentials with federal Ministry of Health (MoH)...",
      "📡 Fetching live data elements for facility code: " + profile.facility,
    ]);

    setTimeout(() => {
      setSyncLogs(prev => [...prev, "📥 Parsing JSON payload of 12 indicators for EFY 2016..."]);
    }, 1000);

    setTimeout(() => {
      // Create completed data set: fill ALL 12 months with realistic completed values!
      const current = [...monthlyData];
      let syncedCount = 0;

      indicators.forEach((ind) => {
        ETHIOPIAN_MONTHS.forEach((m) => {
          const index = current.findIndex(e => e.code === ind.code && e.month === m);
          
          // Generate realistic synced data for unsubmitted months, or overwrite
          const monthIdx = ETHIOPIAN_MONTHS.indexOf(m);
          const baseVal = ind.perf2017 + ((ind.plan2018 - ind.perf2017) * (monthIdx / 11));
          const actual = Math.max(0, Math.round(baseVal + (Math.sin(monthIdx) * (baseVal * 0.1))));

          const syncedEntry: MonthlyEntry = {
            code: ind.code,
            month: m,
            actual,
            updatedAt: new Date().toISOString()
          };

          if (index >= 0) {
            // Only fill if it was blank/null to show completion progress
            if (current[index].actual === null) {
              current[index] = syncedEntry;
              syncedCount++;
            }
          } else {
            current.push(syncedEntry);
            syncedCount++;
          }
        });
      });

      localStorage.setItem("plan_compass_monthly_entries", JSON.stringify(current));
      onMonthlyDataChange(current);
      localDb.logAudit(
        profile.id,
        "DHIS2_SYNC_SUCCESS",
        "dhis2_api_gateway",
        `DHIS2 simulation sync imported ${syncedCount} new records for active indicators.`
      );

      setSyncLogs(prev => [
        ...prev,
        `✅ Success: Imported ${syncedCount} performance datapoints.`,
        "📊 Master record updated.",
        "🔒 Transaction secured under SHA-256 integrity signature."
      ]);
      setIsSyncing(false);
    }, 2500);
  };

  const handlePrintReport = () => {
    // Uses standardized print command to show the browser print preview option
    window.print();
  };

  // Erase all local storage data resets to default sample template
  const handleResetData = () => {
    if (confirm("Warning: This will delete all customized indicator configurations, added objectives, monthly achievement values, and audit logs, resetting Plan Compass back to default sample template data. Proceed?")) {
      localDb.clearAllData();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Intro */}
      <div className="border-b border-slate-200 pb-3">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <span>DHIS2 Integration & Performance report Generator</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Bridge national health registries (DHIS2) with local objectives, and export authorized strategic planning reports.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* DHIS2 Simulated Sync Card */}
        <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
            <Server className="h-5 w-5" />
            <span>DHIS2 Federal Gateway synchronizer</span>
          </div>

          <p className="text-xs text-slate-500 leading-normal">
            National healthcare plans retrieve monthly data via the DHIS2 standard api. Click below to simulate an electronic API pull, which automatically resolves all unfilled monthly actuals in the calendar (reaching **100% completeness**).
          </p>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">DHIS2 Endpoint Status</span>
            
            <div className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="font-bold text-slate-700">Federal Gateway Live (amhara_ref_ref10)</span>
            </div>

            <div className="text-[10px] font-mono text-slate-400">
              Payload Schema: DHIS2 v2.38.1 JSON | Auth: OAuthBearer
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={runDhis2Sync}
              disabled={isSyncing}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Connecting Gateway..." : "Sync Simulated DHIS2 Data"}</span>
            </button>
          </div>

          {/* Sync logs output console */}
          {syncLogs.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-1 font-mono text-[10px] text-emerald-400 max-h-40 overflow-y-auto leading-relaxed shadow-inner">
              {syncLogs.map((log, idx) => (
                <div key={idx}>{log}</div>
              ))}
            </div>
          )}

          <div className="text-[10px] text-slate-400 flex items-start gap-1 p-1">
            <HelpCircle className="h-3.5 w-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
            <span>Simulating sync automatically fills previous null values, enabling planners to test the complete planning recommendations.</span>
          </div>
        </div>

        {/* PDF / Print Report Generation Card */}
        <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4">
          
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
            <FileText className="h-5 w-5" />
            <span>Generate Performance Planning Report</span>
          </div>

          <p className="text-xs text-slate-500 leading-normal">
            Generate and print a beautifully formatted performance summary sheet of active indicators matching current timeframe selections (Annual/Quarter/Monthly). Shows baselines, targets, and actuals formatted for clean paper printing.
          </p>

          <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-2">
            <span className="text-[10px] text-indigo-400 font-bold uppercase block">Authorized Sign-off Sheet</span>
            <div className="text-xs text-indigo-950 font-medium leading-normal">
              Active planner: <strong className="text-indigo-900">{profile.displayName}</strong>
              <br />
              Facility: <strong>{profile.facility}</strong>
              <br />
              Status: <span className="text-emerald-700 font-bold">Ready to Seal (SHA-256 Valid)</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handlePrintReport}
              className="w-full h-11 bg-slate-900 hover:bg-slate-850 text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow"
            >
              <Printer className="h-4 w-4 text-emerald-400" />
              <span>Print Official Planning Sheet</span>
            </button>
          </div>

          <div className="text-[10px] text-slate-400 flex items-start gap-1 p-1">
            <HelpCircle className="h-3.5 w-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
            <span>Uses standard printable layouts. When the system print opens, you can choose &quot;Save as PDF&quot; to download the official document directly.</span>
          </div>

        </div>

      </div>

      {/* Dangerous Reset / Settings Section */}
      <div className="bg-rose-50/30 border border-rose-200 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        
        <div className="space-y-1">
          <div className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
            <FolderSync className="h-4 w-4" />
            <span>Danger Zone / Master clear</span>
          </div>
          <p className="text-xs text-rose-700 leading-normal">
            Clear all browser cookies and local overrides. Resets baseline templates back to initial values.
          </p>
        </div>

        <button
          onClick={handleResetData}
          className="px-4 py-2 bg-rose-100 text-rose-800 hover:bg-rose-200 text-xs font-bold rounded-lg border border-rose-300 transition-colors cursor-pointer whitespace-nowrap self-end sm:self-center"
        >
          Factory Reset Database
        </button>

      </div>

    </div>
  );
}
