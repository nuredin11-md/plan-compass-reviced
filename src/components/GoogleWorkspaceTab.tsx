import React, { useState, useEffect } from "react";
import { Indicator, MonthlyEntry, UserProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";
import {
  googleWorkspaceSignIn,
  workspaceLogout,
  fetchTaskLists,
  createTaskList,
  fetchTasks,
  createTask,
  updateTaskStatus,
  exportToGoogleSheets,
  exportToGoogleSlides,
  GoogleTask,
  GoogleTaskList
} from "../lib/googleWorkspace";
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Plus,
  Loader2,
  TableProperties,
  Presentation,
  ListTodo,
  LogOut,
  FolderSync,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ClipboardList
} from "lucide-react";

interface GoogleWorkspaceTabProps {
  indicators: Indicator[];
  monthlyData: MonthlyEntry[];
  profile: UserProfile;
}

export default function GoogleWorkspaceTab({ indicators, monthlyData, profile }: GoogleWorkspaceTabProps) {
  // Auth States
  const [token, setToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active workspace tool sub-tab inside Google Workspace Connection
  const [subTab, setSubTab] = useState<"tasks" | "sheets" | "slides">("sheets");

  // Google Tasks State
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newListName, setNewListName] = useState("");
  const [showAddList, setShowAddList] = useState(false);

  // Automated M&E Diagnostic suggestions for Google Tasks
  const [diagnosticTasks, setDiagnosticTasks] = useState<{ code: string; title: string; notes: string; selected: boolean }[]>([]);

  // Google Sheets Export State
  const [sheetExportStatus, setSheetExportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [createdSheetUrl, setCreatedSheetUrl] = useState<string | null>(null);
  const [sheetExportError, setSheetExportError] = useState<string | null>(null);
  const [exportFilter, setExportFilter] = useState<"all" | "critical" | "mch" | "emergency">("all");

  // Google Slides Export State
  const [slidesExportStatus, setSlidesExportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [createdSlidesUrl, setCreatedSlidesUrl] = useState<string | null>(null);
  const [slidesExportError, setSlidesExportError] = useState<string | null>(null);

  // Handle Google Workspace Auth
  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const result = await googleWorkspaceSignIn();
      if (result) {
        setToken(result.accessToken);
        setGoogleUser(result.user);
      }
    } catch (err: any) {
      console.error("Workspace Auth Error:", err);
      setAuthError(err.message || "Failed to establish a secure auth session.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await workspaceLogout();
      setToken(null);
      setGoogleUser(null);
      setTasks([]);
      setTaskLists([]);
      setSelectedListId("");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Fetch Task lists once authenticated
  useEffect(() => {
    if (token) {
      setIsLoadingLists(true);
      fetchTaskLists(token)
        .then(lists => {
          setTaskLists(lists);
          if (lists.length > 0) {
            setSelectedListId(lists[0].id);
          }
        })
        .catch(err => {
          console.error("Error fetching task lists:", err);
        })
        .finally(() => {
          setIsLoadingLists(false);
        });
    }
  }, [token]);

  // Fetch tasks when selected list changes
  useEffect(() => {
    if (token && selectedListId) {
      setIsLoadingTasks(true);
      fetchTasks(token, selectedListId)
        .then(data => {
          setTasks(data);
        })
        .catch(err => {
          console.error("Error fetching tasks:", err);
        })
        .finally(() => {
          setIsLoadingTasks(false);
        });
    }
  }, [token, selectedListId]);

  // Generate diagnostic M&E tasks based on indicators
  useEffect(() => {
    if (indicators && indicators.length > 0) {
      // Find indicators with critical growth or below performance 
      const alerts = indicators
        .filter(ind => {
          const perf = ind.perf2018 || 0;
          const target = ind.plan2018 || 0;
          // Indicators that missed target by more than 10%
          return target > 0 && perf / target < 0.9;
        })
        .slice(0, 5) // Cap suggestions
        .map(ind => {
          const gap = Math.round((1 - (ind.perf2018 / ind.plan2018)) * 100);
          return {
            code: ind.code,
            title: `Formulate action plan for indicator ${ind.code}`,
            notes: `Indicator details:\nName: ${ind.name}\nDepartment: ${ind.department}\nTarget Plan (2018): ${ind.plan2018} [${ind.unit}]\nActual Achievement (2018): ${ind.perf2018} [${ind.unit}]\nDiscrepancy: ${gap}% below targeted target in ${profile.facility}.`,
            selected: true
          };
        });
      setDiagnosticTasks(alerts);
    }
  }, [indicators, profile.facility]);

  // Tasks Add, Toggle functions
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedListId || !newTaskTitle.trim()) return;

    try {
      const added = await createTask(token, selectedListId, {
        title: newTaskTitle.trim(),
        notes: `Manual review task logged via Plan Compass M&E Suite for standard ${profile.department} department follow-up.`
      });
      setTasks(prev => [added, ...prev]);
      setNewTaskTitle("");
    } catch (err) {
      console.error("Task creation failed:", err);
    }
  };

  const handleCreateNewList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newListName.trim()) return;

    try {
      const newList = await createTaskList(token, newListName.trim());
      setTaskLists(prev => [...prev, newList]);
      setSelectedListId(newList.id);
      setNewListName("");
      setShowAddList(false);
    } catch (err) {
      console.error("Create list error:", err);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    if (!token || !selectedListId) return;
    const isCompleted = currentStatus === "completed";
    
    // Optimistic UI state update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: isCompleted ? "needsAction" : "completed" } : t));

    try {
      await updateTaskStatus(token, selectedListId, taskId, !isCompleted);
    } catch (err) {
      console.error("Update task status failed:", err);
      // Revert upon error
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: isCompleted ? "completed" : "needsAction" } : t));
    }
  };

  // Push Diagnostic M&E alerts directly to Google Tasks
  const handlePushDiagnosticTasks = async () => {
    if (!token || !selectedListId) return;
    const toPush = diagnosticTasks.filter(t => t.selected);
    if (toPush.length === 0) return;

    const confirmed = window.confirm(`Push ${toPush.length} M&E indicator corrective follow-up tasks into Google Tasks?`);
    if (!confirmed) return;

    try {
      setIsLoadingTasks(true);
      for (const t of toPush) {
        await createTask(token, selectedListId, {
          title: t.title,
          notes: t.notes,
          due: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week due date
        });
      }
      // Reload tasks
      const updated = await fetchTasks(token, selectedListId);
      setTasks(updated);
      
      // Clear selected indicators from suggestion board
      setDiagnosticTasks(prev => prev.map(item => item.selected ? { ...item, selected: false } : item));
      alert("Successfully loaded action objectives into Google Tasks!");
    } catch (err: any) {
      console.error("Bulk sync error:", err);
      alert(`Bulk Sync error: ${err.message}`);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // Google Sheets Export Implementation
  const handleSheetsExport = async () => {
    if (!token) return;

    setSheetExportStatus("loading");
    setCreatedSheetUrl(null);
    setSheetExportError(null);

    try {
      // 1. Filter Indicators based on criteria
      let filtered = [...indicators];
      if (exportFilter === "critical") {
        filtered = indicators.filter(ind => {
          const perf = ind.perf2018 || 0;
          const target = ind.plan2018 || 0;
          return target > 0 && perf / target < 0.95;
        });
      } else if (exportFilter === "mch") {
        filtered = indicators.filter(ind => ind.department === "Maternal & Child Health");
      } else if (exportFilter === "emergency") {
        filtered = indicators.filter(ind => ind.department.includes("Emergency"));
      }

      // Title
      const title = `${profile.facility || "Hospital"} M&E Strategic Plan & Actual Metrics Export`;
      const headers = [
        "Indicator Code", 
        "Category", 
        "Department", 
        "Metric Name", 
        "Unit", 
        "Baseline Performance 2017", 
        "Plan Target 2018", 
        "Actual Progress 2018", 
        "Status Rate",
        "EAP 2018 Track",
        "Strategic Plan 2019"
      ];

      const rows = filtered.map(ind => {
        const perf = ind.perf2018 || 0;
        const target = ind.plan2018 || 0;
        const pct = target > 0 ? Math.round((perf / target) * 100) : 0;
        const status = pct >= 100 ? "Fully Met" : pct >= 90 ? "Satisfactory" : "Critical Concern";

        return [
          ind.code,
          ind.category,
          ind.department,
          ind.name,
          ind.unit,
          ind.perf2017,
          ind.plan2018,
          ind.perf2018,
          `${pct}%`,
          status,
          ind.plan2019
        ];
      });

      const res = await exportToGoogleSheets(token, title, headers, rows);
      setCreatedSheetUrl(res.spreadsheetUrl);
      setSheetExportStatus("success");
    } catch (err: any) {
      console.error("Google Sheets Export Failure:", err);
      setSheetExportError(err.message || "Failed to structure spreadsheet rows.");
      setSheetExportStatus("error");
    }
  };

  // Google Slides Export Implementation
  const handleSlidesExport = async () => {
    if (!token) return;

    setSlidesExportStatus("loading");
    setCreatedSlidesUrl(null);
    setSlidesExportError(null);

    try {
      const facilityName = profile.facility || "Active Healthcare Center";

      // 1. Determine Success Metrics (Highest target matching progress rate)
      const achievements = [...indicators]
        .filter(ind => ind.plan2018 > 0 && (ind.perf2018 || 0) > 0)
        .sort((a, b) => (b.perf2018 / b.plan2018) - (a.perf2018 / a.plan2018))
        .slice(0, 3)
        .map(ind => {
          const pct = Math.round((ind.perf2018 / ind.plan2018) * 100);
          return `🌟 ${ind.name} (${ind.code}): Achieved ${pct}% of annual target plan. Measured at ${ind.perf2018} (Target: ${ind.plan2018}).`;
        });

      // 2. Determine Concern Milestones (Lowest progress rate relative to target)
      const threats = [...indicators]
        .filter(ind => ind.plan2018 > 0)
        .sort((a, b) => (a.perf2018 / a.plan2018) - (b.perf2018 / b.plan2018))
        .slice(0, 3)
        .map(ind => {
          const pct = Math.round((ind.perf2018 / ind.plan2018) * 100);
          return `🚨 ${ind.name} (${ind.code}): High-priority concern. Registered only ${pct}% progress (${ind.perf2018} of ${ind.plan2018} [${ind.unit}]).`;
        });

      // Slide sequence layout
      const slidesData = [
        {
          title: "I. Hospital M&E Strategic Annual Performance Review",
          bulletPoints: [
            `Facility: ${facilityName}`,
            `Region Authority: ${profile.region}`,
            `Department Review: Joint clinical overview covering all clinical indicators`,
            `Strategic Evaluation Context: Real data parsed directly from active cloud registries on metric baseline (2017) & progress targets (2018-2019).`
          ]
        },
        {
          title: "II. Critical performance Concerns (Attention Needed)",
          bulletPoints: [
            "The following high-priority healthcare indicators have missed their strategic targets by significant margins and require active, structured corrective protocols:",
            ...threats,
            "Recommended Interventions: Leverage designated staff, increase site monitoring frequency, and secure support streams."
          ]
        },
        {
          title: "III. Exceptional Department Successes & Achievements",
          bulletPoints: [
            "Remarkable performance records have been listed with high progress rates relative to targeted baselines:",
            ...achievements,
            "Action Plan context: Commend active clinical teams and document protocol methodologies to scale in other departments."
          ]
        },
        {
          title: "IV. Comprehensive Work Plan & System Next Steps",
          bulletPoints: [
            "1. Set up bi-weekly evaluation reviews to monitor underperforming program metrics.",
            "2. Ensure automated cloud backups and DHIS2 interoperability logs are loaded correctly.",
            "3. Coordinate with regional focal personnel to align resources with registered target plans."
          ]
        }
      ];

      const presentationTitle = `Hospital M&E Performance Report - ${facilityName}`;
      const res = await exportToGoogleSlides(token, presentationTitle, slidesData);
      setCreatedSlidesUrl(res.presentationUrl);
      setSlidesExportStatus("success");
    } catch (err: any) {
      console.error("Google Slides Export Failure:", err);
      setSlidesExportError(err.message || "Failed to align presentation slides.");
      setSlidesExportStatus("error");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
      
      {/* Upper command decoration */}
      <div className="bg-slate-900 px-6 py-6 text-white border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500 rounded-md text-slate-900">
            <Cloud className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-sans tracking-tight">Google Workspace Connection Hub</h2>
            <p className="text-xs text-slate-400 font-medium">Interlink plan metrics with Google Sheets, Slides, and Tasks in real-time</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        
        {/* LOGGED OUT STATE */}
        {!token ? (
          <div className="max-w-xl mx-auto py-10 px-4 text-center space-y-8">
            <div className="inline-flex p-4 bg-slate-50 border border-slate-200 rounded-full text-slate-400">
              <FolderSync className="h-10 w-10 text-indigo-500" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-md font-bold text-slate-900">Synchronize active medical registry with Google Suite</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-sans">
                Establish direct secure connections with your Google account. This lets you write formatted tracking spreadsheets, construct briefing presentations, and log review task checklists directly with user permissions.
              </p>
            </div>

            {/* Capability boxes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left font-sans text-xs pt-2">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="text-teal-600 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                  <TableProperties className="h-3.5 w-3.5" /> Sheets
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Export indicator tables to custom formatted Google spreadsheets for board and director evaluations.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="text-amber-500 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                  <Presentation className="h-3.5 w-3.5" /> Slides
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Export real-time annual summary reports directly into custom presentation slides with performance metrics.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="text-blue-500 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                  <ListTodo className="h-3.5 w-3.5" /> Tasks
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Sync critical indicator discrepancies as corrective follow-up items dynamically into task lists.
                </p>
              </div>
            </div>

            <div className="pt-4 flex flex-col items-center justify-center space-y-4">
              {/* official Sign in with Google Button */}
              <button 
                onClick={handleSignIn}
                disabled={isAuthenticating}
                className="gsi-material-button w-full max-w-[280px] shadow border border-slate-300 rounded-md hover:shadow-md transition-all h-[42px] cursor-pointer flex items-center justify-center bg-white"
              >
                <div className="gsi-material-button-content-wrapper flex items-center justify-center space-x-3">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }} className="w-5 h-5">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents font-sans text-xs font-semibold text-slate-705">Connect Google Workspace</span>
                </div>
              </button>

              {isAuthenticating && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono font-bold animate-pulse">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-505" />
                  Establishing Google Secure Session...
                </div>
              )}

              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-mono flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          
          /* LOGGED IN WORKSPACE DESK */
          <div className="space-y-6">
            
            {/* Header info bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-205 flex items-center justify-center font-bold text-slate-900 border border-slate-300 shadow-inner">
                  {googleUser?.displayName ? googleUser.displayName[0] : "G"}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 leading-none">Connected Google Workspace Profile</div>
                  <div className="text-[11px] font-mono text-slate-500 mt-1">{googleUser?.email || "healthcare-officer@google.com"}</div>
                </div>
              </div>
              
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg hover:border-red-200 hover:text-red-700 text-xs text-slate-600 transition-all font-semibold font-sans focus:outline-none"
              >
                <LogOut className="h-3.5 w-3.5" /> Disconnect account
              </button>
            </div>

            {/* Navigation / Choice of workspace tools */}
            <div className="border-b border-slate-200">
              <div className="flex gap-2 -mb-px">
                <button
                  onClick={() => setSubTab("sheets")}
                  className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all focus:outline-none ${
                    subTab === "sheets"
                      ? "border-teal-500 text-teal-605"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <TableProperties className="h-4 w-4" /> Google Sheets Sync
                </button>

                <button
                  onClick={() => setSubTab("slides")}
                  className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all focus:outline-none ${
                    subTab === "slides"
                      ? "border-amber-500 text-amber-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Presentation className="h-4 w-4" /> Google Slides Presenter
                </button>

                <button
                  onClick={() => setSubTab("tasks")}
                  className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all focus:outline-none ${
                    subTab === "tasks"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <ListTodo className="h-4 w-4" /> Google Tasks Desk
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              
              {/* GOOGLE SHEETS DESK PANEL */}
              {subTab === "sheets" && (
                <motion.div
                  key="sheets"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-6 font-sans"
                >
                  <div className="p-4 bg-teal-50/40 border border-teal-100 rounded-xl flex items-start gap-3">
                    <TableProperties className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-teal-900 leading-tight">Structured Performance Spreadsheets</h4>
                      <p className="text-[11px] text-teal-800/80 leading-normal mt-1">
                        Build perfectly aligned spreadsheet registries on your Google Drive client list showing targets and achievements. This makes sharing report data with focal regional directors highly efficient.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Settings card */}
                    <div className="border border-slate-200 rounded-xl p-5 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Spreadsheet Parameters</h4>
                      
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700">Filter Indicator Data Scope</label>
                        <select
                          value={exportFilter}
                          onChange={(e: any) => setExportFilter(e.target.value)}
                          className="w-full text-xs font-semibold h-[38px] px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none bg-slate-50 text-slate-800 shrink-0"
                        >
                          <option value="all">Complete Master Plan (Full 270+ CSV Indicators)</option>
                          <option value="critical">Critical Concerns (Performance &lt; 95% of Target)</option>
                          <option value="mch">Maternal &amp; Child Health indicators only</option>
                          <option value="emergency">Emergency / Acute Care indicators only</option>
                        </select>
                      </div>

                      <div className="text-xs text-slate-500 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono">
                        <div>📦 Spreadsheet title:</div>
                        <div className="font-bold text-slate-800 truncate">{profile.facility || "Hospital"} M&amp;E performance Review</div>
                      </div>

                      <button
                        onClick={handleSheetsExport}
                        disabled={sheetExportStatus === "loading"}
                        className="w-full h-10 px-4 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md focus:outline-none cursor-pointer"
                      >
                        {sheetExportStatus === "loading" ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Provisioning Spreadsheet...
                          </>
                        ) : (
                          <>
                            <TableProperties className="h-4 w-4" />
                            Build Spreadsheet in Google Sheets
                          </>
                        )}
                      </button>
                    </div>

                    {/* Results / Status Card */}
                    <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 flex flex-col justify-center min-h-[180px]">
                      {sheetExportStatus === "idle" && (
                        <div className="text-center text-slate-400 space-y-2 py-6">
                          <TableProperties className="h-10 w-10 mx-auto text-slate-300" />
                          <p className="text-xs font-semibold">No Spreadsheet built yet in this session</p>
                        </div>
                      )}

                      {sheetExportStatus === "loading" && (
                        <div className="text-center text-slate-500 space-y-3 py-6">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-teal-600" />
                          <div className="space-y-1">
                            <p className="text-xs font-bold">Deploying spreadsheet rows in real-time...</p>
                            <p className="text-[10px] text-slate-400 font-medium">Checking authentic Google scopes and parsing dataset</p>
                          </div>
                        </div>
                      )}

                      {sheetExportStatus === "success" && createdSheetUrl && (
                        <div className="text-center space-y-4 py-4 animate-fade-in">
                          <div className="inline-flex p-2.5 bg-green-100 text-green-700 rounded-full">
                            <CheckCircle2 className="h-8 w-8" />
                          </div>
                          
                          <div className="space-y-1">
                            <h5 className="text-xs font-bold text-slate-900">Spreadsheet Deployed Successfully!</h5>
                            <p className="text-[10px] text-slate-400 font-sans">Available securely in your Google Drive storage</p>
                          </div>

                          <div className="pt-2">
                            <a
                              href={createdSheetUrl}
                              target="_blank"
                              rel="noreferrer referrerPolicy"
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white hover:bg-black rounded-lg text-xs font-bold shadow transition-all"
                            >
                              Open in Google Sheets <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>
                      )}

                      {sheetExportStatus === "error" && (
                        <div className="text-center p-4 bg-red-50 border border-red-100 rounded-xl text-red-800 space-y-3">
                          <AlertCircle className="h-8 w-8 mx-auto text-red-600" />
                          <div className="space-y-1">
                            <p className="text-xs font-bold">Failed to export data</p>
                            <p className="text-[10px] font-mono leading-relaxed">{sheetExportError}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* GOOGLE SLIDES DESK PANEL */}
              {subTab === "slides" && (
                <motion.div
                  key="slides"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-6 font-sans"
                >
                  <div className="p-4 bg-amber-50/40 border border-amber-100 rounded-xl flex items-start gap-3">
                    <Presentation className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-900 leading-tight">Automated Performance Slides Briefing</h4>
                      <p className="text-[11px] text-amber-800/80 leading-normal mt-1">
                        Build customized Google Slides presentations summarizing healthcare indicators, achievements, and corrective focus scopes. Generates elegant slides using clinical metrics from the active Hospital dataset with one click.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Slide details structure preview */}
                    <div className="border border-slate-200 rounded-xl p-5 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Briefing Slides Deck Structure</h4>
                      
                      <div className="space-y-3 font-sans text-xs text-slate-600">
                        <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span className="font-mono bg-amber-100 text-amber-800 h-5 w-5 rounded flex items-center justify-center font-bold shrink-0">1</span>
                          <div>
                            <span className="font-bold text-slate-800 block">Title Briefing Slide</span>
                            <span className="text-[10px] text-slate-500">Strategic M&amp;E performance details for {profile.facility || "Facility"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span className="font-mono bg-amber-100 text-amber-800 h-5 w-5 rounded flex items-center justify-center font-bold shrink-0">2</span>
                          <div>
                            <span className="font-bold text-slate-800 block">Critical Indicators Alert Slide</span>
                            <span className="text-[10px] text-slate-500">Flags priority indicators failing target (real hospital data analysis)</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span className="font-mono bg-amber-100 text-amber-800 h-5 w-5 rounded flex items-center justify-center font-bold shrink-0">3</span>
                          <div>
                            <span className="font-bold text-slate-800 block">Exceptional Success Achievements Slide</span>
                            <span className="text-[10px] text-slate-500">Reviews top performance milestones that reached targets YoY</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span className="font-mono bg-amber-100 text-amber-800 h-5 w-5 rounded flex items-center justify-center font-bold shrink-0">4</span>
                          <div>
                            <span className="font-bold text-slate-800 block">Correction Protocol &amp; Next Steps</span>
                            <span className="text-[10px] text-slate-500">Bi-weekly assessments, backup measures, and local benchmarks</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleSlidesExport}
                        disabled={slidesExportStatus === "loading"}
                        className="w-full h-10 px-4 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md focus:outline-none cursor-pointer"
                      >
                        {slidesExportStatus === "loading" ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Constructing Slides Deck...
                          </>
                        ) : (
                          <>
                            <Presentation className="h-4 w-4" />
                            Build Google Slides Deck
                          </>
                        )}
                      </button>
                    </div>

                    {/* Slides result box */}
                    <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 flex flex-col justify-center min-h-[180px]">
                      {slidesExportStatus === "idle" && (
                        <div className="text-center text-slate-400 space-y-2 py-6">
                          <Presentation className="h-10 w-10 mx-auto text-slate-300" />
                          <p className="text-xs font-semibold">No Slide presentation compiled yet</p>
                        </div>
                      )}

                      {slidesExportStatus === "loading" && (
                        <div className="text-center text-slate-500 space-y-3 py-6">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber-500" />
                          <div className="space-y-1">
                            <p className="text-xs font-bold">Generating slide elements and updating text containers...</p>
                            <p className="text-[10px] text-slate-400 font-medium">Provisioning standard Google Slides layout templates</p>
                          </div>
                        </div>
                      )}

                      {slidesExportStatus === "success" && createdSlidesUrl && (
                        <div className="text-center space-y-4 py-4 animate-fade-in">
                          <div className="inline-flex p-2.5 bg-amber-105 text-amber-700 rounded-full bg-amber-50 border border-amber-100">
                            <CheckCircle2 className="h-8 w-8 text-amber-500" />
                          </div>
                          
                          <div className="space-y-1">
                            <h5 className="text-xs font-bold text-slate-900">Briefing Slide Deck Created!</h5>
                            <p className="text-[10px] text-slate-400 font-sans">You can immediately present this to board stakeholders</p>
                          </div>

                          <div className="pt-2">
                            <a
                              href={createdSlidesUrl}
                              target="_blank"
                              rel="noreferrer referrerPolicy"
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white hover:bg-black rounded-lg text-xs font-bold shadow transition-all"
                            >
                              Present Google Slides <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>
                      )}

                      {slidesExportStatus === "error" && (
                        <div className="text-center p-4 bg-red-50 border border-red-100 rounded-xl text-red-800 space-y-3">
                          <AlertCircle className="h-8 w-8 mx-auto text-red-600" />
                          <div className="space-y-1">
                            <p className="text-xs font-bold">Failed to compile presentation</p>
                            <p className="text-[10px] font-mono leading-relaxed">{slidesExportError}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* GOOGLE TASKS DESK PANEL */}
              {subTab === "tasks" && (
                <motion.div
                  key="tasks"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-6"
                >
                  <div className="p-4 bg-blue-50/40 border border-blue-105/60 rounded-xl flex items-start gap-3">
                    <ListTodo className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="font-sans">
                      <h4 className="text-xs font-bold text-blue-900 leading-tight">M&amp;E Action Items Synchronization</h4>
                      <p className="text-[11px] text-blue-800/80 leading-normal mt-1">
                        Review active follow-up checklists, inject new clinical objectives linked directly to underperforming indicators, and toggle task status directly against Google's servers.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
                    
                    {/* Diagnostic list sync section */}
                    <div className="lg:col-span-5 border border-slate-200 rounded-xl p-5 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-indigo-505 text-indigo-500" />
                        Strategic indicator Alerts
                      </h4>

                      <div className="text-[11px] text-slate-500 leading-normal">
                        Plan Compass automatically identified metrics where performance is under target plan. Inject these as real tasks into your active Google Task List:
                      </div>

                      <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                        {diagnosticTasks.length === 0 ? (
                          <div className="text-center text-slate-400 py-6 text-xs bg-slate-50 rounded-lg border border-slate-100">
                            No critical alerts detected!
                          </div>
                        ) : (
                          diagnosticTasks.map((t, index) => (
                            <div 
                              key={t.code} 
                              className={`p-3 bg-slate-50 border rounded-lg flex items-start gap-2.5 transition-colors ${
                                t.selected ? "border-slate-300 bg-white" : "border-slate-100 opacity-60 bg-slate-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={t.selected}
                                onChange={(e) => {
                                  const updated = [...diagnosticTasks];
                                  updated[index].selected = e.target.checked;
                                  setDiagnosticTasks(updated);
                                }}
                                className="mt-0.5"
                              />
                              <div className="text-xs">
                                <span className="font-bold text-slate-800 block leading-tight">{t.title}</span>
                                <span className="text-[10px] text-slate-400 block mt-1 leading-normal truncate max-w-[200px]">{t.notes.split('\n')[2]}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <button
                        onClick={handlePushDiagnosticTasks}
                        disabled={isLoadingTasks || diagnosticTasks.filter(item => item.selected).length === 0}
                        className="w-full h-10 bg-indigo-650 bg-indigo-605 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md rounded-lg focus:outline-none cursor-pointer"
                      >
                        <Sparkles className="h-4 w-4" /> Inject Alerts into Google Tasks
                      </button>
                    </div>

                    {/* Live tasks board */}
                    <div className="lg:col-span-7 border border-slate-200 rounded-xl p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Active Google Task List</h4>
                        
                        {/* Task List Selector */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isLoadingLists ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                          ) : (
                            <select
                              value={selectedListId}
                              onChange={(e) => setSelectedListId(e.target.value)}
                              className="text-[11px] font-bold h-7 border border-slate-200 rounded px-2 focus:outline-none bg-slate-50 text-slate-700"
                            >
                              {taskLists.map(l => (
                                <option key={l.id} value={l.id}>{l.title}</option>
                              ))}
                            </select>
                          )}

                          <button
                            onClick={() => setShowAddList(!showAddList)}
                            className="p-1 border border-slate-200 rounded hover:bg-slate-100 text-slate-500 focus:outline-none"
                            title="Create new Google Task List"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Add new Task List Form */}
                      {showAddList && (
                        <form onSubmit={handleCreateNewList} className="flex gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg animate-fade-in">
                          <input
                            type="text"
                            placeholder="New List Title..."
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            className="flex-1 h-8 px-2 border border-slate-200 rounded text-xs bg-white focus:outline-none"
                            required
                          />
                          <button
                            type="submit"
                            className="px-3 h-8 bg-slate-900 hover:bg-black text-white rounded text-xs font-bold focus:outline-none"
                          >
                            Create List
                          </button>
                        </form>
                      )}

                      {/* Add task item form */}
                      <form onSubmit={handleAddTask} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Quick add a hospital review task..."
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          className="flex-1 h-9 px-3 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        />
                        <button
                          type="submit"
                          className="px-3 h-9 bg-slate-900 text-white rounded-lg hover:bg-black font-bold text-xs flex items-center justify-center gap-1 focus:outline-none"
                        >
                          <Plus className="h-4 w-4" /> Add
                        </button>
                      </form>

                      {/* Tasks scroll list */}
                      <div className="border border-slate-100 rounded-lg max-h-[220px] overflow-y-auto pr-1 space-y-2">
                        {isLoadingTasks ? (
                          <div className="text-center text-slate-500 py-10 font-mono text-xs flex flex-col items-center justify-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                            Fetching tasks from Google...
                          </div>
                        ) : tasks.length === 0 ? (
                          <div className="text-center text-slate-400 py-12 text-xs bg-slate-50 border border-slate-100 rounded-lg space-y-1">
                            <ListTodo className="h-8 w-8 mx-auto text-slate-300" />
                            <p className="font-semibold">No active tasks in this list</p>
                            <p className="text-[10px] text-slate-400 font-medium">Add review actions using the entry form above</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-105">
                            {tasks.map(t => (
                              <div 
                                key={t.id}
                                className={`p-3 font-sans flex items-start gap-3 transition-colors ${
                                  t.status === "completed" ? "bg-slate-50/50 opacity-60" : "bg-white"
                                }`}
                              >
                                <button
                                  onClick={() => handleToggleTask(t.id, t.status)}
                                  className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center transition-colors focus:outline-none mt-0.5 shrink-0 ${
                                    t.status === "completed"
                                      ? "bg-indigo-600 border-indigo-600 text-white"
                                      : "border-slate-300 hover:border-indigo-600"
                                  }`}
                                >
                                  {t.status === "completed" && <CheckCircle2 className="h-3 w-3 stroke-[3]" />}
                                </button>
                                <div className="text-xs">
                                  <span className={`font-semibold block leading-tight ${
                                    t.status === "completed" ? "line-through text-slate-400" : "text-slate-800"
                                  }`}>{t.title}</span>
                                  {t.notes && (
                                    <span className="text-[10px] text-slate-400 block mt-1 leading-normal whitespace-pre-line">{t.notes}</span>
                                  )}
                                  {t.due && (
                                    <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded mt-1.5 inline-block">
                                      Due: {new Date(t.due).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}

            </AnimatePresence>

          </div>
        )}

      </div>
    </div>
  );
}
