import { useState } from "react";
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
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { PanelPointsInfo } from "@/components/PanelPointsInfo";

interface PanelTransactionDialogProps {
  panelName: string;
}

export function PanelTransactionDialog({
  panelName,
}: PanelTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"deposit" | "withdrawal">(
    "deposit"
  );

  const utils = trpc.useUtils();
  const { data: players } = trpc.players.list.useQuery();
  const { data: allBankAccounts } = trpc.bankAccounts.list.useQuery();

  // Filter players for this panel
  const panelPlayers = players?.filter(p => p.panelName === panelName) || [];

  // Filter bank accounts by type
  const depositBankAccounts =
    allBankAccounts?.filter(account => account.accountType === "Deposit") || [];
  const withdrawalBankAccounts =
    allBankAccounts?.filter(account => account.accountType === "Withdrawal") ||
    [];

  // Deposit form state
  const [depositForm, setDepositForm] = useState({
    userId: "",
    amount: "",
    utr: "",
    selectedBankId: "",
    bonusPoints: "",
    isExtraDeposit: false,
    isWrongDeposit: false,
  });

  // Withdrawal form state
  const [withdrawalForm, setWithdrawalForm] = useState({
    userId: "",
    amount: "",
    utr: "",
    selectedBankId: "",
    paymentMethod: "",
    transactionCharge: 0,
  });

  // Get selected banks
  const selectedDepositBank = depositBankAccounts?.find(
    b => b.id === parseInt(depositForm.selectedBankId)
  );
  const selectedWithdrawalBank = withdrawalBankAccounts?.find(
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
      toast.success("Deposit created successfully");
      utils.players.list.invalidate();
      utils.deposits.list.invalidate();
      resetDepositForm();
      setOpen(false);
    },
    onError: error => {
      toast.error(`Failed to create deposit: ${error.message}`);
    },
  });

  const createWithdrawal = trpc.withdrawals.create.useMutation({
    onSuccess: () => {
      toast.success("Withdrawal created successfully");
      utils.players.list.invalidate();
      utils.withdrawals.list.invalidate();
      resetWithdrawalForm();
      setOpen(false);
    },
    onError: error => {
      toast.error(`Failed to create withdrawal: ${error.message}`);
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
      amount: "",
      utr: "",
      selectedBankId: "",
      bonusPoints: "",
      isExtraDeposit: false,
      isWrongDeposit: false,
    });
  };

  const resetWithdrawalForm = () => {
    setWithdrawalForm({
      userId: "",
      amount: "",
      utr: "",
      selectedBankId: "",
      paymentMethod: "",
      transactionCharge: 0,
    });
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!depositForm.userId || !depositForm.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!depositForm.utr) {
      toast.error("UTR number is required");
      return;
    }

    if (!depositForm.selectedBankId) {
      toast.error("Bank account selection is required");
      return;
    }

    createDeposit.mutate({
      userId: depositForm.userId,
      amount: parseInt(depositForm.amount),
      utr: depositForm.utr,
      accountNumber: selectedDepositBank?.accountNumber,
      bankName: selectedDepositBank?.bankName,
      panelName: panelName,
      bonusPoints: depositForm.bonusPoints
        ? parseInt(depositForm.bonusPoints)
        : 0,
      isExtraDeposit: depositForm.isExtraDeposit ? 1 : 0,
      isWrongDeposit: depositForm.isWrongDeposit ? 1 : 0,
      depositDate: new Date(),
    });
  };

  const handleWithdrawalSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!withdrawalForm.userId || !withdrawalForm.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!withdrawalForm.utr) {
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
      amount: parseInt(withdrawalForm.amount),
      utr: withdrawalForm.utr,
      accountNumber: selectedWithdrawalBank?.accountNumber,
      bankName: selectedWithdrawalBank?.bankName,
      panelName: panelName,
      paymentMethod: withdrawalForm.paymentMethod as "IMPS" | "RTGS" | "NEFT" | "UPI" | "PhonePe" | "GooglePay" | "Paytm",
      transactionCharge: withdrawalForm.transactionCharge,
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
          <ArrowDownCircle className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Panel Transactions - {panelName}</DialogTitle>
          <DialogDescription>
            Add deposits or withdrawals for players in this panel
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
              <PanelPointsInfo
                panelName={panelName}
                transactionType="deposit"
                amount={depositForm.amount}
                bonusPoints={depositForm.bonusPoints}
              />

              <div className="space-y-2">
                <Label htmlFor="deposit-player">Player *</Label>
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
                    {panelPlayers.map(player => (
                      <SelectItem key={player.id} value={player.userId}>
                        {player.userId} {player.name ? `(${player.name})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deposit-amount">Amount *</Label>
                <Input
                  id="deposit-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={depositForm.amount}
                  onChange={e =>
                    setDepositForm({ ...depositForm, amount: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deposit-utr">UTR Number *</Label>
                <Input
                  id="deposit-utr"
                  placeholder="Enter UTR number"
                  value={depositForm.utr}
                  onChange={e =>
                    setDepositForm({ ...depositForm, utr: e.target.value })
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
                >
                  <SelectTrigger id="deposit-bank">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {depositBankAccounts?.map(account => (
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

              <div className="space-y-2">
                <Label htmlFor="deposit-bonus">Bonus Points</Label>
                <Input
                  id="deposit-bonus"
                  type="number"
                  placeholder="Enter bonus points"
                  value={depositForm.bonusPoints}
                  onChange={e =>
                    setDepositForm({
                      ...depositForm,
                      bonusPoints: e.target.value,
                    })
                  }
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createDeposit.isPending}
                >
                  {createDeposit.isPending ? "Creating..." : "Create Deposit"}
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
              <PanelPointsInfo
                panelName={panelName}
                transactionType="withdrawal"
                amount={withdrawalForm.amount}
              />

              <div className="space-y-2">
                <Label htmlFor="withdrawal-player">Player *</Label>
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
                    {panelPlayers.map(player => (
                      <SelectItem key={player.id} value={player.userId}>
                        {player.userId} {player.name ? `(${player.name})` : ""}
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
                  placeholder="Enter amount"
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
                  placeholder="Enter UTR number"
                  value={withdrawalForm.utr}
                  onChange={e =>
                    setWithdrawalForm({
                      ...withdrawalForm,
                      utr: e.target.value,
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
                    {withdrawalBankAccounts?.map(account => (
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
                    ? "Creating..."
                    : "Create Withdrawal"}
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
