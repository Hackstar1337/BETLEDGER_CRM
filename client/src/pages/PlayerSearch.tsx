import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Search, ArrowDownCircle, ArrowUpCircle, Users, TrendingUp, TrendingDown } from "lucide-react";
import { PlayerTransactionDialog } from "@/components/PlayerTransactionDialog";
import { PlayerActionDialog } from "@/components/PlayerActionDialog";
import { cn } from "@/lib/utils";

export default function PlayerSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [transactionType, setTransactionType] = useState<
    "deposit" | "withdrawal" | null
  >(null);

  const { data: players, isLoading } = trpc.players.list.useQuery();

  // Filter players based on search query (show all if no query)
  const filteredPlayers =
    players?.filter(player => {
      if (!searchQuery.trim()) return true; // Show all players when no search query

      const query = searchQuery.toLowerCase();
      const matchesUserId = player.userId.toLowerCase().includes(query);
      const matchesName = player.name?.toLowerCase().includes(query);

      return matchesUserId || matchesName;
    }) || [];

  // Calculate statistics
  const activePlayers = filteredPlayers.filter(player => {
    const balance = typeof player.balance === "string" ? parseFloat(player.balance) : player.balance;
    return balance >= 0;
  }).length;

  // Helper function to highlight matching text
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={index}
          className="bg-yellow-200 dark:bg-yellow-900 font-semibold"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDeposit = (player: any) => {
    setSelectedPlayer(player);
    setTransactionType("deposit");
  };

  const handleWithdrawal = (player: any) => {
    setSelectedPlayer(player);
    setTransactionType("withdrawal");
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Player Search</h1>
            <p className="text-slate-500 mt-1">
              Search for players by User ID or name, then perform transactions
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Total: {filteredPlayers.length}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-900">Active: {activePlayers}</span>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl opacity-50 blur-xl"></div>
          <div className="relative bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 px-8 py-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <div className="p-2 bg-blue-100 border border-blue-200 rounded-lg">
                      <Search className="h-5 w-5 text-blue-600" />
                    </div>
                    Find Players
                  </h2>
                  <p className="text-slate-600 mt-1 ml-11">Quickly locate any player by their details</p>
                </div>
              </div>
            </div>
            <div className="p-8">
              <div className="relative max-w-2xl mx-auto">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-6 w-6 text-slate-400" />
                </div>
                <Input
                  placeholder="Type User ID or player name to search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-14 pr-14 text-base h-14 text-lg border border-slate-200 rounded-xl focus:border-blue-300 focus:ring-4 focus:ring-blue-50 transition-all duration-200 shadow-sm"
                />
                {searchQuery && (
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchQuery("")}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                    >
                      ✕
                    </Button>
                  </div>
                )}
              </div>
              {searchQuery && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-slate-500">
                    Searching for: <span className="font-semibold text-slate-700">"{searchQuery}"</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search Results */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <div className="p-1.5 bg-slate-100 border border-slate-200 rounded">
                    <Users className="h-4 w-4 text-slate-600" />
                  </div>
                  Player Results
                </CardTitle>
                <CardDescription className="text-slate-600">
                  {searchQuery.trim() === ""
                    ? `Displaying all ${filteredPlayers.length} player(s)`
                    : `Found ${filteredPlayers.length} player(s) matching "${searchQuery}"`}
                </CardDescription>
              </div>
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="text-slate-600 hover:text-slate-800 border-slate-300 hover:border-slate-400"
                >
                  Clear Search
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-16 text-slate-500">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                </div>
                <p className="text-lg font-medium">Loading Players</p>
                <p className="text-sm text-slate-400 mt-1">Please wait while we fetch the data...</p>
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                  <Search className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-xl font-semibold text-slate-700">No Players Found</p>
                <p className="text-slate-400 mt-2">Try adjusting your search criteria</p>
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery("")}
                  className="mt-4 border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  Show All Players
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">User ID</TableHead>
                      <TableHead className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Name</TableHead>
                      <TableHead className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Panel</TableHead>
                      <TableHead className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Balance</TableHead>
                      <TableHead className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Created Date</TableHead>
                      <TableHead className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Status</TableHead>
                      <TableHead className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-white divide-y divide-slate-100">
                    {filteredPlayers.map((player, index) => {
                      const balance =
                        typeof player.balance === "string"
                          ? parseFloat(player.balance)
                          : player.balance;
                      return (
                        <TableRow
                          key={player.id}
                          className={cn(
                            "cursor-pointer transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50",
                            index % 2 === 0 ? "bg-white" : "bg-slate-50"
                          )}
                          onClick={() => {
                            setSelectedPlayer(player);
                          }}
                        >
                          <TableCell className="px-6 py-4 font-medium text-slate-900 border-r border-slate-100">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-bold text-slate-600">
                                  {player.userId.slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <span>{highlightText(player.userId, searchQuery)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-slate-700 border-r border-slate-100">
                            {player.name
                              ? highlightText(player.name, searchQuery)
                              : <span className="text-slate-400 italic">Not set</span>}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-slate-700 border-r border-slate-100">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                              {player.panelName}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-center border-r border-slate-100">
                            <span
                              className={cn(
                                "inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold tabular-nums",
                                balance >= 0
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : "bg-amber-100 text-amber-800 border border-amber-200"
                              )}
                            >
                              {formatCurrency(balance)}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-slate-700 border-r border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{formatDate(player.createdAt)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-center border-r border-slate-100">
                            <Badge
                              className={cn(
                                "px-3 py-1 text-xs font-bold border",
                                balance >= 0 
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-300" 
                                  : "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-300"
                              )}
                            >
                              {balance >= 0 ? (
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                  Active
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                                  Negative
                                </span>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div
                              className="flex gap-2 justify-center"
                              onClick={e => e.stopPropagation()}
                            >
                              <Button
                                size="sm"
                                onClick={() => handleDeposit(player)}
                                className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-medium shadow-sm hover:shadow-md transition-all border border-emerald-200"
                              >
                                <ArrowDownCircle className="h-4 w-4 mr-1" />
                                Deposit
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleWithdrawal(player)}
                                className="bg-amber-100 hover:bg-amber-200 text-amber-700 font-medium shadow-sm hover:shadow-md transition-all border border-amber-200"
                              >
                                <ArrowUpCircle className="h-4 w-4 mr-1" />
                                Withdraw
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Player Action Dialog (from row click) - handles its own transaction dialogs */}
      <PlayerActionDialog
        player={selectedPlayer}
        open={selectedPlayer !== null && transactionType === null}
        onOpenChange={open => {
          if (!open) {
            setSelectedPlayer(null);
          }
        }}
      />

      {/* Transaction Dialog (from action buttons only) */}
      <PlayerTransactionDialog
        player={selectedPlayer}
        type={transactionType}
        open={selectedPlayer !== null && transactionType !== null}
        onOpenChange={open => {
          if (!open) {
            setSelectedPlayer(null);
            setTransactionType(null);
          }
        }}
      />
    </DashboardLayout>
  );
}
