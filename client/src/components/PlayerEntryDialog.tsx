import { useState, useEffect, useMemo } from "react";
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
import { UserPlus, UserCog } from "lucide-react";

export function PlayerEntryDialog() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"add" | "update">("add");

  const utils = trpc.useUtils();
  const { data: panels } = trpc.panels.list.useQuery();
  const { data: players } = trpc.players.list.useQuery();
  const { data: allBankAccounts } = trpc.bankAccounts.list.useQuery();

  // Filter bank accounts for deposits (initial deposit is a deposit transaction)
  const bankAccounts = allBankAccounts?.filter(
    account => account.accountType === "Deposit" || account.accountType === "Both"
  );

  // Add player form state
  const [addForm, setAddForm] = useState({
    userId: "",
    name: "",
    panelName: "",
    openingBalance: "",
    utr: "",
    bankName: "",
    bonusPercentage: "0",
  });

  // Calculate bonus points automatically
  const calculatedBonus = useMemo(() => {
    const amt = parseFloat(addForm.openingBalance) || 0;
    const percentage = parseFloat(addForm.bonusPercentage) || 0;
    return Math.round(amt * (percentage / 100));
  }, [addForm.openingBalance, addForm.bonusPercentage]);

  // Update player form state
  const [updateForm, setUpdateForm] = useState({
    selectedPlayerId: "",
    userId: "",
    name: "",
    panelName: "",
  });

  const createPlayer = trpc.players.create.useMutation({
    onSuccess: () => {
      toast.success("Player created successfully");
      utils.players.list.invalidate();
      resetAddForm();
      setOpen(false);
    },
    onError: error => {
      toast.error(`Failed to create player: ${error.message}`);
    },
  });

  const updatePlayer = trpc.players.update.useMutation({
    onSuccess: () => {
      toast.success("Player updated successfully");
      utils.players.list.invalidate();
      resetUpdateForm();
      setOpen(false);
    },
    onError: error => {
      toast.error(`Failed to update player: ${error.message}`);
    },
  });

  const resetAddForm = () => {
    setAddForm({
      userId: "",
      name: "",
      panelName: "",
      openingBalance: "",
      utr: "",
      bankName: "",
      bonusPercentage: "0",
    });
  };

  const resetUpdateForm = () => {
    setUpdateForm({
      selectedPlayerId: "",
      userId: "",
      name: "",
      panelName: "",
    });
  };

  // Load player data when selected for update
  useEffect(() => {
    if (updateForm.selectedPlayerId && players) {
      const player = players.find(
        p => p.id.toString() === updateForm.selectedPlayerId
      );
      if (player) {
        setUpdateForm({
          ...updateForm,
          userId: player.userId,
          name: player.name || "",
          panelName: player.panelName,
        });
      }
    }
  }, [updateForm.selectedPlayerId, players]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!addForm.userId || !addForm.panelName) {
      toast.error("Please fill in all required fields");
      return;
    }

    // If opening balance is provided, UTR and bank account are required
    if (addForm.openingBalance && parseFloat(addForm.openingBalance) > 0) {
      if (!addForm.utr) {
        toast.error("UTR number is required when adding opening balance");
        return;
      }
      if (!addForm.bankName) {
        toast.error("Bank account selection is required when adding opening balance");
        return;
      }
    }

    createPlayer.mutate({
      userId: addForm.userId,
      name: addForm.name || undefined,
      panelName: addForm.panelName,
      openingBalance: addForm.openingBalance
        ? parseFloat(addForm.openingBalance)
        : undefined,
      utr: addForm.utr || undefined,
      accountNumber: addForm.bankName || undefined,
      bankName: bankAccounts?.find(acc => acc.accountNumber === addForm.bankName)?.bankName,
      bonusPoints: calculatedBonus,
    });
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !updateForm.selectedPlayerId ||
      !updateForm.userId ||
      !updateForm.panelName
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    updatePlayer.mutate({
      id: parseInt(updateForm.selectedPlayerId),
      userId: updateForm.userId,
      name: updateForm.name || undefined,
      panelName: updateForm.panelName,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-md z-50 bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-700 border border-blue-200"
        >
          <UserPlus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-slate-100 via-blue-50 to-indigo-100 p-6 border-b border-slate-200">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-20">
            <UserPlus className="h-24 w-24 text-slate-400" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/80 rounded-lg backdrop-blur-sm border border-slate-200">
                <UserPlus className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-slate-900">Player Entry</DialogTitle>
                <DialogDescription className="text-slate-600 mt-1">
                  Add new players or update existing player information
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={v => setActiveTab(v as "add" | "update")}
          className="px-6 pt-4"
        >
          <TabsList className="grid w-full grid-cols-2 bg-slate-100 border border-slate-200">
            <TabsTrigger value="add" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-700 text-slate-600">
              <UserPlus className="h-4 w-4" />
              Add Player
            </TabsTrigger>
            <TabsTrigger value="update" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-700 text-slate-600">
              <UserCog className="h-4 w-4" />
              Update Player
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="space-y-4 mt-4 px-6 pb-6">
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="add-userId" className="text-slate-700 font-medium">Player User ID *</Label>
                <Input
                  id="add-userId"
                  placeholder="Enter unique user ID"
                  value={addForm.userId}
                  onChange={e =>
                    setAddForm({ ...addForm, userId: e.target.value })
                  }
                  className="border-slate-200 focus:border-blue-300 focus:ring-blue-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-name" className="text-slate-700 font-medium">Player Name</Label>
                <Input
                  id="add-name"
                  placeholder="Enter player name (optional)"
                  value={addForm.name}
                  onChange={e =>
                    setAddForm({ ...addForm, name: e.target.value })
                  }
                  className="border-slate-200 focus:border-blue-300 focus:ring-blue-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-panel" className="text-slate-700 font-medium">Panel *</Label>
                <Select
                  value={addForm.panelName}
                  onValueChange={value =>
                    setAddForm({ ...addForm, panelName: value })
                  }
                >
                  <SelectTrigger id="add-panel" className="border-slate-200 focus:border-blue-300 focus:ring-blue-50">
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

              <div className="border-t border-slate-200 pt-4 space-y-4">
                <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <span className="inline-block w-1 h-4 bg-blue-200 rounded"></span>
                  Initial Deposit
                </p>

                <div className="space-y-2">
                  <Label htmlFor="add-balance" className="text-slate-700 font-medium">Opening Balance</Label>
                  <Input
                    id="add-balance"
                    type="number"
                    step="0.01"
                    placeholder="Enter opening balance"
                    value={addForm.openingBalance}
                    onChange={e =>
                      setAddForm({ ...addForm, openingBalance: e.target.value })
                    }
                    className="border-slate-200 focus:border-blue-300 focus:ring-blue-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-bonus" className="text-slate-700 font-medium">Bonus Percentage</Label>
                  <Select
                    value={addForm.bonusPercentage}
                    onValueChange={value =>
                      setAddForm({ ...addForm, bonusPercentage: value })
                    }
                  >
                    <SelectTrigger id="add-bonus" className="border-slate-200 focus:border-blue-300 focus:ring-blue-50">
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
                    <p className="text-sm text-slate-500 bg-slate-50 p-2 rounded border border-slate-200">
                      Bonus: ₹{calculatedBonus.toLocaleString()} | Total with bonus:
                      ₹{(parseFloat(addForm.openingBalance) + calculatedBonus).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-utr" className="text-slate-700 font-medium">UTR Number *</Label>
                  <Input
                    id="add-utr"
                    placeholder="Enter UTR number"
                    value={addForm.utr}
                    onChange={e =>
                      setAddForm({ ...addForm, utr: e.target.value })
                    }
                    required={!!(addForm.openingBalance && parseFloat(addForm.openingBalance) > 0)}
                    className="border-slate-200 focus:border-blue-300 focus:ring-blue-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-bank" className="text-slate-700 font-medium">Bank Account *</Label>
                  <Select
                    value={addForm.bankName}
                    onValueChange={value =>
                      setAddForm({ ...addForm, bankName: value })
                    }
                    required={!!(addForm.openingBalance && parseFloat(addForm.openingBalance) > 0)}
                  >
                    <SelectTrigger id="add-bank" className="border-slate-200 focus:border-blue-300 focus:ring-blue-50">
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts?.map(account => (
                        <SelectItem key={account.id} value={account.accountNumber}>
                          {account.accountHolderName} - {account.bankName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-700 border border-blue-200 shadow-sm hover:shadow-md"
                  disabled={createPlayer.isPending}
                >
                  {createPlayer.isPending ? "Creating..." : "Create Player"}
                </Button>
                <Button type="button" variant="outline" onClick={resetAddForm} className="border-slate-300 text-slate-600 hover:bg-slate-50">
                  Clear
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="update" className="space-y-4 mt-4 px-6 pb-6">
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="update-select" className="text-slate-700 font-medium">Select Player *</Label>
                <Select
                  value={updateForm.selectedPlayerId}
                  onValueChange={value =>
                    setUpdateForm({ ...updateForm, selectedPlayerId: value })
                  }
                >
                  <SelectTrigger id="update-select" className="border-slate-200 focus:border-blue-300 focus:ring-blue-50">
                    <SelectValue placeholder="Select player to update" />
                  </SelectTrigger>
                  <SelectContent>
                    {players?.map(player => (
                      <SelectItem key={player.id} value={player.id.toString()}>
                        {player.userId} {player.name ? `(${player.name})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {updateForm.selectedPlayerId && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="update-userId" className="text-slate-700 font-medium">Player User ID *</Label>
                    <Input
                      id="update-userId"
                      placeholder="Enter unique user ID"
                      value={updateForm.userId}
                      onChange={e =>
                        setUpdateForm({ ...updateForm, userId: e.target.value })
                      }
                      className="border-slate-200 focus:border-blue-300 focus:ring-blue-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="update-name" className="text-slate-700 font-medium">Player Name</Label>
                    <Input
                      id="update-name"
                      placeholder="Enter player name (optional)"
                      value={updateForm.name}
                      onChange={e =>
                        setUpdateForm({ ...updateForm, name: e.target.value })
                      }
                      className="border-slate-200 focus:border-blue-300 focus:ring-blue-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="update-panel" className="text-slate-700 font-medium">Panel *</Label>
                    <Select
                      value={updateForm.panelName}
                      onValueChange={value =>
                        setUpdateForm({ ...updateForm, panelName: value })
                      }
                    >
                      <SelectTrigger id="update-panel" className="border-slate-200 focus:border-blue-300 focus:ring-blue-50">
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

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-700 border border-blue-200 shadow-sm hover:shadow-md"
                      disabled={updatePlayer.isPending}
                    >
                      {updatePlayer.isPending ? "Updating..." : "Update Player"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetUpdateForm}
                      className="border-slate-300 text-slate-600 hover:bg-slate-50"
                    >
                      Clear
                    </Button>
                  </div>
                </>
              )}
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
