import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

export function QuickEntryDialog() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"deposit" | "withdrawal">(
    "deposit"
  );

  const utils = trpc.useUtils();
  const { data: panels } = trpc.panels.list.useQuery();
  const { data: players } = trpc.players.list.useQuery();
  const { data: bankAccounts } = trpc.bankAccounts.list.useQuery();

  // Deposit form state
  const [depositForm, setDepositForm] = useState({
    userId: "",
    panelName: "",
    amount: "",
    utrNumber: "",
    selectedBankId: "",
    bonusPercentage: "0",
  });

  // Calculate bonus points automatically
  const calculatedDepositBonus = useMemo(() => {
    const amount = parseFloat(depositForm.amount) || 0;
    const percentage = parseFloat(depositForm.bonusPercentage) || 0;
    return Math.round(amount * (percentage / 100));
  }, [depositForm.amount, depositForm.bonusPercentage]);

  // Withdrawal form state
  const [withdrawalForm, setWithdrawalForm] = useState({
    userId: "",
    panelName: "",
    amount: "",
    utrNumber: "",
    selectedBankId: "",
    paymentMethod: "",
    transactionCharge: 0,
  });

  // Get selected banks
  const selectedDepositBank = bankAccounts?.find(
    b => b.id === parseInt(depositForm.selectedBankId)
  );
  const selectedWithdrawalBank = bankAccounts?.find(
    b => b.id === parseInt(withdrawalForm.selectedBankId)
  );

  // Available payment methods for withdrawal
  const paymentMethods = [
    { value: "IMPS", label: "IMPS", fee: selectedWithdrawalBank?.feeIMPS || 0 },
    { value: "RTGS", label: "RTGS", fee: selectedWithdrawalBank?.feeRTGS || 0 },
    { value: "NEFT", label: "NEFT", fee: selectedWithdrawalBank?.feeNEFT || 0 },
    { value: "UPI", label: "UPI", fee: selectedWithdrawalBank?.feeUPI || 0 },
    {
      value: "PhonePe",
      label: "PhonePe",
      fee: selectedWithdrawalBank?.feePhonePe || 0,
    },
    {
      value: "GooglePay",
      label: "Google Pay",
      fee: selectedWithdrawalBank?.feeGooglePay || 0,
    },
    {
      value: "Paytm",
      label: "Paytm",
      fee: selectedWithdrawalBank?.feePaytm || 0,
    },
  ].filter(pm => pm.fee !== null);

  const createDeposit = trpc.deposits.create.useMutation({
    onSuccess: () => {
      toast.success("Deposit recorded successfully");
      utils.deposits.list.invalidate();
      utils.dashboard.overview.invalidate();
      utils.dashboard.todayStats.invalidate();
      resetDepositForm();
      setOpen(false);
    },
    onError: error => {
      toast.error(`Failed to record deposit: ${error.message}`);
    },
  });

  const createWithdrawal = trpc.withdrawals.create.useMutation({
    onSuccess: () => {
      toast.success("Withdrawal recorded successfully");
      utils.withdrawals.list.invalidate();
      utils.dashboard.overview.invalidate();
      utils.dashboard.todayStats.invalidate();
      resetWithdrawalForm();
      setOpen(false);
    },
    onError: error => {
      toast.error(`Failed to record withdrawal: ${error.message}`);
    },
  });

  // Update charge when payment method changes
  const handlePaymentMethodChange = (method: string) => {
    const selectedMethod = paymentMethods.find(pm => pm.value === method);
    setWithdrawalForm({
      ...withdrawalForm,
      paymentMethod: method,
      transactionCharge: selectedMethod?.fee || 0,
    });
  };

  const resetDepositForm = () => {
    setDepositForm({
      userId: "",
      panelName: "",
      amount: "",
      utrNumber: "",
      selectedBankId: "",
      bonusPercentage: "0",
    });
  };

  const resetWithdrawalForm = () => {
    setWithdrawalForm({
      userId: "",
      panelName: "",
      amount: "",
      utrNumber: "",
      selectedBankId: "",
      paymentMethod: "",
      transactionCharge: 0,
    });
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!depositForm.userId || !depositForm.panelName || !depositForm.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!depositForm.utrNumber) {
      toast.error("UTR number is required");
      return;
    }

    if (!depositForm.selectedBankId) {
      toast.error("Bank account selection is required");
      return;
    }

    createDeposit.mutate({
      userId: depositForm.userId,
      panelName: depositForm.panelName,
      amount: parseFloat(depositForm.amount),
      utr: depositForm.utrNumber,
      accountNumber: selectedDepositBank?.accountNumber,
      bankName: selectedDepositBank?.bankName,
      bonusPoints: calculatedDepositBonus,
      isExtraDeposit: 0,
      isWrongDeposit: 0,
      depositDate: new Date(),
    });
  };

  const handleWithdrawalSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !withdrawalForm.userId ||
      !withdrawalForm.panelName ||
      !withdrawalForm.amount
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!withdrawalForm.utrNumber) {
      toast.error("UTR number is required");
      return;
    }

    if (!withdrawalForm.selectedBankId) {
      toast.error("Bank account selection is required");
      return;
    }

    if (!withdrawalForm.paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    createWithdrawal.mutate({
      userId: withdrawalForm.userId,
      panelName: withdrawalForm.panelName,
      amount: parseFloat(withdrawalForm.amount),
      utr: withdrawalForm.utrNumber,
      accountNumber: selectedWithdrawalBank?.accountNumber,
      bankName: selectedWithdrawalBank?.bankName,
      paymentMethod: withdrawalForm.paymentMethod as "IMPS" | "RTGS" | "NEFT" | "UPI" | "PhonePe" | "GooglePay" | "Paytm",
      transactionCharge: withdrawalForm.transactionCharge,
      status: "pending",
      isExtraWithdrawal: 0,
      isWrongWithdrawal: 0,
      withdrawalDate: new Date(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Quick Entry</DialogTitle>
          <DialogDescription>
            Record deposits or withdrawals quickly without navigating through
            sections
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={v => setActiveTab(v as "deposit" | "withdrawal")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deposit" className="flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4" />
              Deposit
            </TabsTrigger>
            <TabsTrigger value="withdrawal" className="flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4" />
              Withdrawal
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="space-y-4 mt-4">
            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deposit-player">Player User ID *</Label>
                <Select
                  value={depositForm.userId}
                  onValueChange={value =>
                    setDepositForm({ ...depositForm, userId: value })
                  }
                >
                  <SelectTrigger id="deposit-player">
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
                <Label htmlFor="deposit-panel">Panel *</Label>
                <Select
                  value={depositForm.panelName}
                  onValueChange={value =>
                    setDepositForm({ ...depositForm, panelName: value })
                  }
                >
                  <SelectTrigger id="deposit-panel">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deposit-amount">Amount *</Label>
                  <Input
                    id="deposit-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={depositForm.amount}
                    onChange={e =>
                      setDepositForm({ ...depositForm, amount: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deposit-bonus">Bonus Percentage</Label>
                  <Select
                    value={depositForm.bonusPercentage}
                    onValueChange={value =>
                      setDepositForm({ ...depositForm, bonusPercentage: value })
                    }
                  >
                    <SelectTrigger id="deposit-bonus">
                      <SelectValue placeholder="Select bonus %" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0% - No Bonus</SelectItem>
                      <SelectItem value="5">5% Bonus</SelectItem>
                      <SelectItem value="10">10% Bonus</SelectItem>
                      <SelectItem value="15">15% Bonus</SelectItem>
                      <SelectItem value="20">20% Bonus</SelectItem>
                    </SelectContent>
                  </Select>
                  {calculatedDepositBonus > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Bonus: ₹{calculatedDepositBonus.toLocaleString()} | Total
                      with bonus: ₹
                      {(
                        parseFloat(depositForm.amount) + calculatedDepositBonus
                      ).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deposit-utr">UTR Number *</Label>
                <Input
                  id="deposit-utr"
                  placeholder="Enter UTR"
                  value={depositForm.utrNumber}
                  onChange={e =>
                    setDepositForm({
                      ...depositForm,
                      utrNumber: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deposit-bank">Bank Account *</Label>
                <Select
                  value={depositForm.selectedBankId}
                  onValueChange={value =>
                    setDepositForm({ ...depositForm, selectedBankId: value })
                  }
                  required
                >
                  <SelectTrigger id="deposit-bank">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts?.map(account => (
                      <SelectItem
                        key={account.id}
                        value={account.id.toString()}
                      >
                        {account.bankName} - {account.accountHolderName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createDeposit.isPending}
                >
                  {createDeposit.isPending ? "Recording..." : "Record Deposit"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetDepositForm}
                >
                  Clear
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="withdrawal" className="space-y-4 mt-4">
            <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="withdrawal-player">Player User ID *</Label>
                <Select
                  value={withdrawalForm.userId}
                  onValueChange={value =>
                    setWithdrawalForm({ ...withdrawalForm, userId: value })
                  }
                >
                  <SelectTrigger id="withdrawal-player">
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
                <Label htmlFor="withdrawal-panel">Panel *</Label>
                <Select
                  value={withdrawalForm.panelName}
                  onValueChange={value =>
                    setWithdrawalForm({ ...withdrawalForm, panelName: value })
                  }
                >
                  <SelectTrigger id="withdrawal-panel">
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
                <Label htmlFor="withdrawal-amount">Amount *</Label>
                <Input
                  id="withdrawal-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={withdrawalForm.amount}
                  onChange={e =>
                    setWithdrawalForm({
                      ...withdrawalForm,
                      amount: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="withdrawal-utr">UTR Number *</Label>
                <Input
                  id="withdrawal-utr"
                  placeholder="Enter UTR"
                  value={withdrawalForm.utrNumber}
                  onChange={e =>
                    setWithdrawalForm({
                      ...withdrawalForm,
                      utrNumber: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="withdrawal-bank">Bank Account *</Label>
                <Select
                  value={withdrawalForm.selectedBankId}
                  onValueChange={value =>
                    setWithdrawalForm({
                      ...withdrawalForm,
                      selectedBankId: value,
                      paymentMethod: "",
                      transactionCharge: 0,
                    })
                  }
                >
                  <SelectTrigger id="withdrawal-bank">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts?.map(account => (
                      <SelectItem
                        key={account.id}
                        value={account.id.toString()}
                      >
                        {account.bankName} - {account.accountHolderName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {withdrawalForm.selectedBankId && (
                <div className="space-y-2">
                  <Label htmlFor="withdrawal-payment-method">
                    Payment Method *
                  </Label>
                  <Select
                    value={withdrawalForm.paymentMethod}
                    onValueChange={handlePaymentMethodChange}
                  >
                    <SelectTrigger id="withdrawal-payment-method">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(method => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label} (Fee: ₹{method.fee})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {withdrawalForm.transactionCharge > 0 && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-orange-900">
                      Transaction Charge:
                    </span>
                    <span className="font-bold text-orange-600">
                      ₹{withdrawalForm.transactionCharge}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-orange-700">
                    This fee will be charged for the{" "}
                    {withdrawalForm.paymentMethod} transaction
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createWithdrawal.isPending}
                >
                  {createWithdrawal.isPending
                    ? "Recording..."
                    : "Record Withdrawal"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetWithdrawalForm}
                >
                  Clear
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
