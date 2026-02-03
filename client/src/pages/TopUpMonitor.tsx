import { useState, useEffect } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, CalendarIcon, Clock, Search, TrendingUp, Filter, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { getTimezone, parseTimezoneOffset, toLocalTime, formatDateForDisplay } from "@/lib/timezone";

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

export default function TopUpMonitor() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPanel, setSelectedPanel] = useState<string>("all");
  const [dateRange, setDateRange] = useState<"today" | "yesterday" | "7d" | "30d" | "all">("today");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [timezone, setTimezone] = useState<string>(getTimezone());

  // Update timezone when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setTimezone(getTimezone());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Fetch panels for filter
  const { data: panels, isLoading: panelsLoading } = trpc.panels.list.useQuery();

  // Fetch top-up records
  const { data: topUpData, isLoading, refetch } = trpc.topUp.getAll.useQuery({
    panelId: selectedPanel === "all" ? undefined : parseInt(selectedPanel),
    dateRange,
    search: searchTerm,
    timezone,
  });

  // Fetch top-up stats
  const { data: stats } = trpc.topUp.getStats.useQuery({ dateRange, timezone });

  const records = topUpData?.records || [];

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
      setLastUpdated(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [refetch]);

  const handleRefresh = () => {
    refetch();
    setLastUpdated(new Date());
    toast.success("Data refreshed");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case "today": return "Today";
      case "7d": return "Last 7 Days";
      case "30d": return "Last 30 Days";
      case "all": return "All Time";
      default: return "";
    }
  };

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
                  <h1 className="text-2xl font-bold text-slate-900">Top-Up Monitor</h1>
                  <p className="text-slate-600 text-sm mt-1">Track and monitor all panel top-up transactions</p>
                </div>
                <div className="flex items-center gap-2">
                  {lastUpdated && (
                    <Badge variant="outline" className="text-xs bg-white/80 border-slate-300 text-slate-600">
                      <Clock className="mr-1 h-3 w-3" />
                      {format(lastUpdated, "HH:mm:ss")}
                    </Badge>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRefresh}
                    className="border-slate-300 text-slate-600 hover:bg-slate-50"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          </div>

        {/* Stats Cards */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 p-4 text-emerald-700 shadow-sm border border-emerald-200">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-emerald-600">Total Top-Ups Today</p>
                  <div className="p-1.5 bg-emerald-100 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-emerald-900">{formatCurrency(stats?.totalAmount || 0)}</p>
                <p className="text-xs text-emerald-600 mt-1">{stats?.totalTransactions || 0} top-ups today</p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 p-4 text-blue-700 shadow-sm border border-blue-200">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-blue-600">Total Top-Ups (7d)</p>
                  <div className="p-1.5 bg-blue-100 rounded-lg">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(stats?.totalAmount || 0)}</p>
                <p className="text-xs text-blue-600 mt-1">{stats?.totalTransactions || 0} top-ups in last 7 days</p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-violet-50 to-purple-50 p-4 text-violet-700 shadow-sm border border-violet-200">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-violet-600">Most Active Panel</p>
                  <div className="p-1.5 bg-violet-100 rounded-lg">
                    <Filter className="h-4 w-4 text-violet-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-violet-900">{stats?.mostActivePanel || "None"}</p>
                <p className="text-xs text-violet-600 mt-1">Most top-ups this period</p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 p-4 text-amber-700 shadow-sm border border-amber-200">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-amber-600">Average Top-Up</p>
                  <div className="p-1.5 bg-amber-100 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-amber-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-amber-900">{formatCurrency(stats?.averageAmount || 0)}</p>
                <p className="text-xs text-amber-600 mt-1">Per transaction</p>
              </div>
            </div>
          </div>

        {/* Filters */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-slate-100 rounded-lg border border-slate-200">
                  <Filter className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
                  <p className="text-sm text-slate-600">Refine top-up records search</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search" className="text-sm font-semibold text-slate-700">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="search"
                      placeholder="Search by panel or admin..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 border-slate-300 focus:border-emerald-300"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="panel" className="text-sm font-semibold text-slate-700">Panel</Label>
                  <Select value={selectedPanel} onValueChange={setSelectedPanel}>
                    <SelectTrigger className="border-slate-300 focus:border-emerald-300">
                      <SelectValue placeholder="Select panel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Panels</SelectItem>
                      {panels?.map((panel) => (
                        <SelectItem key={panel.id} value={panel.id.toString()}>
                          {panel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateRange" className="text-sm font-semibold text-slate-700">Date Range</Label>
                  <Select value={dateRange} onValueChange={(value: "today" | "yesterday" | "7d" | "30d" | "all") => setDateRange(value)}>
                    <SelectTrigger className="border-slate-300 focus:border-emerald-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleRefresh} 
                    className="w-full bg-gradient-to-r from-emerald-100 to-teal-100 hover:from-emerald-200 hover:to-teal-200 text-emerald-700 border border-emerald-200"
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            </div>
          </div>

        {/* Top-Up History Table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-100 rounded-lg border border-emerald-200">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Top-Up History</h3>
                  <p className="text-sm text-slate-600">{getDateRangeLabel()} - {records.length} records found</p>
                </div>
              </div>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-slate-100 animate-pulse rounded" />
                  ))}
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 mb-4">
                    <TrendingUp className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-base font-medium text-slate-900 mb-1">No top-ups found</h3>
                  <p className="text-sm text-slate-600">Try adjusting your filters or date range.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200">
                        <TableHead className="text-slate-700 font-medium">Date & Time</TableHead>
                        <TableHead className="text-slate-700 font-medium">Panel</TableHead>
                        <TableHead className="text-slate-700 font-medium">Amount Added</TableHead>
                        <TableHead className="text-slate-700 font-medium">Previous Top-Up</TableHead>
                        <TableHead className="text-slate-700 font-medium">New Top-Up</TableHead>
                        <TableHead className="text-slate-700 font-medium">Previous Closing</TableHead>
                        <TableHead className="text-slate-700 font-medium">New Closing</TableHead>
                        <TableHead className="text-slate-700 font-medium">Previous Points</TableHead>
                        <TableHead className="text-slate-700 font-medium">New Points</TableHead>
                        <TableHead className="text-slate-700 font-medium">Created By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record) => (
                        <TableRow key={record.id} className="border-slate-100">
                          <TableCell className="text-slate-600">
                            <div>
                              {(() => {
                                const { date: dateStr, time: timeStr } = formatDateForDisplay(record.createdAt);
                                return (
                                  <>
                                    <div className="font-medium text-slate-900">
                                      {dateStr}
                                    </div>
                                    <div className="text-sm text-slate-500">
                                      {timeStr}
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-slate-700">{record.panelName}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-200">
                              +{formatCurrency(record.amountAdded)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-slate-600">{formatCurrency(record.previousTopUp)}</TableCell>
                          <TableCell className="font-mono font-semibold text-slate-900">
                            {formatCurrency(record.newTopUp)}
                          </TableCell>
                          <TableCell className={cn(
                            "font-mono",
                            record.previousClosingBalance > record.newClosingBalance ? "text-emerald-600" : "text-red-600"
                          )}>
                            {formatCurrency(record.previousClosingBalance)}
                          </TableCell>
                          <TableCell className={cn(
                            "font-mono font-semibold",
                            record.previousClosingBalance > record.newClosingBalance ? "text-emerald-600" : "text-red-600"
                          )}>
                            {formatCurrency(record.newClosingBalance)}
                          </TableCell>
                          <TableCell className="font-mono text-slate-600">
                            {record.previousPointsBalance.toLocaleString()} pts
                          </TableCell>
                          <TableCell className="font-mono font-semibold text-slate-900">
                            {record.newPointsBalance.toLocaleString()} pts
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
                              {record.createdBy}
                            </Badge>
                          </TableCell>
                      </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
