import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Building2,
  Activity,
  Database,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { QuickEntryDialog } from "@/components/QuickEntryDialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getTimezone, parseTimezoneOffset } from "@/lib/timezone";

export default function Home() {
  // Get timezone from settings and convert to offset in minutes
  const timezone = getTimezone();
  const timezoneOffset = -(parseTimezoneOffset(timezone) * 60); // Convert hours to minutes

  const { data: overview, isLoading: overviewLoading } =
    trpc.dashboard.overview.useQuery();
  const { data: todayStats, isLoading: todayLoading } =
    trpc.dashboard.todayStats.useQuery({ timezoneOffset });
  const { data: bonusStats, isLoading: bonusLoading } =
    trpc.dashboard.bonusStats.useQuery({ timezoneOffset });
  const { data: panels, isLoading: panelsLoading } =
    trpc.panels.list.useQuery();
  const utils = trpc.useUtils();

  const clearAllRecordsMutation = trpc.system.clearAllRecords.useMutation({
    onSuccess: () => {
      toast.success("All records have been cleared successfully.");
      // Invalidate all queries to refresh the UI
      utils.invalidate();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const addTestDataMutation = trpc.enhancedPanels.addTestData.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      // Invalidate queries to refresh the UI
      utils.invalidate();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const isLoading =
    overviewLoading || todayLoading || bonusLoading || panelsLoading;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Prepare chart data
  const panelChartData =
    panels?.map(panel => ({
      name: panel.name,
      balance: Number(panel.closingBalance) || 0,
      profit: Number(panel.profitLoss) || 0,
      profitColor: (Number(panel.profitLoss) || 0) >= 0 ? "#10b981" : "#f59e0b",
    })) || [];

  // Debug: Log chart data
  console.log("Panel Chart Data:", panelChartData);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-100 via-blue-50 to-indigo-100 p-6 text-slate-900 shadow-sm border border-slate-200">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-20">
            <Activity className="h-32 w-32 text-slate-400" />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
                <span className="text-sm text-slate-600 font-medium px-3 py-1 bg-white/80 rounded-full border border-slate-200">
                  {new Date().toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <p className="text-slate-600 mt-1">
                Last 24 hours data • Overview of your betting exchange management system
              </p>
            </div>

            {/* Clear All Records Button */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => addTestDataMutation.mutate()}
                disabled={addTestDataMutation.isPending}
                className="border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                <Database className="h-4 w-4 mr-2" />
                {addTestDataMutation.isPending ? "Creating..." : "Add Test Data"}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-50">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All Records
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete all
                      panels, players, bank accounts, deposits, withdrawals, and
                      gameplay transactions from the system.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-slate-300 text-slate-600 hover:bg-slate-50">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => clearAllRecordsMutation.mutate()}
                      className="bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-300"
                    >
                      Yes, clear all records
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">
                Total Panel Balance
              </CardTitle>
              <DollarSign className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-7 w-32 bg-slate-200 animate-pulse rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-slate-900">
                    {(overview?.totalPanelBalance || 0).toLocaleString("en-IN")}{" "}
                    pts
                  </div>
                  <p className="text-xs text-slate-600">
                    Across {overview?.panelCount || 0} panels
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">
                Total Bank Balance
              </CardTitle>
              <Building2 className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-7 w-32 bg-slate-200 animate-pulse rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-slate-900">
                    {formatCurrency(overview?.totalBankBalance || 0)}
                  </div>
                  <p className="text-xs text-slate-600">
                    {overview?.bankAccountCount || 0} active accounts
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">
                Total Profit/Loss
              </CardTitle>
              {(overview?.totalProfitLoss || 0) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-amber-500" />
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-7 w-32 bg-slate-200 animate-pulse rounded" />
              ) : (
                <>
                  <div
                    className={`text-2xl font-bold ${(overview?.totalProfitLoss || 0) >= 0 ? "text-emerald-600" : "text-amber-600"}`}
                  >
                    {formatCurrency(overview?.totalProfitLoss || 0)}
                  </div>
                  <p className="text-xs text-slate-600">
                    Overall performance
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">
                Today's Activity
              </CardTitle>
              <Activity className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-7 w-32 bg-slate-200 animate-pulse rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-slate-900">
                    {todayStats?.todayDeposits || 0} Deposits,{" "}
                    {todayStats?.todayWithdrawals || 0} Withdrawals
                  </div>
                  <p className="text-xs text-slate-600">
                    Transaction activity for today
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Today's Statistics */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-emerald-900">Today's Deposits</CardTitle>
              <CardDescription className="text-emerald-700">Deposit activity for today</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-4 w-full bg-emerald-200 animate-pulse rounded" />
                  <div className="h-4 w-3/4 bg-emerald-200 animate-pulse rounded" />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-emerald-700">
                      Total Amount
                    </span>
                    <span className="text-lg font-bold text-emerald-600">
                      {formatCurrency(todayStats?.todayDepositAmount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-emerald-700">
                      Number of Deposits
                    </span>
                    <span className="text-lg font-semibold text-slate-900">
                      {todayStats?.todayDeposits || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-emerald-700">
                      Unique Players
                    </span>
                    <span className="text-lg font-semibold text-slate-900">
                      {todayStats?.uniquePlayersDeposited || 0}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-amber-900">Today's Withdrawals</CardTitle>
              <CardDescription className="text-amber-700">Withdrawal activity for today</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-4 w-full bg-amber-200 animate-pulse rounded" />
                  <div className="h-4 w-3/4 bg-amber-200 animate-pulse rounded" />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-amber-700">
                      Total Amount
                    </span>
                    <span className="text-lg font-bold text-amber-600">
                      {formatCurrency(todayStats?.todayWithdrawalAmount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-amber-700">
                      Number of Withdrawals
                    </span>
                    <span className="text-lg font-semibold text-slate-900">
                      {todayStats?.todayWithdrawals || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-amber-700">
                      Unique Players
                    </span>
                    <span className="text-lg font-semibold text-slate-900">
                      {todayStats?.uniquePlayersWithdrew || 0}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bonus Tracking */}
        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-purple-900">Today's Bonus Points</CardTitle>
            <CardDescription className="text-purple-700">
              Bonus points awarded in the last 24 hours by panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-4 w-full bg-purple-200 animate-pulse rounded" />
                <div className="h-4 w-3/4 bg-purple-200 animate-pulse rounded" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-purple-200">
                  <span className="text-sm font-medium text-purple-700">
                    Total Bonus Awarded
                  </span>
                  <span className="text-2xl font-bold text-purple-600">
                    {bonusStats?.totalBonus || 0} pts
                  </span>
                </div>

                {bonusStats?.panelBreakdown &&
                bonusStats.panelBreakdown.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-purple-700">
                      Breakdown by Panel
                    </span>
                    <div className="space-y-2">
                      {bonusStats.panelBreakdown.map(item => (
                        <div
                          key={item.panelName}
                          className="flex justify-between items-center py-2 px-3 bg-white/50 rounded-md border border-purple-100"
                        >
                          <span className="text-sm font-medium text-slate-900">
                            {item.panelName}
                          </span>
                          <span className="text-sm font-bold text-purple-600">
                            {item.bonus} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-purple-600 text-center py-4">
                    No bonus points awarded today
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel Performance Chart */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Closing Balance Chart */}
          <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Closing Balance by Panel</CardTitle>
              <CardDescription className="text-slate-600">
                Current balance after all transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading || !panelChartData.length ? (
                <div className="h-80 flex items-center justify-center">
                  <p className="text-slate-500">Loading chart data...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={panelChartData}
                    margin={{ top: 20, right: 40, left: 20, bottom: 20 }}
                    barSize={60}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <YAxis
                      tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickFormatter={value => `₹${value.toLocaleString()}`}
                    />
                    <Tooltip
                      formatter={value => formatCurrency(Number(value))}
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar
                      dataKey="balance"
                      fill="#60a5fa"
                      name="Closing Balance"
                      radius={[8, 8, 0, 0]}
                      label={{
                        position: "top",
                        fill: "hsl(var(--foreground))",
                        fontSize: 12,
                        formatter: (value: number) => formatCurrency(value),
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Profit/Loss Chart */}
          <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Profit/Loss by Panel</CardTitle>
              <CardDescription className="text-slate-600">
                Performance based on deposits vs withdrawals
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading || !panelChartData.length ? (
                <div className="h-80 flex items-center justify-center">
                  <p className="text-slate-500">Loading chart data...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={panelChartData}
                    margin={{ top: 20, right: 40, left: 20, bottom: 20 }}
                    barSize={60}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <YAxis
                      tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickFormatter={value => `₹${value.toLocaleString()}`}
                      domain={[
                        (dataMin: number) => Math.min(dataMin, 0),
                        (dataMax: number) => Math.max(dataMax, 0),
                      ]}
                    />
                    <Tooltip
                      formatter={value => formatCurrency(Number(value))}
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar
                      dataKey="profit"
                      name="Profit/Loss"
                      radius={[8, 8, 0, 0]}
                      label={{
                        position: "top",
                        fill: "hsl(var(--foreground))",
                        fontSize: 12,
                        formatter: (value: number) => formatCurrency(value),
                      }}
                    >
                      {panelChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.profitColor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Entry Floating Button */}
      <QuickEntryDialog />
    </DashboardLayout>
  );
}
