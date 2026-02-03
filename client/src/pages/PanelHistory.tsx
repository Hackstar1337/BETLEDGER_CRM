import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarDays, TrendingUp, TrendingDown, RefreshCw, RotateCcw, DollarSign, ArrowUpCircle, ArrowDownCircle, Search, Filter, Calendar, CalendarIcon, Clock, PanelTop, Activity, DollarSignIcon, BarChart3, Eye } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { parseISO } from "date-fns";
import { getTimezone, parseTimezoneOffset, toLocalTime, formatDateForDisplay } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import DashboardLayout from "@/components/DashboardLayout";

interface DailyBalance {
  date: string;
  openingBalance: number;
  deposits: number;
  withdrawals: number;
  bonusPoints: number;
  closingBalance: number;
  profitLoss: number;
}

type TopUpRecord = {
  id: number;
  panelId: number;
  panelName: string;
  previousTopUp: number;
  amountAdded: number;
  newTopUp: number;
  previousClosingBalance: number;
  newClosingBalance: number;
  previousPointsBalance: number;
  newPointsBalance: number;
  createdAt: Date;
  createdBy: string;
};

export default function PanelHistory() {
  const [activeTab, setActiveTab] = useState("history");
  const [selectedPanel, setSelectedPanel] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<"today" | "yesterday" | "7d" | "30d" | "all">("today");
  const [selectedTimezone, setSelectedTimezone] = useState(getTimezone());
  
  // State for Top-Up Monitor
  const [searchTerm, setSearchTerm] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Update timezone when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setSelectedTimezone(getTimezone());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Fetch panels
  const { data: panels, isLoading: panelsLoading } = trpc.panels.list.useQuery();

  // Fetch real-time daily balances
  const { data: dailyBalances, refetch: refetchDailyBalances } = trpc.dashboard.getRealTimeDailyBalances.useQuery(
    {
      panelId: selectedPanel ? parseInt(selectedPanel) : 0,
      startDate: selectedPeriod !== "all" ? (() => {
        const now = new Date();
        const offset = parseTimezoneOffset(selectedTimezone) * 60; // Convert to minutes
        const localTime = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + offset * 60000);
        
        switch (selectedPeriod) {
          case "today":
            const today = new Date(localTime);
            today.setHours(0, 0, 0, 0);
            return today.toISOString().split('T')[0];
          case "yesterday":
            const yesterday = new Date(localTime);
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            return yesterday.toISOString().split('T')[0];
          case "7d":
            const start7d = new Date(localTime.getTime() - 7 * 24 * 60 * 60 * 1000);
            start7d.setHours(0, 0, 0, 0);
            return start7d.toISOString().split('T')[0];
          case "30d":
            const start30d = new Date(localTime.getTime() - 30 * 24 * 60 * 60 * 1000);
            start30d.setHours(0, 0, 0, 0);
            return start30d.toISOString().split('T')[0];
          default:
            return undefined;
        }
      })() : undefined,
      endDate: selectedPeriod === "yesterday" ? (() => {
        const now = new Date();
        const offset = parseTimezoneOffset(selectedTimezone) * 60; // Convert to minutes
        const localTime = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + offset * 60000);
        const yesterday = new Date(localTime);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(23, 59, 59, 999);
        return yesterday.toISOString().split('T')[0];
      })() : selectedPeriod === "today" ? (() => {
        const now = new Date();
        const offset = parseTimezoneOffset(selectedTimezone) * 60; // Convert to minutes
        const localTime = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + offset * 60000);
        return localTime.toISOString().split('T')[0];
      })() : selectedPeriod !== "all" ? (() => {
        const now = new Date();
        const offset = parseTimezoneOffset(selectedTimezone) * 60; // Convert to minutes
        const localTime = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + offset * 60000);
        return localTime.toISOString().split('T')[0];
      })() : undefined
    },
    { enabled: !!selectedPanel }
  );

  // Fetch panel metrics
  const { data: panelMetrics, refetch: refetchPanelMetrics } = trpc.enhancedPanels.list.useQuery(
    { timePeriod: selectedPeriod, timezone: selectedTimezone },
    { enabled: !!selectedPanel }
  );

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && selectedPanel) {
      const interval = setInterval(() => {
        refetchDailyBalances();
        refetchPanelMetrics();
        setLastUpdated(new Date());
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, selectedPanel, refetchDailyBalances, refetchPanelMetrics]);

  // Update last updated when data is refetched
  useEffect(() => {
    if (dailyBalances || panelMetrics) {
      setLastUpdated(new Date());
    }
  }, [dailyBalances, panelMetrics]);

  // Fetch top-up records
  const { data: topUpRecords, refetch: refetchTopUps } = trpc.topUp.getAll.useQuery(
    {
      panelId: selectedPanel ? parseInt(selectedPanel) : undefined,
      dateRange: selectedPeriod,
      timezone: selectedTimezone
    }
  );

  // Calculate period totals
  const periodTotals = useMemo(() => {
    if (!dailyBalances || dailyBalances.length === 0) {
      return {
        openingBalance: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalBonus: 0,
        closingBalance: 0,
        profitLoss: 0
      };
    }

    const first = dailyBalances[0];
    const last = dailyBalances[dailyBalances.length - 1];
    
    const totalDeposits = dailyBalances.reduce((sum, day) => sum + day.deposits, 0);
    const totalWithdrawals = dailyBalances.reduce((sum, day) => sum + day.withdrawals, 0);
    const totalBonus = dailyBalances.reduce((sum, day) => sum + day.bonusPoints, 0);

    return {
      openingBalance: first.openingBalance,
      totalDeposits,
      totalWithdrawals,
      totalBonus,
      closingBalance: last.closingBalance,
      profitLoss: totalDeposits - totalWithdrawals
    };
  }, [dailyBalances]);

  // Filter top-up records
  const filteredTopUps = useMemo(() => {
    if (!topUpRecords?.records) return [];
    
    return topUpRecords.records.filter(record => {
      const matchesSearch = searchTerm === "" || 
        record.panelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.createdBy.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [topUpRecords, searchTerm]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Get period label
  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case "today": return "Today";
      case "yesterday": return "Yesterday";
      case "7d": return "Last 7 Days";
      case "30d": return "Last 30 Days";
      case "all": return "All Time";
      default: return "";
    }
  };

  if (panelsLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
            <p className="text-lg font-medium text-slate-600">Loading panels...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen p-3">
        <div className="space-y-3">
          {/* Modern Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-100 via-blue-50 to-indigo-100 p-6 text-slate-900 shadow-sm border border-slate-200">
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
            <div className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Panel History</h1>
                  <p className="text-slate-600 text-sm mt-1">Comprehensive view of panel performance and top-up transactions</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={autoRefresh ? "default" : "outline"}
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`min-w-[120px] h-9 text-sm ${
                      autoRefresh 
                        ? "bg-gradient-to-r from-emerald-100 to-teal-100 hover:from-emerald-200 hover:to-teal-200 text-emerald-700 border border-emerald-200" 
                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                    {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      refetchDailyBalances();
                      refetchPanelMetrics();
                      refetchTopUps();
                    }} 
                    className="min-w-[80px] h-9 text-sm border-slate-300 text-slate-600 hover:bg-slate-50"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          </div>

        {/* Controls - Ultra Compact */}
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 backdrop-blur-xl rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Panel Selection */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1 whitespace-nowrap">
                <PanelTop className="h-3 w-3" />
                Panel
              </Label>
              <Select value={selectedPanel} onValueChange={setSelectedPanel}>
                <SelectTrigger className="h-8 text-xs bg-white border-slate-300 hover:border-slate-400 transition-colors shadow-sm min-w-[180px]">
                  <SelectValue placeholder="Choose panel" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-300 shadow-lg">
                  {panels?.map((panel) => (
                    <SelectItem key={panel.id} value={panel.id.toString()} className="text-xs hover:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-gradient-to-r from-slate-400 to-slate-600 rounded-full"></div>
                        {panel.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Time Period */}
            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1 whitespace-nowrap">
                <Calendar className="h-3 w-3" />
                Period
              </Label>
              <div className="flex gap-0.5">
                {(["today", "yesterday", "7d", "30d", "all"] as const).map((period) => (
                  <Button
                    key={period}
                    variant={selectedPeriod === period ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedPeriod(period);
                      refetchDailyBalances();
                      refetchPanelMetrics();
                      refetchTopUps();
                    }}
                    className={`text-xs font-medium h-7 px-[6px] transition-all ${
                      selectedPeriod === period 
                        ? "bg-gradient-to-r from-slate-100 to-blue-100 hover:from-slate-200 hover:to-blue-200 text-slate-700 border border-slate-300 shadow-sm" 
                        : "bg-white hover:bg-slate-50 border-slate-300 text-slate-600"
                    }`}
                  >
                    {period === "all" ? "All" : period === "today" ? "Today" : period === "yesterday" ? "Yesterday" : period}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Timezone */}
            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1 whitespace-nowrap">
                <Clock className="h-3 w-3" />
                Time Zone
              </Label>
              <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                <SelectTrigger className="h-8 text-xs bg-white border-slate-300 hover:border-slate-400 transition-colors shadow-sm w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-300 shadow-lg">
                  <SelectItem value="GMT+5:30" className="text-xs hover:bg-slate-50">IST</SelectItem>
                  <SelectItem value="GMT+0:00" className="text-xs hover:bg-slate-50">UTC</SelectItem>
                  <SelectItem value="GMT-5:00" className="text-xs hover:bg-slate-50">EST</SelectItem>
                  <SelectItem value="GMT-8:00" className="text-xs hover:bg-slate-50">PST</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Status */}
            {lastUpdated && (
              <div className="flex items-center gap-2 text-xs text-slate-500 ml-auto">
                <Activity className="h-3 w-3" />
                {lastUpdated.toLocaleTimeString()}
                {autoRefresh && (
                  <Badge variant="secondary" className="text-xs h-4 ml-2 px-1.5 bg-emerald-100 text-emerald-700 border border-emerald-200">
                    Live
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content with Tabs */}
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 backdrop-blur-xl rounded-lg shadow-sm border border-slate-200">
          <div className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full max-w-[500px] mx-auto grid-cols-2 h-12 p-1 bg-slate-100 border border-slate-200">
                <TabsTrigger 
                  value="history" 
                  className="text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Balance History
                </TabsTrigger>
                <TabsTrigger 
                  value="topup" 
                  className="text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                >
                  <DollarSignIcon className="mr-2 h-4 w-4" />
                  Top-Up Monitor
                </TabsTrigger>
              </TabsList>

              {/* Balance History Tab */}
              <TabsContent value="history" className="space-y-4">
                {selectedPanel && (
                  <>
                    {/* Period Summary */}
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-emerald-100 rounded-lg border border-emerald-200">
                            <CalendarDays className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">Period Summary - {getPeriodLabel()}</h3>
                            <p className="text-sm text-slate-600">Overview of performance metrics</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                          <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-50 to-blue-50 p-4 text-slate-700 shadow-sm border border-slate-200">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
                            <div className="relative">
                              <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wider">Opening</p>
                              <p className="font-mono font-bold text-lg text-slate-900">
                                {formatCurrency(periodTotals.openingBalance)}
                              </p>
                            </div>
                          </div>
                          <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 p-4 text-emerald-700 shadow-sm border border-emerald-200">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
                            <div className="relative">
                              <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">Deposits</p>
                              <p className="font-mono font-bold text-lg text-emerald-900">
                                +{formatCurrency(periodTotals.totalDeposits)}
                              </p>
                            </div>
                          </div>
                          <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-red-50 to-rose-50 p-4 text-red-700 shadow-sm border border-red-200">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
                            <div className="relative">
                              <p className="text-[10px] font-medium text-red-600 uppercase tracking-wider">Withdrawals</p>
                              <p className="font-mono font-bold text-lg text-red-900">
                                -{formatCurrency(periodTotals.totalWithdrawals)}
                              </p>
                            </div>
                          </div>
                          <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 p-4 text-amber-700 shadow-sm border border-amber-200">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
                            <div className="relative">
                              <p className="text-[10px] font-medium text-amber-600 uppercase tracking-wider">Bonus</p>
                              <p className="font-mono font-bold text-lg text-amber-900">
                                {periodTotals.totalBonus} pts
                              </p>
                            </div>
                          </div>
                          <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 p-4 text-blue-700 shadow-sm border border-blue-200">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
                            <div className="relative">
                              <p className="text-[10px] font-medium text-blue-600 uppercase tracking-wider">P/L</p>
                              <p className={`font-mono font-bold text-lg ${
                                periodTotals.profitLoss >= 0 ? "text-emerald-900" : "text-red-900"
                              }`}>
                                {periodTotals.profitLoss >= 0 ? "+" : ""}{formatCurrency(periodTotals.profitLoss)}
                              </p>
                            </div>
                          </div>
                          <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-violet-50 to-purple-50 p-4 text-violet-700 shadow-sm border border-violet-200">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
                            <div className="relative">
                              <p className="text-[10px] font-medium text-violet-600 uppercase tracking-wider">Closing</p>
                              <p className={`font-mono font-bold text-lg ${
                                periodTotals.closingBalance > 0 ? "text-red-900" : 
                                periodTotals.closingBalance < 0 ? "text-emerald-900" : "text-slate-900"
                              }`}>
                                {formatCurrency(periodTotals.closingBalance)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

            {/* Daily Breakdown */}
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-blue-100 rounded-lg border border-blue-200">
                            <Eye className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">Daily Balance Breakdown</h3>
                            <p className="text-sm text-slate-600">Day-by-day analysis of balance changes and performance</p>
                          </div>
                        </div>
                        {dailyBalances && dailyBalances.length > 0 ? (
                          <div className="space-y-3">
                            {dailyBalances.map((day, index) => (
                              <div key={day.date} className="relative overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50/50 to-white p-4 transition-all hover:shadow-md">
                                {index === dailyBalances.length - 1 && selectedPeriod === "today" && (
                                  <div className="absolute top-4 right-4">
                                    <Badge variant="secondary" className="animate-pulse bg-emerald-100 text-emerald-700 border border-emerald-200">
                                      <Activity className="mr-1 h-3 w-3" />
                                      Live
                                    </Badge>
                                  </div>
                                )}
                                <div className="flex justify-between items-center mb-3">
                                  <h3 className="text-base font-semibold text-slate-900">
                                    {day.date}
                                  </h3>
                                  <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    (day.closingBalance - day.openingBalance - (day.deposits - day.withdrawals)) >= 0 
                                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
                                      : "bg-red-100 text-red-700 border border-red-200"
                                  }`}>
                                    {(day.closingBalance - day.openingBalance - (day.deposits - day.withdrawals)) >= 0 ? "Profit" : "Loss"}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                  <div className="text-center p-3 bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg border border-slate-200">
                                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-1">Opening</p>
                                    <p className="font-mono font-semibold text-sm text-slate-900">{formatCurrency(day.openingBalance)}</p>
                                  </div>
                                  <div className="text-center p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                                    <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider mb-1">Deposits</p>
                                    <p className="font-mono font-semibold text-sm text-emerald-900">+{formatCurrency(day.deposits)}</p>
                                  </div>
                                  <div className="text-center p-3 bg-gradient-to-br from-red-50 to-rose-50 rounded-lg border border-red-200">
                                    <p className="text-xs font-medium text-red-600 uppercase tracking-wider mb-1">Withdrawals</p>
                                    <p className="font-mono font-semibold text-sm text-red-900">-{formatCurrency(day.withdrawals)}</p>
                                  </div>
                                  <div className="text-center p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                                    <p className="text-xs font-medium text-amber-600 uppercase tracking-wider mb-1">Bonus</p>
                                    <p className="font-mono font-semibold text-sm text-amber-900">{day.bonusPoints} pts</p>
                                  </div>
                                  <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                                    <p className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">P/L</p>
                                    <p className={`font-mono font-semibold text-sm ${
                                      (day.closingBalance - day.openingBalance - (day.deposits - day.withdrawals)) >= 0 
                                        ? "text-emerald-900" 
                                        : "text-red-900"
                                    }`}>
                                      {formatCurrency(day.closingBalance - day.openingBalance - (day.deposits - day.withdrawals))}
                                    </p>
                                  </div>
                                  <div className="text-center p-3 bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg border border-violet-200">
                                    <p className="text-xs font-medium text-violet-600 uppercase tracking-wider mb-1">Closing</p>
                                    <p className={`font-mono font-bold text-sm ${
                                      day.closingBalance > 0 ? "text-red-900" : 
                                      day.closingBalance < 0 ? "text-emerald-900" : "text-slate-900"
                                    }`}>
                                      {formatCurrency(day.closingBalance)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 mb-4">
                              <CalendarDays className="h-8 w-8 text-slate-400" />
                            </div>
                            <p className="text-base font-medium text-slate-900 mb-1">No data available</p>
                            <p className="text-sm text-slate-600">Select a different time period or panel to view data</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

        {/* Top-Up Monitor Tab */}
              <TabsContent value="topup" className="space-y-4">
                {/* Top-Up Records Table */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-emerald-100 rounded-lg border border-emerald-200">
                        <DollarSignIcon className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Top-Up Records</h3>
                        <p className="text-sm text-slate-600">Track all panel top-up transactions</p>
                      </div>
                    </div>
                    <div className="space-y-2 mb-4">
                      <Label htmlFor="search-panel" className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                        <Search className="h-4 w-4" />
                        Search Panel
                      </Label>
                      <div className="relative">
                        <Input
                          id="search-panel"
                          type="text"
                          placeholder="Search by panel name or creator..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 border-slate-300 focus:border-emerald-300"
                        />
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                    {filteredTopUps.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-200">
                              <TableHead className="text-slate-700 font-medium">Date & Time</TableHead>
                              <TableHead className="text-slate-700 font-medium">Panel</TableHead>
                              <TableHead className="text-slate-700 font-medium">Previous Top-Up</TableHead>
                              <TableHead className="text-slate-700 font-medium">Amount Added</TableHead>
                              <TableHead className="text-slate-700 font-medium">New Top-Up</TableHead>
                              <TableHead className="text-slate-700 font-medium">Previous Balance</TableHead>
                              <TableHead className="text-slate-700 font-medium">New Balance</TableHead>
                              <TableHead className="text-slate-700 font-medium">Created By</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredTopUps.map((record) => (
                              <TableRow key={record.id} className="border-slate-100">
                                <TableCell className="text-slate-600">
                                  {(() => {
                                    const formatted = formatDateForDisplay(record.createdAt, selectedTimezone);
                                    return `${formatted.date} ${formatted.time}`;
                                  })()}
                                </TableCell>
                                <TableCell className="font-medium text-slate-700">
                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                    {record.panelName}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-slate-600">
                                  {formatCurrency(record.previousTopUp)}
                                </TableCell>
                                <TableCell className="font-mono font-semibold text-emerald-600">
                                  +{formatCurrency(record.amountAdded)}
                                </TableCell>
                                <TableCell className="font-mono font-semibold text-slate-900">
                                  {formatCurrency(record.newTopUp)}
                                </TableCell>
                                <TableCell className="font-mono text-slate-600">
                                  {formatCurrency(record.previousClosingBalance)}
                                </TableCell>
                                <TableCell className="font-mono font-semibold text-slate-900">
                                  {formatCurrency(record.newClosingBalance)}
                                </TableCell>
                                <TableCell className="text-slate-600">{record.createdBy}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 mb-4">
                          <DollarSignIcon className="h-8 w-8 text-slate-400" />
                        </div>
                        <p className="text-base font-medium text-slate-900 mb-1">
                          {searchTerm ? "No matching records found" : "No top-up records available"}
                        </p>
                        <p className="text-sm text-slate-600">
                          {searchTerm ? "Try adjusting your search terms" : "Top-up records will appear here once transactions are made"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
}
