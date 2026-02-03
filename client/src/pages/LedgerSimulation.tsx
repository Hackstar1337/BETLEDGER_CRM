import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, Play, Pause, RotateCcw, RefreshCw, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { getTimezone, parseTimezoneOffset } from "@/lib/timezone";
import DashboardLayout from "@/components/DashboardLayout";

interface DayData {
  id?: number;
  date: string;
  openingBalance: number;
  deposits: number;
  withdrawals: number;
  bonusPoints: number;
  closingBalance: number;
  profitLoss: number;
}

interface Transaction {
  id: string;
  type: "deposit" | "withdrawal";
  amount: number;
  bonus?: number;
  time: string;
  date: string;
}

export default function LedgerSimulation() {
  const [selectedTimezone, setSelectedTimezone] = useState(getTimezone());

  // Update timezone when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setSelectedTimezone(getTimezone());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  const [selectedPeriod, setSelectedPeriod] = useState<"24h" | "7d" | "30d" | "all">("24h");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentDay, setCurrentDay] = useState(0);
  const [selectedPanel, setSelectedPanel] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Fetch panels data
  const { data: panels, isLoading: panelsLoading } = trpc.panels.list.useQuery();
  
  // Fetch panel data for selected panel with time period
  const { data: enhancedPanelData, refetch: refetchPanelData } = trpc.enhancedPanels.list.useQuery(
    { timePeriod: selectedPeriod === "24h" ? "today" : selectedPeriod as "7d" | "30d" | "all", timezone: selectedTimezone },
    { enabled: !!selectedPanel }
  );

  // Auto-refresh every 30 seconds when enabled
  useEffect(() => {
    if (autoRefresh && selectedPanel) {
      const interval = setInterval(() => {
        refetchPanelData();
        setLastUpdated(new Date());
      }, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, selectedPanel, refetchPanelData]);

  // Fetch daily balances for selected panel
  const { data: dailyBalances } = trpc.panelDailyBalances.getByPanel.useQuery(
    { 
      panelId: selectedPanel ? parseInt(selectedPanel) : 0,
      startDate: selectedPeriod !== "all" ? (() => {
        const now = new Date();
        const offset = parseTimezoneOffset(selectedTimezone) * 60; // Convert to minutes
        const localTime = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + offset * 60000);
        
        switch (selectedPeriod) {
          case "24h":
            return new Date(localTime.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          case "7d":
            return new Date(localTime.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          case "30d":
            return new Date(localTime.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          default:
            return undefined;
        }
      })() : undefined,
      endDate: selectedPeriod !== "all" ? new Date().toISOString().split('T')[0] : undefined
    },
    { enabled: !!selectedPanel }
  );

  // Get the panel data from enhanced panels
  const panelData = enhancedPanelData?.panels;

  // Update last updated when data is refetched
  useEffect(() => {
    if (panelData) {
      setLastUpdated(new Date());
    }
  }, [panelData]);

  // State for transactions
  const [transactions, setTransactions] = useState<Transaction[][]>([]);

  // Update transactions when panel data changes
  useEffect(() => {
    if (dailyBalances && dailyBalances.length > 0) {
      // Create a map to store unique transactions by date
      const uniqueTransactions = new Map<string, Transaction[]>();
      
      dailyBalances.forEach(balance => {
        const date = String(balance.date);
        const deposits = Number(balance.totalDeposits) || 0;
        const withdrawals = Number(balance.totalWithdrawals) || 0;
        const bonus = Number(balance.bonusPoints) || 0;
        
        // Only add transactions if there are actual amounts
        if (deposits > 0 || withdrawals > 0 || bonus > 0) {
          const txs: Transaction[] = [];
          
          if (deposits > 0) {
            txs.push({
              id: `${date}-deposit`,
              type: "deposit" as const,
              amount: deposits,
              bonus: bonus,
              time: "Summary",
              date
            });
          }
          
          if (withdrawals > 0) {
            txs.push({
              id: `${date}-withdrawal`,
              type: "withdrawal" as const,
              amount: withdrawals,
              time: "Summary",
              date
            });
          }
          
          uniqueTransactions.set(date, txs);
        }
      });
      
      // Convert map to array and sort by date
      const transactionsByDate = Array.from(uniqueTransactions.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, txs]) => txs);
      
      setTransactions(transactionsByDate);
    }
  }, [dailyBalances]);

  // Get days data from daily balances - remove duplicates
  const daysData: DayData[] = useMemo(() => {
    if (!dailyBalances) return [];
    
    const uniqueDates = new Map<string, DayData>();
    
    dailyBalances.forEach(balance => {
      const date = String(balance.date);
      // Only keep the latest entry for each date (based on ID if available)
      if (!uniqueDates.has(date) || (balance.id && uniqueDates.get(date)?.id && balance.id > (uniqueDates.get(date)?.id || 0))) {
        uniqueDates.set(date, {
          date,
          openingBalance: Number(balance.openingBalance) || 0,
          deposits: Number(balance.totalDeposits) || 0,
          withdrawals: Number(balance.totalWithdrawals) || 0,
          bonusPoints: Number(balance.bonusPoints) || 0,
          closingBalance: Number(balance.closingBalance) || 0,
          profitLoss: Number(balance.profitLoss) || 0,
          id: balance.id
        });
      }
    });
    
    // Convert map to array and sort by date
    return Array.from(uniqueDates.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [dailyBalances]);

  // Get real-time daily balances for the selected period
  const { data: realTimeDailyBalances } = trpc.dashboard.getRealTimeDailyBalances.useQuery(
    { 
      panelId: selectedPanel ? parseInt(selectedPanel) : 0,
      startDate: selectedPeriod !== "all" ? (() => {
        const now = new Date();
        const offset = parseTimezoneOffset(selectedTimezone) * 60; // Convert to minutes
        const localTime = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + offset * 60000);
        
        switch (selectedPeriod) {
          case "24h":
            return new Date(localTime.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          case "7d":
            return new Date(localTime.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          case "30d":
            return new Date(localTime.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          default:
            return undefined;
        }
      })() : undefined,
      endDate: selectedPeriod !== "all" ? new Date().toISOString().split('T')[0] : undefined
    },
    { enabled: !!selectedPanel }
  );

  // Use real-time data if available, otherwise fall back to cached daily balances
  const displayDays = realTimeDailyBalances || daysData;

  // Auto-play simulation
  useEffect(() => {
    if (isPlaying && currentDay < displayDays.length - 1) {
      const timer = setTimeout(() => {
        setCurrentDay(currentDay + 1);
      }, 2000);
      return () => clearTimeout(timer);
    } else if (currentDay >= displayDays.length - 1) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentDay, displayDays.length]);

  // Calculate period totals based on selected period
  const getPeriodData = () => {
    if (!panelData || !selectedPanel) {
      return { 
        periodLabel: "Select a panel", 
        totals: { openingBalance: 0, deposits: 0, withdrawals: 0, bonusPoints: 0, closingBalance: 0, profitLoss: 0 },
        periodDays: [],
        periodTransactions: []
      };
    }

    const panel = panelData.find(p => p.id.toString() === selectedPanel);
    if (!panel) return { 
      periodLabel: "Select a panel", 
      totals: { openingBalance: 0, deposits: 0, withdrawals: 0, bonusPoints: 0, closingBalance: 0, profitLoss: 0 },
      periodDays: [],
      periodTransactions: []
    };

    let periodLabel = "";
    
    switch (selectedPeriod) {
      case "24h":
        periodLabel = "Today";
        break;
      case "7d":
        periodLabel = "Last 7 Days";
        break;
      case "30d":
        periodLabel = "Last 30 Days";
        break;
      case "all":
        periodLabel = "All Time";
        break;
    }

    const periodTransactions = transactions.flat();

    return { 
      periodLabel, 
      totals: {
        openingBalance: panel.openingBalance,
        deposits: panel.totalDeposits,
        withdrawals: panel.totalWithdrawals,
        bonusPoints: panel.bonusPoints,
        closingBalance: panel.closingBalance,
        profitLoss: panel.profitLoss
      },
      periodDays: displayDays,
      periodTransactions 
    };
  };

  const { periodLabel, totals, periodDays, periodTransactions } = getPeriodData();

  const resetSimulation = () => {
    setCurrentDay(0);
    setIsPlaying(false);
  };

  const handlePanelChange = (panelId: string) => {
    setSelectedPanel(panelId);
    setCurrentDay(0);
    setIsPlaying(false);
  };

  if (panelsLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">Loading panels...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Panel History</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Button>
          <Button variant="outline" onClick={resetSimulation}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* Panel Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedPanel}
            onChange={(e) => handlePanelChange(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Choose a panel...</option>
            {panels?.map((panel) => (
              <option key={panel.id} value={panel.id.toString()}>
                {panel.name} (Current: {panel.pointsBalance.toLocaleString()} pts)
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {selectedPanel && (
        <>
          {lastUpdated && (
            <div className="text-sm text-muted-foreground text-center">
              Last updated: {lastUpdated.toLocaleTimeString()}
              {autoRefresh && " (auto-refresh enabled)"}
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Timezone & Period</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Timezone</label>
                  <select
                    value={selectedTimezone}
                    onChange={(e) => {
                      setSelectedTimezone(e.target.value);
                      refetchPanelData();
                    }}
                    className="w-full mt-1 p-2 border rounded"
                  >
                    <option value="GMT+5:30">GMT+5:30 (India)</option>
                    <option value="GMT+0:00">GMT+0:00 (UK)</option>
                    <option value="GMT-5:00">GMT-5:00 (US East)</option>
                    <option value="GMT-8:00">GMT-8:00 (US West)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Time Period</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {(["24h", "7d", "30d", "all"] as const).map((period) => (
                      <Button
                        key={period}
                        variant={selectedPeriod === period ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedPeriod(period);
                          refetchPanelData();
                        }}
                      >
                        {period === "all" ? "All Time" : `Last ${period}`}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="text-center p-3 bg-muted rounded">
                  <p className="text-sm font-medium">{periodLabel}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Period Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Opening Balance:</span>
                  <span className="font-mono font-semibold">
                    ₹{totals.openingBalance.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Total Deposits:</span>
                  <span className="font-mono font-semibold text-green-600">
                    +₹{totals.deposits.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Total Withdrawals:</span>
                  <span className="font-mono font-semibold text-red-600">
                    -₹{totals.withdrawals.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Bonus Points:</span>
                  <span className="font-mono font-semibold text-orange-600">
                    {totals.bonusPoints} pts
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Closing Balance:</span>
                  <span className={`font-mono font-bold ${
                    totals.closingBalance > 0 ? "text-red-600" : 
                    totals.closingBalance < 0 ? "text-green-600" : "text-gray-600"
                  }`}>
                    ₹{totals.closingBalance.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Profit/Loss:</span>
                  <span className={`font-mono font-bold ${
                    totals.profitLoss > 0 ? "text-green-600" : 
                    totals.profitLoss < 0 ? "text-red-600" : "text-gray-600"
                  }`}>
                    ₹{totals.profitLoss.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Auto-Update Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedPeriod === "24h" ? (
                  <>
                    <div className="flex items-center gap-2 text-green-600">
                      <RefreshCw className="h-4 w-4" />
                      <span className="text-sm font-medium">Auto-updated</span>
                    </div>
                    <Badge variant="secondary" className="w-full justify-center">
                      Auto
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      Opening balance automatically set from yesterday&apos;s closing balance
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-blue-600">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm font-medium">Historical View</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Showing calculated data from {periodLabel.toLowerCase()}
                    </p>
                  </>
                )}
                <Separator />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Timezone: {selectedTimezone}</p>
                  <p className="text-xs text-muted-foreground">
                    All calculations respect the selected timezone
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily">Day-by-Day View</TabsTrigger>
              <TabsTrigger value="transactions">All Transactions</TabsTrigger>
              <TabsTrigger value="simulation">Live Simulation</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Balance Breakdown</CardTitle>
                  <CardDescription>
                    See how balances carry forward day by day
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {periodDays.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No daily balance data available. Run the backfill script to populate historical data.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {periodDays.map((day, index) => (
                        <div key={day.date} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="font-semibold">{day.date}</h3>
                            {index === periodDays.length - 1 && selectedPeriod === "24h" && (
                              <Badge variant="secondary" className="text-xs">Auto</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Opening Balance</p>
                              <p className="font-mono font-semibold">₹{day.openingBalance.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Total Deposits</p>
                              <p className="font-mono font-semibold text-green-600">+₹{day.deposits.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Total Withdrawals</p>
                              <p className="font-mono font-semibold text-red-600">-₹{day.withdrawals.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Bonus Points</p>
                              <p className="font-mono font-semibold text-orange-600">{day.bonusPoints} pts</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Closing Balance</p>
                              <p className={`font-mono font-bold ${
                                day.closingBalance > 0 ? "text-red-600" : 
                                day.closingBalance < 0 ? "text-green-600" : "text-gray-600"
                              }`}>
                                ₹{day.closingBalance.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 text-sm">
                            <span className="text-muted-foreground">Formula: </span>
                            <span className="font-mono text-xs">
                              {day.openingBalance} - ({day.deposits} + {day.bonusPoints}) + {day.withdrawals} = {day.closingBalance}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>All Transactions in Period</CardTitle>
                  <CardDescription>
                    Complete transaction list for {periodLabel.toLowerCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {periodTransactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No transactions found for this period
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {periodTransactions.map((tx) => (
                        <div key={tx.id} className="flex justify-between items-center p-3 border rounded">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              tx.type === "deposit" ? "bg-green-500" : "bg-red-500"
                            }`} />
                            <div>
                              <p className="font-medium capitalize">{tx.type}</p>
                              <p className="text-sm text-muted-foreground">{tx.date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${
                              tx.type === "deposit" ? "text-green-600" : "text-red-600"
                            }`}>
                              {tx.type === "deposit" ? "+" : "-"}₹{tx.amount.toLocaleString()}
                            </p>
                            {tx.bonus && tx.bonus > 0 && (
                              <p className="text-sm text-orange-600">Bonus: {tx.bonus} pts</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="simulation" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Live Day-by-Day Simulation</CardTitle>
                  <CardDescription>
                    Watch how balances evolve day by day
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {periodDays.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No data available for simulation
                    </p>
                  ) : (
                    <>
                      <div className="flex justify-center gap-2">
                        <Button
                          onClick={() => setIsPlaying(!isPlaying)}
                          disabled={currentDay >= periodDays.length - 1}
                        >
                          {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                          {isPlaying ? "Pause" : "Play"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setCurrentDay(Math.min(currentDay + 1, periodDays.length - 1))}
                          disabled={currentDay >= periodDays.length - 1}
                        >
                          Next Day
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setCurrentDay(Math.max(currentDay - 1, 0))}
                          disabled={currentDay <= 0}
                        >
                          Previous Day
                        </Button>
                      </div>

                      <div className="relative">
                        <div className="flex gap-1 mb-4 overflow-x-auto">
                          {periodDays.slice(0, 10).map((day, index) => (
                            <div
                              key={day.date}
                              onClick={() => setCurrentDay(index)}
                              className={`flex-shrink-0 text-center p-2 rounded cursor-pointer text-xs ${
                                index <= currentDay ? "bg-primary text-primary-foreground" : "bg-muted"
                              }`}
                            >
                              {new Date(day.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                            </div>
                          ))}
                          {periodDays.length > 10 && (
                            <div className="flex-shrink-0 text-center p-2 text-xs text-muted-foreground">
                              +{periodDays.length - 10} more
                            </div>
                          )}
                        </div>

                        {currentDay < periodDays.length && (
                          <Card className="mt-4">
                            <CardHeader>
                              <CardTitle className="text-lg">
                                {periodDays[currentDay].date}
                                {currentDay === 0 && (
                                  <Badge variant="outline" className="ml-2">
                                    Initial Balance: ₹{periodDays[0].openingBalance.toLocaleString()}
                                  </Badge>
                                )}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="text-center p-3 bg-muted rounded">
                                    <p className="text-sm text-muted-foreground">Opening Balance</p>
                                    <p className="text-2xl font-bold">₹{periodDays[currentDay].openingBalance.toLocaleString()}</p>
                                  </div>
                                  <div className="text-center p-3 bg-muted rounded">
                                    <p className="text-sm text-muted-foreground">Closing Balance</p>
                                    <p className={`text-2xl font-bold ${
                                      periodDays[currentDay].closingBalance > 0 ? "text-red-600" : 
                                      periodDays[currentDay].closingBalance < 0 ? "text-green-600" : "text-gray-600"
                                    }`}>
                                      ₹{periodDays[currentDay].closingBalance.toLocaleString()}
                                    </p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div className="text-center p-2 bg-green-50 rounded">
                                    <p className="text-green-600 font-semibold">Deposits</p>
                                    <p>₹{periodDays[currentDay].deposits.toLocaleString()}</p>
                                  </div>
                                  <div className="text-center p-2 bg-red-50 rounded">
                                    <p className="text-red-600 font-semibold">Withdrawals</p>
                                    <p>₹{periodDays[currentDay].withdrawals.toLocaleString()}</p>
                                  </div>
                                  <div className="text-center p-2 bg-orange-50 rounded">
                                    <p className="text-orange-600 font-semibold">Bonus</p>
                                    <p>{periodDays[currentDay].bonusPoints} pts</p>
                                  </div>
                                </div>

                                <div className="p-3 bg-blue-50 rounded">
                                  <p className="text-sm font-mono">
                                    <strong>Calculation:</strong><br/>
                                    {periodDays[currentDay].openingBalance} - ({periodDays[currentDay].deposits} + {periodDays[currentDay].bonusPoints}) + {periodDays[currentDay].withdrawals} = <strong>{periodDays[currentDay].closingBalance}</strong>
                                  </p>
                                </div>

                                {currentDay < periodDays.length - 1 && (
                                  <div className="p-3 bg-green-50 rounded">
                                    <p className="text-sm">
                                      <strong>Next Day Opening:</strong> ₹{periodDays[currentDay].closingBalance.toLocaleString()}
                                      <br />
                                      <em>(Today&apos;s closing becomes tomorrow&apos;s opening)</em>
                                    </p>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
    </DashboardLayout>
  );
}
