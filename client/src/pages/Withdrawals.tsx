import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { getTimezone, formatDateForDisplay } from "@/lib/timezone";
import { 
  Plus, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock,
  Calendar,
  Search,
  ArrowUpFromLine,
  DollarSign,
  AlertCircle
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function Withdrawals() {
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    userId: "",
    amount: "",
    utr: "",
    bankName: "",
    accountNumber: "",
    panelName: "",
    isExtraWithdrawal: false,
    isWrongWithdrawal: false,
  });
  const [timePeriod, setTimePeriod] = useState<"today" | "yesterday" | "7d" | "30d" | "all">(
    "today"
  );
  const [timezone, setTimezone] = useState(getTimezone());

  // Update timezone when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setTimezone(getTimezone());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const {
    data: withdrawals,
    isLoading,
    refetch,
  } = trpc.withdrawals.list.useQuery({ timePeriod, timezone });
  const { data: panels } = trpc.panels.list.useQuery();
  const { data: bankAccounts } = trpc.bankAccounts.list.useQuery();

  const createWithdrawal = trpc.withdrawals.create.useMutation({
    onSuccess: () => {
      toast.success("Withdrawal recorded successfully");
      setIsCreateDialogOpen(false);
      setFormData({
        userId: "",
        amount: "",
        utr: "",
        bankName: "",
        accountNumber: "",
        panelName: "",
        isExtraWithdrawal: false,
        isWrongWithdrawal: false,
      });
      refetch();
    },
    onError: error => {
      toast.error(error.message || "Failed to record withdrawal");
    },
  });

  const updateStatus = trpc.withdrawals.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Withdrawal status updated");
      refetch();
    },
    onError: error => {
      toast.error(error.message || "Failed to update status");
    },
  });

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

  const handleCreateWithdrawal = () => {
    if (!formData.userId.trim() || !formData.amount || !formData.panelName) {
      toast.error("User ID, amount, and panel name are required");
      return;
    }

    if (!formData.utr.trim()) {
      toast.error("UTR number is required");
      return;
    }

    if (!formData.bankName.trim()) {
      toast.error("Bank account is required");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    createWithdrawal.mutate({
      userId: formData.userId.trim(),
      amount: Math.round(amount),
      utr: formData.utr.trim(),
      bankName: formData.bankName.trim(),
      accountNumber: formData.accountNumber.trim(),
      panelName: formData.panelName,
      isExtraWithdrawal: formData.isExtraWithdrawal ? 1 : 0,
      isWrongWithdrawal: formData.isWrongWithdrawal ? 1 : 0,
      status: "pending",
      withdrawalDate: new Date(),
    });
  };

  const handleStatusUpdate = (id: number, status: "approved" | "rejected") => {
    updateStatus.mutate({ id, status });
  };

  // Calculate statistics
  const stats = useMemo(() => {
    if (!withdrawals)
      return { total: 0, totalAmount: 0, uniquePlayers: 0, pending: 0 };

    return {
      total: withdrawals.length,
      totalAmount: withdrawals.reduce((sum, w) => sum + w.amount, 0),
      uniquePlayers: new Set(withdrawals.map(w => w.userId)).size,
      pending: withdrawals.filter(w => w.status === "pending").length,
    };
  }, [withdrawals]);

  // Filter withdrawals based on search
  const filteredWithdrawals = useMemo(() => {
    if (!withdrawals) return [];
    if (!searchTerm) return withdrawals;

    return withdrawals.filter(withdrawal => {
      const searchLower = searchTerm.toLowerCase();
      return (
        withdrawal.userId.toLowerCase().includes(searchLower) ||
        withdrawal.utr?.toLowerCase().includes(searchLower) ||
        withdrawal.panelName?.toLowerCase().includes(searchLower) ||
        withdrawal.bankName?.toLowerCase().includes(searchLower)
      );
    });
  }, [withdrawals, searchTerm]);

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        icon: any;
        label: string;
      }
    > = {
      pending: { variant: "secondary", icon: Clock, label: "Pending" },
      approved: { variant: "default", icon: CheckCircle, label: "Approved" },
      rejected: { variant: "destructive", icon: XCircle, label: "Rejected" },
    };
    const config = variants[status] || {
      variant: "outline" as const,
      icon: Clock,
      label: status,
    };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const isAdmin = user?.role === "admin";

  return (
    <DashboardLayout>
      <div className="min-h-screen p-3">
        <div className="space-y-3">
          {/* Modern Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-100 via-orange-50 to-amber-100 p-6 text-slate-900 shadow-sm border border-amber-200">
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-xl bg-white/80 backdrop-blur-sm flex items-center justify-center border border-amber-200">
                  <ArrowUpFromLine className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Withdrawals Management</h1>
                  <p className="text-slate-600 text-sm">Track and manage player withdrawals with approval workflow</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></div>
                  <span className="text-xs text-slate-600">Live Tracking</span>
                </div>
                <div className="h-4 w-px bg-amber-300"></div>
                <span className="text-xs text-slate-600">
                  {filteredWithdrawals.length} withdrawals loaded
                </span>
              </div>
            </div>
          </div>

          {/* Modern Stats Cards */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 p-3 text-amber-700 shadow-sm border border-amber-200">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-medium text-amber-600 uppercase tracking-wider">Total Withdrawals</p>
                  <div className="h-6 w-6 rounded bg-white/80 backdrop-blur-sm flex items-center justify-center border border-amber-200">
                    <ArrowUpFromLine className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                </div>
                <p className="text-lg font-bold text-amber-900">{stats.total}</p>
                <p className="text-[9px] text-amber-600">{stats.total} transactions</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 p-3 text-amber-700 shadow-sm border border-amber-200">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-medium text-amber-600 uppercase tracking-wider">Total Amount</p>
                  <div className="h-6 w-6 rounded bg-white/80 backdrop-blur-sm flex items-center justify-center border border-amber-200">
                    <DollarSign className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                </div>
                <p className="text-lg font-bold text-amber-900">{formatCurrency(stats.totalAmount)}</p>
                <p className="text-[9px] text-amber-600">withdrawn</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-50 to-blue-50 p-3 text-slate-700 shadow-sm border border-slate-200">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wider">Unique Players</p>
                  <div className="h-6 w-6 rounded bg-white/80 backdrop-blur-sm flex items-center justify-center border border-slate-200">
                    <Users className="h-3.5 w-3.5 text-slate-600" />
                  </div>
                </div>
                <p className="text-lg font-bold text-slate-900">{stats.uniquePlayers}</p>
                <p className="text-[9px] text-slate-600">active players</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 p-3 text-orange-700 shadow-sm border border-orange-200">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-medium text-orange-600 uppercase tracking-wider">Pending</p>
                  <div className="h-6 w-6 rounded bg-white/80 backdrop-blur-sm flex items-center justify-center border border-orange-200">
                    <Clock className="h-3.5 w-3.5 text-orange-600" />
                  </div>
                </div>
                <p className="text-lg font-bold text-orange-900">{stats.pending}</p>
                <p className="text-[9px] text-orange-600">awaiting approval</p>
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
                    className="pl-10 h-9 text-xs border-slate-300 focus:border-amber-300"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select
                  value={timePeriod}
                  onValueChange={(value: "today" | "yesterday" | "7d" | "30d" | "all") =>
                    setTimePeriod(value)
                  }
                >
                  <SelectTrigger className="h-9 text-xs border-slate-300">
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
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="h-9 text-xs bg-gradient-to-r from-amber-100 to-orange-100 hover:from-amber-200 hover:to-orange-200 text-amber-700 border border-amber-200">
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      New Withdrawal
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg border border-amber-200">
                          <ArrowUpFromLine className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <DialogTitle className="text-lg text-slate-900">Record New Withdrawal</DialogTitle>
                          <DialogDescription className="text-slate-600">
                            Add a new withdrawal transaction to the system
                          </DialogDescription>
                        </div>
                      </div>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="userId" className="text-sm font-medium">User ID *</Label>
                        <Input
                          id="userId"
                          placeholder="Enter user ID"
                          value={formData.userId}
                          onChange={e =>
                            setFormData({ ...formData, userId: e.target.value })
                          }
                          className="border-slate-300 focus:border-amber-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amount" className="text-sm font-medium">Amount (₹) *</Label>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="Enter amount"
                          value={formData.amount}
                          onChange={e =>
                            setFormData({ ...formData, amount: e.target.value })
                          }
                          className="border-slate-300 focus:border-amber-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="panelName" className="text-sm font-medium">Panel *</Label>
                        <Select
                          value={formData.panelName}
                          onValueChange={value =>
                            setFormData({ ...formData, panelName: value })
                          }
                        >
                          <SelectTrigger className="border-slate-300 focus:border-amber-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {panels && panels.length > 0 ? (
                              panels.map(panel => (
                                <SelectItem key={panel.id} value={panel.name}>
                                  {panel.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="" disabled>
                                No panels available - Create a panel first
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="utr" className="text-sm font-medium">UTR Number *</Label>
                        <Input
                          id="utr"
                          placeholder="Enter UTR"
                          value={formData.utr}
                          onChange={e =>
                            setFormData({ ...formData, utr: e.target.value })
                          }
                          required
                          className="border-slate-300 focus:border-amber-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankAccount" className="text-sm font-medium">Bank Account *</Label>
                        <Select
                          value={formData.accountNumber}
                          onValueChange={(value) => {
                            const selectedAccount = bankAccounts?.find(acc => acc.accountNumber === value);
                            if (selectedAccount) {
                              setFormData({ 
                                ...formData, 
                                bankName: selectedAccount.bankName,
                                accountNumber: selectedAccount.accountNumber
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="border-slate-300 focus:border-amber-300">
                            <SelectValue placeholder="Select bank account" />
                          </SelectTrigger>
                          <SelectContent>
                            {bankAccounts?.map((account) => {
                              const typeDisplay = account.accountType === 'Both' 
                                ? '[Deposit, Withdrawal]' 
                                : `[${account.accountType}]`;
                              return (
                                <SelectItem key={account.id} value={account.accountNumber}>
                                  {account.accountHolderName} - {account.bankName} ({account.accountNumber}) {typeDisplay}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                        className="border-slate-300 text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateWithdrawal}
                        disabled={createWithdrawal.isPending}
                        className="bg-gradient-to-r from-amber-100 to-orange-100 hover:from-amber-200 hover:to-orange-200 text-amber-700 border border-amber-200"
                      >
                        {createWithdrawal.isPending
                          ? "Recording..."
                          : "Record Withdrawal"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {/* Withdrawals List */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 backdrop-blur-xl rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-100 to-blue-100">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-600" />
                  Withdrawal History
                </h2>
                <Badge variant="secondary" className="text-xs px-2 py-1 bg-slate-200 text-slate-700">
                  {filteredWithdrawals.length}
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
              ) : !filteredWithdrawals || filteredWithdrawals.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 mb-4">
                    <ArrowUpFromLine className="h-10 w-10 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-slate-900">No Withdrawals Found</h3>
                  <p className="text-sm text-slate-600">
                    {searchTerm
                      ? "Try adjusting your search"
                      : "No withdrawals recorded yet. Record your first withdrawal to get started."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {filteredWithdrawals.map(withdrawal => (
                    <div key={withdrawal.id} className="p-3 hover:bg-white/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {/* Type Icon with Bar */}
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-10 rounded-full bg-gradient-to-b from-amber-400 to-orange-500"></div>
                          <div className="h-9 w-9 rounded-lg flex items-center justify-center shadow-sm bg-gradient-to-br from-amber-400 to-orange-500">
                            <ArrowUpFromLine className="h-4 w-4 text-white" />
                          </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 font-mono truncate">
                                {withdrawal.userId}
                              </span>
                              <Badge variant="outline" className="text-xs px-1.5 py-0.5 flex-shrink-0 bg-amber-50 text-amber-700 border-amber-200">
                                {withdrawal.panelName}
                              </Badge>
                              <div className="flex gap-1">
                                {getStatusBadge(withdrawal.status)}
                                {withdrawal.isExtraWithdrawal === 1 && (
                                  <Badge variant="outline" className="text-[10px] border-blue-500 text-blue-700 bg-blue-50/50 px-1.5 py-0.5">
                                    Extra
                                  </Badge>
                                )}
                                {withdrawal.isWrongWithdrawal === 1 && (
                                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                                    Wrong
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-base font-bold font-mono text-amber-600">
                                {formatCurrency(withdrawal.amount)}
                              </p>
                            </div>
                          </div>

                          {/* Details Row */}
                          <div className="flex items-center gap-3 text-xs text-slate-600">
                            <span className="flex items-center gap-1">
                              <span className="text-slate-400">UTR:</span>
                              <span className="font-mono font-medium text-slate-700">{withdrawal.utr || "N/A"}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="text-slate-400">Bank:</span>
                              <span className="font-medium truncate max-w-[100px] text-slate-700">{withdrawal.bankName || "N/A"}</span>
                            </span>
                            <span className="flex items-center gap-1 ml-auto">
                              <span className="text-slate-400">Date:</span>
                              <span className="text-slate-700">{formatDate(withdrawal.createdAt)}</span>
                            </span>
                          </div>

                          {/* Admin Actions */}
                          {isAdmin && withdrawal.status === "pending" && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-gradient-to-r from-emerald-100 to-teal-100 hover:from-emerald-200 hover:to-teal-200 text-emerald-700 border border-emerald-200"
                                onClick={() =>
                                  handleStatusUpdate(
                                    withdrawal.id,
                                    "approved"
                                  )
                                }
                                disabled={updateStatus.isPending}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50"
                                onClick={() =>
                                  handleStatusUpdate(
                                    withdrawal.id,
                                    "rejected"
                                  )
                                }
                                disabled={updateStatus.isPending}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
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
