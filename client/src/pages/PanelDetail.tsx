import { useParams } from "wouter";
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
import { ArrowDownCircle, ArrowUpCircle, Users, Search } from "lucide-react";
import { PlayerActionDialog } from "@/components/PlayerActionDialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function PanelDetail() {
  const params = useParams();
  const panelName = params.panelName
    ? decodeURIComponent(params.panelName)
    : "";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [showPlayerDialog, setShowPlayerDialog] = useState(false);

  const { data: players, isLoading } = trpc.players.list.useQuery();

  // Filter players for this panel
  const panelPlayers = players?.filter(p => p.panelName === panelName) || [];

  // Further filter by search query
  const filteredPlayers = panelPlayers.filter(player => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const matchesUserId = player.userId.toLowerCase().includes(query);
    const matchesName = player.name?.toLowerCase().includes(query);

    return matchesUserId || matchesName;
  });

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

  // Calculate panel statistics (use filtered players)
  const totalBalance = filteredPlayers.reduce((sum, player) => {
    const balance =
      typeof player.balance === "string"
        ? parseFloat(player.balance)
        : player.balance;
    return sum + balance;
  }, 0);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{panelName}</h1>
          <p className="text-muted-foreground">
            Manage players and transactions for this panel
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Total Players
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredPlayers.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Active players in this panel
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ArrowUpCircle className="h-4 w-4 text-green-500" />
                Total Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totalBalance)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Combined player balances
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Use the floating buttons to add deposits or withdrawals
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Players Table */}
        <Card>
          <CardHeader>
            <CardTitle>Players in {panelName}</CardTitle>
            <CardDescription>
              {searchQuery.trim() === ""
                ? "View and manage all players assigned to this panel"
                : `Found ${filteredPlayers.length} player(s) matching "${searchQuery}"`}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by User ID or name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
          <CardHeader className="pt-0">
            <CardTitle className="text-base">Player List</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading players...
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery.trim() === ""
                  ? "No players found in this panel"
                  : `No players found matching "${searchQuery}"`}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlayers.map(player => {
                      const balance =
                        typeof player.balance === "string"
                          ? parseFloat(player.balance)
                          : player.balance;
                      return (
                        <TableRow
                          key={player.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            setSelectedPlayer(player);
                            setShowPlayerDialog(true);
                          }}
                        >
                          <TableCell className="font-medium">
                            {highlightText(player.userId, searchQuery)}
                          </TableCell>
                          <TableCell>
                            {player.name
                              ? highlightText(player.name, searchQuery)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                balance >= 0
                                  ? "text-green-600 font-semibold"
                                  : "text-red-600 font-semibold"
                              }
                            >
                              {formatCurrency(balance)}
                            </span>
                          </TableCell>
                          <TableCell>{formatDate(player.createdAt)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={balance >= 0 ? "default" : "destructive"}
                            >
                              {balance >= 0 ? "Active" : "Negative"}
                            </Badge>
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

      {/* Player Action Dialog */}
      <PlayerActionDialog
        player={selectedPlayer}
        open={showPlayerDialog}
        onOpenChange={setShowPlayerDialog}
      />
    </DashboardLayout>
  );
}
