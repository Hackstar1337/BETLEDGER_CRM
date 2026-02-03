import { useState, useEffect } from "react";
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
  Users,
  ArrowDownCircle,
  ArrowUpCircle,
  UserPlus,
  Activity,
  TrendingUp,
  Clock,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TodaysPlayersReport() {
  const [timezone, setTimezone] = useState("GMT+5:30");

  // Load timezone from localStorage
  useEffect(() => {
    const savedTimezone = localStorage.getItem("appTimezone");
    if (savedTimezone) {
      setTimezone(savedTimezone);
    }
  }, []);

  const { data: stats, isLoading } = trpc.todaysPlayersReport.getStats.useQuery(
    { timezone }
  );

  const totalActivity = (stats?.numberOfDeposits || 0) + (stats?.numberOfWithdrawals || 0);
  const avgDeposits = stats?.numberOfPlayersDeposited 
    ? (stats.numberOfDeposits / stats.numberOfPlayersDeposited).toFixed(2)
    : "0.00";
  const avgWithdrawals = stats?.numberOfPlayersWithdrew
    ? (stats.numberOfWithdrawals / stats.numberOfPlayersWithdrew).toFixed(2)
    : "0.00";

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
                  <Activity className="h-6 w-6 text-slate-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Today's Players Report</h1>
                  <p className="text-slate-600 text-sm">Real-time statistics for player activity in the last 24 hours</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <Badge variant="outline" className="text-xs bg-white/80 border-slate-300 text-slate-600">
                      {timezone}
                    </Badge>
                  </div>
                  <div className="h-4 w-px bg-slate-300"></div>
                  <span className="text-xs text-slate-600">
                    {totalActivity} total activities
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs text-slate-600">Live</span>
                </div>
              </div>
            </div>
          </div>

        {isLoading ? (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-slate-50 rounded-lg border border-slate-200 p-3 animate-pulse">
                <div className="h-3 w-20 bg-slate-200 rounded mb-2"></div>
                <div className="h-6 w-12 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 p-4 text-blue-700 shadow-sm border border-blue-200">
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-medium text-blue-600 uppercase tracking-wider">Deposits</p>
                    <div className="h-6 w-6 rounded bg-white/80 backdrop-blur-sm flex items-center justify-center border border-blue-200">
                      <ArrowDownCircle className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-blue-900 font-mono">{stats?.numberOfDeposits || 0}</p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 p-4 text-emerald-700 shadow-sm border border-emerald-200">
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">Deposited</p>
                    <div className="h-6 w-6 rounded bg-white/80 backdrop-blur-sm flex items-center justify-center border border-emerald-200">
                      <Users className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-emerald-900 font-mono">{stats?.numberOfPlayersDeposited || 0}</p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 p-4 text-amber-700 shadow-sm border border-amber-200">
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-medium text-amber-600 uppercase tracking-wider">Withdrawals</p>
                    <div className="h-6 w-6 rounded bg-white/80 backdrop-blur-sm flex items-center justify-center border border-amber-200">
                      <ArrowUpCircle className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-amber-900 font-mono">{stats?.numberOfWithdrawals || 0}</p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-violet-50 to-purple-50 p-4 text-violet-700 shadow-sm border border-violet-200">
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-medium text-violet-600 uppercase tracking-wider">Players Withdrew</p>
                    <div className="h-6 w-6 rounded bg-white/80 backdrop-blur-sm flex items-center justify-center border border-violet-200">
                      <Users className="h-3.5 w-3.5 text-violet-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-violet-900 font-mono">{stats?.numberOfPlayersWithdrew || 0}</p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-cyan-50 to-sky-50 p-4 text-cyan-700 shadow-sm border border-cyan-200">
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-medium text-cyan-600 uppercase tracking-wider">New IDs</p>
                    <div className="h-6 w-6 rounded bg-white/80 backdrop-blur-sm flex items-center justify-center border border-cyan-200">
                      <UserPlus className="h-3.5 w-3.5 text-cyan-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-cyan-900 font-mono">{stats?.numberOfNewIdsCreated || 0}</p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-50 to-blue-50 p-4 text-slate-700 shadow-sm border border-slate-200">
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wider">Total</p>
                    <div className="h-6 w-6 rounded bg-white/80 backdrop-blur-sm flex items-center justify-center border border-slate-200">
                      <Activity className="h-3.5 w-3.5 text-slate-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 font-mono">{totalActivity}</p>
                </div>
              </div>
            </div>

            {/* Activity Overview */}
            <div className="grid gap-3 md:grid-cols-2">
              {/* Deposit Activity */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 backdrop-blur-xl rounded-lg shadow-sm border border-slate-200">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg border border-blue-200">
                        <ArrowDownCircle className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Deposit Activity</h3>
                        <p className="text-sm text-slate-600">Today's deposit transactions</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {stats?.numberOfDeposits || 0} total
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Unique Players</span>
                      <span className="font-semibold text-lg text-slate-900">{stats?.numberOfPlayersDeposited || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Average per Player</span>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        <span className="font-semibold text-lg text-slate-900">{avgDeposits}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Conversion Rate</span>
                        <span>{stats?.numberOfPlayersDeposited ? Math.round((stats.numberOfPlayersDeposited / (stats.numberOfPlayersDeposited + stats.numberOfPlayersWithdrew)) * 100) : 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Withdrawal Activity */}
              <div className="bg-gradient-to-br from-slate-50 to-amber-50 backdrop-blur-xl rounded-lg shadow-sm border border-slate-200">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg border border-amber-200">
                        <ArrowUpCircle className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Withdrawal Activity</h3>
                        <p className="text-sm text-slate-600">Today's withdrawal transactions</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                      {stats?.numberOfWithdrawals || 0} total
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Unique Players</span>
                      <span className="font-semibold text-lg text-slate-900">{stats?.numberOfPlayersWithdrew || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Average per Player</span>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                        <span className="font-semibold text-lg text-slate-900">{avgWithdrawals}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Conversion Rate</span>
                        <span>{stats?.numberOfPlayersWithdrew ? Math.round((stats.numberOfPlayersWithdrew / (stats.numberOfPlayersDeposited + stats.numberOfPlayersWithdrew)) * 100) : 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* New Players Summary */}
            <div className="bg-gradient-to-br from-slate-50 to-cyan-50 backdrop-blur-xl rounded-lg shadow-sm border border-slate-200">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-cyan-100 to-sky-100 rounded-lg shadow-sm border border-cyan-200">
                      <UserPlus className="h-6 w-6 text-cyan-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">New Player Acquisition</h3>
                      <p className="text-sm text-slate-600">Fresh accounts created today</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-cyan-700">{stats?.numberOfNewIdsCreated || 0}</p>
                    <p className="text-sm text-cyan-600">new players</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mx-auto mb-3 border border-amber-200">
                      <Zap className="h-6 w-6 text-amber-600" />
                    </div>
                    <p className="text-2xl font-bold text-amber-900">{stats?.numberOfNewIdsCreated || 0}</p>
                    <p className="text-sm text-amber-600">Growth Rate</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mx-auto mb-3 border border-emerald-200">
                      <Users className="h-6 w-6 text-emerald-600" />
                    </div>
                    <p className="text-2xl font-bold text-emerald-900">{stats?.numberOfPlayersDeposited || 0}</p>
                    <p className="text-sm text-emerald-600">Active Players</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg border border-slate-200">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-slate-100 to-blue-100 flex items-center justify-center mx-auto mb-3 border border-slate-200">
                      <Activity className="h-6 w-6 text-slate-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{totalActivity}</p>
                    <p className="text-sm text-slate-600">Total Transactions</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      </div>
    </DashboardLayout>
  );
}
