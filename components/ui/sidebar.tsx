import React from "react";

export interface SidebarProps {
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}

export function Sidebar({ children, className = "", ...props }: SidebarProps) {
  return (
    <aside
      id="app-sidebar-nav"
      className={`w-64 border-r border-slate-800/60 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col shrink-0 h-screen sticky top-0 text-slate-300 ${className}`}
      {...props}
    >
      {children}
    </aside>
  );
}

export function SidebarHeader({ children, className = "", ...props }: SidebarProps) {
  return (
    <div
      id="sidebar-header"
      className={`border-b border-slate-800/60 p-4 bg-slate-950/20 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function SidebarContent({ children, className = "", ...props }: SidebarProps) {
  return (
    <div
      id="sidebar-content"
      className={`flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-4 no-scrollbar scroll-smooth ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function SidebarGroup({ children, className = "", ...props }: SidebarProps) {
  return (
    <div id="sidebar-group" className={`space-y-2 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function SidebarGroupLabel({ children, className = "", ...props }: SidebarProps) {
  return (
    <div
      id="sidebar-group-label"
      className={`px-3 text-[10px] font-mono font-extrabold uppercase tracking-widest text-slate-500 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function SidebarGroupContent({ children, className = "", ...props }: SidebarProps) {
  return (
    <div id="sidebar-group-content" className={`space-y-1 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function SidebarMenu({ children, className = "", ...props }: SidebarProps) {
  return (
    <ul id="sidebar-menu" className={`space-y-1 list-none p-0 m-0 ${className}`} {...props}>
      {children}
    </ul>
  );
}

export function SidebarMenuItem({ children, className = "", ...props }: SidebarProps) {
  return (
    <li id="sidebar-menu-item" className={`block ${className}`} {...props}>
      {children}
    </li>
  );
}

export interface SidebarMenuButtonProps {
  children?: React.ReactNode;
  isActive?: boolean;
  tooltip?: string;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  [key: string]: any;
}

export function SidebarMenuButton({
  children,
  isActive = false,
  tooltip,
  className = "",
  onClick,
  ...props
}: SidebarMenuButtonProps) {
  return (
    <button
      id={`sidebar-menu-btn-${tooltip?.toLowerCase().replace(/\s+/g, "-") || "item"}`}
      onClick={onClick}
      className={`w-full flex items-center h-10 px-3 py-2 rounded-lg text-left text-xs sm:text-sm font-semibold transition-all duration-300 group cursor-pointer ${
        isActive
          ? "bg-slate-800/65 text-white shadow-md relative"
          : "text-slate-400 hover:text-white hover:bg-slate-900/40"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
