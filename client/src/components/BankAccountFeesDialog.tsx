import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface BankAccountFeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: any | null;
  onSuccess: () => void;
}

const paymentMethods = [
  { key: "feeIMPS", label: "IMPS" },
  { key: "feeRTGS", label: "RTGS" },
  { key: "feeNEFT", label: "NEFT" },
  { key: "feeUPI", label: "UPI" },
  { key: "feePhonePe", label: "PhonePe" },
  { key: "feeGooglePay", label: "Google Pay" },
  { key: "feePaytm", label: "Paytm" },
];

export function BankAccountFeesDialog({
  open,
  onOpenChange,
  account,
  onSuccess,
}: BankAccountFeesDialogProps) {
  const [fees, setFees] = useState<Record<string, string>>({});

  useEffect(() => {
    if (account) {
      const initialFees: Record<string, string> = {};
      paymentMethods.forEach(({ key }) => {
        initialFees[key] = String(account[key] || 0);
      });
      setFees(initialFees);
    }
  }, [account]);

  const updateFees = trpc.bankAccounts.updateFees.useMutation({
    onSuccess: () => {
      toast.success("Transaction fees updated successfully");
      onSuccess();
      onOpenChange(false);
    },
    onError: error => {
      toast.error(error.message || "Failed to update fees");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    const feeData: Record<string, number> = {};
    paymentMethods.forEach(({ key }) => {
      feeData[key] = parseInt(fees[key] || "0");
    });

    updateFees.mutate({
      id: account.id,
      feeIMPS: feeData.feeIMPS,
      feeRTGS: feeData.feeRTGS,
      feeNEFT: feeData.feeNEFT,
      feeUPI: feeData.feeUPI,
      feePhonePe: feeData.feePhonePe,
      feeGooglePay: feeData.feeGooglePay,
      feePaytm: feeData.feePaytm,
    });
  };

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Transaction Fees</DialogTitle>
          <DialogDescription>
            Set transaction fees for {account.bankName} ({account.accountNumber}
            )
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="text-sm text-muted-foreground mb-2">
              Enter the transaction fee (in ₹) for each payment method. These
              fees will be automatically added to withdrawals processed through
              this bank account.
            </div>
            <div className="grid grid-cols-2 gap-4">
              {paymentMethods.map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{label}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">₹</span>
                    <Input
                      id={key}
                      type="number"
                      min="0"
                      value={fees[key] || "0"}
                      onChange={e =>
                        setFees({ ...fees, [key]: e.target.value })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateFees.isPending}>
              {updateFees.isPending ? "Saving..." : "Save Fees"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
