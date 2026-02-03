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
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  Building2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Edit,
  Trash2,
  Settings,
  CreditCard,
  DollarSign,
  Activity,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PiggyBank,
  Target,
  User,
  Check,
  Info,
  Loader2,
  BarChart3,
  Layers,
} from "lucide-react";
import { BankAccountFeesDialog } from "@/components/BankAccountFeesDialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";

// Component to display total deposits for a bank account
function TotalDeposits({ bankName, accountNumber }: { bankName: string; accountNumber: string }) {
  const { data: totalDeposits, isLoading } =
    trpc.bankAccounts.getTotalDeposits.useQuery({ bankName, accountNumber });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) return <span className="text-sm text-slate-400">Loading...</span>;
  return <span className="font-semibold text-emerald-600">{formatCurrency(Number(totalDeposits) || 0)}</span>;
}

// Component to display total withdrawals for a bank account
function TotalWithdrawals({ bankName, accountNumber }: { bankName: string; accountNumber: string }) {
  const { data: totalWithdrawals, isLoading } =
    trpc.bankAccounts.getTotalWithdrawals.useQuery({ bankName, accountNumber });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) return <span className="text-sm text-slate-400">Loading...</span>;
  return <span className="font-semibold text-amber-600">{formatCurrency(Number(totalWithdrawals) || 0)}</span>;
}

