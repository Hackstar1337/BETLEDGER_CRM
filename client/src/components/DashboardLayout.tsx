// Standalone auth - no longer using OAuth
// import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Users,
  TrendingUp,
  DollarSign,
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  FileText,
  UserPlus,
  Zap,
  AlertTriangle,
  ClipboardList,
  GamepadIcon,
  Settings as SettingsIcon,
  BarChart3,
  Calculator,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const mainMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Zap, label: "Player Search", path: "/quick-actions" },
  { icon: TrendingUp, label: "Panels", path: "/panels" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: DollarSign, label: "Transactions", path: "/transactions" },
  { icon: AlertTriangle, label: "Extra/Wrong", path: "/extra-wrong" },
  { icon: GamepadIcon, label: "Gameplay", path: "/gameplay" },
  { icon: Building2, label: "Bank Accounts", path: "/bank-accounts" },
  { icon: UserPlus, label: "Players", path: "/players" },
  {
    icon: ClipboardList,
    label: "Today's Players",
    path: "/todays-players-report",
  },
  { icon: FileText, label: "Reports", path: "/reports" },
  { icon: Calculator, label: "Panel History", path: "/panel-history" },
];

const bottomMenuItems = [
  { icon: SettingsIcon, label: "Settings", path: "/settings" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { data: user, isLoading: loading } = trpc.standaloneAuth.me.useQuery();
  const { data: panels } = trpc.panels.list.useQuery();
  const logoutMutation = trpc.standaloneAuth.logout.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to
              launch the login flow.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { data: user } = trpc.standaloneAuth.me.useQuery();
  const logoutMutation = trpc.standaloneAuth.logout.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
  });
  const logout = () => logoutMutation.mutate();
  const [location, setLocation] = useLocation();
  const { data: panels } = trpc.panels.list.useQuery();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = [...mainMenuItems, ...bottomMenuItems].find(
    item => item.path === location
  );
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center bg-gradient-to-r from-slate-50 via-blue-50/50 to-indigo-50/50 border-b border-slate-200">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-slate-600" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold tracking-tight truncate text-slate-900">
                    Navigation
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 flex flex-col">
            <SidebarMenu className="px-2 py-1 flex-1">
              {mainMenuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal rounded-lg ${
                        isActive 
                          ? "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-200 shadow-sm" 
                          : "hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-emerald-600" : "text-slate-500"}`}
                      />
                      <span className={isActive ? "font-medium" : ""}>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Dynamic Panel Menu Items */}
              {panels && panels.length > 0 && (
                <>
                  <div className="px-3 py-2 mt-2 mb-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent flex-1"></div>
                      <span className="text-slate-600">Dynamic Panels</span>
                      <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent flex-1"></div>
                    </p>
                  </div>
                  {panels.map(panel => {
                    const panelPath = `/panel/${encodeURIComponent(panel.name)}`;
                    const isActive = location === panelPath;
                    return (
                      <SidebarMenuItem key={panel.id}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(panelPath)}
                          tooltip={panel.name}
                          className={cn(
                            "h-10 transition-all font-normal group relative overflow-hidden rounded-lg",
                            isActive 
                              ? "bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 text-violet-700 shadow-sm" 
                              : "hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 text-slate-600 hover:text-slate-900"
                          )}
                        >
                          <div className={cn(
                            "absolute inset-0 bg-gradient-to-r opacity-0 transition-opacity group-hover:opacity-100",
                            isActive ? "opacity-100" : "from-violet-500/5 to-purple-500/5"
                          )}></div>
                          <div className="relative flex items-center gap-3">
                            <div className={cn(
                              "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                              isActive 
                                ? "bg-gradient-to-br from-violet-500 to-purple-500 shadow-sm" 
                                : "bg-gradient-to-br from-slate-200 to-slate-300 group-hover:from-violet-200 group-hover:to-purple-200"
                            )}>
                              <PanelLeft
                                className={cn(
                                  "h-4 w-4 transition-colors",
                                  isActive ? "text-white" : "text-slate-600 group-hover:text-violet-600"
                                )}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className={cn(
                                "truncate text-sm font-medium transition-all",
                                isActive ? "text-violet-700" : "text-slate-700 group-hover:text-slate-900"
                              )}>
                                {panel.name}
                              </span>
                              <div className={cn(
                                "text-xs transition-all",
                                isActive ? "text-violet-600" : "text-slate-500 group-hover:text-slate-600"
                              )}>
                                ID: {panel.id}
                              </div>
                            </div>
                            {isActive && (
                              <div className="h-2 w-2 bg-violet-500 rounded-full animate-pulse"></div>
                            )}
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </>
              )}
            </SidebarMenu>

            {/* Bottom Menu Items */}
            <SidebarMenu className="px-2 py-1 border-t border-slate-200">
              {bottomMenuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal rounded-lg ${
                        isActive 
                          ? "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200 shadow-sm" 
                          : "hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-amber-600" : "text-slate-500"}`}
                      />
                      <span className={isActive ? "font-medium" : ""}>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 bg-gradient-to-r from-slate-50/50 to-blue-50/50 border-t border-slate-200">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-slate-100 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                  <Avatar className="h-9 w-9 border border-slate-300 shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700">
                      {(user?.fullName || user?.username)
                        ?.charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-slate-900">
                      {user?.fullName || user?.username || "-"}
                    </p>
                    <p className="text-xs text-slate-600 truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-slate-200">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-red-600 focus:text-red-600 hover:bg-red-50"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-slate-300 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b border-slate-200 h-14 items-center justify-between bg-gradient-to-r from-slate-50/95 via-blue-50/95 to-indigo-50/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-white/80 border border-slate-300 hover:bg-white transition-colors" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-slate-900 font-medium">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
