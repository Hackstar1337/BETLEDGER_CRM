import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { PlayerEntryDialog } from "@/components/PlayerEntryDialog";
import { UserPlus, Trash2, Users, Calendar, Clock, Search, Filter, Activity, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { PlayerWinLossCell } from "@/components/PlayerWinLossCell";
import { cn } from "@/lib/utils";

export default function Players() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { data: players, isLoading, refetch } = trpc.players.list.useQuery();

  const deletePlayers = trpc.players.delete.useMutation({
    onSuccess: () => {
      toast.success("Players deleted successfully");
      setSelectedPlayers([]);
      setDeleteDialogOpen(false);
      refetch();
    },
    onError: error => {
      toast.error(error.message || "Failed to delete players");
    },
  });

  const handleSelectPlayer = (playerId: number) => {
    setSelectedPlayers(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPlayers.length === players?.length) {
      setSelectedPlayers([]);
    } else {
      setSelectedPlayers(players?.map(p => p.id) || []);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedPlayers.length === 0) {
      toast.error("Please select players to delete");
      return;
    }
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deletePlayers.mutate({ ids: selectedPlayers });
  };

  const formatDateTime = (date: Date) => {
    const d = new Date(date);
    const dateStr = d.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const timeStr = d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return { date: dateStr, time: timeStr };
  };

  // Filter players based on search term
  const filteredPlayers = useMemo(() => {
    if (!players) return [];
    if (!searchTerm) return players;
    
    const searchLower = searchTerm.toLowerCase();
    return players.filter(player => 
      player.userId.toLowerCase().includes(searchLower) ||
      (player.name && player.name.toLowerCase().includes(searchLower)) ||
      player.panelName.toLowerCase().includes(searchLower)
    );
  }, [players, searchTerm]);

  // Group players by panel
  const playersByPanel = players?.reduce(
    (acc, player) => {
      if (!acc[player.panelName]) {
        acc[player.panelName] = [];
      }
      acc[player.panelName].push(player);
      return acc;
    },
    {} as Record<string, typeof players>
  );

  return (
    <DashboardLayout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Players
            </h1>
            <p className="text-muted-foreground mt-1 text-base">
              Manage player information and track new ID creations
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button 
                onClick={() => {
                  // Trigger the floating button directly
                  const floatingBtn = document.querySelector('button[class*="fixed bottom-6 right-6"]') as HTMLButtonElement;
                  if (floatingBtn) {
                    floatingBtn.click();
                  }
                }}
                className="bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-700 h-9 text-sm shadow-sm hover:shadow-md transition-all duration-200 border border-blue-200"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Player
              </Button>
            )}
            {isAdmin && selectedPlayers.length > 0 && (
              <Button variant="destructive" onClick={handleDeleteSelected} className="h-9 text-sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected ({selectedPlayers.length})
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 text-blue-700 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
            <div className="absolute top-2 right-2 opacity-30">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="relative">
              <p className="text-xs font-medium text-blue-600 mb-1">Total Players</p>
              <p className="font-mono font-bold text-2xl mb-0.5 text-blue-900">{players?.length || 0}</p>
              <div className="flex items-center gap-1">
                <div className="h-1 w-full bg-blue-200 rounded-full overflow-hidden">
                  <div className="h-full w-full bg-blue-500 rounded-full"></div>
                </div>
                <span className="text-xs font-medium text-blue-700">100%</span>
              </div>
            </div>
          </div>

          {playersByPanel &&
            Object.entries(playersByPanel).slice(0, 3).map(([panelName, panelPlayers], index) => {
              const gradients = [
                'from-emerald-50 to-teal-50 border-emerald-200 text-emerald-700',
                'from-violet-50 to-purple-50 border-violet-200 text-violet-700',
                'from-amber-50 to-orange-50 border-amber-200 text-amber-700'
              ];
              const gradient = gradients[index % gradients.length];
              const iconColors = ['text-emerald-600', 'text-violet-600', 'text-amber-600'];
              const barColors = ['bg-emerald-200', 'bg-violet-200', 'bg-amber-200'];
              const fillColors = ['bg-emerald-500', 'bg-violet-500', 'bg-amber-500'];
              const percentage = Math.round((panelPlayers.length / (players?.length || 1)) * 100);
              
              return (
                <div key={panelName} className={`relative bg-gradient-to-br ${gradient} rounded-lg p-3 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
                  <div className="absolute top-2 right-2 opacity-30">
                    <div className="h-8 w-8 bg-white/50 rounded-md"></div>
                  </div>
                  <div className="relative">
                    <p className="text-xs font-medium mb-1 truncate opacity-80">{panelName}</p>
                    <p className="font-mono font-bold text-2xl mb-0.5">{panelPlayers.length}</p>
                    <div className="flex items-center gap-1">
                      <div className={`h-1 w-full ${barColors[index]} rounded-full overflow-hidden`}>
                        <div 
                          className={`h-full ${fillColors[index]} rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium opacity-80">{percentage}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Players Directory */}
        <div className="space-y-4">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-slate-100 to-gray-100 border border-slate-200 rounded-lg">
                  <Users className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Player Directory</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Complete list of all registered players</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search players..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 w-64 bg-white dark:bg-slate-950 border-slate-200 focus:border-blue-300 dark:focus:border-blue-400"
                  />
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-full border border-slate-200">
                  {filteredPlayers.length} of {players?.length || 0} players
                </div>
              </div>
            </div>
          </div>

          {/* Players Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 p-3 animate-pulse">
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                  <div className="space-y-1.5">
                    <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                    <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : !players || players.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full mb-3">
                <Users className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">No players found</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">Click the floating button to add your first player</p>
              <Button className="bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-700 h-9 text-sm shadow-sm hover:shadow-md transition-all duration-200 border border-blue-200">
                <UserPlus className="mr-2 h-4 w-4" />
                Add First Player
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredPlayers.map((player) => (
                  <div key={player.id} className="group relative bg-white dark:bg-slate-900 rounded-lg border border-slate-200 hover:border-blue-300 dark:hover:border-blue-800 transition-all duration-200 overflow-hidden">
                    {/* Card Header */}
                    <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 border-b border-slate-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          <span className="font-mono text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                            {player.userId}
                          </span>
                        </div>
                        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-[10px] px-1.5 py-0.5">
                          {player.panelName}
                        </Badge>
                      </div>
                    </div>

                  {/* Card Body */}
                  <div className="p-3 space-y-2.5">
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Player Name</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {player.name || <span className="text-gray-400 italic">Not set</span>}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Balance</p>
                        <PlayerWinLossCell
                          userId={player.userId}
                          balance={player.balance}
                        />
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Status</p>
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">Active</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Created</p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                        <Calendar className="h-2.5 w-2.5" />
                        {formatDateTime(player.createdAt).date}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {formatDateTime(player.createdAt).time}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="bg-gray-50 dark:bg-gray-800 px-3 py-1.5 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        ID: {player.id}
                      </p>
                      <div className="flex items-center gap-1">
                        <Activity className="h-2.5 w-2.5 text-gray-400" />
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                          {formatDateTime(player.updatedAt).date}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Player Entry Floating Button */}
      <PlayerEntryDialog />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedPlayers.length}{" "}
              player(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
