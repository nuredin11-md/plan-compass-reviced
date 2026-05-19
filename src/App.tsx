import React, { useState, useEffect } from "react";
import { Indicator, MonthlyEntry, UserProfile } from "./types";
import { localDb } from "./lib/supabaseClient";
import { db, auth } from "./lib/firebase";
import { signInAnonymously } from "firebase/auth";
import { collection, onSnapshot, doc, writeBatch, setDoc } from "firebase/firestore";

// Import modular sub-components
import UserContextIndicator from "./components/UserContextIndicator";
import DashboardTab from "./components/DashboardTab";
import MasterPlanTab from "./components/MasterPlanTab";
import MonthlyDataTab from "./components/MonthlyDataTab";
import FeedbackTab from "./components/FeedbackTab";
import DhisExportTab from "./components/DhisExportTab";
import AiAnalysisTab from "./components/AiAnalysisTab";
import DistributionTab from "./components/DistributionTab";
import BackupTab from "./components/BackupTab";
import ComparisonTab from "./components/ComparisonTab";
import AboutTab from "./components/AboutTab";

// Sidebar Component
import { AppSidebar } from "./components/AppSidebar";

// Icons
import { Compass, Menu, X } from "lucide-react";

export default function App() {
  // Sync state loaded persistently from LocalStorage matching database emulation schema
  const [profile, setProfile] = useState<UserProfile>(() => localDb.getActiveProfile());
  const [indicators, setIndicators] = useState<Indicator[]>(() => localDb.getIndicators());
  const [monthlyData, setMonthlyData] = useState<MonthlyEntry[]>(() => localDb.getMonthlyEntries());

  // Set up Firebase Real-time Synchronization and Seeding
  useEffect(() => {
    let unsubscribeIndicators: (() => void) | null = null;
    let unsubscribeMonthlyData: (() => void) | null = null;

    // 1. Authenticate anonymously for secure, verified sessions
    signInAnonymously(auth)
      .then(async (userCred) => {
        const uid = userCred.user.uid;
        console.log("Firebase secure anonymous session established:", uid);

        // 2. Align local profile structure with the authenticated secure UID in the cloud
        const currentProfile = localDb.getActiveProfile();
        const updatedProfile = {
          ...currentProfile,
          id: uid,
          role: "admin" as const, // Grant default admin capability for user testing
        };

        // Write profile document to Cloud firestore first to provide correct security authority context
        try {
          const profileDocRef = doc(db, "userProfiles", uid);
          await setDoc(profileDocRef, updatedProfile);
          localDb.saveActiveProfile(updatedProfile);
          setProfile(updatedProfile);
          console.log("Profile secured in Live Firestore for UID:", uid);
        } catch (profileErr: any) {
          console.warn("Could not save initial profile context in Live database:", profileErr.message);
        }

        // 3. Set up Real-time master plan updates & initial db seeding, now backed by authenticated context
        unsubscribeIndicators = onSnapshot(
          collection(db, "indicators"),
          (snapshot) => {
            if (snapshot.empty) {
              console.log("Empty Firestore indicators collection. Seeding INITIAL_INDICATORS in batch...");
              import("./data/initialData").then(({ INITIAL_INDICATORS }) => {
                const batch = writeBatch(db);
                INITIAL_INDICATORS.forEach((ind) => {
                  const docRef = doc(db, "indicators", ind.code);
                  batch.set(docRef, ind);
                });
                batch.commit()
                  .then(() => console.log("Seeding INITIAL_INDICATORS to Cloud Firestore completed."))
                  .catch((err) => console.error("Batch seed indicators failed:", err));
              });
            } else {
              const remoteList: Indicator[] = [];
              snapshot.forEach((docSnap) => {
                remoteList.push(docSnap.data() as Indicator);
              });
              // Sync with local fallback cache & React state
              localStorage.setItem("plan_compass_indicators", JSON.stringify(remoteList));
              setIndicators(remoteList);
            }
          },
          (error) => {
            console.error("Firestore indicators snapshot subscription permission error:", error.message);
          }
        );

        // 4. Set up Real-time monthly metrics performance updates & initial seeding
        unsubscribeMonthlyData = onSnapshot(
          collection(db, "monthlyEntries"),
          (snapshot) => {
            if (snapshot.empty) {
              console.log("Empty Firestore monthlyEntries collection. Seeding sample metrics in batch...");
              import("./data/initialData").then(({ generateSampleData }) => {
                const batch = writeBatch(db);
                const samples = generateSampleData();
                samples.forEach((entry) => {
                  const entryId = `${entry.code}_${entry.month}`;
                  const docRef = doc(db, "monthlyEntries", entryId);
                  batch.set(docRef, entry);
                });
                batch.commit()
                  .then(() => console.log("Seeding sample monthly data of EFY 2016 to Firestore completed."))
                  .catch((err) => console.error("Batch seed monthlyEntries failed:", err));
              });
            } else {
              const remoteEntries: MonthlyEntry[] = [];
              snapshot.forEach((docSnap) => {
                remoteEntries.push(docSnap.data() as MonthlyEntry);
              });
              // Sync with local fallback cache & React state
              localStorage.setItem("plan_compass_monthly_entries", JSON.stringify(remoteEntries));
              setMonthlyData(remoteEntries);
            }
          },
          (error) => {
            console.error("Firestore monthlyEntries snapshot subscription permission error:", error.message);
          }
        );
      })
      .catch((err) => {
        console.warn("Could not establish a secure Firebase session (offline fallback active):", err.message);
      });

    // Unmount cleanup
    return () => {
      if (unsubscribeIndicators) unsubscribeIndicators();
      if (unsubscribeMonthlyData) unsubscribeMonthlyData();
    };
  }, []);

  // Active Navigation Tab selection (defaults to dashboard matching the sidebar id)
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  
  // Mobile responsive sidebar visibility
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Keep state synchronized
  const handleProfileChange = (newProfile: UserProfile) => {
    setProfile(newProfile);
  };

  const handleIndicatorsChange = (newIndicators: Indicator[]) => {
    setIndicators(newIndicators);
  };

  const handleMonthlyDataChange = (newMonthlyData: MonthlyEntry[]) => {
    setMonthlyData(newMonthlyData);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSidebarOpen(false); // Auto-close on mobile layout
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased flex flex-col md:flex-row font-sans">
      
      {/* MOBILE HEADER BAR (Toggles slide-out sidebar drawer on minor screens) */}
      <div className="md:hidden bg-slate-900 text-white h-14 flex items-center justify-between px-4 sticky top-0 z-40 screen-only shadow-md">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none transition-colors"
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <span className="text-xs font-bold uppercase tracking-wider font-mono">Plan Compass M&amp;E</span>
        </div>
        <div className="text-right text-[10px] font-mono text-indigo-400 font-extrabold font-semibold">
          {profile.facility.split(' ')[0]}
        </div>
      </div>

      {/* SIDEBAR NAVIGATION GRID (Responsive: Collapsible slide-in on mobile, fixed side-bar left on desktop) */}
      <div className={`screen-only flex-none z-40 transition-all duration-300 md:block ${
        sidebarOpen 
          ? "fixed inset-0 w-64 translate-x-0" 
          : "hidden md:sticky md:top-0 md:h-screen md:w-64"
      }`}>
        <AppSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        
        {/* Mobile backdrop shadow layer */}
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/45 md:hidden -z-10"
          />
        )}
      </div>

      {/* MAIN CONTENT AREA CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* DESKTOP HEADER BAR (Visible on Screen, Hidden during standard browser printing) */}
        <header className="hidden md:flex bg-white border-b border-slate-205/60 h-16 items-center justify-between px-6 sticky top-0 z-30 screen-only">
          
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 text-white p-2 rounded-lg flex items-center justify-center shadow">
              <Compass className="h-5 w-5 text-indigo-400 rotate-45" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-950 tracking-tight leading-none flex items-center gap-1.5 font-sans">
                <span>PLAN COMPASS</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">v1.2</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium font-sans">Health Performance Planning &amp; Evaluation Monitor</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 font-sans">
            <div className="text-right">
              <div className="text-slate-900 font-bold leading-none">{profile.displayName}</div>
              <span className="text-[10px] text-indigo-600 font-mono text-xs font-bold leading-normal">{profile.email}</span>
            </div>

            <div className="h-8 w-px bg-slate-200"></div>

            <div className="text-xs bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-mono font-bold">
              {profile.facility}
            </div>
          </div>

        </header>

        {/* DETAILED SCREEN CANVAS SCROLL PORT */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6 screen-only overflow-y-auto">
          
          {/* User context selector indicator */}
          <UserContextIndicator 
            profile={profile} 
            onProfileChange={handleProfileChange} 
          />

          {/* Render Active Tab panel with elegant container */}
          <div className="bg-transparent rounded-xl">
            {activeTab === "dashboard" && (
              <DashboardTab 
                indicators={indicators} 
                monthlyData={monthlyData} 
                profile={profile}
              />
            )}

            {activeTab === "workspace" && (
              <AiAnalysisTab 
                indicators={indicators} 
                monthlyData={monthlyData} 
                profile={profile}
              />
            )}

            {activeTab === "masterplan" && (
              <MasterPlanTab 
                indicators={indicators} 
                onIndicatorsChange={handleIndicatorsChange}
                profile={profile}
              />
            )}

            {activeTab === "monthly" && (
              <MonthlyDataTab 
                indicators={indicators} 
                monthlyData={monthlyData} 
                onMonthlyDataChange={handleMonthlyDataChange}
                profile={profile}
              />
            )}

            {activeTab === "import" && (
              <DhisExportTab 
                indicators={indicators} 
                monthlyData={monthlyData} 
                onMonthlyDataChange={handleMonthlyDataChange}
                profile={profile}
              />
            )}

            {activeTab === "distribution" && (
              <DistributionTab 
                profile={profile}
              />
            )}

            {activeTab === "backup" && (
              <BackupTab 
                indicators={indicators} 
                monthlyData={monthlyData} 
                onIndicatorsChange={handleIndicatorsChange}
                onMonthlyDataChange={handleMonthlyDataChange}
                profile={profile}
              />
            )}

            {activeTab === "comparison" && (
              <ComparisonTab 
                indicators={indicators} 
                monthlyData={monthlyData} 
                profile={profile}
              />
            )}

            {activeTab === "feedback" && (
              <FeedbackTab 
                indicators={indicators} 
                monthlyData={monthlyData} 
                profile={profile}
              />
            )}

            {activeTab === "about" && (
              <AboutTab 
                profile={profile}
              />
            )}
          </div>

        </main>

        {/* PRINT-ONLY OFFICIAL DOCUMENT VIEW (Formatted perfectly when printing to paper or PDF download via window.print()) */}
        <section className="print-only hidden p-10 max-w-4xl mx-auto space-y-12 bg-white text-slate-900">
          
          {/* Print Header */}
          <div className="border-b-4 border-slate-900 pb-6 flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-extrabold tracking-tight font-sans text-slate-900">PLAN COMPASS</h1>
              <p className="text-xs uppercase font-mono tracking-wider font-bold text-slate-500">
                National Health Monitoring Registry - Federal Strategic Report
              </p>
              <div className="text-sm font-semibold text-slate-800 pt-2 grid grid-cols-2 gap-x-8 gap-y-1">
                <div>🏥 Facility: <strong>{profile.facility}</strong></div>
                <div>🌍 Authority Region: <strong>{profile.region}</strong></div>
                <div>📑 Authority Department: <strong>{profile.department}</strong></div>
                <div>🧑‍💻 Generated by: <strong>{profile.displayName}</strong></div>
              </div>
            </div>
            
            <div className="text-right space-y-2">
              <div className="inline-block p-4 border border-slate-300 rounded font-mono text-center text-xs w-44">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Authorized Stamp</span>
                <div className="font-extrabold text-slate-800 py-3 text-sm border-b border-dashed border-slate-200">APPROVED</div>
                <span className="block text-[8px] text-slate-400 font-semibold pt-1">EFY 2016 Strategic Review</span>
              </div>
            </div>
          </div>

          {/* Print Meta Details */}
          <div className="space-y-4 font-sans text-xs">
            <h2 className="text-lg font-bold uppercase tracking-wider text-slate-800 font-sans border-b border-slate-200 pb-1">
              I. Executive Performance Summary
            </h2>
            <p className="text-xs text-slate-700 leading-relaxed font-sans">
              This document outlines the performance mapping and target achievements registered for active indicators inside the <strong>{profile.department !== "All" ? profile.department : "Hospital System"}</strong>. All baseline numbers represent measurements logged during the 2015 baseline cycle, with comparative actuals recorded across months of the Ethiopian fiscal year 2016 period.
            </p>
          </div>

          {/* Master Plan print datatable */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold uppercase tracking-wider text-slate-800 font-sans border-b border-slate-200 pb-1">
              II. Master Indicators &amp; Target Achievement Table
            </h2>
            
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-900 text-slate-800 font-mono">
                  <th className="p-2.5">Indicator Code</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5 text-left w-2/5">Indicator Metric Name</th>
                  <th className="p-2.5 text-center">Unit</th>
                  <th className="p-2.5 text-right">Baseline (2015)</th>
                  <th className="p-2.5 text-right">Target (2016)</th>
                  <th className="p-2.5 text-right">Consolidated Achievement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {indicators.map((ind) => {
                  const reports = monthlyData.filter(e => e.code === ind.code && e.actual !== null);
                  const actualSum = reports.reduce((acc, curr) => acc + (curr.actual || 0), 0);
                  const avgActual = reports.length > 0 ? Math.round(actualSum / reports.length) : null;

                  return (
                    <tr key={ind.code} className="hover:bg-slate-55 transition-colors">
                      <td className="p-2.5 font-mono text-[10px] font-bold text-slate-800">{ind.code}</td>
                      <td className="p-2.5 font-mono text-[10px] uppercase text-slate-500">{ind.category}</td>
                      <td className="p-2.5">
                        <div className="font-bold text-slate-850 leading-normal">{ind.name}</div>
                        <div className="text-[9px] text-slate-400 font-medium">Department: {ind.department}</div>
                      </td>
                      <td className="p-2.5 text-center font-medium">{ind.unit}</td>
                      <td className="p-2.5 text-right font-mono">{ind.baseline2015}</td>
                      <td className="p-2.5 text-right font-mono font-bold">{ind.target2016}</td>
                      <td className="p-2.5 text-right font-mono font-extrabold text-indigo-900">
                        {avgActual !== null ? `${avgActual} ${ind.unit}` : "Unreported"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Print Sign-off block */}
          <div className="pt-16 grid grid-cols-2 gap-12 text-xs">
            <div className="space-y-8">
              <span className="block text-slate-400 font-bold uppercase tracking-wider font-mono text-[10px]">Verified By Department Unit Head</span>
              <div className="border-t border-slate-900 pt-3">
                <span className="block font-bold text-slate-800 font-sans">Focal Officer Name &amp; Signature:</span>
                <span className="block text-slate-500 pt-1 font-sans">Title: Department Health Bureau Chief</span>
                <span className="block text-slate-400 pt-0.5 font-mono text-[10px]">Date: 2026-05-19</span>
              </div>
            </div>

            <div className="space-y-8">
              <span className="block text-slate-400 font-bold uppercase tracking-wider font-mono text-[10px]">Authorized Counter-Signature By Director</span>
              <div className="border-t border-slate-900 pt-3">
                <span className="block font-bold text-slate-800 font-sans">Facility Director Signature &amp; Seal:</span>
                <span className="block text-slate-500 pt-1 font-sans">Title: Chief of Clinical Planning Services</span>
                <span className="block text-slate-400 pt-0.5 font-mono text-[10px]">Date: 2026-05-19</span>
              </div>
            </div>
          </div>

          {/* Footer info stamp */}
          <div className="text-[10px] text-center text-slate-400 font-mono pt-12 border-t border-slate-200">
            Plan Compass planning record. Generated securely via Local Browser Sandbox database layer encryption.
          </div>

        </section>

        {/* Screen Footer */}
        <footer className="bg-white border-t border-slate-200 py-6 screen-only text-xs text-slate-400 text-center font-sans space-y-1.5">
          <p className="font-semibold text-slate-600">
            🧭 Plan Compass &copy; 2026 | Hospital Evaluation, Planning &amp; Monitoring Registry
          </p>
          <p className="active:underline max-w-sm mx-auto leading-normal">
            Designed specifically to elevate local medical planning, support Ethiopian calendar monthly tracking, and fulfill Ministry of Health reporting compliance.
          </p>
        </footer>

      </div>

    </div>
  );
}
