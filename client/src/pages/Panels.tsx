import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Plus,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Trash2,
  Info,
  Calendar,
  Clock,
  Layers,
  DollarSign,
  Target,
  Activity,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Search,
  Filter,
  Settings,
  BarChart3,
  Zap,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { getTimezone, parseTimezoneOffset, toLocalTime } from "@/lib/timezone";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";

type Panel = {
  id: number;
  name: string;
  pointsBalance: number;
  openingBalance: number;
  closingBalance: number;
  topUp: number;
  extraDeposit: number;
  bonusPoints: number;
  profitLoss: number;
  totalDeposits: number;
  totalWithdrawals: number;
};

export default function Panels() {
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPanelName, setNewPanelName] = useState("");
  const [newPanelPoints, setNewPanelPoints] = useState("");
  const [selectedPanels, setSelectedPanels] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addPointsDialog, setAddPointsDialog] = useState(false);
  const [addPointsForm, setAddPointsForm] = useState({
    panelId: "",
    pointsToAdd: "",
  });
  const [timePeriod, setTimePeriod] = useState<"today" | "yesterday" | "7d" | "30d" | "all">(
    "today"
  );
  const [timezone, setTimezone] = useState(getTimezone());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "balance" | "profit">("name");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Update timezone when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setTimezone(getTimezone());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const {
    data: panels,
    isLoading,
    refetch,
  } = trpc.panels.list.useQuery({ timePeriod, timezone });
  
  const utils = trpc.useUtils();
  
  const createPanel = trpc.panels.create.useMutation({
    onSuccess: () => {
      toast.success("Panel created successfully");
      setIsCreateDialogOpen(false);
      setNewPanelName("");
      setNewPanelPoints("");
      
      // Invalidate cache to refresh panels list
      utils.panels.list.invalidate();
      utils.dashboard.overview.invalidate();
    },
    onError: error => {
      toast.error(error.message || "Failed to create panel");
    },
  });

  const deletePanels = trpc.panels.delete.useMutation({
    onSuccess: () => {
      toast.success("Panels deleted successfully");
      setSelectedPanels([]);
      setDeleteDialogOpen(false);
      
      // Invalidate cache to refresh panels list
      utils.panels.list.invalidate();
      utils.dashboard.overview.invalidate();
    },
    onError: error => {
      toast.error(error.message || "Failed to delete panels");
    },
  });

  const addPointsToPanel = trpc.panels.update.useMutation({
    onSuccess: () => {
      toast.success("Panel topped-up successfully");
      setAddPointsDialog(false);
      setAddPointsForm({ panelId: "", pointsToAdd: "" });
      
      // Invalidate cache to refresh panels list
      utils.panels.list.invalidate();
      utils.dashboard.overview.invalidate();
    },
    onError: error => {
      toast.error(error.message || "Failed to top-up panel");
    },
  });

  const handleSelectPanel = (panelId: number) => {
    setSelectedPanels(prev =>
      prev.includes(panelId)
        ? prev.filter(id => id !== panelId)
        : [...prev, panelId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPanels.length === panels?.length) {
      setSelectedPanels([]);
    } else {
      setSelectedPanels(panels?.map(p => p.id) || []);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedPanels.length === 0) {
      toast.error("Please select panels to delete");
      return;
    }
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deletePanels.mutate({ ids: selectedPanels });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateExpectedClosing = (panel: Panel) => {
    return panel.openingBalance - panel.totalDeposits + panel.totalWithdrawals;
  };

  const handleCreatePanel = () => {
    if (!newPanelName.trim()) {
      toast.error("Panel name is required");
      return;
    }
    if (!newPanelPoints.trim() || parseFloat(newPanelPoints) < 0) {
      toast.error("Please enter a valid initial points balance (0 or greater)");
      return;
    }
    createPanel.mutate({
      name: newPanelName.trim(),
      pointsBalance: parseFloat(newPanelPoints),
      openingBalance: parseFloat(newPanelPoints), // Opening balance starts with initial points
      // closingBalance will be calculated by backend as: openingBalance - totalDeposits + totalWithdrawals
      settling: 0,
      extraDeposit: 0,
      bonusPoints: 0,
      profitLoss: 0,
    });
  };

  const handleAddPoints = () => {
    if (!addPointsForm.panelId) {
      toast.error("Please select a panel");
      return;
    }
    if (
      !addPointsForm.pointsToAdd ||
      parseFloat(addPointsForm.pointsToAdd) <= 0
    ) {
      toast.error("Please enter a valid amount of points to add");
      return;
    }

    const panel = panels?.find(p => p.id.toString() === addPointsForm.panelId);
    if (!panel) return;

    const pointsToAdd = parseFloat(addPointsForm.pointsToAdd);

    // Update logic:
    // - Increase pointsBalance by the added amount
    // - Increase closingBalance by the added amount (Top-Up adds to closing balance)
    // - Update topUp by the added amount
    // - This represents adding funds to the panel
    const updates: any = {
      id: parseInt(addPointsForm.panelId),
      pointsBalance: panel.pointsBalance + pointsToAdd,
      closingBalance: panel.closingBalance + pointsToAdd, // Add because Top-Up increases closing balance
      topUp: panel.topUp + pointsToAdd, // Add to Top-Up
    };

    addPointsToPanel.mutate(updates);
  };

  const isAdmin = user?.role === "admin";

  // Filter and sort panels
  const filteredPanels = panels?.filter(panel => 
    panel.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "balance") return b.pointsBalance - a.pointsBalance;
    if (sortBy === "profit") return (b.totalDeposits - b.totalWithdrawals) - (a.totalDeposits - a.totalWithdrawals);
    return 0;
  }) || [];

  // Calculate totals
  const totalPanels = panels?.length || 0;
  const totalPoints = panels?.reduce((sum, p) => sum + p.pointsBalance, 0) || 0;
  const totalBalance = totalPoints; // 1 pt = ₹1
  const totalProfitLoss = panels?.reduce((sum, p) => sum + (p.totalDeposits - p.totalWithdrawals), 0) || 0;

  return (
    <TooltipProvider>
      <DashboardLayout>
        <div className="p-6 min-h-screen">
          {/* Enhanced Header */}
          <div className="mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-slate-100 to-blue-50 border border-slate-200 rounded-xl shadow-sm">
                <Layers className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Panels Management</h1>
                <p className="text-slate-600 mt-1">Monitor and manage your betting exchange panels</p>
              </div>
            </div>
          </div>

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Total Panels</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{totalPanels}</p>
                    <p className="text-xs text-slate-600 mt-1">Active exchanges</p>
                  </div>
                  <div className="p-3 bg-white/80 rounded-lg border border-slate-200">
                    <Layers className="h-6 w-6 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Total Points</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{totalPoints.toLocaleString()}</p>
                    <p className="text-xs text-slate-600 mt-1">Available inventory</p>
                  </div>
                  <div className="p-3 bg-white/80 rounded-lg border border-slate-200">
                    <Target className="h-6 w-6 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-700">Total Value</p>
                    <p className="text-3xl font-bold text-emerald-900 mt-1">{formatCurrency(totalBalance)}</p>
                    <p className="text-xs text-emerald-600 mt-1">Market value</p>
                  </div>
                  <div className="p-3 bg-white/80 rounded-lg border border-emerald-200">
                    <DollarSign className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cn(
              "shadow-sm hover:shadow-md transition-shadow",
              totalProfitLoss >= 0 
                ? "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200" 
                : "bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200"
            )}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={cn(
                      "text-sm font-medium mt-1",
                      totalProfitLoss >= 0 ? "text-emerald-700" : "text-amber-700"
                    )}>Total P/L</p>
                    <p className={cn(
                      "text-3xl font-bold mt-1",
                      totalProfitLoss >= 0 ? "text-emerald-900" : "text-amber-900"
                    )}>{formatCurrency(totalProfitLoss)}</p>
                    <p className={cn(
                      "text-xs mt-1",
                      totalProfitLoss >= 0 ? "text-emerald-600" : "text-amber-600"
                    )}>Net performance</p>
                  </div>
                  <div className={cn(
                    "p-3 rounded-lg border",
                    totalProfitLoss >= 0 
                      ? "bg-white/80 border-emerald-200" 
                      : "bg-white/80 border-amber-200"
                  )}>
                    {totalProfitLoss >= 0 ? (
                      <TrendingUp className="h-6 w-6 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-6 w-6 text-amber-600" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Advanced Controls */}
          <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200 shadow-sm mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search panels by name or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full sm:w-64 border-slate-300 focus:border-blue-300"
                    />
                  </div>
                  <Select value={sortBy} onValueChange={(value: "name" | "balance" | "profit") => setSortBy(value)}>
                    <SelectTrigger className="w-full sm:w-40 border-slate-300">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="balance">Balance</SelectItem>
                      <SelectItem value="profit">Profit</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={timePeriod}
                    onValueChange={(value: "today" | "yesterday" | "7d" | "30d" | "all") =>
                      setTimePeriod(value)
                    }
                  >
                    <SelectTrigger className="w-full sm:w-40 border-slate-300">
                      <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border rounded-lg p-1 bg-white/80 border-slate-200">
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
                  </div>
                  {isAdmin && (
                    <>
                      {selectedPanels.length > 0 && (
                        <Button variant="outline" onClick={handleDeleteSelected} size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-50">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete ({selectedPanels.length})
                        </Button>
                      )}
                      <Dialog open={addPointsDialog} onOpenChange={setAddPointsDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                            <Zap className="h-4 w-4" />
                            Top-Up
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-emerald-100 rounded-lg border border-emerald-200">
                                <Zap className="h-5 w-5 text-emerald-600" />
                              </div>
                              <div>
                                <DialogTitle className="text-lg text-slate-900">Top-Up Panel</DialogTitle>
                                <DialogDescription className="text-slate-600">
                                  Add points to increase panel inventory
                                </DialogDescription>
                              </div>
                            </div>
                          </DialogHeader>
                          <div className="space-y-6 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="add-points-panel" className="text-sm font-medium">Select Panel</Label>
                              <Select
                                value={addPointsForm.panelId}
                                onValueChange={value =>
                                  setAddPointsForm({ ...addPointsForm, panelId: value })
                                }
                              >
                                <SelectTrigger id="add-points-panel" className="h-11 border-slate-300 focus:border-emerald-300">
                                  <SelectValue placeholder="Choose a panel to top-up" />
                                </SelectTrigger>
                                <SelectContent>
                                  {panels?.map(panel => (
                                    <SelectItem key={panel.id} value={panel.id.toString()}>
                                      <div className="flex items-center justify-between w-full">
                                        <span className="font-medium">{panel.name}</span>
                                        <span className="text-sm text-slate-500 ml-2">{panel.pointsBalance.toLocaleString()} pts</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="add-points-amount" className="text-sm font-medium">Top-Up Amount</Label>
                              <div className="relative">
                                <Input
                                  id="add-points-amount"
                                  type="number"
                                  min="1"
                                  step="1"
                                  placeholder="Enter amount"
                                  value={addPointsForm.pointsToAdd}
                                  onChange={e =>
                                    setAddPointsForm({ ...addPointsForm, pointsToAdd: e.target.value })
                                  }
                                  className="h-11 pl-12 border-slate-300 focus:border-emerald-300"
                                />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                  <Target className="h-4 w-4" />
                                </div>
                              </div>
                              {addPointsForm.pointsToAdd && (
                                <div className="mt-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-emerald-700">Preview</span>
                                    <span className="font-semibold text-emerald-900">
                                      {parseInt(addPointsForm.pointsToAdd || '0').toLocaleString()} points
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {addPointsForm.panelId && addPointsForm.pointsToAdd && (
                              <div className="p-4 bg-slate-50 rounded-lg space-y-2 border border-slate-200">
                                <p className="text-sm font-medium text-slate-700">Summary</p>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Current Balance:</span>
                                    <span className="font-medium text-slate-900">
                                      {panels?.find(p => p.id.toString() === addPointsForm.panelId)?.pointsBalance.toLocaleString()} pts
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Amount to Add:</span>
                                    <span className="font-medium text-emerald-600">
                                      +{parseInt(addPointsForm.pointsToAdd || '0').toLocaleString()} pts
                                    </span>
                                  </div>
                                  <div className="border-t border-slate-200 pt-1 flex justify-between text-sm">
                                    <span className="text-slate-700 font-medium">New Balance:</span>
                                    <span className="font-bold text-emerald-700">
                                      {((panels?.find(p => p.id.toString() === addPointsForm.panelId)?.pointsBalance || 0) + parseInt(addPointsForm.pointsToAdd || '0')).toLocaleString()} pts
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          <DialogFooter className="gap-2">
                            <Button 
                              variant="outline" 
                              onClick={() => setAddPointsDialog(false)}
                              className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-50"
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleAddPoints} 
                              disabled={addPointsToPanel.isPending || !addPointsForm.panelId || !addPointsForm.pointsToAdd}
                              className="flex-1 gap-2 bg-gradient-to-r from-emerald-100 to-emerald-200 hover:from-emerald-200 hover:to-emerald-300 text-emerald-700 border border-emerald-200"
                            >
                              {addPointsToPanel.isPending ? (
                                <>
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Zap className="h-4 w-4" />
                                  Top-Up Panel
                                </>
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="gap-2 bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-700 border border-blue-200 shadow-sm hover:shadow-md">
                            <Plus className="h-4 w-4" />
                            New Panel
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 rounded-lg border border-blue-200">
                                <Plus className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <DialogTitle className="text-lg text-slate-900">Create New Panel</DialogTitle>
                                <DialogDescription className="text-slate-600">
                                  Add a new betting exchange panel
                                </DialogDescription>
                              </div>
                            </div>
                          </DialogHeader>
                          <div className="space-y-6 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="panelName" className="text-sm font-medium">Panel Name</Label>
                              <div className="relative">
                                <Input
                                  id="panelName"
                                  placeholder="e.g., TIGEREXCH"
                                  value={newPanelName}
                                  onChange={e => setNewPanelName(e.target.value)}
                                  className="h-11 pl-12 uppercase border-slate-300 focus:border-blue-300"
                                  maxLength={20}
                                />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                  <Layers className="h-4 w-4" />
                                </div>
                              </div>
                              {newPanelName && (
                                <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="flex items-center gap-2 text-sm">
                                    <div className="h-8 w-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                                      <span className="text-white font-bold text-sm">{newPanelName.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <div>
                                      <p className="font-medium text-blue-900">{newPanelName.toUpperCase()}</p>
                                      <p className="text-xs text-blue-700">Panel preview</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="panelPoints" className="text-sm font-medium">Initial Points</Label>
                              <div className="relative">
                                <Input
                                  id="panelPoints"
                                  type="number"
                                  min="0"
                                  step="1"
                                  placeholder="e.g., 100000"
                                  value={newPanelPoints}
                                  onChange={e => setNewPanelPoints(e.target.value)}
                                  className="h-11 pl-12 border-slate-300 focus:border-blue-300"
                                />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                  <Target className="h-4 w-4" />
                                </div>
                              </div>
                              {newPanelPoints && (
                                <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-blue-700">Initial Balance</span>
                                    <span className="font-semibold text-blue-900">
                                      {formatCurrency(parseFloat(newPanelPoints || '0'))}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {newPanelName && newPanelPoints && (
                              <div className="p-4 bg-slate-50 rounded-lg space-y-2 border border-slate-200">
                                <p className="text-sm font-medium text-slate-700">Panel Summary</p>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Panel Name:</span>
                                    <span className="font-medium text-slate-900">{newPanelName.toUpperCase()}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Initial Points:</span>
                                    <span className="font-medium text-slate-900">{parseInt(newPanelPoints || '0').toLocaleString()} pts</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Opening Balance:</span>
                                    <span className="font-medium text-blue-600">
                                      {formatCurrency(parseFloat(newPanelPoints || '0'))}
                                    </span>
                                  </div>
                                  <div className="border-t border-slate-200 pt-1 flex justify-between text-sm">
                                    <span className="text-slate-700 font-medium">Status:</span>
                                    <span className="font-medium text-emerald-600">Ready to create</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <div className="flex gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700">
                                  Panel name cannot be changed after creation. Initial points will be set as both opening and closing balance.
                                </p>
                              </div>
                            </div>
                          </div>
                          <DialogFooter className="gap-2">
                            <Button 
                              variant="outline" 
                              onClick={() => setIsCreateDialogOpen(false)}
                              className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-50"
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleCreatePanel} 
                              disabled={createPanel.isPending || !newPanelName.trim() || !newPanelPoints.trim() || parseFloat(newPanelPoints) < 0}
                              className="flex-1 gap-2 bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-700 border border-blue-200"
                            >
                              {createPanel.isPending ? (
                                <>
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
                                  Creating...
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4" />
                                  Create Panel
                                </>
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content - Table or Cards View */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Card key={i} className="border border-slate-200 shadow-sm">
                  <CardContent className="p-6">
                    <div className="h-12 bg-gray-100 rounded animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !filteredPanels || filteredPanels.length === 0 ? (
            <Card className="border border-slate-200 shadow-sm">
              <CardContent className="p-12 text-center">
                <Layers className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No panels found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? "Try adjusting your search terms" : "Create your first panel to get started"}
                </p>
                {isAdmin && (
                  <Button className="bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-700 border border-blue-200 shadow-sm hover:shadow-md">
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Panel
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (viewMode === "table" ? (
            <Card className="border border-slate-200 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed" style={{ minWidth: '1460px' }}>
                  <thead className="bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      {isAdmin && (
                        <th className="w-12 px-6 py-4 text-center bg-gradient-to-b from-slate-50 to-gray-50">
                          <Checkbox
                            checked={selectedPanels.length === filteredPanels.length && filteredPanels.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </th>
                      )}
                      <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-normal whitespace-nowrap bg-gradient-to-b from-slate-50 to-gray-50 border-r border-slate-200" style={{ width: '160px' }}>Panel Name</th>
                      <th className="px-5 py-3 text-center text-[10px] font-bold text-slate-700 uppercase tracking-normal whitespace-nowrap bg-gradient-to-b from-slate-50 to-gray-50 border-r border-slate-200" style={{ width: '150px' }}>Points Balance (PTS)</th>
                      <th className="px-5 py-3 text-center text-[10px] font-bold text-slate-700 uppercase tracking-normal whitespace-nowrap bg-gradient-to-b from-slate-50 to-gray-50 border-r border-slate-200" style={{ width: '160px' }}>Opening Balance (PTS)</th>
                      <th className="px-5 py-3 text-center text-[10px] font-bold text-slate-700 uppercase tracking-normal whitespace-nowrap bg-gradient-to-b from-slate-50 to-gray-50 border-r border-slate-200" style={{ width: '160px' }}>Closing Balance (PTS)</th>
                      <th className="px-5 py-3 text-center text-[10px] font-bold text-slate-700 uppercase tracking-normal whitespace-nowrap bg-gradient-to-b from-slate-50 to-gray-50 border-r border-slate-200" style={{ width: '130px' }}>Top-Up PTS</th>
                      <th className="px-5 py-3 text-center text-[10px] font-bold text-slate-700 uppercase tracking-normal whitespace-nowrap bg-gradient-to-b from-slate-50 to-gray-50 border-r border-slate-200" style={{ width: '120px' }}>Extra Deposit</th>
                      <th className="px-5 py-3 text-center text-[10px] font-bold text-slate-700 uppercase tracking-normal whitespace-nowrap bg-gradient-to-b from-slate-50 to-gray-50 border-r border-slate-200" style={{ width: '120px' }}>Bonus Points</th>
                      <th className="px-5 py-3 text-center text-[10px] font-bold text-slate-700 uppercase tracking-normal whitespace-nowrap bg-gradient-to-b from-slate-50 to-gray-50 border-r border-slate-200" style={{ width: '130px' }}>₹ Pt. Profit/Loss</th>
                      <th className="px-5 py-3 text-center text-[10px] font-bold text-slate-700 uppercase tracking-normal whitespace-nowrap bg-gradient-to-b from-slate-50 to-gray-50 border-r border-slate-200" style={{ width: '110px' }}>₹ Deposit</th>
                      <th className="px-5 py-3 text-center text-[10px] font-bold text-slate-700 uppercase tracking-normal whitespace-nowrap bg-gradient-to-b from-slate-50 to-gray-50 border-r border-slate-200" style={{ width: '130px' }}>₹ Withdrawal</th>
                      <th className="px-5 py-3 text-center text-[10px] font-bold text-slate-700 uppercase tracking-normal whitespace-nowrap bg-gradient-to-b from-slate-50 to-gray-50" style={{ width: '120px' }}>₹ Profit/Loss</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {filteredPanels.map((panel, index) => {
                      const profitLoss = panel.totalDeposits - panel.totalWithdrawals;
                      const profitLossPercent = panel.totalDeposits > 0 
                        ? ((profitLoss / panel.totalDeposits) * 100).toFixed(1)
                        : '0';
                      
                      return (
                        <tr key={panel.id} className={cn(
                          "transition-all duration-200 cursor-pointer border-b",
                          index % 2 === 0 ? "bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50" : "bg-gray-50 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50"
                        )} onClick={() => {
                        setAddPointsForm({ panelId: panel.id.toString(), pointsToAdd: "" });
                        setAddPointsDialog(true);
                      }}>
                          {isAdmin && (
                            <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedPanels.includes(panel.id)}
                                onCheckedChange={() => handleSelectPanel(panel.id)}
                              />
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                            <div>
                              <p className="text-sm font-bold text-gray-900">{panel.name}</p>
                              <p className="text-xs text-gray-500 font-medium">ID: {panel.id}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center border-r border-gray-200">
                            <p className="text-sm font-bold text-blue-700 tabular-nums">{panel.pointsBalance.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 tabular-nums font-semibold border-r border-gray-200">
                            {panel.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center border-r border-gray-200">
                            <p className={cn(
                              "text-sm font-bold tabular-nums",
                              panel.closingBalance > panel.openingBalance ? "text-red-600" : "text-green-600"
                            )}>
                              {panel.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                            </p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 tabular-nums font-semibold border-r border-gray-200">
                            {panel.topUp.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 tabular-nums font-semibold border-r border-gray-200">
                            {panel.extraDeposit.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 tabular-nums font-semibold border-r border-gray-200">
                            {panel.bonusPoints.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center border-r border-gray-200">
                            <p className={cn(
                              "text-sm font-bold tabular-nums",
                              panel.profitLoss >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {panel.profitLoss.toLocaleString()} PTS
                            </p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 tabular-nums font-semibold border-r border-gray-200">
                            {formatCurrency(panel.totalDeposits)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 tabular-nums font-semibold border-r border-gray-200">
                            {formatCurrency(panel.totalWithdrawals)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <p className={cn(
                              "text-sm font-bold tabular-nums",
                              profitLoss >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {formatCurrency(profitLoss)}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            /* Cards View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPanels.map(panel => {
                const profitLoss = panel.totalDeposits - panel.totalWithdrawals;
                const profitLossPercent = panel.totalDeposits > 0 
                  ? ((profitLoss / panel.totalDeposits) * 100).toFixed(1)
                  : '0';
                
                return (
                  <Card key={panel.id} className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer" onClick={() => {
                    setAddPointsForm({ panelId: panel.id.toString(), pointsToAdd: "" });
                    setAddPointsDialog(true);
                  }}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {isAdmin && (
                            <Checkbox
                              checked={selectedPanels.includes(panel.id)}
                              onCheckedChange={(checked) => {
                                handleSelectPanel(panel.id);
                              }}
                            />
                          )}
                          <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-lg">{panel.name.charAt(0)}</span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{panel.name}</h3>
                            <p className="text-xs text-gray-500">ID: {panel.id}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-gray-400" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Points Balance</span>
                          <span className="text-lg font-bold text-blue-600">{panel.pointsBalance.toLocaleString()}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500">Opening</p>
                            <p className="text-sm font-semibold text-gray-900">{panel.openingBalance.toLocaleString()}</p>
                          </div>
                          <div className={cn(
                            "rounded-lg p-3",
                            panel.closingBalance > panel.openingBalance ? "bg-red-50" : "bg-green-50"
                          )}>
                            <p className="text-xs text-gray-500">Closing</p>
                            <p className={cn(
                              "text-sm font-semibold",
                              panel.closingBalance > panel.openingBalance ? "text-red-600" : "text-green-600"
                            )}>
                              {panel.closingBalance.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="border-t pt-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600">Profit/Loss</span>
                            <div className={cn(
                              "flex items-center gap-1",
                              profitLoss >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {profitLoss >= 0 ? (
                                <TrendingUp className="h-4 w-4" />
                              ) : (
                                <TrendingDown className="h-4 w-4" />
                              )}
                              <span className="font-semibold">{formatCurrency(profitLoss)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-xs text-gray-500">Deposits</p>
                            <p className="text-sm font-medium text-gray-900">{formatCurrency(panel.totalDeposits)}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-xs text-gray-500">Withdrawals</p>
                            <p className="text-sm font-medium text-gray-900">{formatCurrency(panel.totalWithdrawals)}</p>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-2">
                            <p className="text-xs text-gray-500">Top-Up</p>
                            <p className="text-sm font-medium text-blue-600">{panel.topUp.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))}
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg border border-red-200">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <DialogTitle className="text-lg text-slate-900">Delete Panels</DialogTitle>
                  <DialogDescription className="text-slate-600">
                    This action cannot be undone. All panel data will be permanently deleted.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700">
                    <p className="font-medium mb-1">You are about to delete {selectedPanels.length} panel(s):</p>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedPanels.map(id => {
                        const panel = panels?.find(p => p.id === id);
                        return <li key={id}>{panel?.name || `Panel ID: ${id}`}</li>;
                      })}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="text-sm text-slate-600">
                <p>• All panel balance data will be lost</p>
                <p>• Transaction history will remain</p>
                <p>• This action is irreversible</p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setDeleteDialogOpen(false)}
                className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-50"
                disabled={deletePanels.isPending}
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmDelete} 
                disabled={deletePanels.isPending}
                className="flex-1 gap-2 bg-red-600 hover:bg-red-700 text-white border border-red-200"
              >
                {deletePanels.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete {selectedPanels.length} Panel{selectedPanels.length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </TooltipProvider>
  );
}
