import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { getTimezone, formatDateForDisplay } from "@/lib/timezone";
import { 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Search, 
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Plus,
  Eye
} from "lucide-react";
import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useLocation, Link } from "wouter";

export default function Transactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "deposit" | "withdrawal">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");
  const [timezone] = useState(getTimezone());
  const [location] = useLocation();

  const { data: deposits, isLoading: depositsLoading } = trpc.deposits.list.useQuery();
  const { data: withdrawals, isLoading: withdrawalsLoading } = trpc.withdrawals.list.useQuery();

  const isLoading = depositsLoading || withdrawalsLoading;

  // Combine deposits and withdrawals into a single transaction list
  const transactions = React.useMemo(() => {
    if (!deposits || !withdrawals) return [];

    const depositTransactions = deposits.map(d => ({
      id: `deposit-${d.id}`,
      type: "deposit" as const,
      transactionDate: d.createdAt,
      amount: typeof d.amount === "string" ? parseFloat(d.amount) : d.amount,
      utr: d.utr,
      panelName: d.panelName,
      userId: d.userId,
      bankName: d.bankName,
      bonusPoints: d.bonusPoints,
      isExtra: d.isExtraDeposit,
      isWrong: d.isWrongDeposit,
    }));

    const withdrawalTransactions = withdrawals.map(w => ({
      id: `withdrawal-${w.id}`,
      type: "withdrawal" as const,
      transactionDate: w.createdAt,
      amount: typeof w.amount === "string" ? parseFloat(w.amount) : w.amount,
      utr: w.utr,
      panelName: w.panelName,
      userId: w.userId,
      bankName: w.bankName,
      status: w.status,
      isExtra: w.isExtraWithdrawal,
      isWrong: w.isWrongWithdrawal,
    }));

    // Combine and sort by date (newest first)
    return [...depositTransactions, ...withdrawalTransactions].sort(
      (a, b) =>
        new Date(b.transactionDate).getTime() -
        new Date(a.transactionDate).getTime()
    );
  }, [deposits, withdrawals]);

  // Filter transactions based on search and filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (
          !transaction.userId.toLowerCase().includes(searchLower) &&
          !transaction.utr?.toLowerCase().includes(searchLower) &&
          !transaction.panelName?.toLowerCase().includes(searchLower) &&
          !transaction.bankName?.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Type filter
      if (typeFilter !== "all" && transaction.type !== typeFilter) {
        return false;
      }

      // Status filter (only for withdrawals)
      if (statusFilter !== "all" && transaction.type === "withdrawal") {
        if (transaction.status?.toLowerCase() !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, searchTerm, typeFilter, statusFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalDeposits = transactions
      .filter(t => t.type === "deposit")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawals = transactions
      .filter(t => t.type === "withdrawal")
      .reduce((sum, t) => sum + t.amount, 0);
    const netAmount = totalDeposits - totalWithdrawals;
    const depositCount = transactions.filter(t => t.type === "deposit").length;
    const withdrawalCount = transactions.filter(t => t.type === "withdrawal").length;
    const pendingWithdrawals = transactions.filter(
      t => t.type === "withdrawal" && t.status?.toLowerCase() === "pending"
    ).length;

    return {
      totalDeposits,
      totalWithdrawals,
      netAmount,
      depositCount,
      withdrawalCount,
      pendingWithdrawals,
    };
  }, [transactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    const { date: dateStr, time: timeStr } = formatDateForDisplay(date);
    return `${dateStr} ${timeStr}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return <CheckCircle className="h-3 w-3" />;
      case "pending":
        return <Clock className="h-3 w-3" />;
      case "rejected":
        return <XCircle className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
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
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-xl bg-white/80 backdrop-blur-sm flex items-center justify-center border border-slate-200">
                  <Calendar className="h-6 w-6 text-slate-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Transaction Ledger</h1>
                  <p className="text-slate-600 text-sm">Complete financial movements tracking</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs text-slate-600">Live Tracking</span>
                </div>
                <div className="h-4 w-px bg-slate-300"></div>
                <span className="text-xs text-slate-600">
                  {filteredTransactions.length} transactions loaded
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions - Deposits & Withdrawals */}
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            <Link href="/deposits">
              <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-4 text-emerald-700 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <ArrowDownToLine className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                        Manage
                      </span>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-1 text-emerald-900">Deposits</h3>
                  <p className="text-sm text-emerald-600 mb-3">Add and manage player deposits</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs font-medium text-emerald-700">New Deposit</span>
                    </div>
                    <Eye className="h-4 w-4 text-emerald-600" />
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/withdrawals">
              <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-4 text-amber-700 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
                      <ArrowUpFromLine className="h-6 w-6 text-amber-600" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                        Manage
                      </span>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-1 text-amber-900">Withdrawals</h3>
                  <p className="text-sm text-amber-600 mb-3">Process player withdrawal requests</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-amber-600" />
                      <span className="text-xs font-medium text-amber-700">New Withdrawal</span>
                    </div>
                    <Eye className="h-4 w-4 text-amber-600" />
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Modern Stats Cards */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <div 
              className={cn(
                "relative overflow-hidden rounded-lg p-3 text-emerald-700 shadow-sm cursor-pointer transition-all duration-200",
                typeFilter === "deposit"
                  ? "bg-gradient-to-br from-emerald-100 to-teal-100 border-2 border-emerald-300 ring-2 ring-emerald-200 ring-offset-2"
                  : "bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 hover:shadow-md hover:scale-[1.02]"
              )}
              onClick={() => {
                if (typeFilter === "deposit") {
                  setTypeFilter("all");
                } else {
                  setTypeFilter("deposit");
                  setStatusFilter("all");
                }
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">Total Deposits</p>
                  <div className="h-6 w-6 rounded bg-emerald-200 flex items-center justify-center">
                    {typeFilter === "deposit" ? (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-700" />
                    ) : (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                  </div>
                </div>
                <p className="text-lg font-bold text-emerald-900">{formatCurrency(stats.totalDeposits)}</p>
                <p className="text-[9px] text-emerald-600">
                  {typeFilter === "deposit" ? "Click to clear" : `${stats.depositCount} transactions`}
                </p>
              </div>
            </div>

            <div 
              className={cn(
                "relative overflow-hidden rounded-lg p-3 text-amber-700 shadow-sm cursor-pointer transition-all duration-200",
                typeFilter === "withdrawal"
                  ? "bg-gradient-to-br from-amber-100 to-orange-100 border-2 border-amber-300 ring-2 ring-amber-200 ring-offset-2"
                  : "bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 hover:shadow-md hover:scale-[1.02]"
              )}
              onClick={() => {
                if (typeFilter === "withdrawal" && statusFilter === "all") {
                  setTypeFilter("all");
                } else {
                  setTypeFilter("withdrawal");
                  setStatusFilter("all");
                }
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-medium text-amber-600 uppercase tracking-wider">Total Withdrawals</p>
                  <div className="h-6 w-6 rounded bg-amber-200 flex items-center justify-center">
                    {typeFilter === "withdrawal" && statusFilter === "all" ? (
                      <CheckCircle className="h-3.5 w-3.5 text-amber-700" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-amber-600" />
                    )}
                  </div>
                </div>
                <p className="text-lg font-bold text-amber-900">{formatCurrency(stats.totalWithdrawals)}</p>
                <p className="text-[9px] text-amber-600">
                  {typeFilter === "withdrawal" && statusFilter === "all" ? "Click to clear" : `${stats.withdrawalCount} transactions`}
                </p>
              </div>
            </div>

            <div 
              className={cn(
                "relative overflow-hidden rounded-lg p-3 text-slate-700 shadow-sm cursor-pointer transition-all duration-200",
                searchTerm === "net" || (typeFilter === "all" && statusFilter === "all" && !searchTerm)
                  ? "bg-gradient-to-br from-slate-100 to-gray-100 border-2 border-slate-300 ring-2 ring-slate-200 ring-offset-2"
                  : "bg-gradient-to-br from-slate-50 to-gray-50 border border-slate-200 hover:shadow-md hover:scale-[1.02]"
              )}
              onClick={() => {
                // Toggle net amount view (shows all transactions by default)
                setTypeFilter("all");
                setStatusFilter("all");
                setSearchTerm("");
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wider">Net Amount</p>
                  <div className="h-6 w-6 rounded bg-slate-200 flex items-center justify-center">
                    <DollarSign className="h-3.5 w-3.5 text-slate-600" />
                  </div>
                </div>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(stats.netAmount)}</p>
                <p className="text-[9px] text-slate-600">Deposits - Withdrawals</p>
              </div>
            </div>

            <div 
              className={cn(
                "relative overflow-hidden rounded-lg p-3 text-orange-700 shadow-sm cursor-pointer transition-all duration-200",
                typeFilter === "withdrawal" && statusFilter === "pending"
                  ? "bg-gradient-to-br from-orange-100 to-amber-100 border-2 border-orange-300 ring-2 ring-orange-200 ring-offset-2"
                  : "bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 hover:shadow-md hover:scale-[1.02]"
              )}
              onClick={() => {
                if (typeFilter === "withdrawal" && statusFilter === "pending") {
                  setTypeFilter("all");
                  setStatusFilter("all");
                } else {
                  setTypeFilter("withdrawal");
                  setStatusFilter("pending");
                }
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-medium text-orange-600 uppercase tracking-wider">Pending</p>
                  <div className="h-6 w-6 rounded bg-orange-200 flex items-center justify-center">
                    {typeFilter === "withdrawal" && statusFilter === "pending" ? (
                      <CheckCircle className="h-3.5 w-3.5 text-orange-700" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-orange-600" />
                    )}
                  </div>
                </div>
                <p className="text-lg font-bold text-orange-900">{stats.pendingWithdrawals}</p>
                <p className="text-[9px] text-orange-600">
                  {typeFilter === "withdrawal" && statusFilter === "pending" ? "Click to clear" : "withdrawals"}
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 backdrop-blur-xl rounded-lg shadow-sm border border-slate-200 p-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by User ID, UTR, Bank or Panel..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-9 text-xs border-slate-300 focus:border-blue-300"
                  />
                </div>
              </div>
              <Select
                value={typeFilter}
                onValueChange={(value: "all" | "deposit" | "withdrawal") => setTypeFilter(value)}
              >
                <SelectTrigger className="w-[140px] h-9 text-xs border-slate-300">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="deposit">Deposits</SelectItem>
                  <SelectItem value="withdrawal">Withdrawals</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value: "all" | "approved" | "pending" | "rejected") => setStatusFilter(value)}
              >
                <SelectTrigger className="w-[140px] h-9 text-xs border-slate-300">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              {(searchTerm || typeFilter !== "all" || statusFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setTypeFilter("all");
                    setStatusFilter("all");
                  }}
                  className="h-9 text-xs border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  Clear All
                </Button>
              )}
            </div>
            {(typeFilter !== "all" || statusFilter !== "all" || searchTerm) && (
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                <span>Active filters:</span>
                {typeFilter !== "all" && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                    Type: {typeFilter}
                  </span>
                )}
                {statusFilter !== "all" && (
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                    Status: {statusFilter}
                  </span>
                )}
                {searchTerm && (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
                    Search: "{searchTerm}"
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Transactions List */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 backdrop-blur-xl rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-100 to-blue-100">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-600" />
                  Transaction History
                </h2>
                <Badge variant="secondary" className="text-xs px-2 py-1 bg-slate-200 text-slate-700">
                  {filteredTransactions.length}
                </Badge>
              </div>
            </div>
            
            <div className="max-h-[600px] overflow-y-auto">
              {isLoading ? (
                <div className="divide-y divide-slate-200">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="p-3">
                      <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : !filteredTransactions || filteredTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 mb-4">
                    <Calendar className="h-10 w-10 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-slate-900">No Transactions Found</h3>
                  <p className="text-sm text-slate-600">
                    {searchTerm || typeFilter !== "all" || statusFilter !== "all"
                      ? "Try adjusting your filters"
                      : "No transactions have been recorded yet"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {filteredTransactions.map(transaction => (
                    <div key={transaction.id} className="p-3 hover:bg-white/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {/* Type Icon with Bar */}
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-1 h-10 rounded-full",
                            transaction.type === "deposit" 
                              ? "bg-gradient-to-b from-emerald-400 to-emerald-500" 
                              : "bg-gradient-to-b from-amber-400 to-amber-500"
                          )}></div>
                          <div className={cn(
                            "h-9 w-9 rounded-lg flex items-center justify-center shadow-sm",
                            transaction.type === "deposit" 
                              ? "bg-gradient-to-br from-emerald-400 to-emerald-500" 
                              : "bg-gradient-to-br from-amber-400 to-amber-500"
                          )}>
                            {transaction.type === "deposit" ? (
                              <ArrowDownToLine className="h-4 w-4 text-white" />
                            ) : (
                              <ArrowUpFromLine className="h-4 w-4 text-white" />
                            )}
                          </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 font-mono truncate">
                                {transaction.userId}
                              </span>
                              <Badge
                                variant={transaction.type === "deposit" ? "default" : "destructive"}
                                className={cn(
                                  "text-xs px-1.5 py-0.5 flex-shrink-0",
                                  transaction.type === "deposit" 
                                    ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                                    : "bg-amber-100 text-amber-700 border-amber-200"
                                )}
                              >
                                {transaction.type === "deposit" ? "Deposit" : "Withdrawal"}
                              </Badge>
                              <div className="flex gap-1">
                                {transaction.type === "withdrawal" &&
                                  "status" in transaction &&
                                  transaction.status && (
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-[10px] capitalize px-1.5 py-0.5",
                                        transaction.status.toLowerCase() === "approved" && "border-emerald-500 text-emerald-700 bg-emerald-50/50",
                                        transaction.status.toLowerCase() === "pending" && "border-orange-500 text-orange-700 bg-orange-50/50",
                                        transaction.status.toLowerCase() === "rejected" && "border-red-500 text-red-700 bg-red-50/50"
                                      )}
                                    >
                                      {transaction.status}
                                    </Badge>
                                  )}
                                {Boolean(transaction.isExtra) && (
                                  <Badge variant="outline" className="text-[10px] border-blue-500 text-blue-700 bg-blue-50/50 px-1.5 py-0.5">
                                    Extra
                                  </Badge>
                                )}
                                {Boolean(transaction.isWrong) && (
                                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                                    Wrong
                                  </Badge>
                                )}
                                {transaction.type === "deposit" &&
                                  "bonusPoints" in transaction &&
                                  transaction.bonusPoints > 0 && (
                                    <Badge variant="secondary" className="text-[10px] bg-purple-100/80 text-purple-700 border-purple-300 px-1.5 py-0.5">
                                      +{transaction.bonusPoints}
                                    </Badge>
                                  )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={cn(
                                "text-base font-bold font-mono",
                                transaction.type === "deposit" ? "text-emerald-600" : "text-amber-600"
                              )}>
                                {transaction.type === "deposit" ? "+" : "-"}
                                {formatCurrency(transaction.amount)}
                              </p>
                            </div>
                          </div>

                          {/* Details Row */}
                          <div className="flex items-center gap-3 text-xs text-slate-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(transaction.transactionDate)}
                            </span>
                            <span className="text-slate-400">•</span>
                            {transaction.utr && (
                              <>
                                <span className="font-mono text-slate-700">UTR: {transaction.utr}</span>
                                <span className="text-slate-400">•</span>
                              </>
                            )}
                            {transaction.panelName && (
                              <>
                                <span className="text-slate-700">{transaction.panelName}</span>
                                <span className="text-slate-400">•</span>
                              </>
                            )}
                            {transaction.bankName && (
                              <span className="text-slate-700">{transaction.bankName}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
