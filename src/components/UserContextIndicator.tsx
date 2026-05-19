import React, { useState } from "react";
import { UserProfile, UserRole } from "../types";
import { localDb, isSupabaseConfigured } from "../lib/supabaseClient";
import { INITIAL_FACILITIES, INITIAL_REGIONS, DEPARTMENTS } from "../data/initialData";
import { Shield, Building, Globe, Layers, ChevronDown, Check, Info } from "lucide-react";

interface UserContextIndicatorProps {
  profile: UserProfile;
  onProfileChange: (newProfile: UserProfile) => void;
}

export default function UserContextIndicator({ profile, onProfileChange }: UserContextIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<UserRole>(profile.role);
  const [region, setRegion] = useState(profile.region);
  const [facility, setFacility] = useState(profile.facility);
  const [department, setDepartment] = useState(profile.department);
  const [name, setName] = useState(profile.displayName);
  const [email, setEmail] = useState(profile.email);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      id: profile.id,
      email,
      displayName: name,
      role,
      region,
      facility,
      department
    };
    localDb.saveActiveProfile(updated);
    onProfileChange(updated);
    setIsOpen(false);
  };

  const getRoleBadgeColor = (r: UserRole) => {
    switch (r) {
      case "admin": return "bg-red-100 text-red-800 border-red-200";
      case "regional_coordinator": return "bg-blue-100 text-blue-800 border-blue-200";
      case "facility_head": return "bg-green-100 text-green-800 border-green-200";
      case "department_head": return "bg-purple-100 text-purple-800 border-purple-200";
      case "data_entry": return "bg-orange-100 text-orange-800 border-orange-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="bg-slate-900 text-white rounded-xl shadow-lg border border-slate-800 p-4 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Current active state */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono tracking-wider uppercase font-semibold">Active Session Authority</span>
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded">
              🔥 Connected to Google Cloud Firestore (Live)
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="text-lg font-bold text-white flex items-center gap-1.5">
              <span>{profile.displayName}</span>
              <span className={`text-xs ml-1 px-2.5 py-0.5 rounded-full border font-semibold ${getRoleBadgeColor(profile.role)}`}>
                {profile.role.replace("_", " ").toUpperCase()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-1.5 gap-x-6 pt-1.5 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-slate-400">Region:</span>
              <span className="font-medium text-white">{profile.region}</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-slate-400">Facility:</span>
              <span className="font-medium text-white">{profile.facility}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-slate-400">Dept:</span>
              <span className="font-medium text-white">{profile.department}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Toggle control panel */}
        <div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full md:w-auto h-10 px-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-sm font-medium rounded-lg text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Shield className="h-4 w-4 text-amber-500" />
            <span>Customize Authority Context</span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-slate-800 animate-fadeIn text-slate-900 bg-white p-5 rounded-lg shadow-inner">
          <div className="flex items-start gap-2.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-lg mb-4">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">Multi-Level Role & Department Emulation</p>
              <p className="active:text-amber-900 mt-0.5">
                Hospital planners utilize role constraints to restrict who can write (Data Entry vs Admin) 
                and separate view scopes by departments. Adjust settings below to test the full logic!
              </p>
            </div>
          </div>

          <form onSubmit={handleApply} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Profile Details */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-slate-800"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50"
                  required
                />
              </div>

              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">Assigned Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full h-[38px] px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-slate-800 font-medium"
                >
                  <option value="admin">Admin (Full CRUD / Settings)</option>
                  <option value="regional_coordinator">Regional Coordinator (Region-Wide Read)</option>
                  <option value="facility_head">Facility Head (Hospital Manager)</option>
                  <option value="department_head">Department Head (Approve & Evaluate)</option>
                  <option value="data_entry">Data Entry Staff (Submit Performance)</option>
                  <option value="viewer">Viewer (Read-Only Observer)</option>
                </select>
              </div>

              {/* Region Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">Active Region Context</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full h-[38px] px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none bg-slate-50 text-slate-800 font-medium"
                >
                  {INITIAL_REGIONS.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Facility Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">Active Facility Context</label>
                <select
                  value={facility}
                  onChange={(e) => setFacility(e.target.value)}
                  className="w-full h-[38px] px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none bg-slate-50 text-slate-800 font-medium"
                >
                  {INITIAL_FACILITIES.map((f) => (
                    <option key={f.id} value={f.name}>{f.name} ({f.type})</option>
                  ))}
                </select>
              </div>

              {/* Department Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">Assigned Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full h-[38px] px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none bg-slate-50 text-slate-800 font-medium"
                >
                  <option value="All">All Departments (Admin Only)</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3 border-t border-slate-200 mt-4">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 border border-slate-300 text-sm font-semibold rounded-md text-slate-700 bg-white hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 border border-transparent text-sm font-semibold rounded-md text-white hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Check className="h-4 w-4" />
                <span>Apply Session Authority Shift</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
