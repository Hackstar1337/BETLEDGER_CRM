import { getDb } from "./db";
import { panels, deposits, withdrawals } from "../drizzle/schema";
import { sql, eq, and, gte, lt, inArray } from "drizzle-orm";

/**
 * Optimized database queries for real-time performance
 * Uses bulk queries instead of per-panel queries
 */

// Optimized getAllPanels with bulk queries
export async function getAllPanelsOptimized(
  timePeriod: "today" | "yesterday" | "7d" | "30d" | "all" = "today",
  timezone: string = "GMT+5:30"
) {
  const db = await getDb();
  if (!db) return [];

  const timezoneOffset = getTimezoneOffset(timezone);
  const now = new Date();
  const localTime = new Date(
    now.getTime() + now.getTimezoneOffset() * 60000 + timezoneOffset * 60000
  );

  let startDate: Date | null = null;
  switch (timePeriod) {
    case "today":
      startDate = new Date(localTime);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "yesterday":
      startDate = new Date(localTime);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "7d":
      startDate = new Date(localTime.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(localTime.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "all":
      startDate = null;
      break;
  }

  const utcStart = startDate
    ? new Date(
        startDate.getTime() -
          timezoneOffset * 60000 -
          now.getTimezoneOffset() * 60000
      )
    : null;

  let utcEnd = new Date(
    localTime.getTime() -
      timezoneOffset * 60000 -
      now.getTimezoneOffset() * 60000
  );

  if (timePeriod === "yesterday") {
    const yesterdayEnd = new Date(localTime);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
    yesterdayEnd.setHours(23, 59, 59, 999);
    utcEnd = new Date(
      yesterdayEnd.getTime() -
        timezoneOffset * 60000 -
        now.getTimezoneOffset() * 60000
    );
  }

  // STEP 1: Get all panels in one query
  const panelsList = await db.select().from(panels);

  if (panelsList.length === 0) {
    return [];
  }

  // STEP 2: Get all aggregated data in bulk queries
  const panelNames = panelsList.map(p => p.name);

  // Bulk deposits query
  let depositQuery = db
    .select({
      panelName: deposits.panelName,
      totalAmount: sql<number>`COALESCE(SUM(${deposits.amount}), 0)`,
      totalBonus: sql<number>`COALESCE(SUM(${deposits.bonusPoints}), 0)`,
    })
    .from(deposits)
    .where(inArray(deposits.panelName, panelNames));

  if (utcStart) {
    depositQuery = depositQuery.where(gte(deposits.createdAt, utcStart));
  }

  const depositAggregates = await depositQuery;

  // Bulk withdrawals query
  let withdrawalQuery = db
    .select({
      panelName: withdrawals.panelName,
      totalAmount: sql<number>`COALESCE(SUM(${withdrawals.amount}), 0)`,
    })
    .from(withdrawals)
    .where(inArray(withdrawals.panelName, panelNames));

  if (utcStart) {
    withdrawalQuery = withdrawalQuery.where(gte(withdrawals.createdAt, utcStart));
  }

  const withdrawalAggregates = await withdrawalQuery;

  // STEP 3: Create lookup maps for O(1) access
  const depositMap = new Map(
    depositAggregates.map(d => [d.panelName, { amount: Number(d.totalAmount), bonus: Number(d.totalBonus) }])
  );

  const withdrawalMap = new Map(
    withdrawalAggregates.map(w => [w.panelName, Number(w.totalAmount)])
  );

  // STEP 4: Combine data in memory (fast!)
  return panelsList.map(panel => {
    const depositData = depositMap.get(panel.name) || { amount: 0, bonus: 0 };
    const withdrawalAmount = withdrawalMap.get(panel.name) || 0;

    const totalDeposits = depositData.amount;
    const totalWithdrawals = withdrawalAmount;
    const totalBonusPoints = depositData.bonus;

    // Calculate current points balance (real-time inventory)
    const currentPointsBalance = panel.pointsBalance || 0;

    // Calculate closing balance for the period
    const periodClosingBalance =
      currentPointsBalance - (totalDeposits + totalBonusPoints) + totalWithdrawals + (panel.topUp || 0);

    // Calculate Profit/Loss for the period
    const profitLoss = (totalDeposits + totalBonusPoints) - totalWithdrawals;

    return {
      ...panel,
      totalDeposits,
      totalWithdrawals,
      totalBonusPoints,
      currentPointsBalance,
      periodClosingBalance,
      profitLoss,
    };
  });
}

// Optimized getAllBankAccounts with bulk queries
export async function getAllBankAccountsOptimized(
  timePeriod: "today" | "yesterday" | "7d" | "30d" | "all" = "today",
  timezone: string = "GMT+5:30"
) {
  const db = await getDb();
  if (!db) return [];

  const timezoneOffset = getTimezoneOffset(timezone);
  const now = new Date();
  const localTime = new Date(
    now.getTime() + now.getTimezoneOffset() * 60000 + timezoneOffset * 60000
  );

  let startDate: Date | null = null;
  switch (timePeriod) {
    case "today":
      startDate = new Date(localTime);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "yesterday":
      startDate = new Date(localTime);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "7d":
      startDate = new Date(localTime.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(localTime.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "all":
      startDate = null;
      break;
  }

  const utcStart = startDate
    ? new Date(
        startDate.getTime() -
          timezoneOffset * 60000 -
          now.getTimezoneOffset() * 60000
      )
    : null;

  // Get all bank accounts in one query
  const bankAccountsList = await db.select().from(await import("../drizzle/schema").then(m => m.bankAccounts));

  if (bankAccountsList.length === 0) {
    return [];
  }

  // Bulk deposits and withdrawals for bank accounts
  const bankNames = bankAccountsList.map(ba => `${ba.bankName}-${ba.accountNumber}`);

  const depositAggregates = await db
    .select({
      bankName: deposits.bankName,
      accountNumber: deposits.accountNumber,
      totalAmount: sql<number>`COALESCE(SUM(${deposits.amount}), 0)`,
    })
    .from(deposits)
    .where(
      and(
        inArray(deposits.bankName, bankAccountsList.map(ba => ba.bankName)),
        inArray(deposits.accountNumber, bankAccountsList.map(ba => ba.accountNumber))
      )
    )
    .groupBy(deposits.bankName, deposits.accountNumber);

  const withdrawalAggregates = await db
    .select({
      bankName: withdrawals.bankName,
      accountNumber: withdrawals.accountNumber,
      totalAmount: sql<number>`COALESCE(SUM(${withdrawals.amount}), 0)`,
    })
    .from(withdrawals)
    .where(
      and(
        inArray(withdrawals.bankName, bankAccountsList.map(ba => ba.bankName)),
        inArray(withdrawals.accountNumber, bankAccountsList.map(ba => ba.accountNumber))
      )
    )
    .groupBy(withdrawals.bankName, withdrawals.accountNumber);

  // Create lookup maps
  const depositMap = new Map(
    depositAggregates.map(d => [`${d.bankName}-${d.accountNumber}`, Number(d.totalAmount)])
  );

  const withdrawalMap = new Map(
    withdrawalAggregates.map(w => [`${w.bankName}-${w.accountNumber}`, Number(w.totalAmount)])
  );

  // Combine data
  return bankAccountsList.map(bankAccount => {
    const key = `${bankAccount.bankName}-${bankAccount.accountNumber}`;
    const totalDeposits = depositMap.get(key) || 0;
    const totalWithdrawals = withdrawalMap.get(key) || 0;

    return {
      ...bankAccount,
      totalDeposits,
      totalWithdrawals,
    };
  });
}

// Helper function for timezone offset
function getTimezoneOffset(timezone: string): number {
  const match = timezone.match(/GMT([+-]\d{2}):?(\d{2})/);
  if (!match) return 330; // Default to GMT+5:30 (330 minutes)
  const [, hours, minutes] = match;
  return parseInt(hours) * 60 + parseInt(minutes);
}