export default function BankAccounts() {
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    accountHolderName: "",
    accountNumber: "",
    bankName: "",
    isDeposit: true,
    isWithdrawal: true,
    openingBalance: "0",
    closingBalance: "0",
    totalCharges: "0",
  });
  const [quickUpdateDialog, setQuickUpdateDialog] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [quickUpdateForm, setQuickUpdateForm] = useState({
    openingBalance: "",
    closingBalance: "",
  });
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    account: any | null;
  }>({ open: false, account: null });
  const [editForm, setEditForm] = useState({
    accountHolderName: "",
    accountNumber: "",
    bankName: "",
    isDeposit: true,
    isWithdrawal: true,
    openingBalance: "",
    closingBalance: "",
    totalCharges: "",
  });
  const [timePeriod, setTimePeriod] = useState<"today" | "yesterday" | "7d" | "30d" | "all">(
    "today"
  );
  const [timezone, setTimezone] = useState("GMT+5:30");
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");
  const [feesDialog, setFeesDialog] = useState<{
    open: boolean;
    account: any | null;
  }>({ open: false, account: null });

  // Load timezone from localStorage
  useEffect(() => {
    const savedTimezone = localStorage.getItem("appTimezone");
    if (savedTimezone) {
      setTimezone(savedTimezone);
    }
  }, []);

  const {
    data: bankAccounts,
    isLoading,
    refetch,
  } = trpc.bankAccounts.list.useQuery({ timePeriod, timezone });

  const createBankAccount = trpc.bankAccounts.create.useMutation({
    onSuccess: () => {
      toast.success("Bank account added successfully");
      setIsCreateDialogOpen(false);
      setFormData({
        accountHolderName: "",
        accountNumber: "",
        bankName: "",
        isDeposit: true,
        isWithdrawal: true,
        openingBalance: "0",
        closingBalance: "0",
        totalCharges: "0",
      });
      refetch();
    },
    onError: error => {
      toast.error(error.message || "Failed to add bank account");
    },
  });

  const quickUpdateAccount = trpc.bankAccounts.update.useMutation({
    onSuccess: () => {
      toast.success("Bank account balance updated successfully");
      setQuickUpdateDialog(false);
      setSelectedAccountId("");
      setQuickUpdateForm({ openingBalance: "", closingBalance: "" });
      refetch();
    },
    onError: error => {
      toast.error(error.message || "Failed to update bank account");
    },
  });

  const updateAccount = trpc.bankAccounts.update.useMutation({
    onSuccess: () => {
      toast.success("Bank account updated successfully");
      setEditDialog({ open: false, account: null });
      refetch();
    },
    onError: error => {
      toast.error(error.message || "Failed to update bank account");
    },
  });

  const deleteAccounts = trpc.bankAccounts.delete.useMutation({
    onSuccess: () => {
      toast.success("Bank accounts deleted successfully");
      setSelectedAccounts([]);
      setDeleteDialogOpen(false);
      refetch();
    },
    onError: error => {
      toast.error(error.message || "Failed to delete bank accounts");
    },
  });

  const handleSelectAccount = (accountId: number) => {
    setSelectedAccounts(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAccounts.length === bankAccounts?.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(bankAccounts?.map(a => a.id) || []);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedAccounts.length === 0) {
      toast.error("Please select bank accounts to delete");
      return;
    }
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteAccounts.mutate({ ids: selectedAccounts });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleCreateBankAccount = () => {
    if (
      !formData.accountHolderName.trim() ||
      !formData.accountNumber.trim() ||
      !formData.bankName.trim()
    ) {
      toast.error(
        "Account holder name, account number, and bank name are required"
      );
      return;
    }

    // Convert boolean fields to accountType
    let accountType: "Deposit" | "Withdrawal" | "Both";
    if (formData.isDeposit && formData.isWithdrawal) {
      accountType = "Both";
    } else if (formData.isDeposit) {
      accountType = "Deposit";
    } else if (formData.isWithdrawal) {
      accountType = "Withdrawal";
    } else {
      toast.error("Please select at least one account type (Deposit or Withdrawal)");
      return;
    }

    const openingBal = parseInt(formData.openingBalance) || 0;
    
    // Debug log
    console.log('Creating bank account with data:', {
      accountHolderName: formData.accountHolderName.trim(),
      accountNumber: formData.accountNumber.trim(),
      bankName: formData.bankName.trim(),
      accountType: accountType,
      openingBalance: openingBal,
      closingBalance: openingBal,
      totalCharges: parseInt(formData.totalCharges) || 0,
      isActive: 1,
    });
    
    createBankAccount.mutate({
      accountHolderName: formData.accountHolderName.trim(),
      accountNumber: formData.accountNumber.trim(),
      bankName: formData.bankName.trim(),
      accountType: accountType,
      openingBalance: openingBal,
      closingBalance: openingBal, // Initialize closing balance to match opening balance
      totalCharges: parseInt(formData.totalCharges) || 0,
      isActive: 1,
    });
  };

  const handleQuickUpdate = () => {
    if (!selectedAccountId) {
      toast.error("Please select a bank account");
      return;
    }

    if (!quickUpdateForm.openingBalance && !quickUpdateForm.closingBalance) {
      toast.error("Please enter at least one balance value");
      return;
    }

    const updates: any = {
      id: parseInt(selectedAccountId),
    };

    if (quickUpdateForm.openingBalance)
      updates.openingBalance = parseFloat(quickUpdateForm.openingBalance);
    if (quickUpdateForm.closingBalance)
      updates.closingBalance = parseFloat(quickUpdateForm.closingBalance);

    quickUpdateAccount.mutate(updates);
  };

  const handleAccountSelect = (accountId: string) => {
    setSelectedAccountId(accountId);
    const account = bankAccounts?.find(a => a.id.toString() === accountId);
    if (account) {
      setQuickUpdateForm({
        openingBalance: account.openingBalance.toString(),
        closingBalance: account.closingBalance.toString(),
      });
    }
  };

  const handleEditClick = (account: any) => {
    setEditDialog({ open: true, account });
    // Convert accountType to boolean fields
    const isDeposit = account.accountType === "Deposit" || account.accountType === "Both";
    const isWithdrawal = account.accountType === "Withdrawal" || account.accountType === "Both";
    
    setEditForm({
      accountHolderName: account.accountHolderName,
      accountNumber: account.accountNumber,
      bankName: account.bankName,
      isDeposit: isDeposit,
      isWithdrawal: isWithdrawal,
      openingBalance: account.openingBalance.toString(),
      closingBalance: account.closingBalance.toString(),
      totalCharges: account.totalCharges.toString(),
    });
  };

  const handleUpdateAccount = () => {
    if (!editDialog.account) return;

    if (
      !editForm.accountHolderName.trim() ||
      !editForm.accountNumber.trim() ||
      !editForm.bankName.trim()
    ) {
      toast.error(
        "Account holder name, account number, and bank name are required"
      );
      return;
    }

    // Convert boolean fields to accountType
    let accountType: "Deposit" | "Withdrawal" | "Both";
    if (editForm.isDeposit && editForm.isWithdrawal) {
      accountType = "Both";
    } else if (editForm.isDeposit) {
      accountType = "Deposit";
    } else if (editForm.isWithdrawal) {
      accountType = "Withdrawal";
    } else {
      toast.error("Please select at least one account type (Deposit or Withdrawal)");
      return;
    }

    updateAccount.mutate({
      id: editDialog.account.id,
      accountHolderName: editForm.accountHolderName.trim(),
      accountNumber: editForm.accountNumber.trim(),
      bankName: editForm.bankName.trim(),
      accountType: accountType,
      openingBalance: parseFloat(editForm.openingBalance) || 0,
      closingBalance: parseFloat(editForm.closingBalance) || 0,
      totalCharges: parseFloat(editForm.totalCharges) || 0,
    });
  };

  const isAdmin = user?.role === "admin";

  // Calculate totals
  const totalOpeningBalance =
    bankAccounts?.reduce((sum, acc) => sum + acc.openingBalance, 0) || 0;
  const totalClosingBalance =
    bankAccounts?.reduce((sum, acc) => sum + acc.closingBalance, 0) || 0;
  const totalCharges =
    bankAccounts?.reduce((sum, acc) => sum + acc.totalCharges, 0) || 0;
  const activeAccounts =
    bankAccounts?.filter(acc => acc.isActive === 1).length || 0;

  return (
    <DashboardLayout>
      <div className="min-h-screen">
        <div className="p-4 space-y-4">
          {/* Header with Stats */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-100 via-blue-50 to-indigo-100 p-6 text-slate-900 shadow-sm border border-slate-200">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-20">
              <Building2 className="h-32 w-32 text-slate-400" />
            </div>
            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2 text-slate-900">Bank Accounts</h1>
                  <p className="text-slate-600">Complete financial overview at a glance</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select
                    value={timePeriod}
                    onValueChange={(value: "today" | "yesterday" | "7d" | "30d" | "all") =>
                      setTimePeriod(value)
                    }
                  >
                    <SelectTrigger className="w-full sm:w-[180px] bg-white/80 border-slate-300 text-slate-700 backdrop-blur-sm">
                      <SelectValue placeholder="Select time period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                  {isAdmin && (
                    <div className="flex gap-2">
                      {selectedAccounts.length > 0 && (
                        <Button variant="destructive" onClick={handleDeleteSelected} className="shadow-sm">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete ({selectedAccounts.length})
                        </Button>
                      )}
                      <Dialog open={quickUpdateDialog} onOpenChange={setQuickUpdateDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="shadow-sm bg-white/80 border-slate-300 text-slate-700 hover:bg-white">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Update Balance
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="backdrop-blur-xl">
                          <DialogHeader>
                            <DialogTitle>Quick Balance Update</DialogTitle>
                            <DialogDescription>
                              Select a bank account and update its opening and closing balances
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="account-select">Select Bank Account</Label>
                              <Select value={selectedAccountId} onValueChange={handleAccountSelect}>
                                <SelectTrigger id="account-select">
                                  <SelectValue placeholder="Choose a bank account" />
                                </SelectTrigger>
                                <SelectContent>
                                  {bankAccounts?.map(account => (
                                    <SelectItem key={account.id} value={account.id.toString()}>
                                      {account.accountHolderName} - {account.bankName} ({account.accountNumber})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {selectedAccountId && (
                              <>
                                <div className="space-y-2">
                                  <Label htmlFor="quick-opening">Opening Balance</Label>
                                  <Input
                                    id="quick-opening"
                                    type="number"
                                    step="0.01"
                                    placeholder="Enter opening balance"
                                    value={quickUpdateForm.openingBalance}
                                    onChange={e => setQuickUpdateForm({ ...quickUpdateForm, openingBalance: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="quick-closing">Closing Balance</Label>
                                  <Input
                                    id="quick-closing"
                                    type="number"
                                    step="0.01"
                                    placeholder="Enter closing balance"
                                    value={quickUpdateForm.closingBalance}
                                    onChange={e => setQuickUpdateForm({ ...quickUpdateForm, closingBalance: e.target.value })}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setQuickUpdateDialog(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleQuickUpdate} disabled={quickUpdateAccount.isPending}>
                              {quickUpdateAccount.isPending ? "Updating..." : "Update Balance"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="shadow-sm bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-700 border border-blue-200">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Account
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="backdrop-blur-xl max-w-2xl">
                          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-8 text-slate-900 border border-slate-200">
                            <div className="absolute top-0 right-0 -mt-8 -mr-8 opacity-20">
                              <Building2 className="h-40 w-40 text-slate-400" />
                            </div>
                            <div className="relative z-10">
                              <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-white/80 rounded-2xl backdrop-blur-sm border border-slate-200">
                                  <Plus className="h-8 w-8 text-slate-600" />
                                </div>
                                <div>
                                  <h2 className="text-2xl font-bold text-slate-900">Add New Bank Account</h2>
                                  <p className="text-slate-600">Register a new bank account for tracking</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <Label htmlFor="accountHolderName" className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                  <User className="h-4 w-4 text-slate-600" />
                                  Account Holder Name
                                </Label>
                                <Input
                                  id="accountHolderName"
                                  placeholder="John Doe"
                                  value={formData.accountHolderName}
                                  onChange={e => setFormData({ ...formData, accountHolderName: e.target.value })}
                                  className="h-12 border-gray-200 dark:border-gray-600 focus:border-slate-500 focus:ring-slate-500/20"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="bankName" className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-slate-600" />
                                  Bank Name
                                </Label>
                                <Input
                                  id="bankName"
                                  placeholder="State Bank of India"
                                  value={formData.bankName}
                                  onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                                  className="h-12 border-gray-200 dark:border-gray-600 focus:border-slate-500 focus:ring-slate-500/20"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="accountNumber" className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-slate-600" />
                                Account Number
                              </Label>
                              <Input
                                id="accountNumber"
                                placeholder="1234567890123"
                                value={formData.accountNumber}
                                onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                                className="h-12 border-gray-200 dark:border-gray-600 focus:border-slate-500 focus:ring-slate-500/20 font-mono"
                              />
                            </div>

                            <div className="space-y-3">
                              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Settings className="h-4 w-4 text-slate-600" />
                                Account Type
                              </Label>
                              <div className="grid grid-cols-2 gap-4">
                                <div 
                                  className={cn(
                                    "relative cursor-pointer rounded-xl border-2 p-4 transition-all",
                                    formData.isDeposit 
                                      ? "border-slate-500 bg-slate-50 dark:bg-slate-950/30" 
                                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                                  )}
                                  onClick={() => setFormData({ ...formData, isDeposit: !formData.isDeposit })}
                                >
                                  <div className="flex items-center space-x-3">
                                    <Checkbox
                                      checked={formData.isDeposit}
                                      className="h-5 w-5"
                                    />
                                    <div>
                                      <p className="font-medium text-gray-900 dark:text-gray-100">Deposit Account</p>
                                      <p className="text-sm text-gray-500 dark:text-gray-400">For receiving funds</p>
                                    </div>
                                  </div>
                                </div>
                                
                                <div 
                                  className={cn(
                                    "relative cursor-pointer rounded-xl border-2 p-4 transition-all",
                                    formData.isWithdrawal 
                                      ? "border-slate-500 bg-slate-50 dark:bg-slate-950/30" 
                                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                                  )}
                                  onClick={() => setFormData({ ...formData, isWithdrawal: !formData.isWithdrawal })}
                                >
                                  <div className="flex items-center space-x-3">
                                    <Checkbox
                                      checked={formData.isWithdrawal}
                                      className="h-5 w-5"
                                    />
                                    <div>
                                      <p className="font-medium text-gray-900 dark:text-gray-100">Withdrawal Account</p>
                                      <p className="text-sm text-gray-500 dark:text-gray-400">For sending funds</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="openingBalance" className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-slate-600" />
                                Opening Balance
                              </Label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₹</span>
                                <Input
                                  id="openingBalance"
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={formData.openingBalance}
                                  onChange={e => setFormData({ ...formData, openingBalance: e.target.value })}
                                  className="h-12 pl-10 border-gray-200 dark:border-gray-600 focus:border-slate-500 focus:ring-slate-500/20 font-mono"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-950/30 rounded-xl">
                              <Info className="h-5 w-5 text-slate-600" />
                              <p className="text-sm text-slate-900 dark:text-slate-100">
                                All fields marked with an icon are required. Account type can be both deposit and withdrawal.
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex justify-end gap-3 px-8 pb-8">
                            <Button 
                              variant="outline" 
                              onClick={() => setIsCreateDialogOpen(false)}
                              className="h-12 px-8 border-gray-300 dark:border-gray-600"
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleCreateBankAccount} 
                              disabled={createBankAccount.isPending}
                              className="h-12 px-8 bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 shadow-lg"
                            >
                              {createBankAccount.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Adding Account...
                                </>
                              ) : (
                                <>
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add Account
                                </>
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Inline Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-slate-200">
                  <p className="text-slate-600 text-xs mb-1">Total Accounts</p>
                  <p className="text-2xl font-bold text-slate-900">{activeAccounts}</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-slate-200">
                  <p className="text-slate-600 text-xs mb-1">Opening Balance</p>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalOpeningBalance)}</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-slate-200">
                  <p className="text-slate-600 text-xs mb-1">Closing Balance</p>
                  <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalClosingBalance)}</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-slate-200">
                  <p className="text-slate-600 text-xs mb-1">Total Charges</p>
                  <p className="text-2xl font-bold text-amber-700">{formatCurrency(totalCharges)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* View Toggle and Actions */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("cards")}
                className={cn(
                  "h-8 px-3",
                  viewMode === "cards" 
                    ? "bg-blue-100 text-blue-700 hover:bg-blue-200" 
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <Layers className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className={cn(
                  "h-8 px-3",
                  viewMode === "table" 
                    ? "bg-blue-100 text-blue-700 hover:bg-blue-200" 
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Bank Accounts - New Design */}
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : !bankAccounts || bankAccounts.length === 0 ? (
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-xl shadow-sm border border-slate-200 p-16 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-100 to-blue-100 rounded-full mb-6 shadow-sm border border-slate-200">
                <Building2 className="h-10 w-10 text-slate-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">No bank accounts found</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg">Add your first bank account to get started</p>
              {isAdmin && (
                <Button onClick={() => setIsCreateDialogOpen(true)} size="lg" className="bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-700 border border-blue-200 shadow-sm">
                  <Plus className="mr-2 h-5 w-5" />
                  Add First Account
                </Button>
              )}
            </div>
          ) : (
            <>
              {viewMode === "cards" ? (
              /* Cards View */
              <div className="space-y-6">
                {/* Account Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {bankAccounts.map(account => {
                    const netBalance = account.closingBalance - account.totalCharges;
                    const isProfit = netBalance > account.openingBalance;
                    const isLoss = netBalance < account.openingBalance;
                    const profitPercentage = account.openingBalance > 0 ? ((netBalance - account.openingBalance) / account.openingBalance * 100).toFixed(2) : '0.00';
                    
                    return (
                      <div key={account.id} className="group relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
                        <div className="relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300 overflow-hidden">
                          {/* Account Header */}
                          <div className="relative p-6 pb-0">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                {isAdmin && (
                                  <Checkbox
                                    checked={selectedAccounts.includes(account.id)}
                                    onCheckedChange={() => handleSelectAccount(account.id)}
                                    className="h-5 w-5"
                                  />
                                )}
                                <div className="p-3 bg-gradient-to-br from-slate-100 to-blue-100 rounded-xl shadow-sm border border-slate-200">
                                  <CreditCard className="h-6 w-6 text-slate-600" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                    {account.accountHolderName}
                                  </h3>
                                  <p className="text-sm text-slate-600 dark:text-slate-400">{account.bankName}</p>
                                </div>
                              </div>
                              <Badge 
                                variant={account.isActive === 1 ? "default" : "secondary"}
                                className={cn(
                                  "px-3 py-1 text-sm font-semibold",
                                  account.isActive === 1 
                                    ? "bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border border-emerald-300 shadow-sm" 
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200"
                                )}
                              >
                                {account.isActive === 1 ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            
                            {/* Account Number and Type */}
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Account Number</p>
                                <p className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">{account.accountNumber}</p>
                              </div>
                              {account.accountType === 'Both' ? (
                                <div className="flex items-center gap-1">
                                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs px-2 py-0.5">D</Badge>
                                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs px-2 py-0.5">W</Badge>
                                </div>
                              ) : (
                                <Badge variant="outline" className="text-sm font-medium border-slate-200 text-slate-700">
                                  {account.accountType}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Balance Overview */}
                          <div className="px-6 py-4 bg-gradient-to-b from-transparent to-slate-50/50 dark:to-slate-900/50">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Opening</p>
                                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(account.openingBalance)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Closing</p>
                                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(account.closingBalance)}</p>
                              </div>
                            </div>
                            
                            {/* Performance Indicator */}
                            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Net Balance</p>
                                  <div className="flex items-center gap-2">
                                    {isProfit ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : isLoss ? <TrendingDown className="h-4 w-4 text-amber-600" /> : null}
                                    <p className={cn(
                                      "text-lg font-bold",
                                      isProfit ? "text-emerald-600" : isLoss ? "text-amber-600" : "text-slate-600"
                                    )}>
                                      {formatCurrency(netBalance)}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">ROI</p>
                                  <p className={cn(
                                    "text-lg font-bold",
                                    isProfit ? "text-emerald-600" : isLoss ? "text-amber-600" : "text-slate-600"
                                  )}>
                                    {isProfit ? '+' : ''}{profitPercentage}%
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Quick Stats */}
                          <div className="px-6 py-4 grid grid-cols-3 gap-4 border-t border-slate-200/20 dark:border-slate-700/20">
                            <div className="text-center">
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Deposits</p>
                              <TotalDeposits bankName={account.bankName} accountNumber={account.accountNumber} />
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Withdrawals</p>
                              <TotalWithdrawals bankName={account.bankName} accountNumber={account.accountNumber} />
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Charges</p>
                              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{formatCurrency(account.totalCharges)}</p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          {isAdmin && (
                            <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200/20 dark:border-slate-700/20">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setFeesDialog({ open: true, account })}
                                  className="hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600"
                                >
                                  <Settings className="mr-2 h-4 w-4" />
                                  Fees
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditClick(account)}
                                  className="hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600"
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Table View */
              <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50 border-b border-slate-200">
                      <tr>
                        {isAdmin && (
                          <th className="w-12 px-6 py-4 text-center">
                            <Checkbox
                              checked={selectedAccounts.length === bankAccounts.length && bankAccounts.length > 0}
                              onCheckedChange={handleSelectAll}
                            />
                          </th>
                        )}
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-normal">Account Holder</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-normal">Bank Name</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-normal">Account Number</th>
                        <th className="px-5 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-normal">Type</th>
                        <th className="px-5 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-normal">Opening Balance</th>
                        <th className="px-5 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-normal">Closing Balance</th>
                        <th className="px-5 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-normal">Net Balance</th>
                        <th className="px-5 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-normal">ROI</th>
                        <th className="px-5 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-normal">Total Deposits</th>
                        <th className="px-5 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-normal">Total Withdrawals</th>
                        <th className="px-5 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-normal">Total Charges</th>
                        <th className="px-5 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-normal">Status</th>
                        {isAdmin && (
                          <th className="px-5 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-normal">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bankAccounts.map(account => {
                        const netBalance = account.closingBalance - account.totalCharges;
                        const isProfit = netBalance > account.openingBalance;
                        const isLoss = netBalance < account.openingBalance;
                        const profitPercentage = account.openingBalance > 0 ? ((netBalance - account.openingBalance) / account.openingBalance * 100).toFixed(2) : '0.00';
                        
                        return (
                          <tr key={account.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                            {isAdmin && (
                              <td className="px-6 py-4 text-center">
                                <Checkbox
                                  checked={selectedAccounts.includes(account.id)}
                                  onCheckedChange={() => handleSelectAccount(account.id)}
                                />
                              </td>
                            )}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-slate-100 to-blue-100 rounded-lg">
                                  <CreditCard className="h-4 w-4 text-slate-600" />
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900">{account.accountHolderName}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-slate-700">{account.bankName}</td>
                            <td className="px-5 py-4">
                              <p className="font-mono text-sm text-slate-700">{account.accountNumber}</p>
                            </td>
                            <td className="px-5 py-4 text-center">
                              {account.accountType === 'Both' ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs px-2 py-0.5">D</Badge>
                                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs px-2 py-0.5">W</Badge>
                                </div>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  {account.accountType}
                                </Badge>
                              )}
                            </td>
                            <td className="px-5 py-4 text-center">
                              <p className="font-semibold text-slate-900">{formatCurrency(account.openingBalance)}</p>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <p className="font-semibold text-emerald-700">{formatCurrency(account.closingBalance)}</p>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {isProfit ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : isLoss ? <TrendingDown className="h-4 w-4 text-amber-600" /> : null}
                                <p className={cn(
                                  "font-semibold",
                                  isProfit ? "text-emerald-600" : isLoss ? "text-amber-600" : "text-slate-600"
                                )}>
                                  {formatCurrency(netBalance)}
                                </p>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <p className={cn(
                                "font-semibold",
                                isProfit ? "text-emerald-600" : isLoss ? "text-amber-600" : "text-slate-600"
                              )}>
                                {isProfit ? '+' : ''}{profitPercentage}%
                              </p>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <TotalDeposits bankName={account.bankName} accountNumber={account.accountNumber} />
                            </td>
                            <td className="px-5 py-4 text-center">
                              <TotalWithdrawals bankName={account.bankName} accountNumber={account.accountNumber} />
                            </td>
                            <td className="px-5 py-4 text-center">
                              <p className="font-semibold text-amber-700">{formatCurrency(account.totalCharges)}</p>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <Badge 
                                variant={account.isActive === 1 ? "default" : "secondary"}
                                className={cn(
                                  "text-xs",
                                  account.isActive === 1 
                                    ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                )}
                              >
                                {account.isActive === 1 ? "Active" : "Inactive"}
                              </Badge>
                            </td>
                            {isAdmin && (
                              <td className="px-5 py-4">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setFeesDialog({ open: true, account })}
                                    className="h-8 w-8 p-0 hover:bg-slate-100"
                                  >
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditClick(account)}
                                    className="h-8 w-8 p-0 hover:bg-slate-100"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            </>
          )}
        </div>
      </div>

      {/* Edit Bank Account Dialog */}
      <Dialog
        open={editDialog.open}
        onOpenChange={open => setEditDialog({ open, account: null })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Bank Account</DialogTitle>
            <DialogDescription>
              Update bank account details and balances
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-accountHolderName">
                Account Holder Name *
              </Label>
              <Input
                id="edit-accountHolderName"
                placeholder="Enter account holder name"
                value={editForm.accountHolderName}
                onChange={e =>
                  setEditForm({
                    ...editForm,
                    accountHolderName: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-accountNumber">Account Number *</Label>
              <Input
                id="edit-accountNumber"
                placeholder="Enter account number"
                value={editForm.accountNumber}
                onChange={e =>
                  setEditForm({ ...editForm, accountNumber: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-bankName">Bank Name *</Label>
              <Input
                id="edit-bankName"
                placeholder="Enter bank name"
                value={editForm.bankName}
                onChange={e =>
                  setEditForm({ ...editForm, bankName: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Account Type *</Label>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-deposit"
                    checked={editForm.isDeposit}
                    onCheckedChange={(checked) =>
                      setEditForm({ ...editForm, isDeposit: checked as boolean })
                    }
                  />
                  <Label htmlFor="edit-deposit" className="text-sm font-normal">
                    Deposit
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-withdrawal"
                    checked={editForm.isWithdrawal}
                    onCheckedChange={(checked) =>
                      setEditForm({ ...editForm, isWithdrawal: checked as boolean })
                    }
                  />
                  <Label htmlFor="edit-withdrawal" className="text-sm font-normal">
                    Withdrawal
                  </Label>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-openingBalance">Opening Balance</Label>
              <Input
                id="edit-openingBalance"
                type="number"
                step="0.01"
                placeholder="Enter opening balance"
                value={editForm.openingBalance}
                onChange={e =>
                  setEditForm({ ...editForm, openingBalance: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-closingBalance">Closing Balance</Label>
              <Input
                id="edit-closingBalance"
                type="number"
                step="0.01"
                placeholder="Enter closing balance"
                value={editForm.closingBalance}
                onChange={e =>
                  setEditForm({ ...editForm, closingBalance: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-totalCharges">Total Charges</Label>
              <Input
                id="edit-totalCharges"
                type="number"
                step="0.01"
                placeholder="Enter total charges"
                value={editForm.totalCharges}
                onChange={e =>
                  setEditForm({ ...editForm, totalCharges: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog({ open: false, account: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateAccount}
              disabled={updateAccount.isPending}
            >
              {updateAccount.isPending ? "Updating..." : "Update Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bank Accounts</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedAccounts.length} bank
              account(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteAccounts.isPending}
            >
              {deleteAccounts.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Account Fees Dialog */}
      <BankAccountFeesDialog
        open={feesDialog.open}
        onOpenChange={open => setFeesDialog({ open, account: null })}
        account={feesDialog.account}
        onSuccess={refetch}
      />
    </DashboardLayout>
  );

}
