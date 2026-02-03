import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  DollarSign,
  BarChart3,
  Clock,
  Zap,
  Play,
  Pause,
  RefreshCw,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function Analytics() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<"1h" | "6h" | "24h" | "7d">("7d");
  const [timezone, setTimezone] = useState("GMT+5:30");
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Load timezone from localStorage
  useEffect(() => {
    const savedTimezone = localStorage.getItem("appTimezone");
    if (savedTimezone) {
      setTimezone(savedTimezone);
    }
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (!isAutoRefresh) return;

    const interval = setInterval(() => {
      refetchMetrics();
      setLastUpdated(new Date());
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [isAutoRefresh, timeRange, timezone]);

  const {
    data: metrics,
    refetch: refetchMetrics,
    isLoading,
  } = trpc.analytics.getRealTimeMetrics.useQuery(
    { timeRange, timezone },
    {
      refetchInterval: isAutoRefresh ? 30000 : false,
      staleTime: 10000,
    }
  );

  const { data: comparison } = trpc.analytics.getPerformanceComparison.useQuery(
    { timezone, period: "today" },
    { refetchInterval: isAutoRefresh ? 60000 : false }
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-IN").format(num);
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-emerald-600" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-amber-600" />;
    return <Activity className="h-4 w-4 text-slate-600" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return "text-emerald-600";
    if (trend < 0) return "text-amber-600";
    return "text-slate-600";
  };

  const getPerformanceBadge = (performance: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      profitable: "default",
      loss: "destructive",
    };
    return (
      <Badge variant={variants[performance] || "secondary"}>
        {performance === "profitable" ? "📈 Profitable" : "📉 Loss"}
      </Badge>
    );
  };

  const handleManualRefresh = () => {
    refetchMetrics();
    setLastUpdated(new Date());
    toast.success("Data refreshed successfully");
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-100 via-blue-50 to-indigo-100 p-6 text-slate-900 shadow-sm border border-slate-200">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-20">
            <BarChart3 className="h-32 w-32 text-slate-400" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Analytics Dashboard
              </h1>
              <p className="text-slate-600 mt-1">
                Real-time panel performance and transaction analytics
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Select
                value={timeRange}
                onValueChange={(value: any) => setTimeRange(value)}
              >
                <SelectTrigger className="w-32 border-slate-300 bg-white/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="6h">Last 6 Hours</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                className={cn(
                  "border-slate-300",
                  isAutoRefresh ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                {isAutoRefresh ? (
                  <Pause className="h-4 w-4 mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isAutoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isLoading}
                className="border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-sm text-slate-600 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
          Last updated: {lastUpdated.toLocaleTimeString()} | Timezone:{" "}
          {timezone}
        </div>

        {/* Overall Metrics */}
        {metrics?.totalMetrics && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700">
                  Total Profit/Loss
                </CardTitle>
                <DollarSign className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${metrics?.totalMetrics?.totalProfitLoss >= 0 ? "text-emerald-600" : "text-amber-600"}`}
                >
                  {formatCurrency(metrics?.totalMetrics?.totalProfitLoss || 0)}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Overall performance
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700">
                  Total Deposits
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(metrics?.totalMetrics?.totalDeposits || 0)}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  From {formatNumber(metrics?.totalMetrics?.totalDepositCount || 0)} transactions
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700">
                  Total Withdrawals
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(metrics?.totalMetrics?.totalWithdrawals || 0)}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  From {formatNumber(metrics?.totalMetrics?.totalWithdrawalCount || 0)} transactions
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700">
                  Active Players
                </CardTitle>
                <Users className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {formatNumber(metrics?.totalMetrics?.totalActivePlayers || 0)}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Unique players this period
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Panel Performance Cards */}
        {metrics?.panelMetrics && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Panel Performance</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {metrics.panelMetrics.map(panel => (
                <Card key={panel.id} className={cn(
                  "relative shadow-sm",
                  panel.performance === "profitable" 
                    ? "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200" 
                    : "bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200"
                )}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-slate-900">{panel.name}</CardTitle>
                      {getPerformanceBadge(panel.performance)}
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <span className={getTrendColor(panel.trendPercentage)}>
                        {getTrendIcon(panel.trendPercentage)}
                        {panel.trendPercentage > 0 ? "+" : ""}
                        {panel.trendPercentage}%
                      </span>
                      <span className="text-xs text-slate-600">
                        vs previous period
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Current Balance</p>
                        <p className="font-semibold text-slate-900">
                          {formatCurrency(panel.currentBalance)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Profit/Loss</p>
                        <p
                          className={`font-semibold ${panel.profitLoss >= 0 ? "text-emerald-600" : "text-amber-600"}`}
                        >
                          {formatCurrency(panel.profitLoss)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Active Players</p>
                        <p className="font-semibold text-slate-900">
                          {formatNumber(panel.activePlayers)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Transactions</p>
                        <p className="font-semibold text-slate-900">
                          {formatNumber(panel.transactionCount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Points Balance</p>
                        <p className="font-semibold text-slate-900">
                          {formatNumber(panel.pointsBalance)} pts
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Velocity</p>
                        <p className="font-semibold text-slate-900">
                          {panel.transactionVelocity}/hr
                        </p>
                      </div>
                    </div>

                    {/* Current Hour Activity */}
                    <div className="pt-2 border-t border-slate-200">
                      <p className="text-xs text-slate-600 mb-1">
                        Current Hour Activity
                      </p>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-700">Deposits: {panel.currentHourDeposits}</span>
                        <span className="text-slate-700">Withdrawals: {panel.currentHourWithdrawals}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Performance Comparison */}
        {comparison?.comparisonData && (
          <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Performance Ranking - Today</CardTitle>
              <CardDescription className="text-slate-600">
                Panels ranked by total profit/loss performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {comparison.comparisonData
                  .sort((a, b) => a.performanceRank - b.performanceRank)
                  .map((panel, index) => (
                    <div
                      key={panel.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        panel.profitLoss >= 0 
                          ? "bg-white/60 border-emerald-200" 
                          : "bg-white/60 border-amber-200"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                          panel.profitLoss >= 0 
                            ? "bg-emerald-100 text-emerald-700" 
                            : "bg-amber-100 text-amber-700"
                        )}>
                          {panel.performanceRank}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{panel.name}</p>
                          <p className="text-sm text-slate-600">
                            {panel.uniquePlayers} players •{" "}
                            {panel.periodTransactionCount} transactions
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-bold ${panel.profitLoss >= 0 ? "text-emerald-600" : "text-amber-600"}`}
                        >
                          {formatCurrency(panel.profitLoss)}
                        </p>
                        <p className="text-sm text-slate-600">
                          {formatCurrency(panel.periodNetCashFlow)} net flow
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
