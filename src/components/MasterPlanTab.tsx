import React, { useState, useMemo, useEffect } from "react";
import { Indicator, UserProfile } from "../types";
import { DEPARTMENTS } from "../data/initialData";
import { localDb } from "../lib/supabaseClient";
import { 
  Search, Filter, Plus, Trash2, Edit2, Check, X, Maximize2, Minimize2, 
  HelpCircle, Sparkles, ArrowUpDown, CalendarRange, TrendingUp, Landmark, ShieldCheck,
  Trophy, Settings, Activity, CheckSquare, Info, Save, RefreshCw, Sliders, ListTodo, BadgeAlert
} from "lucide-react";

interface MasterPlanTabProps {
  indicators: Indicator[];
  onIndicatorsChange: (newIndicators: Indicator[]) => void;
  profile: UserProfile;
}

export default function MasterPlanTab({ indicators, onIndicatorsChange, profile }: MasterPlanTabProps) {
  // Filters & State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sortBy, setSortBy] = useState<"code" | "category" | "name" | "plan2018">("code");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Sub-tab selection: "indicators" or "recognition"
  const [activeSubTab, setActiveSubTab] = useState<"indicators" | "recognition">("indicators");

  // Recognition weights configuration
  const [weights, setWeights] = useState<{ label: string; weight: number; color: string }[]>(() => {
    const cached = localStorage.getItem("plan_compass_recognition_criteria");
    if (cached) {
      try { return JSON.parse(cached); } catch (e) { console.error(e); }
    }
    return [
      { label: "Programme Performance", weight: 35, color: "#0ea5e9" },
      { label: "EHSIG Score",            weight: 25, color: "#8b5cf6" },
      { label: "IPC Practices",          weight: 20, color: "#10b981" },
      { label: "Data Quality & Reporting", weight: 20, color: "#f59e0b" },
    ];
  });

  // Selected indicator codes per department
  const [selectedIndicatorsByDept, setSelectedIndicatorsByDept] = useState<Record<string, string[]>>(() => {
    const cached = localStorage.getItem("plan_compass_selected_indicators_by_dept");
    if (cached) {
      try { return JSON.parse(cached); } catch (e) { console.error(e); }
    }
    const defaultObj: Record<string, string[]> = {};
    DEPARTMENTS.forEach(dept => {
      defaultObj[dept] = [];
    });
    return defaultObj;
  });

  const [selectedYearFilter, setSelectedYearFilter] = useState("2018");
  const [selectedIndicatorCode, setSelectedIndicatorCode] = useState("All");

  const [evalSetupYear, setEvalSetupYear] = useState(() => {
    return localStorage.getItem("plan_compass_setup_year") || "2018";
  });
  const [evalSetupInterval, setEvalSetupInterval] = useState<"annual" | "six-month" | "quarterly">(() => {
    return (localStorage.getItem("plan_compass_setup_interval") as any) || "annual";
  });
  const [evalSetupRef, setEvalSetupRef] = useState(() => {
    return localStorage.getItem("plan_compass_setup_ref") || "Annual";
  });

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Inline edit state
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editPerf2016, setEditPerf2016] = useState(0);
  const [editPerf2017, setEditPerf2017] = useState(0);
  const [editPlan2018, setEditPlan2018] = useState(0);
  const [editPerf2018, setEditPerf2018] = useState(0);
  const [editEap2018, setEditEap2018] = useState(0);
  const [editPlan2019, setEditPlan2019] = useState(0);

  // Add Indicator form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newCategory, setNewCategory] = useState("Family Planning");
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("count");
  const [newPerf2016, setNewPerf2016] = useState(0);
  const [newPerf2017, setNewPerf2017] = useState(0);
  const [newPlan2018, setNewPlan2018] = useState(0);
  const [newPerf2018, setNewPerf2018] = useState(0);
  const [newEap2018, setNewEap2018] = useState(0);
  const [newPlan2019, setNewPlan2019] = useState(0);
  const [newDept, setNewDept] = useState(profile.department !== "All" ? profile.department : DEPARTMENTS[0]);

  const filteredIndicatorListForDropdown = useMemo(() => {
    return indicators.filter(ind => selectedDepartment === "All" || ind.department === selectedDepartment);
  }, [indicators, selectedDepartment]);

  // Handle Sort Toggle
  const toggleSort = (field: "code" | "category" | "name" | "plan2018") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // Extract unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set(indicators.map((ind) => ind.category));
    return ["All", ...Array.from(cats)];
  }, [indicators]);

  // Segment indicators dynamically by all recognition departments from DEPARTMENTS from initialData
  const deptIndicatorsMap = useMemo(() => {
    const map: Record<string, Indicator[]> = {};
    DEPARTMENTS.forEach((dept) => {
      map[dept] = [];
    });
    indicators.forEach((ind) => {
      const dept = ind.department;
      if (map[dept] !== undefined) {
        map[dept].push(ind);
      }
    });
    return map;
  }, [indicators]);

  // Sum of weights validation
  const totalWeightSum = useMemo(() => {
    return weights.reduce((sum, item) => sum + item.weight, 0);
  }, [weights]);

  const canEdit = profile.role === "admin" || profile.role === "facility_head";

  // Filtered & Sorted indicators
  const filteredIndicators = useMemo(() => {
    let result = indicators.filter((ind) => {
      const matchesSearch = 
        ind.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ind.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "All" || ind.category === selectedCategory;
      const matchesDept = selectedDepartment === "All" || ind.department === selectedDepartment;
      const matchesIndicator = selectedIndicatorCode === "All" || ind.code === selectedIndicatorCode;
      
      return matchesSearch && matchesCategory && matchesDept && matchesIndicator;
    });

    result.sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];

      if (typeof valA === "string") {
        return sortOrder === "asc" 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return sortOrder === "asc" 
          ? (valA as number) - (valB as number) 
          : (valB as number) - (valA as number);
      }
    });

    return result;
  }, [indicators, searchTerm, selectedCategory, selectedDepartment, sortBy, sortOrder]);

  // Methods
  const startEdit = (ind: Indicator) => {
    if (!canEdit) return;
    setEditingCode(ind.code);
    setEditName(ind.name);
    setEditUnit(ind.unit);
    setEditPerf2016(ind.perf2016 || 0);
    setEditPerf2017(ind.perf2017 || 0);
    setEditPlan2018(ind.plan2018 || 0);
    setEditPerf2018(ind.perf2018 || 0);
    setEditEap2018(ind.eap2018 || 0);
    setEditPlan2019(ind.plan2019 || 0);
  };

  const saveEdit = (ind: Indicator) => {
    // 2017 performance is baseline for 2018 Plan
    // 2018 performance is baseline for 2019 Plan
    const updated: Indicator = {
      ...ind,
      name: editName,
      unit: editUnit,
      perf2016: Number(editPerf2016),
      perf2017: Number(editPerf2017),
      plan2018: Number(editPlan2018),
      perf2018: Number(editPerf2018),
      eap2018: Number(editEap2018),
      plan2019: Number(editPlan2019),
      
      // Backward compatibility bindings
      baseline2015: Number(editPerf2017), // 2017 baseline for 2018 goal
      target2016: Number(editPlan2018)    // 2018 plan as target
    };
    localDb.saveIndicator(updated);
    onIndicatorsChange(localDb.getIndicators());
    setEditingCode(null);
  };

  const deleteIndicator = (code: string) => {
    if (!canEdit) return;
    if (confirm(`Are you absolutely sure you want to delete the indicator with Code: "${code}"? This will cause existing reported performance points to be detached.`)) {
      if (localDb.deleteIndicator(code)) {
        onIndicatorsChange(localDb.getIndicators());
      }
    }
  };

  const submitAddForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (indicators.some(ind => ind.code.toLowerCase() === newCode.trim().toLowerCase())) {
      alert(`Error: An indicator with the Code "${newCode.toUpperCase()}" already exists in the Master Plan.`);
      return;
    }

    const created: Indicator = {
      code: newCode.trim().toUpperCase(),
      category: newCategory,
      name: newName.trim(),
      unit: newUnit,
      perf2016: Number(newPerf2016),
      perf2017: Number(newPerf2017),
      plan2018: Number(newPlan2018),
      perf2018: Number(newPerf2018),
      eap2018: Number(newEap2018),
      plan2019: Number(newPlan2019),

      // Alignment bindings
      baseline2015: Number(newPerf2017), // 2017 performance baseline for 2018 goal
      target2016: Number(newPlan2018),  // 2018 plan as primary target
      department: newDept
    };

    localDb.saveIndicator(created);
    onIndicatorsChange(localDb.getIndicators());
    
    // reset form
    setNewCode("");
    setNewName("");
    setNewPerf2016(0);
    setNewPerf2017(0);
    setNewPlan2018(0);
    setNewPerf2018(0);
    setNewEap2018(0);
    setNewPlan2019(0);
    setShowAddForm(false);
  };

  // Configuration setters & controllers for Recognition Board Customizer
  const handleWeightChange = (index: number, val: number) => {
    const updated = [...weights];
    updated[index].weight = isNaN(val) ? 0 : val;
    setWeights(updated);
  };

  const handleEqualizeWeights = () => {
    const equalized = weights.map((w, idx) => ({
      ...w,
      weight: 25
    }));
    setWeights(equalized);
  };

  const toggleIndicatorSelection = (dept: string, code: string) => {
    setSelectedIndicatorsByDept((prev) => {
      const currentCodes = prev[dept] || [];
      const updatedCodes = currentCodes.includes(code)
        ? currentCodes.filter((c) => c !== code)
        : [...currentCodes, code];
      
      return {
        ...prev,
        [dept]: updatedCodes
      };
    });
  };

  const handleSelectAllInDept = (dept: string) => {
    const allCodes = (deptIndicatorsMap[dept] || []).map((i) => i.code);
    setSelectedIndicatorsByDept((prev) => ({
      ...prev,
      [dept]: allCodes
    }));
  };

  const handleClearAllInDept = (dept: string) => {
    setSelectedIndicatorsByDept((prev) => ({
      ...prev,
      [dept]: []
    }));
  };

  const saveRecognitionSettings = () => {
    if (totalWeightSum !== 100) {
      setErrorMsg("Error: Sum of Criteria Weights must equal exactly 100% to save settings.");
      setSaveSuccess(false);
      return;
    }

    try {
      localStorage.setItem("plan_compass_recognition_criteria", JSON.stringify(weights));
      localStorage.setItem("plan_compass_selected_indicators_by_dept", JSON.stringify(selectedIndicatorsByDept));
      localStorage.setItem("plan_compass_setup_year", evalSetupYear);
      localStorage.setItem("plan_compass_setup_interval", evalSetupInterval);
      localStorage.setItem("plan_compass_setup_ref", evalSetupRef);
      setErrorMsg("");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e: any) {
      setErrorMsg(`Failed to save: ${e.message}`);
    }
  };

  return (
    <div className={`transition-all duration-300 ${isFullscreen ? "fixed inset-0 z-50 bg-slate-50 p-6 overflow-y-auto" : "relative"} space-y-6 animate-fadeIn`}>
      
      {/* Informative Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/25 border border-indigo-400/40 text-indigo-200 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Multi-Year Evaluation Model
              </span>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                EFY 2016 - 2019 Baseline Linked
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight font-sans text-white leading-none">
              Strategic Master Objectives &amp; Indicators Plan
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-3xl">
              Configure indicators, review performances of 2016 and 2017 as past baselines, and plan goals.
              <strong className="text-indigo-300"> Note:</strong> EFY 2017 performance is mathematically used as the baseline for the EFY 2018 Plan, and cumulative EFY 2018 Performance acts as the baseline for the future EFY 2019 Plan.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 self-start md:self-center">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-10 px-4 border border-slate-700 bg-slate-800/80 hover:bg-slate-850 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              <span>{isFullscreen ? "Normal Screen" : "Maximize Screen"}</span>
            </button>

            {canEdit && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="h-10 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer hover:scale-[1.02]"
              >
                <Plus className="h-4 w-4" />
                <span>Create Indicator</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-rose-100 bg-white/50 backdrop-blur-md p-1.5 rounded-xl gap-2 shadow-sm border">
        <button
          type="button"
          onClick={() => setActiveSubTab("indicators")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === "indicators"
              ? "bg-indigo-600 text-white shadow-md font-extrabold"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
          }`}
        >
          <Landmark className="h-4 w-4" />
          <span>📊 Master Plan Indicators</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("recognition")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === "recognition"
              ? "bg-amber-500 text-white shadow-md font-extrabold"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
          }`}
        >
          <Trophy className="h-4 w-4" />
          <span>🏆 Recognition Board Setup</span>
        </button>
      </div>

      {activeSubTab === "indicators" ? (
        <>
          {/* Add Indicator Form Box */}
          {showAddForm && (
        <div className="bg-white rounded-2xl border border-indigo-150 p-6 animate-slideDown shadow-md">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
              <span>Define New Strategic Metric Objective</span>
            </h3>
            <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={submitAddForm} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Code / Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. MCH_ANC_04"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Category Indicator</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="Family Planning">Family Planning</option>
                  <option value="Maternal & Child Health">Maternal & Child Health</option>
                  <option value="EPI">EPI</option>
                  <option value="Child Health">Child Health</option>
                  <option value="Surgical Services">Surgical Services</option>
                  <option value="Hospital Utilization">Hospital Utilization</option>
                  <option value="Quality & Safety">Quality & Safety</option>
                  <option value="Blood Bank">Blood Bank</option>
                  <option value="Pharmacy">Pharmacy</option>
                  <option value="Nutrition">Nutrition</option>
                  <option value="Tuberculosis">Tuberculosis</option>
                  <option value="HIV/AIDS">HIV/AIDS</option>
                  <option value="Malaria">Malaria</option>
                  <option value="Non-Communicable Diseases">Non-Communicable Diseases</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Responsible Department</label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Unit of Measure</label>
                <input
                  type="text"
                  placeholder="e.g. %, count, Rate"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs bg-white"
                  required
                />
              </div>

              <div className="space-y-1 sm:col-span-2 md:col-span-3 lg:col-span-4">
                <label className="block text-xs font-bold text-slate-700">Detailed Objective Description</label>
                <input
                  type="text"
                  placeholder="Insert the full qualitative description of this metric..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs bg-white"
                  required
                />
              </div>

            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-250 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                <CalendarRange className="h-3.5 w-3.5 text-indigo-500" />
                <span>Multi-Year Baseline Progress &amp; Targets Config (Values)</span>
              </h4>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-500">2016 Perf</label>
                  <input
                    type="number"
                    value={newPerf2016}
                    onChange={(e) => setNewPerf2016(Number(e.target.value))}
                    className="w-full h-9 px-2 border border-slate-300 rounded-lg text-xs bg-white font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-500">2017 Perf (Baseline)</label>
                  <input
                    type="number"
                    value={newPerf2017}
                    onChange={(e) => setNewPerf2017(Number(e.target.value))}
                    className="w-full h-9 px-2 border border-slate-300 rounded-lg text-xs bg-white font-mono text-indigo-650 font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-500">2018 Plan</label>
                  <input
                    type="number"
                    value={newPlan2018}
                    onChange={(e) => setNewPlan2018(Number(e.target.value))}
                    className="w-full h-9 px-2 border border-slate-300 rounded-lg text-xs bg-white font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-500">2018 Perf (New Baseline)</label>
                  <input
                    type="number"
                    value={newPerf2018}
                    onChange={(e) => setNewPerf2018(Number(e.target.value))}
                    className="w-full h-9 px-2 border border-slate-300 rounded-lg text-xs bg-white font-mono text-emerald-650 font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-500">2018 EAP</label>
                  <input
                    type="number"
                    value={newEap2018}
                    onChange={(e) => setNewEap2018(Number(e.target.value))}
                    className="w-full h-9 px-2 border border-slate-300 rounded-lg text-xs bg-white font-mono text-slate-700"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-500">2019 Plan</label>
                  <input
                    type="number"
                    value={newPlan2019}
                    onChange={(e) => setNewPlan2019(Number(e.target.value))}
                    className="w-full h-9 px-2 border border-slate-300 rounded-lg text-xs bg-white font-mono font-bold"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <span>Save to master database</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code or objective title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-4 text-xs bg-slate-50 border border-slate-205 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-405 pr-1">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <span>Filters</span>
            </div>

            {/* Period Year Select */}
            <select
              value={selectedYearFilter}
              onChange={(e) => setSelectedYearFilter(e.target.value)}
              className="h-10 px-3 border border-indigo-200 rounded-xl text-xs bg-indigo-50 text-indigo-900 font-bold focus:outline-none cursor-pointer hover:bg-indigo-100 transition-colors"
            >
              <option value="All">Period: All Years</option>
              <option value="2016">Period: 2016 EFY</option>
              <option value="2017">Period: 2017 EFY</option>
              <option value="2018">Period: 2018 EFY (Active)</option>
              <option value="2019">Period: 2019 EFY (Plan)</option>
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 px-3 border border-slate-205 rounded-xl text-xs bg-slate-50 text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="All">Category: All ({categories.length - 1})</option>
              {categories.filter(c => c !== "All").map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSelectedIndicatorCode("All");
              }}
              className="h-10 px-3 border border-slate-205 rounded-xl text-xs bg-slate-50 text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="All">Department: All ({DEPARTMENTS.length})</option>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Indicator Select Filter */}
            <select
              value={selectedIndicatorCode}
              onChange={(e) => setSelectedIndicatorCode(e.target.value)}
              className="h-10 px-3 border border-slate-205 rounded-xl text-xs bg-slate-50 text-slate-800 font-bold focus:outline-none cursor-pointer max-w-[200px]"
            >
              <option value="All">Indicator Focus: All</option>
              {filteredIndicatorListForDropdown.map((ind) => (
                <option key={ind.code} value={ind.code}>
                  [{ind.code}] {ind.name.length > 30 ? `${ind.name.slice(0, 30)}...` : ind.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedYearFilter !== "All" && (
          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-[11px] text-slate-500 font-medium font-sans flex items-center gap-1.5">
            <Info className="h-4 w-4 text-indigo-500 flex-shrink-0" />
            <span>Active Columns highlighted under <strong className="text-indigo-700 font-bold">{selectedYearFilter} EFY</strong> timeframe selection.</span>
          </div>
        )}
      </div>

      {/* Main Multi-Year Data Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-150 text-left text-xs font-sans">
            <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-150">
              <tr>
                <th 
                  onClick={() => toggleSort("code")}
                  className="px-4 py-3 select-none cursor-pointer hover:bg-slate-100 transition-colors font-mono"
                >
                  <div className="flex items-center gap-1 font-extrabold text-slate-900">
                    <span>CODE</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                
                <th className="px-5 py-3 min-w-[280px]">OBJECTIVE TITLE &amp; DEPARTMENT</th>
                
                <th className="px-3 py-3 text-center">UNIT</th>
                
                {/* 2016-2017 (PAST PERFORMANCE) */}
                <th className="px-3 py-3 text-right bg-slate-100/40 border-r border-slate-150">
                  <div className="text-[9px] text-slate-400 font-medium lowercase">past</div>
                  <div className="font-bold text-slate-700">2016 perf</div>
                </th>
                
                <th className="px-3 py-3 text-right bg-indigo-50/20 border-r border-slate-150">
                  <div className="text-[9px] text-indigo-400 font-bold lowercase">2018 baseline</div>
                  <div className="font-bold text-indigo-900 font-mono">2017 perf</div>
                </th>

                {/* 2018 (ACTIVE YEAR TARGET & DATA) */}
                <th className="px-3 py-3 text-right border-r border-slate-150">
                  <div className="text-[9px] text-slate-400 font-medium">target</div>
                  <div className="font-bold text-slate-900">2018 plan</div>
                </th>

                <th className="px-3 py-3 text-right bg-emerald-50/20 border-r border-slate-150">
                  <div className="text-[9px] text-emerald-500 font-extrabold lowercase">2019 baseline</div>
                  <div className="font-bold text-emerald-950 font-mono">2018 perf</div>
                </th>

                <th className="px-3 py-3 text-right border-r border-slate-150">
                  <div className="text-[9px] text-slate-405 font-medium">est</div>
                  <div className="font-bold text-slate-800">2018 EAP</div>
                </th>

                {/* 2019 (FUTURE PLAN TARGET) */}
                <th className="px-4 py-3 text-right bg-slate-50 border-r border-slate-150">
                  <div className="text-[9px] text-indigo-500 font-extrabold">next loop</div>
                  <div className="font-bold text-indigo-950 font-mono">2019 plan</div>
                </th>

                <th className="px-4 py-3 text-center">ACTIONS</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700 font-medium">
              {filteredIndicators.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-slate-40s">
                    <p className="font-bold text-slate-800 text-sm">No Plan Compass Objectives Found</p>
                    <p className="text-xs text-slate-400 mt-1">Change search parameters or choose create new objective target.</p>
                  </td>
                </tr>
              ) : (
                filteredIndicators.map((ind) => {
                  const isEditing = editingCode === ind.code;
                  return (
                    <tr 
                      key={ind.code}
                      className={`hover:bg-slate-50/60 transition-colors ${isEditing ? "bg-indigo-50/30 hover:bg-indigo-50/30" : ""}`}
                    >
                      {/* Code */}
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900 border-r border-slate-100">
                        {ind.code}
                      </td>

                      {/* Name / Category / Dept */}
                      <td className="px-5 py-3.5">
                        {isEditing ? (
                          <textarea
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full p-2 border border-indigo-300 rounded-lg text-xs bg-white text-slate-900 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            rows={2}
                          />
                        ) : (
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-900 leading-snug">{ind.name}</p>
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[9px] tracking-wide uppercase px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-mono font-extrabold">
                                {ind.category}
                              </span>
                              <span className="text-[9px] tracking-wide uppercase px-1.5 py-0.5 bg-indigo-50 text-indigo-750 font-bold rounded">
                                {ind.department}
                              </span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Unit */}
                      <td className="px-3 py-3.5 text-center text-slate-500">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editUnit}
                            onChange={(e) => setEditUnit(e.target.value)}
                            className="w-16 p-1 border border-indigo-300 rounded text-center text-xs"
                          />
                        ) : (
                          <span className="font-mono text-slate-650">{ind.unit}</span>
                        )}
                      </td>

                      {/* 2016 Perf */}
                      <td className="px-3 py-3.5 text-right font-mono text-slate-600 border-r border-slate-100 bg-slate-50/30">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editPerf2016}
                            onChange={(e) => setEditPerf2016(Number(e.target.value))}
                            className="w-16 p-1 border border-indigo-305 text-right text-xs"
                          />
                        ) : (
                          <span>{ind.perf2016 !== null ? ind.perf2016 : "-"}</span>
                        )}
                      </td>

                      {/* 2017 Perf (Baseline for 2018 Plan) */}
                      <td className="px-3 py-3.5 text-right font-mono font-bold text-indigo-700 bg-indigo-50/10 border-r border-slate-100">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editPerf2017}
                            onChange={(e) => setEditPerf2017(Number(e.target.value))}
                            className="w-16 p-1 border border-indigo-305 text-right text-xs"
                          />
                        ) : (
                          <span>{ind.perf2017 !== null ? ind.perf2017 : "-"}</span>
                        )}
                      </td>

                      {/* 2018 Plan (Target) */}
                      <td className="px-3 py-3.5 text-right font-mono text-slate-900 border-r border-slate-100 font-bold">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editPlan2018}
                            onChange={(e) => setEditPlan2018(Number(e.target.value))}
                            className="w-16 p-1 border border-indigo-305 text-right text-xs"
                          />
                        ) : (
                          <span>{ind.plan2018 !== null ? ind.plan2018 : "-"}</span>
                        )}
                      </td>

                      {/* 2018 Perf (Baseline for 2019 Plan) */}
                      <td className="px-3 py-3.5 text-right font-mono font-bold text-emerald-700 bg-emerald-50/10 border-r border-slate-100">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editPerf2018}
                            onChange={(e) => setEditPerf2018(Number(e.target.value))}
                            className="w-16 p-1 border border-indigo-305 text-right text-xs"
                          />
                        ) : (
                          <span title="Used as base limit for the future 2019 plan cycle">{ind.perf2018 !== null ? ind.perf2018 : "-"}</span>
                        )}
                      </td>

                      {/* 2018 EAP */}
                      <td className="px-3 py-3.5 text-right font-mono text-slate-500 border-r border-slate-100">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editEap2018}
                            onChange={(e) => setEditEap2018(Number(e.target.value))}
                            className="w-16 p-1 border border-indigo-305 text-right text-xs"
                          />
                        ) : (
                          <span>{ind.eap2018 !== null ? ind.eap2018 : "-"}</span>
                        )}
                      </td>

                      {/* 2019 Plan */}
                      <td className="px-4 py-3.5 text-right font-mono font-extrabold text-indigo-900 bg-slate-50/50 border-r border-slate-100">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editPlan2019}
                            onChange={(e) => setEditPlan2019(Number(e.target.value))}
                            className="w-16 p-1 border border-indigo-305 text-right text-xs font-bold"
                          />
                        ) : (
                          <span>{ind.plan2019 !== null ? ind.plan2019 : "-"}</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEdit(ind)}
                                className="h-7 w-7 rounded-lg bg-emerald-100 hover:bg-emerald-250 text-emerald-800 flex items-center justify-center transition-colors cursor-pointer"
                                title="Apply modifications"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              
                              <button
                                onClick={() => setEditingCode(null)}
                                className="h-7 w-7 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 flex items-center justify-center transition-colors cursor-pointer"
                                title="Dismiss modifications"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              {canEdit ? (
                                <>
                                  <button
                                    onClick={() => startEdit(ind)}
                                    className="h-7 w-7 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-650 flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
                                    title="Edit parameters inline"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>

                                  <button
                                    onClick={() => deleteIndicator(ind.code)}
                                    className="h-7 w-7 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
                                    title="Delete metric permanently"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold">Protected</span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      ) : (
        <div className="space-y-6 animate-fadeIn">
          {/* Active Period Evaluation Setup Card */}
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-5 text-white shadow-sm border border-amber-400/30">
            <div className="flex items-start gap-3">
              <CalendarRange className="h-6 w-6 mt-0.5 animate-pulse" />
              <div className="space-y-2 flex-1">
                <h3 className="text-sm font-black font-sans uppercase tracking-wider">Evaluation Schedule &amp; Target Setup</h3>
                <p className="text-xs text-amber-50">
                  Select the official active appraisal session period. Recognition criteria metrics calculate performance automatically for this setup block. Needs to be established at the beginning of each year and updated quarterly.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase text-amber-100">Setup Evaluation Year</label>
                    <select
                      value={evalSetupYear}
                      onChange={(e) => setEvalSetupYear(e.target.value)}
                      className="w-full h-9 px-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-bold text-white focus:outline-none cursor-pointer"
                    >
                      <option className="text-slate-800" value="2016">2016 EFY</option>
                      <option className="text-slate-800" value="2017">2017 EFY</option>
                      <option className="text-slate-800" value="2018">2018 EFY Active</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase text-amber-100">Interval Schedule</label>
                    <select
                      value={evalSetupInterval}
                      onChange={(e) => {
                        const newInt = e.target.value as any;
                        setEvalSetupInterval(newInt);
                        if (newInt === "annual") setEvalSetupRef("Annual");
                        else if (newInt === "six-month") setEvalSetupRef("H1");
                        else setEvalSetupRef("Q1");
                      }}
                      className="w-full h-9 px-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-bold text-white focus:outline-none cursor-pointer"
                    >
                      <option className="text-slate-800" value="annual">Annually (Full Year)</option>
                      <option className="text-slate-800" value="six-month">Six-Month (Semi-Annually)</option>
                      <option className="text-slate-800" value="quarterly">Quarterly</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase text-amber-100">Appraisal Sub-Block</label>
                    <select
                      value={evalSetupRef}
                      onChange={(e) => setEvalSetupRef(e.target.value)}
                      className="w-full h-9 px-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-bold text-white focus:outline-none cursor-pointer"
                    >
                      {evalSetupInterval === "annual" && (
                        <option className="text-slate-800" value="Annual">Annual Cycle (12 Months)</option>
                      )}
                      {evalSetupInterval === "six-month" && (
                        <>
                          <option className="text-slate-800" value="H1">H1: Hamle - Tahsas (First Half)</option>
                          <option className="text-slate-800" value="H2">H2: Tirr - Sene (Second Half)</option>
                        </>
                      )}
                      {evalSetupInterval === "quarterly" && (
                        <>
                          <option className="text-slate-800" value="Q1">Q1: Hamle - Meskerem</option>
                          <option className="text-slate-800" value="Q2">Q2: Tikimt - Tahsas</option>
                          <option className="text-slate-800" value="Q3">Q3: Tirr - Megabit</option>
                          <option className="text-slate-800" value="Q4">Q4: Miazia - Sene</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recognition Board configuration Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-indigo-650" />
                  <span>Evaluation Criteria Weights Setup</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configure the relative priority for each score dimension used to compute aggregate department scores.
                </p>
              </div>
              <div className="flex items-center gap-3 font-sans">
                <button
                  type="button"
                  onClick={handleEqualizeWeights}
                  className="h-9 px-3 border border-slate-300 bg-slate-50 text-slate-705 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Equalize (25% each)</span>
                </button>
                <button
                  type="button"
                  disabled={totalWeightSum !== 100}
                  onClick={saveRecognitionSettings}
                  className={`h-9 px-4 rounded-lg text-xs font-bold flex items-center gap-2 shadow transition-all cursor-pointer ${
                    totalWeightSum === 100
                      ? "bg-amber-500 hover:bg-amber-600 text-white"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <Save className="h-4 w-4" />
                  <span>Save Configuration</span>
                </button>
              </div>
            </div>

            {/* Error or Success notification */}
            {saveSuccess && (
              <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-xl p-4 flex items-start gap-2.5 mb-6 animate-slideDown">
                <Check className="h-5 w-5 text-emerald-600 mt-0.5" />
                <div>
                  <p className="text-xs font-bold font-sans">Settings Saved Successfully!</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5 font-sans">
                    The custom criteria weights and department focus indicators are now live. Head to the **Recognition Board** tab to see your modifications update the podium rankings instantly!
                  </p>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-start gap-2.5 mb-6 animate-slideDown">
                <BadgeAlert className="h-5 w-5 text-rose-600 mt-0.5" />
                <div>
                  <p className="text-xs font-bold font-sans">Configuration Error</p>
                  <p className="text-[11px] text-rose-700 mt-0.5 font-sans">{errorMsg}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {weights.map((item, idx) => (
                <div key={item.label} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 font-sans">{item.label}</span>
                    <span
                      className="text-xs font-mono font-extrabold px-2 py-0.5 rounded-md"
                      style={{ color: item.color, backgroundColor: `${item.color}15` }}
                    >
                      {item.weight}%
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={item.weight}
                        onChange={(e) => handleWeightChange(idx, parseInt(e.target.value))}
                        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-600 bg-slate-200"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-405 font-mono">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sum Indicator Banner */}
            <div className="mt-6 flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-150">
              <span className="text-xs font-semibold text-slate-650 flex items-center gap-1.5 font-sans">
                <Info className="h-4 w-4 text-slate-400" />
                Sum of recognition dimensions weights:
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-mono font-black ${totalWeightSum === 100 ? "text-emerald-600" : "text-amber-600"}`}>
                  {totalWeightSum}%
                </span>
                {totalWeightSum === 100 ? (
                  <span className="bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Balanced
                  </span>
                ) : (
                  <span className="bg-rose-100 border border-rose-250 text-rose-800 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Weight conflict ({totalWeightSum > 100 ? `Over-budget +${totalWeightSum - 100}%` : `Under-budget -${100 - totalWeightSum}%`})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Indicators Selection Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-indigo-650" />
                <span>Department Indicator Focus List Settings</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Select specific objective indicators from the Master Plan to utilize for calculating each department's Programme Performance ranking. Leaving selections empty defaults to evaluating using all indicators under that department.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 font-sans">
              {Object.keys(deptIndicatorsMap).map((deptName) => {
                const list = deptIndicatorsMap[deptName] || [];
                const selectedCodes = selectedIndicatorsByDept[deptName] || [];
                
                return (
                  <div key={deptName} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/20 hover:border-slate-300 transition-all flex flex-col h-[340px]">
                    <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-3">
                      <div className="space-y-0.5 min-w-0">
                        <h4 className="text-xs font-black text-slate-800 truncate" title={deptName}>
                          {deptName}
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400 block whitespace-nowrap">
                          {selectedCodes.length > 0
                            ? `Selected indicators: ${selectedCodes.length} of ${list.length}`
                            : `Default: Evaluating all ${list.length} indicators`
                          }
                        </span>
                      </div>
                      <Trophy className="h-4 w-4 text-amber-500 flex-shrink-0 ml-2 animate-bounce" />
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => handleSelectAllInDept(deptName)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] rounded font-bold uppercase tracking-wider cursor-pointer transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClearAllInDept(deptName)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] rounded font-bold uppercase tracking-wider cursor-pointer transition-colors"
                      >
                        Clear Focus
                      </button>
                    </div>

                    {/* Scrollable indicators focus checkboxes */}
                    <div className="flex-1 overflow-y-auto pr-1 space-y-2 border border-slate-100 bg-white rounded-lg p-2 scrollbar-thin">
                      {list.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic text-center py-8">
                          No indicators found in this department. Go back to indicators tab to add some!
                        </p>
                      ) : (
                        list.map((ind) => {
                          const isChecked = selectedCodes.includes(ind.code);
                          return (
                            <label
                              key={ind.code}
                              className={`flex items-start gap-2.5 p-2 rounded-lg text-[10px] cursor-pointer border transition-all ${
                                isChecked
                                  ? "bg-indigo-50/40 border-indigo-250"
                                  : "bg-white border-slate-100 hover:bg-slate-55"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleIndicatorSelection(deptName, ind.code)}
                                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                              />
                              <div className="space-y-0.5 leading-tight flex-1">
                                <span className="font-extrabold text-indigo-700 block">{ind.code}</span>
                                <span className="font-semibold text-slate-700 block">{ind.name}</span>
                                <span className="text-[9px] text-slate-400 block font-mono">Unit: {ind.unit} | Plan: {ind.plan2018 || ind.target2016}</span>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end border-t border-slate-100 pt-5 mt-4">
              <button
                type="button"
                disabled={totalWeightSum !== 100}
                onClick={saveRecognitionSettings}
                className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-md transition-all cursor-pointer ${
                  totalWeightSum === 100
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-[1.02]"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Save className="h-4 w-4" />
                <span>Apply &amp; Save Setup Parameters</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Banner */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-205 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-slate-650 leading-relaxed space-y-1">
          <p><strong>Database Migration Successful:</strong> Stored objective baselines are fetched from Live Google Cloud Firestore with real active UIDs. All modifications occur real-time across comparison tables and performance visualizers.</p>
          <p className="text-[11px] text-slate-405 font-mono">Current authorized context: {profile.role} (Dept: {profile.department}) | Facility: {profile.facility}</p>
        </div>
      </div>

    </div>
  );
}
