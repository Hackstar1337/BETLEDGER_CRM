import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowDownCircle, ArrowUpCircle, User, Building, IndianRupee } from "lucide-react";
import { PlayerTransactionDialog } from "@/components/PlayerTransactionDialog";
import { cn } from "@/lib/utils";

interface PlayerActionDialogProps {
  player: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlayerActionDialog({
  player,
  open,
  onOpenChange,
}: PlayerActionDialogProps) {
  const [transactionType, setTransactionType] = useState<
    "deposit" | "withdrawal" | null
  >(null);

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  if (!player) return null;

  const balance =
    typeof player.balance === "string"
      ? parseFloat(player.balance)
      : player.balance;

  return (
    <>
      <Dialog open={open && !transactionType} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
          {/* Header with gradient */}
          <div className="relative bg-gradient-to-r from-slate-100 via-blue-50 to-indigo-100 px-6 py-6 border-b border-slate-200">
            <div className="absolute top-0 right-0 w-24 h-24 opacity-20">
              <User className="h-24 w-24 text-slate-400" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-xl bg-white/80 backdrop-blur-sm flex items-center justify-center border border-slate-200">
                  <User className="h-6 w-6 text-slate-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-slate-900 m-0">Player Actions</DialogTitle>
                  <DialogDescription className="text-slate-600 text-sm">
                    Choose an action for {player.userId}
                  </DialogDescription>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 space-y-6">
            {/* Player Info Card */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 shadow-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/50 to-transparent rounded-full -mr-16 -mt-16"></div>
              <div className="relative p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">User ID</p>
                      <p className="text-lg font-bold text-slate-900">{player.userId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <IndianRupee className="h-4 w-4 text-slate-400" />
                      <p className="text-sm font-medium text-slate-600">Balance</p>
                    </div>
                    <p
                      className={cn(
                        "text-xl font-bold tabular-nums",
                        balance >= 0 ? "text-emerald-600" : "text-amber-600"
                      )}
                    >
                      {formatCurrency(balance)}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  {player.name && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-xs font-medium text-slate-600">Name</p>
                        <p className="text-sm font-semibold text-slate-900">{player.name}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-xs font-medium text-slate-600">Panel</p>
                      <p className="text-sm font-semibold text-slate-900">{player.panelName}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => setTransactionType("deposit")}
                className="h-24 flex-col gap-3 bg-gradient-to-br from-emerald-100 to-emerald-200 hover:from-emerald-200 hover:to-emerald-300 text-emerald-700 shadow-sm hover:shadow-md transition-all duration-200 border border-emerald-200 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/50 group-hover:from-white/50 transition-all"></div>
                <div className="relative">
                  <ArrowDownCircle className="h-8 w-8" />
                  <span className="text-lg font-bold">Deposit</span>
                </div>
              </Button>
              <Button
                onClick={() => setTransactionType("withdrawal")}
                className="h-24 flex-col gap-3 bg-gradient-to-br from-amber-100 to-amber-200 hover:from-amber-200 hover:to-amber-300 text-amber-700 shadow-sm hover:shadow-md transition-all duration-200 border border-amber-200 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/50 group-hover:from-white/50 transition-all"></div>
                <div className="relative">
                  <ArrowUpCircle className="h-8 w-8" />
                  <span className="text-lg font-bold">Withdrawal</span>
                </div>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Dialog */}
      <PlayerTransactionDialog
        player={player}
        type={transactionType}
        open={transactionType !== null}
        onOpenChange={open => {
          if (!open) {
            setTransactionType(null);
            onOpenChange(false);
          }
        }}
      />
    </>
  );
}
