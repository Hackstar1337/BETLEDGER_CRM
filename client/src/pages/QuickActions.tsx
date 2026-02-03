import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function QuickActions() {
  const { data: players, isLoading } = trpc.players.list.useQuery();
  const utils = trpc.useUtils();

  const [depositDialog, setDepositDialog] = useState<{
    open: boolean;
    player: {
      id: number;
      userId: string;
      panelName: string;
      balance: string;
    } | null;
  }>({
    open: false,
    player: null,
  });

  const [withdrawalDialog, setWithdrawalDialog] = useState<{
    open: boolean;
    player: {
      id: number;
      userId: string;
      panelName: string;
      balance: string;
    } | null;
  }>({
    open: false,
    player: null,
  });

  const [depositForm, setDepositForm] = useState({
    amount: "",
    utrNumber: "",
    bankName: "",
    bonusPoints: "0",
  });

  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: "",
    utrNumber: "",
    bankName: "",
  });

  const createDeposit = trpc.deposits.create.useMutation({
    onSuccess: () => {
      toast.success("Deposit recorded successfully");
      utils.deposits.list.invalidate();
      utils.players.list.invalidate();
      utils.dashboard.overview.invalidate();
      utils.dashboard.todayStats.invalidate();
      setDepositDialog({ open: false, player: null });
      resetDepositForm();
    },
    onError: error => {
      toast.error(`Failed to record deposit: ${error.message}`);
    },
  });

  const createWithdrawal = trpc.withdrawals.create.useMutation({
    onSuccess: () => {
      toast.success("Withdrawal recorded successfully");
      utils.withdrawals.list.invalidate();
      utils.players.list.invalidate();
      utils.dashboard.overview.invalidate();
      utils.dashboard.todayStats.invalidate();
      setWithdrawalDialog({ open: false, player: null });
      resetWithdrawalForm();
    },
    onError: error => {
      toast.error(`Failed to record withdrawal: ${error.message}`);
    },
  });

  const resetDepositForm = () => {
    setDepositForm({
      amount: "",
      utrNumber: "",
      bankName: "",
      bonusPoints: "0",
    });
  };

  const resetWithdrawalForm = () => {
    setWithdrawalForm({
      amount: "",
      utrNumber: "",
      bankName: "",
    });
  };

  const handleDepositClick = (player: {
    id: number;
    userId: string;
    panelName: string;
    balance: string;
  }) => {
    setDepositDialog({ open: true, player });
    resetDepositForm();
  };

  const handleWithdrawalClick = (player: {
    id: number;
    userId: string;
    panelName: string;
    balance: string;
  }) => {
    setWithdrawalDialog({ open: true, player });
    resetWithdrawalForm();
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!depositDialog.player || !depositForm.amount) {
      toast.error("Please fill in the amount");
      return;
    }

    createDeposit.mutate({
      userId: depositDialog.player.userId,
      panelName: depositDialog.player.panelName,
      amount: parseFloat(depositForm.amount),
      utr: depositForm.utrNumber || undefined,
      bankName: depositForm.bankName || undefined,
      bonusPoints: parseFloat(depositForm.bonusPoints) || 0,
      isExtraDeposit: 0,
      isWrongDeposit: 0,
      depositDate: new Date(),
    });
  };

  const handleWithdrawalSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!withdrawalDialog.player || !withdrawalForm.amount) {
      toast.error("Please fill in the amount");
      return;
    }

    createWithdrawal.mutate({
      userId: withdrawalDialog.player.userId,
      panelName: withdrawalDialog.player.panelName,
      amount: parseFloat(withdrawalForm.amount),
      utr: withdrawalForm.utrNumber || undefined,
      bankName: withdrawalForm.bankName || undefined,
      status: "pending",
      isExtraWithdrawal: 0,
      isWrongWithdrawal: 0,
      withdrawalDate: new Date(),
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Player Entry</CardTitle>
            <CardDescription>
              View and manage player transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div
                    key={i}
                    className="h-12 bg-muted animate-pulse rounded"
                  />
                ))}
              </div>
            ) : !players || players.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No players found. Add players first to use player entry.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player Name</TableHead>
                      <TableHead>Player Balance</TableHead>
                      <TableHead>Panel Name</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {players.map(player => (
                      <TableRow key={player.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {player.name || player.userId}
                            </div>
                            <div className="text-sm text-muted-foreground font-mono">
                              {player.userId}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(parseFloat(player.balance || "0"))}
                        </TableCell>
                        <TableCell>{player.panelName}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleDepositClick(player)}
                              className="gap-1"
                            >
                              <ArrowDownCircle className="h-4 w-4" />
                              Deposit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleWithdrawalClick(player)}
                              className="gap-1"
                            >
                              <ArrowUpCircle className="h-4 w-4" />
                              Withdrawal
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Deposit Dialog */}
      <Dialog
        open={depositDialog.open}
        onOpenChange={open =>
          setDepositDialog({ open, player: depositDialog.player })
        }
      >
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Record Deposit</DialogTitle>
            <DialogDescription>
              Recording deposit for player:{" "}
              <span className="font-mono font-semibold">
                {depositDialog.player?.userId}
              </span>
              <br />
              Current Balance:{" "}
              <span className="font-semibold">
                {depositDialog.player
                  ? formatCurrency(
                      parseFloat(depositDialog.player.balance || "0")
                    )
                  : "₹0"}
              </span>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDepositSubmit} className="space-y-4 mt-4">
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
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deposit-bonus">Bonus Points</Label>
              <Input
                id="deposit-bonus"
                type="number"
                step="0.01"
                placeholder="0"
                value={depositForm.bonusPoints}
                onChange={e =>
                  setDepositForm({
                    ...depositForm,
                    bonusPoints: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deposit-utr">UTR Number</Label>
              <Input
                id="deposit-utr"
                placeholder="Enter UTR"
                value={depositForm.utrNumber}
                onChange={e =>
                  setDepositForm({ ...depositForm, utrNumber: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deposit-bank">Bank Name</Label>
              <Input
                id="deposit-bank"
                placeholder="Enter bank name"
                value={depositForm.bankName}
                onChange={e =>
                  setDepositForm({ ...depositForm, bankName: e.target.value })
                }
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setDepositDialog({ open: false, player: null })}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createDeposit.isPending}
              >
                {createDeposit.isPending ? "Recording..." : "Record Deposit"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Dialog */}
      <Dialog
        open={withdrawalDialog.open}
        onOpenChange={open =>
          setWithdrawalDialog({ open, player: withdrawalDialog.player })
        }
      >
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Record Withdrawal</DialogTitle>
            <DialogDescription>
              Recording withdrawal for player:{" "}
              <span className="font-mono font-semibold">
                {withdrawalDialog.player?.userId}
              </span>
              <br />
              Current Balance:{" "}
              <span className="font-semibold">
                {withdrawalDialog.player
                  ? formatCurrency(
                      parseFloat(withdrawalDialog.player.balance || "0")
                    )
                  : "₹0"}
              </span>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleWithdrawalSubmit} className="space-y-4 mt-4">
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
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="withdrawal-utr">UTR Number</Label>
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="withdrawal-bank">Bank Name</Label>
              <Input
                id="withdrawal-bank"
                placeholder="Enter bank name"
                value={withdrawalForm.bankName}
                onChange={e =>
                  setWithdrawalForm({
                    ...withdrawalForm,
                    bankName: e.target.value,
                  })
                }
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() =>
                  setWithdrawalDialog({ open: false, player: null })
                }
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createWithdrawal.isPending}
              >
                {createWithdrawal.isPending
                  ? "Recording..."
                  : "Record Withdrawal"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
