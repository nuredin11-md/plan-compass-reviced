import React, { useState, useMemo } from "react";
import { Indicator, UserProfile } from "../types";
import { DEPARTMENTS } from "../data/initialData";
import { localDb } from "../lib/supabaseClient";
import { 
  Search, Filter, Plus, Trash2, Edit2, Check, X, Maximize2, Minimize2, 
  HelpCircle, Sparkles, SlidersHorizontal, ArrowUpDown
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
  const [sortBy, setSortBy] = useState<"code" | "category" | "name" | "target">("code");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Inline edit state
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBaseline, setEditBaseline] = useState(0);
  const [editTarget, setEditTarget] = useState(0);

  // Add Indicator form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newCategory, setNewCategory] = useState("Maternal Health");
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("%");
  const [newBaseline, setNewBaseline] = useState(0);
  const [newTarget, setNewTarget] = useState(0);
  const [newDept, setNewDept] = useState(profile.department !== "All" ? profile.department : DEPARTMENTS[0]);

  // Handle Sort
  const toggleSort = (field: "code" | "category" | "name" | "target") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // Categories extracted from our actual loaded indicators
  const categories = useMemo(() => {
    const cats = new Set(indicators.map((ind) => ind.category));
    return ["All", ...Array.from(cats)];
  }, [indicators]);

  const canEdit = profile.role === "admin" || profile.role === "facility_head";

  // Filtered & Sorted indicators
  const filteredIndicators = useMemo(() => {
    let result = indicators.filter((ind) => {
      const matchesSearch = 
        ind.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ind.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "All" || ind.category === selectedCategory;
      const matchesDept = selectedDepartment === "All" || ind.department === selectedDepartment;
      
      return matchesSearch && matchesCategory && matchesDept;
    });

    result.sort((a, b) => {
      let valA: any = a[sortBy === "target" ? "target2016" : sortBy];
      let valB: any = b[sortBy === "target" ? "target2016" : sortBy];

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
    setEditBaseline(ind.baseline2015);
    setEditTarget(ind.target2016);
  };

  const saveEdit = (ind: Indicator) => {
    const updated: Indicator = {
      ...ind,
      name: editName,
      baseline2015: Number(editBaseline),
      target2016: Number(editTarget)
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
      baseline2015: Number(newBaseline),
      target2016: Number(newTarget),
      department: newDept
    };

    localDb.saveIndicator(created);
    onIndicatorsChange(localDb.getIndicators());
    
    // reset form
    setNewCode("");
    setNewName("");
    setNewBaseline(0);
    setNewTarget(0);
    setShowAddForm(false);
  };

  return (
    <div className={`transition-all duration-300 ${isFullscreen ? "fixed inset-0 z-50 bg-slate-50 p-6 overflow-y-auto" : "relative"}`}>
      
      {/* Header and Add Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold font-sans tracking-tight text-slate-900 flex items-center gap-2">
            <span>Hospital Objectives & master Indicators Plan</span>
            <span className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono px-2.5 py-0.5 rounded-full font-semibold">
              Y2016 target period
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Define, adjust baselines, and specify goal targets for key departments to evaluate hospital progress.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-10 px-3.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Toggle fullscreen table viewport"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            <span className="hidden md:inline">{isFullscreen ? "Normal View" : "Fullscreen View"}</span>
          </button>

          {canEdit && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Objective</span>
            </button>
          )}
        </div>
      </div>

      {/* Add Indicator Form Box (Animated / Collapsible) */}
      {showAddForm && (
        <div className="bg-gradient-to-r from-indigo-50 to-slate-50 rounded-xl border border-indigo-100 p-5 mb-6 animate-slideDown shadow-sm">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <span>Define New Performance Indicator / Metric</span>
            </h3>
            <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={submitAddForm} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">Indicator Identifier Code</label>
              <input
                type="text"
                placeholder="e.g. MCH_ANC_04"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="w-full h-[38px] px-3 border border-slate-300 rounded-md text-sm bg-white focus:ring-1 focus:ring-indigo-500"
                required
              />
              <span className="text-[10px] text-slate-400">Must be unique (alphanumeric separated by underscores)</span>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">Indicator category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full h-[38px] px-3 border border-slate-300 rounded-md text-sm bg-white"
              >
                <option value="Maternal Health">Maternal Health</option>
                <option value="Child Health">Child Health</option>
                <option value="Tuberculosis">Tuberculosis</option>
                <option value="HIV/AIDS">HIV/AIDS</option>
                <option value="Nutrition">Nutrition</option>
                <option value="Sanitation">Sanitation</option>
                <option value="NCD Management">NCD Management</option>
                <option value="Other Diagnostics">Other Diagnostics</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">Responsible Department</label>
              <select
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                className="w-full h-[38px] px-3 border border-slate-300 rounded-md text-sm bg-white"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600">Full Indicator Description</label>
              <input
                type="text"
                placeholder="e.g. Percentage of pregnant mothers with 4 key antenatal visits"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full h-[38px] px-3 border border-slate-300 rounded-md text-sm bg-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">Unit of Measurement</label>
              <input
                type="text"
                placeholder="e.g. %, count, Rate per 1000"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                className="w-full h-[38px] px-3 border border-slate-300 rounded-md text-sm bg-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">Baseline (EFY 2015)</label>
              <input
                type="number"
                value={newBaseline}
                onChange={(e) => setNewBaseline(Number(e.target.value))}
                min="0"
                max="100000"
                className="w-full h-[38px] px-3 border border-slate-300 rounded-md text-sm bg-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">Target goal (EFY 2016)</label>
              <input
                type="number"
                value={newTarget}
                onChange={(e) => setNewTarget(Number(e.target.value))}
                min="0"
                max="100000"
                className="w-full h-[38px] px-3 border border-slate-300 rounded-md text-sm bg-white"
                required
              />
            </div>

            <div className="sm:col-span-3 flex justify-end gap-3 pt-3 border-t border-indigo-100">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white rounded-md flex items-center gap-1 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <span>Publish to Master Record</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Command Strip */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search indicator by code or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold uppercase pr-2">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter</span>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 px-3 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-800 font-medium cursor-pointer"
          >
            <option value="All">Category: All</option>
            {categories.filter(c => c !== "All").map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="h-9 px-3 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-800 font-medium cursor-pointer"
          >
            <option value="All">Department: All</option>
            {DEPARTMENTS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Indicators Grid */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-w-full">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm font-sans">
            <thead className="bg-slate-50 font-semibold text-slate-500 uppercase tracking-wider text-xs">
              <tr>
                <th 
                  onClick={() => toggleSort("code")}
                  className="px-6 py-3.5 select-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1 font-bold">
                    <span>CODE</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort("category")}
                  className="px-6 py-3.5 select-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>CATEGORY</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort("name")}
                  className="px-6 py-3.5 select-none cursor-pointer hover:bg-slate-100 transition-colors min-w-[320px]"
                >
                  <div className="flex items-center gap-1">
                    <span>INDICATOR (OBJECTIVE DESCRIPTION)</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-3.5">UNIT</th>
                <th className="px-6 py-3.5 text-right font-mono">BASELINE (2015)</th>
                <th 
                  onClick={() => toggleSort("target")}
                  className="px-6 py-3.5 text-right font-mono select-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1 justify-end">
                    <span>TARGET (2016)</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-3.5 text-center">ACTION</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
              {filteredIndicators.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <p className="font-semibold text-slate-800">No Indicators Found</p>
                    <p className="text-xs text-slate-400 mt-1">Try relaxing filters or search keywords.</p>
                  </td>
                </tr>
              ) : (
                filteredIndicators.map((ind) => {
                  const isEditing = editingCode === ind.code;
                  return (
                    <tr 
                      key={ind.code}
                      className={`hover:bg-slate-50 transition-colors ${isEditing ? "bg-amber-50/40 hover:bg-amber-50/40" : ""}`}
                    >
                      {/* Code */}
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900 border-r border-slate-100">
                        {ind.code}
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4">
                        <span className="inline-flex text-[10px] uppercase font-mono px-2 py-0.5 font-bold rounded bg-slate-100 text-slate-800">
                          {ind.category}
                        </span>
                      </td>

                      {/* Name / Desc */}
                      <td className="px-6 py-4 max-w-sm">
                        {isEditing ? (
                          <textarea
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full p-2 border border-indigo-300 rounded text-sm bg-white text-slate-950 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            rows={2}
                          />
                        ) : (
                          <div>
                            <p className="font-medium text-slate-900 leading-snug">{ind.name}</p>
                            <p className="text-[10px] text-indigo-600 font-semibold mt-1 uppercase font-mono tracking-wider">
                              🏫 {ind.department}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Unit */}
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {ind.unit}
                      </td>

                      {/* Baseline */}
                      <td className="px-6 py-4 text-right font-mono font-semibold">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editBaseline}
                            onChange={(e) => setEditBaseline(Number(e.target.value))}
                            className="w-20 p-1 border border-indigo-300 rounded text-center text-sm bg-white"
                          />
                        ) : (
                          <span>{ind.baseline2015}</span>
                        )}
                      </td>

                      {/* Target */}
                      <td className="px-6 py-4 text-right font-mono font-bold text-indigo-900">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editTarget}
                            onChange={(e) => setEditTarget(Number(e.target.value))}
                            className="w-20 p-1 border border-indigo-300 rounded text-center text-sm bg-white"
                          />
                        ) : (
                          <span>{ind.target2016}</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEdit(ind)}
                                className="h-8 w-8 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 flex items-center justify-center transition-colors cursor-pointer"
                                title="Save changes"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              
                              <button
                                onClick={() => setEditingCode(null)}
                                className="h-8 w-8 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 flex items-center justify-center transition-colors cursor-pointer"
                                title="Abort inline editing"
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
                                    className="h-8 w-8 rounded hover:bg-indigo-50 border border-transparent hover:border-indigo-100 text-slate-500 hover:text-indigo-700 flex items-center justify-center transition-colors cursor-pointer"
                                    title="Click to enter inline editing"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>

                                  <button
                                    onClick={() => deleteIndicator(ind.code)}
                                    className="h-8 w-8 rounded hover:bg-rose-50 border border-transparent hover:border-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                                    title="Permanently remove indicator"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Protected</span>
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
      
      {/* Help Banner */}
      <div className="mt-4 bg-slate-100 rounded-xl p-3 border border-slate-200 flex items-center gap-2.5">
        <HelpCircle className="h-5 w-5 text-indigo-500 flex-shrink-0" />
        <span className="text-xs text-slate-600 leading-snug">
          <strong>Authority Rules:</strong> Only the <strong>Admin</strong> or <strong>Facility Head</strong> roles can execute creations, inline updates, or deletions inside the Master Plan tab. Switch your active session authority above to change permissions dynamically.
        </span>
      </div>

    </div>
  );
}
