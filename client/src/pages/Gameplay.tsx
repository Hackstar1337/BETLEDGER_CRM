import { trpc } from "@/lib/trpc";
import { getTimezone, formatDateForDisplay } from "@/lib/timezone";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  GamepadIcon,
  Search,
  Filter,
  ArrowUpCircle,
  ArrowDownCircle,
  User,
  Users,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";

export default function Gameplay() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPlayerFilter, setSelectedPlayerFilter] =
    useState<string>("all");
  const [formData, setFormData] = useState({
    userId: "",
    panelName: "",
    transactionType: "Win" as "Win" | "Loss",
    amount: "",
    notes: "",
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
    data: gameplayTransactions,
    isLoading,
    refetch,
  } = trpc.gameplayTransactions.list.useQuery({ timePeriod, timezone });
  const { data: players } = trpc.players.list.useQuery();
  const { data: panels } = trpc.panels.list.useQuery();
  const createGameplayTransaction =
    trpc.gameplayTransactions.create.useMutation({
      onSuccess: () => {
        toast.success("Gameplay transaction recorded successfully");
        setIsCreateDialogOpen(false);
        setFormData({
          userId: "",
          panelName: "",
          transactionType: "Win",
          amount: "",
          notes: "",
        });
        refetch();
      },
      onError: error => {
        toast.error(error.message);
      },
    });

  const handleCreateTransaction = () => {
    if (!formData.userId || !formData.panelName || !formData.amount) {
      toast.error("User ID, Panel, and Amount are required");
      return;
    }

    createGameplayTransaction.mutate({
      userId: formData.userId,
      panelName: formData.panelName,
      transactionType: formData.transactionType,
      amount: parseInt(formData.amount),
      notes: formData.notes || undefined,
      transactionDate: new Date(),
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    const { date: dateStr, time: timeStr } = formatDateForDisplay(date);
    return `${dateStr} ${timeStr}`;
  };

  // Filter transactions by selected player
  const filteredTransactions =
    selectedPlayerFilter === "all"
      ? gameplayTransactions
      : gameplayTransactions?.filter(t => t.userId === selectedPlayerFilter);

  // Calculate statistics based on filtered data
  const totalWins =
    filteredTransactions
      ?.filter(t => t.transactionType === "Win")
      .reduce((sum, t) => sum + t.amount, 0) || 0;
  const totalLosses =
    filteredTransactions
      ?.filter(t => t.transactionType === "Loss")
      .reduce((sum, t) => sum + t.amount, 0) || 0;
  const netGameplay = totalWins - totalLosses;

  // Get selected player name for display
  const selectedPlayerName =
    selectedPlayerFilter === "all"
      ? "All Players"
      : players?.find(p => p.userId === selectedPlayerFilter)?.name ||
        selectedPlayerFilter;

  return (
    <DashboardLayout>
      <div className="min-h-screen p-3">
        <div className="space-y-3">
          {/* Modern Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-100 via-blue-50 to-indigo-100 p-6 text-slate-900 shadow-sm border border-slate-200">
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
            <div className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Gameplay Transactions</h1>
                  <p className="text-slate-600 text-sm mt-1">Record player wins and losses</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={timePeriod}
                    onValueChange={(value: "today" | "yesterday" | "7d" | "30d" | "all") =>
                      setTimePeriod(value)
                    }
                  >
                    <SelectTrigger className="w-[140px] h-9 text-xs border-slate-300 focus:border-emerald-300 bg-white/80">
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
                    <Button
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="bg-gradient-to-r from-emerald-100 to-teal-100 hover:from-emerald-200 hover:to-teal-200 text-emerald-700 border border-emerald-200"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Transaction
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Player Filter */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="p-4">
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="flex-1 justify-between h-10 px-3 bg-white hover:bg-slate-50 border-slate-300"
                    >
                      <div className="flex items-center gap-2">
                        {selectedPlayerFilter === "all" ? (
                          <>
                            <Users className="h-4 w-4 text-slate-600" />
                            <span className="text-sm font-medium">All Players</span>
                            {players && players.length > 0 && (
                              <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600">
                                {players.length}
                              </Badge>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center">
                              <User className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-sm font-medium truncate max-w-[150px]">
                              {selectedPlayerName}
                            </span>
                          </>
                        )}
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search player..." className="text-sm" />
                      <CommandEmpty className="text-sm">No player found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => setSelectedPlayerFilter("all")}
                          className="cursor-pointer text-sm"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedPlayerFilter === "all"
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <Users className="mr-2 h-4 w-4 text-slate-600" />
                          <span className="font-medium">All Players</span>
                          {players && players.length > 0 && (
                            <Badge variant="secondary" className="ml-auto text-xs px-2 py-0.5 bg-slate-100 text-slate-600">
                              {players.length}
                            </Badge>
                          )}
                        </CommandItem>
                        {players?.map(player => (
                          <CommandItem
                            key={player.userId}
                            value={`${player.name} ${player.userId}`}
                            onSelect={() => setSelectedPlayerFilter(player.userId)}
                            className="cursor-pointer text-sm"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedPlayerFilter === player.userId
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-slate-400 to-gray-500 flex items-center justify-center mr-2 flex-shrink-0">
                              <User className="h-3 w-3 text-white" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium">{player.name}</span>
                              <span className="text-xs text-slate-500">
                                {player.userId}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedPlayerFilter !== "all" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPlayerFilter("all")}
                    className="h-10 w-10 p-0 hover:bg-slate-100"
                    title="Clear filter"
                  >
                    <X className="h-4 w-4 text-slate-600" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 p-4 text-emerald-700 shadow-sm border border-emerald-200">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-emerald-600">Total Wins</p>
                  <div className="p-1.5 bg-emerald-100 rounded-lg">
                    <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-emerald-900">{formatCurrency(totalWins)}</p>
                <p className="text-xs text-emerald-600 mt-1">
                  {filteredTransactions?.filter(t => t.transactionType === "Win").length || 0} transactions
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-red-50 to-rose-50 p-4 text-red-700 shadow-sm border border-red-200">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-red-600">Total Losses</p>
                  <div className="p-1.5 bg-red-100 rounded-lg">
                    <ArrowDownCircle className="h-4 w-4 text-red-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-red-900">{formatCurrency(totalLosses)}</p>
                <p className="text-xs text-red-600 mt-1">
                  {filteredTransactions?.filter(t => t.transactionType === "Loss").length || 0} transactions
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 p-4 text-blue-700 shadow-sm border border-blue-200">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-blue-600">Net Gameplay</p>
                  <div className={`p-1.5 rounded-lg ${netGameplay >= 0 ? 'bg-blue-100' : 'bg-red-100'}`}>
                    {netGameplay >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </div>
                <p className={`text-2xl font-bold ${netGameplay >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
                  {formatCurrency(Math.abs(netGameplay))}
                </p>
                <p className={`text-xs mt-1 ${netGameplay >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {netGameplay >= 0 ? 'Net Profit' : 'Net Loss'}
                </p>
              </div>
            </div>
          </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg border border-blue-200">
                    <GamepadIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Transactions</h3>
                    <p className="text-sm text-slate-600">{selectedPlayerName}'s gameplay history</p>
                  </div>
                </div>
                {filteredTransactions && filteredTransactions.length > 0 && (
                  <Badge variant="secondary" className="text-xs px-3 py-1 bg-slate-100 text-slate-600">
                    {filteredTransactions.length}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : !filteredTransactions || filteredTransactions.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 mb-4">
                    <GamepadIcon className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-base font-medium text-slate-900 mb-1">No Transactions</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    {selectedPlayerFilter === "all"
                      ? "Start recording player wins and losses"
                      : "This player has no transactions"}
                  </p>
                  {isAdmin && (
                    <Button 
                      onClick={() => setIsCreateDialogOpen(true)} 
                      size="sm" 
                      className="bg-gradient-to-r from-emerald-100 to-teal-100 hover:from-emerald-200 hover:to-teal-200 text-emerald-700 border border-emerald-200"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Record First
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredTransactions.map(transaction => (
                    <div key={transaction.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            onClick={() => setSelectedPlayerFilter(transaction.userId)}
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                          >
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-400 to-gray-500 flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4 text-white" />
                            </div>
                            <div className="text-left min-w-0">
                              <p className="text-sm font-mono text-slate-600 truncate">
                                {transaction.userId}
                              </p>
                              <p className="text-xs text-slate-500">
                                {transaction.panelName}
                              </p>
                            </div>
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs px-2 py-1",
                              transaction.transactionType === "Win" 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                : "bg-red-50 text-red-700 border border-red-200"
                            )}
                          >
                            {transaction.transactionType === "Win" ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {transaction.transactionType}
                          </Badge>
                          <span className={cn(
                            "text-sm font-bold font-mono",
                            transaction.transactionType === "Win" ? "text-emerald-600" : "text-red-600"
                          )}>
                            {transaction.transactionType === "Win" ? "+" : "-"}
                            {formatCurrency(transaction.amount)}
                          </span>
                        </div>
                      </div>
                      {transaction.notes && (
                        <p className="text-xs text-slate-500 mt-2 truncate">
                          {transaction.notes}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {formatDate(transaction.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Create Transaction Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="max-w-md border-slate-200">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-emerald-100 rounded-lg border border-emerald-200">
                    <Plus className="h-5 w-5 text-emerald-600" />
                  </div>
                  <DialogTitle className="text-slate-900">Record Gameplay Transaction</DialogTitle>
                </div>
                <DialogDescription className="text-slate-600">
                  Record a win or loss for a player from external gameplay
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="userId" className="text-sm font-semibold text-slate-700">Player</Label>
                  <Select
                    value={formData.userId}
                    onValueChange={value =>
                      setFormData({ ...formData, userId: value })
                    }
                  >
                    <SelectTrigger className="border-slate-300 focus:border-emerald-300">
                      <SelectValue placeholder="Select player" />
                    </SelectTrigger>
                    <SelectContent>
                      {players?.map(player => (
                        <SelectItem key={player.userId} value={player.userId}>
                          {player.name} ({player.userId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="panelName" className="text-sm font-semibold text-slate-700">Panel</Label>
                  <Select
                    value={formData.panelName}
                    onValueChange={value =>
                      setFormData({ ...formData, panelName: value })
                    }
                  >
                    <SelectTrigger className="border-slate-300 focus:border-emerald-300">
                      <SelectValue placeholder="Select panel" />
                    </SelectTrigger>
                    <SelectContent>
                      {panels?.map(panel => (
                        <SelectItem key={panel.name} value={panel.name}>
                          {panel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transactionType" className="text-sm font-semibold text-slate-700">Transaction Type</Label>
                  <Select
                    value={formData.transactionType}
                    onValueChange={(value: "Win" | "Loss") =>
                      setFormData({ ...formData, transactionType: value })
                    }
                  >
                    <SelectTrigger className="border-slate-300 focus:border-emerald-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Win">Win (+)</SelectItem>
                      <SelectItem value="Loss">Loss (-)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-semibold text-slate-700">Amount (Points)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={formData.amount}
                    onChange={e =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    className="border-slate-300 focus:border-emerald-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-semibold text-slate-700">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any notes about this transaction"
                    value={formData.notes}
                    onChange={e =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={3}
                    className="border-slate-300 focus:border-emerald-300"
                  />
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
                  onClick={handleCreateTransaction}
                  disabled={createGameplayTransaction.isPending}
                  className="bg-gradient-to-r from-emerald-100 to-teal-100 hover:from-emerald-200 hover:to-teal-200 text-emerald-700 border border-emerald-200"
                >
                  {createGameplayTransaction.isPending ? "Recording..." : "Record Transaction"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </div>
    </DashboardLayout>
  );
}
