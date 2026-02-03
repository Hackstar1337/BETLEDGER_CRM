import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { trpc } from "@/lib/trpc";
import { AlertCircle, TrendingDown, TrendingUp, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type TransactionCategory = "deposit" | "withdrawal";
type TransactionFlag = "extra" | "wrong";

export default function ExtraWrongTransactions() {
  const { data: deposits, isLoading: depositsLoading } =
    trpc.deposits.list.useQuery();
  const { data: withdrawals, isLoading: withdrawalsLoading } =
    trpc.withdrawals.list.useQuery();
  const { data: players } = trpc.players.list.useQuery();
  const { data: panels } = trpc.panels.list.useQuery();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [transactionCategory, setTransactionCategory] =
    useState<TransactionCategory>("deposit");
  const [form, setForm] = useState({
    userId: "",
    amount: "",
    utr: "",
    bankName: "",
    panelName: "",
    transactionFlag: "extra" as TransactionFlag,
  });

  const utils = trpc.useUtils();
  const createDeposit = trpc.deposits.create.useMutation({
    onSuccess: () => {
      toast.success("Transaction added successfully");
      utils.deposits.list.invalidate();
      setDialogOpen(false);
      resetForm();
    },
    onError: error => {
      toast.error(error.message || "Failed to add transaction");
    },
  });

  const createWithdrawal = trpc.withdrawals.create.useMutation({
    onSuccess: () => {
      toast.success("Transaction added successfully");
      utils.withdrawals.list.invalidate();
      setDialogOpen(false);
      resetForm();
    },
    onError: error => {
      toast.error(error.message || "Failed to add transaction");
    },
  });

  const resetForm = () => {
    setForm({
      userId: "",
      amount: "",
      utr: "",
      bankName: "",
      panelName: "",
      transactionFlag: "extra",
    });
  };

  const openDialog = (category: TransactionCategory) => {
    setTransactionCategory(category);
    resetForm();
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.userId || !form.amount) {
      toast.error("User ID and Amount are required");
      return;
    }

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (transactionCategory === "deposit") {
      createDeposit.mutate({
        userId: form.userId,
        amount,
        panelName: form.panelName,
        depositDate: new Date(),
        utr: form.utr || undefined,
        bankName: form.bankName || undefined,
        bonusPoints: 0,
        isExtraDeposit: form.transactionFlag === "extra" ? 1 : 0,
        isWrongDeposit: form.transactionFlag === "wrong" ? 1 : 0,
      });
    } else {
      createWithdrawal.mutate({
        userId: form.userId,
        amount,
        panelName: form.panelName,
        withdrawalDate: new Date(),
        utr: form.utr || undefined,
        bankName: form.bankName || undefined,
        isExtraWithdrawal: form.transactionFlag === "extra" ? 1 : 0,
        isWrongWithdrawal: form.transactionFlag === "wrong" ? 1 : 0,
      });
    }
  };

  // Filter for extra/wrong transactions
  const extraWrongDeposits =
    deposits?.filter(d => d.isExtraDeposit === 1 || d.isWrongDeposit === 1) ||
    [];
  const extraWrongWithdrawals =
    withdrawals?.filter(
      w => w.isExtraWithdrawal === 1 || w.isWrongWithdrawal === 1
    ) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getDialogTitle = () => {
    if (transactionCategory === "deposit") {
      return "Add Deposit";
    } else {
      return "Add Withdrawal";
    }
  };

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
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Extra / Wrong Transactions</h1>
                  <p className="text-slate-600 text-sm">Track and manage extra deposits, wrong deposits, extra withdrawals, and wrong withdrawals</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></div>
                  <span className="text-xs text-slate-600">Special Transactions</span>
                </div>
                <div className="h-4 w-px bg-amber-300"></div>
                <span className="text-xs text-slate-600">
                  {extraWrongDeposits.length + extraWrongWithdrawals.length} total
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              onClick={() => openDialog("deposit")}
              variant="outline"
              size="sm"
              className="border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Deposit
            </Button>
            <Button
              onClick={() => openDialog("withdrawal")}
              variant="outline"
              size="sm"
              className="border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Withdrawal
            </Button>
          </div>

        {/* Summary Cards */}
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 p-4 text-amber-700 shadow-sm border border-amber-200">
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-medium text-amber-600 uppercase tracking-wider">Extra Deposits</p>
                <div className="h-6 w-6 rounded bg-white/80 backdrop-blur-sm flex items-center justify-center border border-amber-200">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-900">
                {extraWrongDeposits.filter(d => d.isExtraDeposit === 1).length}
              </p>
              <p className="text-[9px] text-amber-600 mt-1">
                {formatCurrency(
                  extraWrongDeposits
                    .filter(d => d.isExtraDeposit === 1)
                    .reduce((sum, d) => sum + d.amount, 0)
                )}
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-red-50 to-rose-50 p-4 text-red-700 shadow-sm border border-red-200">
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-medium text-red-600 uppercase tracking-wider">Wrong Deposits</p>
                <div className="h-6 w-6 rounded bg-white/80 backdrop-blur-sm flex items-center justify-center border border-red-200">
                  <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-red-900">
                {extraWrongDeposits.filter(d => d.isWrongDeposit === 1).length}
              </p>
              <p className="text-[9px] text-red-600 mt-1">
                {formatCurrency(
                  extraWrongDeposits
                    .filter(d => d.isWrongDeposit === 1)
                    .reduce((sum, d) => sum + d.amount, 0)
                )}
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 p-4 text-amber-700 shadow-sm border border-amber-200">
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-medium text-amber-600 uppercase tracking-wider">Extra Withdrawals</p>
                <div className="h-6 w-6 rounded bg-white/80 backdrop-blur-sm flex items-center justify-center border border-amber-200">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-900">
                {
                  extraWrongWithdrawals.filter(w => w.isExtraWithdrawal === 1)
                    .length
                }
              </p>
              <p className="text-[9px] text-amber-600 mt-1">
                {formatCurrency(
                  extraWrongWithdrawals
                    .filter(w => w.isExtraWithdrawal === 1)
                    .reduce((sum, w) => sum + w.amount, 0)
                )}
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-red-50 to-rose-50 p-4 text-red-700 shadow-sm border border-red-200">
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-medium text-red-600 uppercase tracking-wider">Wrong Withdrawals</p>
                <div className="h-6 w-6 rounded bg-white/80 backdrop-blur-sm flex items-center justify-center border border-red-200">
                  <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-red-900">
                {
                  extraWrongWithdrawals.filter(w => w.isWrongWithdrawal === 1)
                    .length
                }
              </p>
              <p className="text-[9px] text-red-600 mt-1">
                {formatCurrency(
                  extraWrongWithdrawals
                    .filter(w => w.isWrongWithdrawal === 1)
                    .reduce((sum, w) => sum + w.amount, 0)
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs for Deposits and Withdrawals */}
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 backdrop-blur-xl rounded-lg shadow-sm border border-slate-200">
          <div className="p-4">
            <Tabs defaultValue="deposits" className="space-y-4">
              <TabsList className="bg-slate-100 border border-slate-200">
                <TabsTrigger value="deposits" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  <TrendingUp className="h-4 w-4" />
                  Deposits
                </TabsTrigger>
                <TabsTrigger
                  value="withdrawals"
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-900"
                >
                  <TrendingDown className="h-4 w-4" />
                  Withdrawals
                </TabsTrigger>
              </TabsList>

              <TabsContent value="deposits">
                <div className="p-4 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-emerald-100 rounded-lg border border-emerald-200">
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Extra / Wrong Deposits</h3>
                      <p className="text-sm text-slate-600">All deposits marked as extra or wrong</p>
                    </div>
                  </div>
                  {depositsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="h-12 bg-slate-100 animate-pulse rounded"
                        />
                      ))}
                    </div>
                  ) : extraWrongDeposits.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 mb-4">
                        <TrendingUp className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-600">
                        No extra or wrong deposits found.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-200">
                            <TableHead className="text-slate-700 font-medium">SR. NO.</TableHead>
                            <TableHead className="text-slate-700 font-medium">Date</TableHead>
                            <TableHead className="text-slate-700 font-medium">User ID</TableHead>
                            <TableHead className="text-slate-700 font-medium">Panel</TableHead>
                            <TableHead className="text-right text-slate-700 font-medium">Amount</TableHead>
                            <TableHead className="text-slate-700 font-medium">UTR</TableHead>
                            <TableHead className="text-slate-700 font-medium">Bank Name</TableHead>
                            <TableHead className="text-slate-700 font-medium">Type</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {extraWrongDeposits.map((deposit, index) => (
                            <TableRow key={deposit.id} className="border-slate-100">
                              <TableCell className="text-slate-600">{index + 1}</TableCell>
                              <TableCell className="text-slate-600">
                                {formatDate(deposit.createdAt)}
                              </TableCell>
                              <TableCell className="font-medium text-slate-700">
                                {deposit.userId}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                  {deposit.panelName}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-semibold text-emerald-600">
                                {formatCurrency(deposit.amount)}
                              </TableCell>
                              <TableCell className="font-mono text-sm text-slate-600">
                                {deposit.utr || "-"}
                              </TableCell>
                              <TableCell className="text-slate-600">{deposit.bankName || "-"}</TableCell>
                              <TableCell>
                                {deposit.isExtraDeposit === 1 && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-amber-100 text-amber-700 border border-amber-200"
                                  >
                                    Extra Deposit
                                  </Badge>
                                )}
                                {deposit.isWrongDeposit === 1 && (
                                  <Badge variant="destructive" className="bg-red-100 text-red-700 border border-red-200">
                                    Wrong Deposit
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="withdrawals">
                <div className="p-4 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-100 rounded-lg border border-amber-200">
                      <TrendingDown className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Extra / Wrong Withdrawals</h3>
                      <p className="text-sm text-slate-600">All withdrawals marked as extra or wrong</p>
                    </div>
                  </div>
                  {withdrawalsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="h-12 bg-slate-100 animate-pulse rounded"
                        />
                      ))}
                    </div>
                  ) : extraWrongWithdrawals.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 mb-4">
                        <TrendingDown className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-600">
                        No extra or wrong withdrawals found.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-200">
                            <TableHead className="text-slate-700 font-medium">SR. NO.</TableHead>
                            <TableHead className="text-slate-700 font-medium">Date</TableHead>
                            <TableHead className="text-slate-700 font-medium">User ID</TableHead>
                            <TableHead className="text-slate-700 font-medium">Panel</TableHead>
                            <TableHead className="text-right text-slate-700 font-medium">Amount</TableHead>
                            <TableHead className="text-slate-700 font-medium">UTR</TableHead>
                            <TableHead className="text-slate-700 font-medium">Bank Name</TableHead>
                            <TableHead className="text-slate-700 font-medium">Type</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {extraWrongWithdrawals.map((withdrawal, index) => (
                            <TableRow key={withdrawal.id} className="border-slate-100">
                              <TableCell className="text-slate-600">{index + 1}</TableCell>
                              <TableCell className="text-slate-600">
                                {formatDate(withdrawal.createdAt)}
                              </TableCell>
                              <TableCell className="font-medium text-slate-700">
                                {withdrawal.userId}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                  {withdrawal.panelName}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-semibold text-amber-600">
                                {formatCurrency(withdrawal.amount)}
                              </TableCell>
                              <TableCell className="font-mono text-sm text-slate-600">
                                {withdrawal.utr || "-"}
                              </TableCell>
                              <TableCell className="text-slate-600">{withdrawal.bankName || "-"}</TableCell>
                              <TableCell>
                                {withdrawal.isExtraWithdrawal === 1 && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-amber-100 text-amber-700 border border-amber-200"
                                  >
                                    Extra Withdrawal
                                  </Badge>
                                )}
                                {withdrawal.isWrongWithdrawal === 1 && (
                                  <Badge variant="destructive" className="bg-red-100 text-red-700 border border-red-200">
                                    Wrong Withdrawal
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

      {/* Add Transaction Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg border border-amber-200">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <DialogTitle className="text-lg text-slate-900">{getDialogTitle()}</DialogTitle>
                <DialogDescription className="text-slate-600">
                  Enter transaction details to record this {transactionCategory}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="transactionFlag" className="text-sm font-medium">Transaction Type *</Label>
              <Select
                value={form.transactionFlag}
                onValueChange={(value: TransactionFlag) =>
                  setForm({ ...form, transactionFlag: value })
                }
              >
                <SelectTrigger id="transactionFlag" className="border-slate-300 focus:border-amber-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="extra">
                    Extra{" "}
                    {transactionCategory === "deposit"
                      ? "Deposit"
                      : "Withdrawal"}
                  </SelectItem>
                  <SelectItem value="wrong">
                    Wrong{" "}
                    {transactionCategory === "deposit"
                      ? "Deposit"
                      : "Withdrawal"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="userId" className="text-sm font-medium">User ID *</Label>
              <Select
                value={form.userId}
                onValueChange={value => setForm({ ...form, userId: value })}
              >
                <SelectTrigger id="userId" className="border-slate-300 focus:border-amber-300">
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent>
                  {players?.map(player => (
                    <SelectItem key={player.id} value={player.userId}>
                      {player.userId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="Enter amount"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                className="border-slate-300 focus:border-amber-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="panelName" className="text-sm font-medium">Panel *</Label>
              <Select
                value={form.panelName}
                onValueChange={(value: any) =>
                  setForm({ ...form, panelName: value })
                }
              >
                <SelectTrigger id="panelName" className="border-slate-300 focus:border-amber-300">
                  <SelectValue placeholder="Select panel" />
                </SelectTrigger>
                <SelectContent>
                  {panels?.map(panel => (
                    <SelectItem key={panel.id} value={panel.name}>
                      {panel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="utr" className="text-sm font-medium">UTR</Label>
              <Input
                id="utr"
                placeholder="Enter UTR number (optional)"
                value={form.utr}
                onChange={e => setForm({ ...form, utr: e.target.value })}
                className="border-slate-300 focus:border-amber-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankName" className="text-sm font-medium">Bank Name</Label>
              <Input
                id="bankName"
                placeholder="Enter bank name (optional)"
                value={form.bankName}
                onChange={e => setForm({ ...form, bankName: e.target.value })}
                className="border-slate-300 focus:border-amber-300"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-slate-300 text-slate-600 hover:bg-slate-50">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                (transactionCategory === "deposit" && createDeposit.isPending) ||
                (transactionCategory === "withdrawal" && createWithdrawal.isPending)
              }
              className="bg-gradient-to-r from-amber-100 to-orange-100 hover:from-amber-200 hover:to-orange-200 text-amber-700 border border-amber-200"
            >
              {(transactionCategory === "deposit" && createDeposit.isPending) ||
              (transactionCategory === "withdrawal" && createWithdrawal.isPending)
                ? "Adding..."
                : "Add Transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </DashboardLayout>
  );
}
