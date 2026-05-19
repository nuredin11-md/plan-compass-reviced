import React, { createContext, useContext, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

const SelectContext = createContext<{
  value: string;
  onValueChange: (v: string) => void;
  options: SelectOption[];
  registerOption: (value: string, label: string) => void;
} | null>(null);

export function Select({ value, onValueChange, children }: any) {
  const [options, setOptions] = useState<SelectOption[]>([]);

  const registerOption = (val: string, lbl: string) => {
    setOptions(prev => {
      if (prev.some(o => o.value === val)) return prev;
      return [...prev, { value: val, label: lbl }];
    });
  };

  return (
    <SelectContext.Provider value={{ value, onValueChange, options, registerOption }}>
      <div className="relative inline-block w-full sm:w-auto text-slate-850">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className = "", children }: any) {
  const ctx = useContext(SelectContext);
  if (!ctx) return null;

  return (
    <div className="relative w-full">
      <select
        value={ctx.value}
        onChange={(e) => ctx.onValueChange && ctx.onValueChange(e.target.value)}
        className={`w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:border-slate-500 rounded-lg h-9 pl-3 pr-8 focus:outline-none appearance-none cursor-pointer transition-colors ${className}`}
      >
        {ctx.options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <ChevronDown className="h-4 w-4" />
      </div>
    </div>
  );
}

export function SelectValue({ placeholder }: any) {
  // standard select displays its options natively, so this is just metadata representation
  return null;
}

export function SelectContent({ children }: any) {
  // Let item children register their options under the SelectContext
  return <div className="hidden border-none p-0 m-0">{children}</div>;
}

export function SelectItem({ value, children }: any) {
  const ctx = useContext(SelectContext);
  const label = typeof children === "string" ? children : String(children);

  useEffect(() => {
    if (ctx) {
      ctx.registerOption(value, label);
    }
  }, [value, label, ctx]);

  return null;
}
