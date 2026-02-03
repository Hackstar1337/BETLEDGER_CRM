import { trpc } from "@/lib/trpc";
import { TableCell } from "@/components/ui/table";

interface PlayerWinLossCellProps {
  userId: string;
  balance: string | number;
}

export function PlayerWinLossCell({ userId, balance }: PlayerWinLossCellProps) {
  const { data: gameplayTxns } = trpc.gameplayTransactions.getByPlayer.useQuery(
    { userId }
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalWins =
    gameplayTxns
      ?.filter(t => t.transactionType === "Win")
      .reduce((sum, t) => sum + t.amount, 0) || 0;
  const totalLosses =
    gameplayTxns
      ?.filter(t => t.transactionType === "Loss")
      .reduce((sum, t) => sum + t.amount, 0) || 0;

  return (
    <>
      <TableCell className="text-right font-semibold">
        {formatCurrency(Number(balance))}
      </TableCell>
      <TableCell className="text-right text-green-600 font-medium">
        {totalWins > 0 ? `+${formatCurrency(totalWins)}` : "-"}
      </TableCell>
      <TableCell className="text-right text-red-600 font-medium">
        {totalLosses > 0 ? `-${formatCurrency(totalLosses)}` : "-"}
      </TableCell>
    </>
  );
}
