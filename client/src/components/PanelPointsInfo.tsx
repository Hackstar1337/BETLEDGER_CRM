import { trpc } from "@/lib/trpc";
import { AlertCircle, TrendingDown, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PanelPointsInfoProps {
  panelName: string;
  transactionType: "deposit" | "withdrawal";
  amount: string;
  bonusPoints?: string;
}

export function PanelPointsInfo({
  panelName,
  transactionType,
  amount,
  bonusPoints,
}: PanelPointsInfoProps) {
  const { data: panel } = trpc.panels.getByName.useQuery({ name: panelName });

  if (!panel) return null;

  const currentPoints = panel.pointsBalance;
  const amountNum = parseInt(amount) || 0;
  const bonusNum = parseInt(bonusPoints || "0") || 0;

  let pointsAfter = currentPoints;
  let pointsChange = 0;

  if (transactionType === "deposit") {
    pointsChange = -(amountNum + bonusNum); // Decrease by deposit + bonus
    pointsAfter = currentPoints + pointsChange;
  } else if (transactionType === "withdrawal") {
    pointsChange = amountNum; // Increase by withdrawal
    pointsAfter = currentPoints + pointsChange;
  }

  const isLowPoints = pointsAfter < 10000;
  const isNegative = pointsAfter < 0;

  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Panel: {panelName}</span>
          <span className="font-semibold text-blue-600">
            {currentPoints.toLocaleString()} pts
          </span>
        </div>

        {amountNum > 0 && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {transactionType === "deposit"
                  ? "After Deposit"
                  : "After Withdrawal"}
                {transactionType === "deposit" &&
                  bonusNum > 0 &&
                  ` (incl. ${bonusNum} bonus)`}
              </span>
              <div className="flex items-center gap-1">
                {pointsChange < 0 ? (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                )}
                <span
                  className={`font-semibold ${isNegative ? "text-red-600" : isLowPoints ? "text-orange-600" : "text-blue-600"}`}
                >
                  {pointsAfter.toLocaleString()} pts
                </span>
              </div>
            </div>

            {isNegative && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Insufficient panel points! Transaction will be rejected.
                </AlertDescription>
              </Alert>
            )}

            {!isNegative && isLowPoints && (
              <Alert className="py-2 border-orange-500 bg-orange-50 text-orange-900">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Warning: Panel points running low. Consider recharging soon.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </div>
    </div>
  );
}
