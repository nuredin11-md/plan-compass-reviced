import React from "react";
import { Mail, Github, Code2, Heart, MapPin, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AboutTabProps {
  profile?: {
    facility: string;
    region: string;
    role: string;
  };
}

export default function AboutTab({ profile }: AboutTabProps) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent sm:text-4xl">
          About Plan Compass
        </h1>
        <p className="text-sm font-medium text-slate-500 max-w-2xl mx-auto sm:text-base">
          Hospital M&E Performance Tracking System - Built for healthcare excellence and data-driven decision making
        </p>
      </div>

      {/* Application Overview */}
      <Card className="border border-indigo-100 bg-gradient-to-br from-indigo-50/40 to-purple-50/40 p-6 rounded-2xl shadow-sm">
        <CardHeader className="border-b border-indigo-100/30 pb-3">
          <CardTitle className="flex items-center gap-2 text-slate-950 font-sans font-bold text-base">
            <Code2 className="h-5 w-5 text-indigo-600" />
            Application Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">Purpose</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                Plan Compass is a comprehensive Monitoring & Evaluation (M&E) system designed for healthcare facilities to track performance indicators, manage master plans, and ensure data-driven decision making.
              </p>
            </div>
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">Key Features</h3>
              <ul className="space-y-2 text-xs text-slate-600 font-sans">
                <li className="flex gap-2 items-center">
                  <span className="text-indigo-600 font-bold">✓</span> Real-time KPI Dashboard
                </li>
                <li className="flex gap-2 items-center">
                  <span className="text-indigo-600 font-bold">✓</span> Data Entry & Auto-save
                </li>
                <li className="flex gap-2 items-center">
                  <span className="text-indigo-600 font-bold">✓</span> Secure Data Backup
                </li>
                <li className="flex gap-2 items-center">
                  <span className="text-indigo-600 font-bold">✓</span> Multi-channel Distribution
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Developer Info Card */}
      <Card className="border border-amber-200/60 bg-gradient-to-br from-amber-50/30 to-orange-50/30 p-6 rounded-2xl shadow-sm font-sans">
        <CardHeader className="border-b border-amber-200/30 pb-3">
          <CardTitle className="flex items-center gap-2 text-slate-950 font-sans font-bold text-base">
            <Code2 className="h-5 w-5 text-amber-600" />
            Developer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          {/* Developer Profile */}
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl shadow-inner select-none">
                NM
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-xl font-bold text-slate-900 leading-none">Nuredin Muhammed</h3>
                <p className="text-xs font-semibold text-slate-500">Full-Stack Developer</p>
                <p className="text-xs text-slate-600 leading-relaxed mt-2 font-medium">
                  Building innovative healthcare solutions with modern technology
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-amber-200/30">
            {/* Email */}
            <a
              href="mailto:nuredinmuhammed176@gmail.com"
              className="group p-4 rounded-xl border border-slate-200 bg-white/60 hover:border-amber-400 hover:bg-amber-50/20 transition-all duration-200 flex items-center"
            >
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-amber-600 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 font-sans uppercase">Email</p>
                  <p className="font-mono text-xs font-bold text-slate-800 group-hover:text-amber-700 break-all">
                    nuredinmuhammed176@gmail.com
                  </p>
                </div>
              </div>
            </a>

            {/* GitHub */}
            <a
              href="https://github.com/nuredin11-md"
              target="_blank"
              rel="noopener noreferrer"
              className="group p-4 rounded-xl border border-slate-200 bg-white/60 hover:border-slate-400 hover:bg-slate-50/30 transition-all duration-200 flex items-center"
            >
              <div className="flex items-center gap-3">
                <Github className="h-5 w-5 text-slate-700 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 font-sans uppercase">GitHub</p>
                  <p className="font-mono text-xs font-bold text-slate-800 group-hover:text-slate-900">
                    github.com/nuredin11-md
                  </p>
                </div>
              </div>
            </a>
          </div>

          {/* Contact Buttons */}
          <div className="flex gap-3 pt-4 border-t border-amber-200/30">
            <a 
              href="mailto:nuredinmuhammed176@gmail.com"
              className="flex-1 inline-flex items-center justify-center gap-2 font-bold text-xs rounded-lg h-9 px-4 bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all select-none hover:shadow-md cursor-pointer"
            >
              <Mail className="h-4 w-4" />
              Send Email
            </a>
            <a
              href="https://github.com/nuredin11-md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 font-bold text-xs rounded-lg h-9 px-4 bg-white border border-slate-300 text-slate-700 hover:border-slate-800 hover:bg-slate-50 shadow-sm transition-all select-none cursor-pointer"
            >
              <Github className="h-4 w-4" />
              Visit GitHub
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Technology Stack */}
      <Card className="p-6 rounded-2xl border border-slate-200/80 shadow-sm bg-white">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="flex items-center gap-2 text-slate-950 font-sans font-bold text-base">
            <Code2 className="h-5 w-5 text-indigo-600" />
            Technology Stack
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs text-indigo-600">Frontend</h4>
              <ul className="text-xs text-slate-500 space-y-1.5 font-sans leading-relaxed">
                <li>• React 18 + TypeScript</li>
                <li>• Vite + TailwindCSS</li>
                <li>• shadcn/ui Components</li>
                <li>• Recharts Visualization</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs text-indigo-600">Backend System</h4>
              <ul className="text-xs text-slate-500 space-y-1.5 font-sans leading-relaxed">
                <li>• Encrypted SQLite / Cache State</li>
                <li>• Local Session &amp; Auth Handlers</li>
                <li>• Audit Trail Integration</li>
                <li>• Real-time State Subscriptions</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-slate-905 text-xs text-indigo-600">Features</h4>
              <ul className="text-xs text-slate-500 space-y-1.5 font-sans leading-relaxed">
                <li>• End-to-End Encryption</li>
                <li>• Local Backup &amp; Diagnostics</li>
                <li>• Action Audit Logging</li>
                <li>• Telegram &amp; WA Exporters</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features & Capabilities */}
      <Card className="p-6 rounded-2xl border border-slate-200/80 shadow-sm bg-white font-sans">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="flex items-center gap-2 text-slate-950 font-sans font-bold text-base">
            <Heart className="h-5 w-5 text-indigo-600" />
            Core Features
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-indigo-50/40 border border-indigo-100/50">
              <p className="font-bold text-xs text-indigo-750 mb-1">Dashboard</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Real-time KPI metrics with visual indicators and performance tracking
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-indigo-50/40 border border-indigo-100/50">
              <p className="font-bold text-xs text-indigo-750 mb-1">Data Entry</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Auto-save enabled monthly data entry with validation and audit logging
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-indigo-50/40 border border-indigo-100/50">
              <p className="font-bold text-xs text-indigo-750 mb-1">Security</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Encrypted storage, input validation, and comprehensive backup system
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-indigo-50/40 border border-indigo-100/50">
              <p className="font-bold text-xs text-indigo-750 mb-1">Distribution</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Multi-channel sharing via Telegram and WhatsApp with secure credentials
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-indigo-50/40 border border-indigo-100/50">
              <p className="font-bold text-xs text-indigo-750 mb-1">Analysis</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Data quality assessment and year-on-year performance comparison
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-indigo-50/40 border border-indigo-100/50">
              <p className="font-bold text-xs text-indigo-750 mb-1">Export</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Export reports in PDF and Excel formats with customizable layouts
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <Card className="bg-gradient-to-r from-indigo-500/5 to-purple-500/5 p-6 rounded-2xl border border-slate-150">
        <CardContent className="p-0">
          <div className="text-center space-y-2">
            <p className="text-xs font-semibold text-slate-500 flex items-center justify-center gap-1.5">
              <Heart className="h-4 w-4 text-rose-500 animate-pulse" />
              Built with passion for healthcare excellence
            </p>
            <p className="text-[11px] font-mono font-semibold text-slate-400 flex items-center justify-center gap-1.5">
              <Calendar className="h-4 w-4" />
              © {currentYear} Plan Compass. All rights reserved.
            </p>
            <p className="text-[10px] font-semibold text-slate-400">
              Developed by <span className="font-bold text-slate-800">Nuredin Muhammed</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
