import React from "react";
import { Info } from "lucide-react";

interface EmptyDataStateProps {
  type: string;
  period?: string;
  name?: string;
}

export function EmptyDataState({ type, period, name }: EmptyDataStateProps) {
  return (
    <div className="text-center p-12 bg-white border border-slate-200 border-dashed rounded-2xl max-w-lg mx-auto space-y-3">
      <div className="h-10 w-10 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
        <Info className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-slate-900">Reporting Stream Empty</h4>
        <p className="text-xs text-slate-400 leading-normal">
          No clinical reports are currently logged for {name || period || "this department Unit"}.
        </p>
      </div>
    </div>
  );
}
