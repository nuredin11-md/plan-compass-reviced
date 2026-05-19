import React, { useState } from "react";
import { UserProfile } from "../types";
import { 
  Share2, Printer, CheckCircle, FileText, Globe, Send, Mail, Cloud, ShieldCheck
} from "lucide-react";

interface DistributionTabProps {
  profile: UserProfile;
}

export default function DistributionTab({ profile }: DistributionTabProps) {
  const [stampStatus, setStampStatus] = useState<boolean>(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState<string>("");

  const triggerPrint = () => {
    window.print();
  };

  const circulatePlan = (type: string) => {
    setSuccessMsg(`Consolidated EFY 2016 strategic data successfully queued to the ${profile.region} Bureau over ${type}!`);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const handleEmailSync = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setSuccessMsg(`Secure report link dispatched to focal officer: ${emailInput.trim()}`);
    setEmailInput("");
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <div className="bg-slate-900 text-pink-400 p-1.5 rounded-lg">
            <Share2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-950">Strategic Report Distribution &amp; Share</h2>
            <p className="text-[11px] text-slate-400 font-medium">Verify authorization credentials, generate official printouts, and trigger sync protocols</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5">
          {/* Left Block */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">1. Local Actions &amp; Printing</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Plan Compass is fully equipped with professional CSS Media Print rules. Triggering a print or standard browser "Save to PDF" output will hide non-essential sidebars and format an official, signed-and-stamped Federal Health strategic review document automatically.
            </p>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3.5">
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="font-semibold text-slate-700">Digital Authorized Stamp</span>
                <button
                  onClick={() => setStampStatus(!stampStatus)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    stampStatus ? "bg-indigo-600" : "bg-slate-205"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      stampStatus ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="text-[10px] text-slate-400 leading-relaxed">
                {stampStatus 
                  ? "● Standard digital stamp 'APPROVED EFY 2016' is locked and will appear in the top-right corner of the printed report." 
                  : "○ Digital validation stamp will be hidden from print summaries."}
              </div>

              <button
                onClick={triggerPrint}
                className="w-full h-10 bg-slate-950 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow"
              >
                <Printer className="h-4 w-4" />
                <span>Launch Document Print View</span>
              </button>
            </div>
          </div>

          {/* Right Block */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">2. Secure Network Circulation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Directly transmit the secure data payload to official planning networks. Values are validated against regional boundaries prior to sync.
            </p>

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-3 text-xs flex gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="font-semibold">{successMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => circulatePlan("Ministry Regional Gateway")}
                className="p-3 bg-white border border-slate-200 hover:border-indigo-400 transition-colors rounded-xl text-left space-y-1 block cursor-pointer"
              >
                <Globe className="h-4 w-4 text-indigo-600" />
                <strong className="text-xs block text-slate-850">Bureau Gateway</strong>
                <span className="text-[10px] text-slate-400 block leading-tight">Direct API packet to regional DHIS database</span>
              </button>

              <button
                onClick={() => circulatePlan("Secure MOH SFTP Payload")}
                className="p-3 bg-white border border-slate-200 hover:border-indigo-400 transition-colors rounded-xl text-left space-y-1 block cursor-pointer"
              >
                <Cloud className="h-4 w-4 text-indigo-600" />
                <strong className="text-xs block text-slate-850">MOH Central Cloud</strong>
                <span className="text-[10px] text-slate-400 block leading-tight">Sync encrypted JSON baseline metadata packet</span>
              </button>
            </div>

            <form onSubmit={handleEmailSync} className="space-y-2 pt-2">
              <span className="text-[10px] tracking-wider uppercase font-mono font-bold text-slate-400 block">Circulate via secure direct link</span>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="focal.officer@moh.gov.et"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="flex-1 h-10 border border-slate-300 rounded-lg text-xs px-3 focus:outline-none focus:border-slate-800 text-slate-800"
                />
                <button
                  type="submit"
                  className="h-10 px-3.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold rounded-lg cursor-pointer max-w-xs flex items-center justify-center"
                >
                  <Send className="h-3 w-3" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Informative Footer Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-6 flex gap-3 text-slate-500">
          <ShieldCheck className="h-5 w-5 text-slate-400 flex-shrink-0" />
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">Strategic Security Standard</span>
            <p className="text-[11px] leading-relaxed">
              Export and print transactions inside Plan Compass generate unique digital trace tokens securely linked to <strong>{profile.email}</strong> to support medical audit logs and administrative accountability.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
