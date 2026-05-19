import React, { useState, useEffect, useRef } from "react";
import { BackupManager, DataRecovery, type BackupMetadata } from "@/lib/backupUtils";
import { AuditLogger } from "@/lib/securityUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { localDb } from "@/lib/supabaseClient";
import { UserProfile, Indicator, MonthlyEntry } from "../types";
import { 
  ShieldAlert, RefreshCw, Trash2, Download, Upload, ClipboardCheck, History, ArrowUpRight, CheckCircle, Info, ShieldCheck, Database
} from "lucide-react";

interface BackupTabProps {
  indicators: Indicator[];
  monthlyData: MonthlyEntry[];
  onIndicatorsChange: (indicators: Indicator[]) => void;
  onMonthlyDataChange: (monthlyData: MonthlyEntry[]) => void;
  profile: UserProfile;
}

export default function BackupTab({
  indicators,
  monthlyData,
  onIndicatorsChange,
  onMonthlyDataChange,
  profile
}: BackupTabProps) {
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [description, setDescription] = useState("");
  const [dbState, setDbState] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("automatic");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const showToast = (text: string, isError = false) => {
    setToast({ text, error: isError });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    refreshBackups();
    loadCurrentDbState();
  }, [indicators, monthlyData]);

  const refreshBackups = () => {
    setBackups(BackupManager.listBackups());
  };

  const loadCurrentDbState = () => {
    setDbState({
      indicators,
      monthlyData,
    });
  };

  const handleCreateManual = () => {
    if (!description.trim()) {
      showToast("Please enter a backup description", true);
      return;
    }
    const currentData = {
      indicators,
      monthlyData
    };
    const userEmail = profile.email;
    const res = BackupManager.createBackup(currentData, userEmail, description);
    
    if (res.success) {
      showToast("Manual database snapshot created successfully");
      setDescription("");
      refreshBackups();
      AuditLogger.logAction(userEmail, "MANUAL_BACKUP_CREATED", "Database Backup", "SUCCESS", { backupId: res.backupId });
    } else {
      showToast(res.error || "Failed to create backup snapshot", true);
    }
  };

  const handleRestore = (id: string) => {
    if (!window.confirm("Are you sure you want to restore this snapshot? Active database changes since checkout will be overridden.")) {
      return;
    }
    const userEmail = profile.email;
    const res = BackupManager.restoreBackup(id, userEmail);
    if (res.success && res.data) {
      // Overwrite persistent local DB
      localStorage.setItem("plan_compass_indicators", JSON.stringify(res.data.indicators));
      localStorage.setItem("plan_compass_monthly_entries", JSON.stringify(res.data.monthlyData));
      
      // Notify parent state handlers
      onIndicatorsChange(res.data.indicators);
      onMonthlyDataChange(res.data.monthlyData);
      
      showToast("Database snapshot restored successfully!");
      loadCurrentDbState();
      AuditLogger.logAction(userEmail, "BACKUP_RESTORED", "Database Backup", "SUCCESS", { backupId: id });
    } else {
      showToast(res.error || "Failed to restore backup snapshot", true);
    }
  };

  const handleDelete = (id: string) => {
    const userEmail = profile.email;
    if (BackupManager.deleteBackup(id, userEmail)) {
      showToast("Backup snapshot deleted successfully");
      refreshBackups();
      AuditLogger.logAction(userEmail, "BACKUP_DELETED", "Database Backup", "SUCCESS", { backupId: id });
    }
  };

  const handleExport = (id: string) => {
    const userEmail = profile.email;
    if (BackupManager.exportBackup(id)) {
      showToast("Backup schema file downloaded successfully");
      AuditLogger.logAction(userEmail, "BACKUP_EXPORTED", "Database Backup", "SUCCESS", { backupId: id });
    }
  };

  // Upload/Import from file
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawText = event.target?.result as string;
        const parsed = JSON.parse(rawText);

        const verification = DataRecovery.validateAndRepairData(parsed.monthlyData || parsed, profile.email);
        if (!verification.valid) {
          showToast(`Invalid JSON file format: ${verification.errors[0] || "Unknown format error"}`, true);
          return;
        }

        const restoredIndicators = parsed.indicators || indicators;
        const restoredEntries = verification.repaired;

        // Save directly to raw local DB
        localStorage.setItem("plan_compass_indicators", JSON.stringify(restoredIndicators));
        localStorage.setItem("plan_compass_monthly_entries", JSON.stringify(restoredEntries));
        
        // Push state updates
        onIndicatorsChange(restoredIndicators);
        onMonthlyDataChange(restoredEntries);

        showToast("JSON Data import complete!");
        AuditLogger.logAction(profile.email, "JSON_FILE_IMPORTED", "Database Backup", "SUCCESS", { dataCount: restoredEntries.length });
        
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (err: any) {
        showToast(`Import parse error: ${err.message}`, true);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-fadeIn relative">
      {/* Toast Alert banner */}
      {toast && (
        <div className={`fixed top-4 right-4 z-55 max-w-sm p-4 rounded-xl shadow-lg border flex gap-3 text-xs font-bold leading-normal transition-all animate-bounce ${
          toast.error 
            ? "bg-rose-50 border-rose-220 text-rose-900" 
            : "bg-emerald-50 border-emerald-200 text-emerald-950"
        }`}>
          {toast.error ? <ShieldAlert className="h-5 w-5 text-rose-600 flex-shrink-0" /> : <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Main Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Data Protection and Settings */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-200/80 bg-slate-50/10">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Database className="h-4.5 w-4.5 text-indigo-600" />
                Database Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-100 p-4 rounded-xl space-y-2 border border-slate-200/60">
                <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Active Workspace Size</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Indicators</span>
                    <strong className="text-base text-slate-900 font-mono">{dbState?.indicators?.length || 0}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Monthly Records</span>
                    <strong className="text-base text-slate-900 font-mono">{dbState?.monthlyData?.length || 0}</strong>
                  </div>
                </div>
              </div>

              {/* Upload schema section */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-slate-800">Restore from File Checkout</h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Restore clinical benchmarks directly from an offline template file into this container.
                </p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".json" 
                  onChange={handleImportFile} 
                  className="hidden" 
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  variant="outline" 
                  className="w-full gap-2 hover:border-slate-800"
                >
                  <Upload className="h-4 w-4 text-indigo-600" /> Upload Local JSON File
                </Button>
              </div>

              {/* Global backup download */}
              <div className="pt-2">
                <Button 
                  onClick={() => {
                    const currentData = { indicators, monthlyData };
                    const blob = new Blob([JSON.stringify(currentData, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `PlanCompass_DatabaseCheckout_${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    showToast("Schema downloaded to client filesystem");
                  }}
                  className="w-full gap-2"
                >
                  <Download className="h-4 w-4 text-white" /> Download Full Checkout
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Secure Tips Card */}
          <Card className="bg-gradient-to-br from-slate-950 to-slate-900 text-white border-none p-5 rounded-2xl">
            <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wide flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Data Protection Safeguards
            </h4>
            <ul className="text-[11px] text-slate-400 space-y-2 leading-relaxed list-disc pl-4">
              <li>All database modifications log instant immutable security audit records.</li>
              <li>Data is cached locally via sandboxed memory segments, guaranteeing off-grid operational resilience.</li>
              <li>Perform monthly diagnostic exports next to clinical validation runs.</li>
            </ul>
          </Card>
        </div>

        {/* RIGHT COLUMN: Backup Snapshots Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200/80">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-4.5 w-4.5 text-indigo-650" />
                  Database Checkout Checkpoints
                </CardTitle>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border text-xs">
                  <button 
                    onClick={() => setActiveTab("automatic")} 
                    className={`px-3 py-1 rounded-md font-bold transition-all ${activeTab === "automatic" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                  >
                    Checkpoints
                  </button>
                  <button 
                    onClick={() => setActiveTab("new")} 
                    className={`px-3 py-1 rounded-md font-bold transition-all ${activeTab === "new" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                  >
                    + Create Manual
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              
              {activeTab === "new" ? (
                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-800">Snapshot Description</label>
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Pre-import adjustment run - Maternal ANC goals updated" 
                      className="w-full text-xs text-slate-800 p-3 bg-white border border-slate-300 rounded-xl h-24 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <Button onClick={handleCreateManual} className="gap-2">
                    <ClipboardCheck className="h-4 w-4" /> Create Checkpoint
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {backups.length === 0 ? (
                    <div className="text-center p-12 bg-slate-50/50 border border-slate-200 border-dashed rounded-xl">
                      <Info className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <h4 className="text-xs font-bold text-slate-800">No Custom Checkpoints Created Yet</h4>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                        Manually create a checkpoint before major DHIS2 bulk import events to establish rollback points.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {backups.map((bak) => (
                        <div key={bak.id} className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-md transition-shadow flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-indigo-700 font-mono block bg-indigo-50 px-1.5 py-0.5 rounded w-max">
                              ID: {bak.id}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900">{bak.description}</h4>
                            <p className="text-[10px] text-slate-400 font-medium">
                              Created: {new Date(bak.timestamp).toLocaleString()} • User: {bak.user}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Button 
                              onClick={() => handleRestore(bak.id)} 
                              size="sm" 
                              variant="outline" 
                              className="text-[10px] font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" /> Restore
                            </Button>
                            <Button 
                              onClick={() => handleExport(bak.id)} 
                              size="sm" 
                              variant="outline" 
                              className="text-[10px] border-slate-200 text-slate-600"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button 
                              onClick={() => handleDelete(bak.id)} 
                              size="sm" 
                              variant="outline" 
                              className="text-[10px] border-rose-100 text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
