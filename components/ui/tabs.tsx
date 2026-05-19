import React, { createContext, useContext, useState } from "react";

const TabsContext = createContext<{
  activeTab: string;
  changeTab: (val: string) => void;
} | null>(null);

export function Tabs({ 
  defaultValue, 
  value, 
  onValueChange, 
  children, 
  className = "" 
}: any) {
  const [active, setActive] = useState(defaultValue);
  const activeTab = value !== undefined ? value : active;
  const changeTab = onValueChange || setActive;

  return (
    <TabsContext.Provider value={{ activeTab, changeTab }}>
      <div className={`space-y-4 ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = "" }: any) {
  return (
    <div className={`flex bg-slate-100 p-1 rounded-xl w-full max-w-sm gap-1 border border-slate-205/60 ${className}`}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, className = "" }: any) {
  const ctx = useContext(TabsContext);
  if (!ctx) return null;
  const isActive = ctx.activeTab === value;

  return (
    <button
      type="button"
      onClick={() => ctx.changeTab(value)}
      className={`flex-1 text-center py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
        isActive 
          ? "bg-white text-slate-950 shadow-sm border border-slate-200/50" 
          : "text-slate-500 hover:text-slate-800"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className = "" }: any) {
  const ctx = useContext(TabsContext);
  if (!ctx || ctx.activeTab !== value) return null;

  return <div className={`animate-fadeIn ${className}`}>{children}</div>;
}
