import {
  Activity,
  BarChart3,
  ClipboardList,
  CalendarDays,
  Upload,
  Cloud,
  
  GitCompareArrows,
  MessageSquareText,
  
  Share2,
  Zap,
  HardDrive,
  Info,
  LayoutDashboard,
  X,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3, color: "text-blue-500" },
  { id: "google", label: "Workspace Suite", icon: Cloud, color: "text-sky-500" },
  { id: "workspace", label: "Analytics Workspace", icon: LayoutDashboard, color: "text-teal-500" },
  { id: "masterplan", label: "Master Plan", icon: ClipboardList, color: "text-purple-500" },
  { id: "monthly", label: "Monthly Entry", icon: CalendarDays, color: "text-amber-500" },
  { id: "import", label: "DHIS2 Import", icon: Upload, color: "text-green-500" },
  { id: "distribution", label: "Distribution", icon: Share2, color: "text-pink-500" },
  { id: "backup", label: "Backup & Recovery", icon: HardDrive, color: "text-red-500" },
  { id: "comparison", label: "YoY Compare", icon: GitCompareArrows, color: "text-indigo-500" },
  { id: "feedback", label: "Dept. Feedback", icon: MessageSquareText, color: "text-orange-500" },
  { id: "about", label: "About & Contact", icon: Info, color: "text-violet-500" },
];

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onCollapse?: () => void;
}

export function AppSidebar({ activeTab, onTabChange, onCollapse }: AppSidebarProps) {
  return (
    <Sidebar className="border-r border-sidebar-border/50 bg-gradient-to-b from-sidebar/55 to-sidebar">
      <SidebarHeader className="p-4 border-b border-sidebar-border/30 background-gradient">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="relative">
              <Zap className="h-6 w-6 text-blue-500 animate-pulse" />
              <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-lg group-hover:blur-xl transition-all"></div>
            </div>
            <div className="flex-1 col-span-1">
              <h2 className="text-sm font-bold text-white tracking-wide">Hospital M&amp;E</h2>
              <p className="text-[10px] text-slate-400 font-medium font-sans">Performance Tracker</p>
            </div>
          </div>
          {onCollapse && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCollapse();
              }}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              title="Collapse Sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-bold uppercase tracking-widest text-slate-500">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {navItems.map((item, index) => (
                <SidebarMenuItem key={item.id} className="animate-fade-in">
                  <SidebarMenuButton
                    isActive={activeTab === item.id}
                    onClick={() => onTabChange(item.id)}
                    tooltip={item.label}
                    className={`relative overflow-hidden rounded-lg transition-all duration-300 group ${
                      activeTab === item.id
                        ? "bg-blue-500/15 text-blue-400 font-semibold shadow-lg shadow-blue-500/20"
                        : "hover:bg-slate-800/40 text-slate-300 hover:text-white"
                    }`}
                  >
                    {/* Active Indicator */}
                    {activeTab === item.id && (
                      <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-blue-400 to-blue-600 shadow-lg"></div>
                    )}
                    
                    {/* Icon Container */}
                    <div className={`relative flex items-center justify-center ${
                      activeTab === item.id ? item.color : "text-slate-400 group-hover:text-white"
                    } transition-all duration-300`}>
                      <item.icon className={`h-5 w-5 transition-transform duration-300 ${
                        activeTab === item.id ? "scale-110" : "group-hover:scale-110 group-hover:rotate-12"
                      }`} />
                      {activeTab === item.id && (
                        <div className={`absolute inset-0 ${item.color} rounded-full blur-md opacity-40 -z-10 group-hover:opacity-60`}></div>
                      )}
                    </div>

                    {/* Label */}
                    <span className={`ml-3 text-xs font-medium transition-all duration-300 ${
                      activeTab === item.id ? "font-semibold tracking-wide text-white" : ""
                    }`}>
                      {item.label}
                    </span>

                    {/* Hover Background Gradient */}
                    {activeTab !== item.id && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
