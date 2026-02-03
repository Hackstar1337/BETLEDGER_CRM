import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { toast } from "sonner";
import { PanelPointsInfo } from "@/components/PanelPointsInfo";
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  User, 
  IndianRupee, 
  Building, 
  CreditCard,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerTransactionDialogProps {
  player: any | null;
  type: "deposit" | "withdrawal" | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlayerTransactionDialog({
  player,
  type,
  open,
  onOpenChange,
}: PlayerTransactionDialogProps) {
  const utils = trpc.useUtils();
  const { data: allBankAccounts } = trpc.bankAccounts.list.useQuery();

  // Filter bank accounts based on transaction type
  const bankAccounts = allBankAccounts?.filter(account => {
    if (type === "deposit") return account.accountType === "Deposit" || account.accountType === "Both";
    if (type === "withdrawal") return account.accountType === "Withdrawal" || account.accountType === "Both";
    return true;
  });

  // Form state
  const [amount, setAmount] = useState("");
  const [utr, setUtr] = useState("");
  const [selectedBankId, setSelectedBankId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"IMPS" | "RTGS" | "NEFT" | "UPI" | "PhonePe" | "GooglePay" | "Paytm" | "">("");
  const [bonusPercentage, setBonusPercentage] = useState("0");
  const [transactionCharge, setTransactionCharge] = useState(0);

  // Calculate bonus points automatically
  const calculatedBonus = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    const percentage = parseFloat(bonusPercentage) || 0;
    return Math.round(amt * (percentage / 100));
  }, [amount, bonusPercentage]);

  // Get selected bank account details
  const selectedBank = bankAccounts?.find(
    b => b.id === parseInt(selectedBankId)
  );

  // Available payment methods for selected bank
  const paymentMethods = [
    { value: "IMPS", label: "IMPS", fee: selectedBank?.feeIMPS || 0 },
    { value: "RTGS", label: "RTGS", fee: selectedBank?.feeRTGS || 0 },
    { value: "NEFT", label: "NEFT", fee: selectedBank?.feeNEFT || 0 },
    { value: "UPI", label: "UPI", fee: selectedBank?.feeUPI || 0 },
    { value: "PhonePe", label: "PhonePe", fee: selectedBank?.feePhonePe || 0 },
    {
      value: "GooglePay",
      label: "Google Pay",
      fee: selectedBank?.feeGooglePay || 0,
    },
    { value: "Paytm", label: "Paytm", fee: selectedBank?.feePaytm || 0 },
  ].filter(pm => pm.fee !== null); // Only show methods with configured fees

  // Calculate charge when payment method or amount changes
  useEffect(() => {
    if (type === "withdrawal" && paymentMethod && selectedBank) {
      const method = paymentMethods.find(pm => pm.value === paymentMethod);
      setTransactionCharge(method?.fee || 0);
    } else {
      setTransactionCharge(0);
    }
  }, [paymentMethod, selectedBank, type]);

  // Reset form when dialog opens with new player/type
  useEffect(() => {
    if (open) {
      setAmount("");
      setUtr("");
      setSelectedBankId("");
      setPaymentMethod("");
      setBonusPercentage("0");
      setTransactionCharge(0);
    }
  }, [open, player, type]);

  const createDeposit = trpc.deposits.create.useMutation({
    onSuccess: () => {
      toast.success("Deposit created successfully");
      utils.players.list.invalidate();
      utils.deposits.list.invalidate();
      onOpenChange(false);
    },
    onError: error => {
      toast.error(`Failed to create deposit: ${error.message}`);
    },
  });

  const createWithdrawal = trpc.withdrawals.create.useMutation({
    onSuccess: () => {
      toast.success("Withdrawal created successfully");
      utils.players.list.invalidate();
      utils.withdrawals.invalidate();
      onOpenChange(false);
    },
    onError: error => {
      toast.error(`Failed to create withdrawal: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!player || !amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!utr) {
      toast.error("UTR number is required");
      return;
    }

    if (!selectedBankId) {
      toast.error("Bank account selection is required");
      return;
    }

    if (type === "deposit") {
      createDeposit.mutate({
        userId: player.userId,
        amount: parseInt(amount),
        utr: utr,
        accountNumber: selectedBank?.accountNumber,
        bankName: selectedBank?.bankName,
        panelName: player.panelName,
        bonusPoints: calculatedBonus,
        isExtraDeposit: 0,
        isWrongDeposit: 0,
        depositDate: new Date(),
      });
    } else if (type === "withdrawal") {
      if (!paymentMethod) {
        toast.error("Please select a payment method");
        return;
      }
      createWithdrawal.mutate({
        userId: player.userId,
        amount: parseInt(amount),
        utr: utr,
        accountNumber: selectedBank?.accountNumber,
        bankName: selectedBank?.bankName,
        panelName: player.panelName,
        paymentMethod,
        transactionCharge,
        withdrawalDate: new Date(),
      });
    }
  };

  if (!player || !type) return null;

  const isDeposit = type === "deposit";
  const isPending = isDeposit
    ? createDeposit.isPending
    : createWithdrawal.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden">
        {/* Header with gradient */}
        <div className={cn(
          "relative px-6 py-6 border-b border-slate-200",
          isDeposit 
            ? "bg-gradient-to-r from-emerald-100 via-emerald-50 to-emerald-100" 
            : "bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100"
        )}>
          <div className="absolute top-0 right-0 w-24 h-24 opacity-20">
            {isDeposit ? (
              <ArrowDownCircle className="h-24 w-24 text-emerald-400" />
            ) : (
              <ArrowUpCircle className="h-24 w-24 text-amber-400" />
            )}
          </div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className={cn(
                "h-12 w-12 rounded-xl backdrop-blur-sm flex items-center justify-center border",
                isDeposit ? "bg-white/80 border-emerald-200" : "bg-white/80 border-amber-200"
              )}>
                {isDeposit ? (
                  <ArrowDownCircle className="h-6 w-6 text-emerald-600" />
                ) : (
                  <ArrowUpCircle className="h-6 w-6 text-amber-600" />
                )}
              </div>
              <div>
                <DialogTitle className={cn(
                  "text-xl font-bold m-0",
                  isDeposit ? "text-emerald-900" : "text-amber-900"
                )}>
                  {isDeposit ? "Create Deposit" : "Create Withdrawal"}
                </DialogTitle>
                <DialogDescription className={cn(
                  "text-sm",
                  isDeposit ? "text-emerald-700" : "text-amber-700"
                )}>
                  {isDeposit ? "Add a deposit" : "Add a withdrawal"} for{" "}
                  {player.userId} {player.name ? `(${player.name})` : ""}
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          {/* Player Info Card */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 shadow-sm mb-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/50 to-transparent rounded-full -mr-16 -mt-16"></div>
            <div className="relative p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Player</p>
                    <p className="text-lg font-bold text-slate-900">{player.userId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-slate-400" />
                  <span className="px-3 py-1 bg-white rounded-full text-sm font-medium text-slate-700 border border-slate-200">
                    {player.panelName}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <IndianRupee className="h-4 w-4" />
                  Amount *
                </Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                  className="h-11 border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="utr" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  UTR Number *
                </Label>
                <Input
                  id="utr"
                  placeholder="Enter UTR number"
                  value={utr}
                  onChange={e => setUtr(e.target.value)}
                  required
                  className="h-11 border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Building className="h-4 w-4" />
                Bank Account *
              </Label>
              <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                <SelectTrigger id="bank" className="h-11 border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-50">
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts?.map(account => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.bankName} - {account.accountHolderName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!isDeposit && selectedBankId && (
              <div className="space-y-2">
                <Label htmlFor="payment-method" className="text-sm font-medium text-slate-700">Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as typeof paymentMethod)}>
                  <SelectTrigger id="payment-method" className="h-11 border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-50">
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

            {!isDeposit && transactionCharge > 0 && (
              <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-amber-900">
                        Transaction Charge:
                      </span>
                      <span className="font-bold text-amber-600 text-lg">
                        ₹{transactionCharge}
                      </span>
                    </div>
                    <p className="text-sm text-amber-700">
                      This fee will be charged for the {paymentMethod} transaction
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isDeposit && selectedBankId && (
              <div className="space-y-2">
                <Label htmlFor="bonus" className="text-sm font-medium text-slate-700">Bonus Percentage</Label>
                <Select
                  value={bonusPercentage}
                  onValueChange={setBonusPercentage}
                >
                  <SelectTrigger id="bonus" className="h-11 border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-50">
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
                {calculatedBonus > 0 && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 mt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span className="font-medium text-emerald-900">
                        Bonus: ₹{calculatedBonus.toLocaleString()} | Total with bonus:
                        ₹{(parseFloat(amount) + calculatedBonus).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <PanelPointsInfo
              panelName={player.panelName}
              transactionType={type}
              amount={amount}
              bonusPoints={calculatedBonus.toString()}
            />

            <div className="flex gap-3 pt-4">
              <Button 
                type="submit" 
                className={cn(
                  "flex-1 h-11 font-semibold shadow-sm hover:shadow-md transition-all",
                  isDeposit 
                    ? "bg-gradient-to-r from-emerald-100 to-emerald-200 hover:from-emerald-200 hover:to-emerald-300 text-emerald-700 border border-emerald-200" 
                    : "bg-gradient-to-r from-amber-100 to-amber-200 hover:from-amber-200 hover:to-amber-300 text-amber-700 border border-amber-200"
                )} 
                disabled={isPending}
              >
                {isPending
                  ? "Creating..."
                  : isDeposit 
                    ? "Create Deposit" 
                    : "Create Withdrawal"
                }
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
