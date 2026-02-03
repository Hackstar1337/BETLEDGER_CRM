import { eq, and, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Helper function for timezone conversion
const getTimezoneOffset = (tz: string): number => {
  const match = tz.match(/GMT([+-]\d{2}):?(\d{2})/);
  if (!match) return 330; // Default to GMT+5:30 (330 minutes)
  const [, hours, minutes] = match;
  const offset = parseInt(hours) * 60 + parseInt(minutes);
  return offset;
};

// Panel queries
export async function getAllPanels(
  timePeriod: "today" | "yesterday" | "7d" | "30d" | "all" = "today",
  timezone: string = "GMT+5:30"
) {
  const db = await getDb();
  if (!db) return [];
  const { panels, deposits, withdrawals } = await import("../drizzle/schema");
  const { sql, eq, and, gte, lt } = await import("drizzle-orm");

  const timezoneOffset = getTimezoneOffset(timezone);

  // Calculate date range based on time period and timezone
  const now = new Date();
  const localTime = new Date(
    now.getTime() + now.getTimezoneOffset() * 60000 + timezoneOffset * 60000
  );
  let startDate: Date | null = null;

  switch (timePeriod) {
    case "today":
      // Start from today at 00:00:00 in the local timezone
      startDate = new Date(localTime);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "yesterday":
      // Start from yesterday at 00:00:00 in the local timezone
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

  // Convert back to UTC for database queries
  const utcStart = startDate
    ? new Date(
        startDate.getTime() -
          timezoneOffset * 60000 -
          now.getTimezoneOffset() * 60000
      )
    : null;
  
  // For "yesterday", set end time to yesterday at 23:59:59
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

  // Get all panels with aggregated deposit and withdrawal totals
  const panelsList = await db.select().from(panels);

  // For each panel, calculate balances based on the selected time period
  const panelsWithTotals = await Promise.all(
    panelsList.map(async panel => {
      // Get the opening balance for the start of this time period
      let periodOpeningBalance = 0;
      if (startDate) {
        periodOpeningBalance = await getOpeningBalanceForDate(panel.id, startDate, timezone);
      } else {
        // For "all" time, opening balance is 0
        periodOpeningBalance = 0;
      }

      // Build date filter for deposits within the time period
      const depositConditions = [eq(deposits.panelName, panel.name)];
      if (utcStart) {
        depositConditions.push(gte(deposits.createdAt, utcStart));
      }

      // Calculate total deposits for this panel within time period
      const depositResult = await db
        .select({ total: sql<number>`COALESCE(SUM(${deposits.amount}), 0)` })
        .from(deposits)
        .where(and(...depositConditions));

      // Calculate total bonus points for this panel within time period
      const bonusResult = await db
        .select({ total: sql<number>`COALESCE(SUM(${deposits.bonusPoints}), 0)` })
        .from(deposits)
        .where(and(...depositConditions));

      // Build date filter for withdrawals within the time period
      const withdrawalConditions = [eq(withdrawals.panelName, panel.name)];
      if (utcStart) {
        withdrawalConditions.push(gte(withdrawals.createdAt, utcStart));
      }

      // Calculate total withdrawals for this panel within time period
      const withdrawalResult = await db
        .select({ total: sql<number>`COALESCE(SUM(${withdrawals.amount}), 0)` })
        .from(withdrawals)
        .where(and(...withdrawalConditions));

      const totalDeposits = Number(depositResult[0]?.total || 0);
      const totalWithdrawals = Number(withdrawalResult[0]?.total || 0);
      const totalBonusPoints = Number(bonusResult[0]?.total || 0);

      // Calculate current points balance (real-time inventory)
      // This is the panel's current points balance from the database
      const currentPointsBalance = panel.pointsBalance || 0;

      // Calculate closing balance for the period
      // Closing Balance = Opening Balance - Deposits - Bonus + Withdrawals + Top Up
      const periodClosingBalance =
        periodOpeningBalance - (totalDeposits + totalBonusPoints) + totalWithdrawals + (panel.topUp || 0);

      // Calculate Profit/Loss for the period (including bonus points)
      const profitLoss = (totalDeposits + totalBonusPoints) - totalWithdrawals;
      
      // Update the panel's profitLoss in the database
      await db
        .update(panels)
        .set({ profitLoss })
        .where(eq(panels.id, panel.id));

      // For today's date, also handle auto-update of opening balance if needed
      if (timePeriod === "today") {
        const todayDate = new Date(localTime);
        todayDate.setHours(0, 0, 0, 0);
        
        // Get today's daily balance record if it exists
        const todayBalance = await getPanelDailyBalance(panel.id, todayDate, timezone);
        
        // Always update daily balance for today (regardless of opening balance)
        if (!todayBalance) {
          // Get previous day's closing balance for auto-forwarding
          const previousClosing = await getPreviousDayClosingBalance(panel.id, todayDate, timezone);
          
          // If there's a previous closing and it's different from current opening, update it
          if (previousClosing !== 0 && previousClosing !== (panel.openingBalance || 0)) {
            // Update the panel's opening balance to previous day's closing
            await db
              .update(panels)
              .set({ openingBalance: previousClosing })
              .where(eq(panels.id, panel.id));
            
            periodOpeningBalance = previousClosing;
          }
        }

        // Save today's balance snapshot if no record exists
        if (!todayBalance) {
          await savePanelDailyBalance(panel.id, {
            date: todayDate,
            openingBalance: periodOpeningBalance,
            closingBalance: periodClosingBalance,
            totalDeposits,
            totalWithdrawals,
            bonusPoints: totalBonusPoints,
            topUp: panel.topUp || 0,
            extraDeposit: panel.extraDeposit || 0,
            profitLoss,
            timezone,
          });
        }
      }

      return {
        ...panel,
        openingBalance: periodOpeningBalance,
        totalDeposits,
        totalWithdrawals,
        bonusPoints: totalBonusPoints,
        closingBalance: periodClosingBalance,
        profitLoss: profitLoss,
        pointsBalance: currentPointsBalance, // Keep the real-time points balance
      };
    })
  );

  return panelsWithTotals;
}

export async function getPanelByName(name: string) {
  const db = await getDb();
  if (!db) return undefined;
  const { panels } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const result = await db
    .select()
    .from(panels)
    .where(eq(panels.name, name))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPanelById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { panels } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const result = await db
    .select()
    .from(panels)
    .where(eq(panels.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createPanel(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { panels } = await import("../drizzle/schema");
  
  // Remove id field to let database auto-generate it
  const { id, ...rest } = data;
  
  // Ensure all required fields have values
  const panelData = {
    name: rest.name,
    pointsBalance: rest.pointsBalance ?? 0,
    openingBalance: rest.openingBalance ?? 0,
    closingBalance: rest.closingBalance ?? 0,
    topUp: rest.topUp ?? 0,
    extraDeposit: rest.extraDeposit ?? 0,
    bonusPoints: rest.bonusPoints ?? 0,
    profitLoss: rest.profitLoss ?? 0,
  };
  
  const result = await db.insert(panels).values(panelData);
  return result;
}

export async function updatePanel(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { panels } = await import("../drizzle/schema");
  await db.update(panels).set(data).where(eq(panels.id, id));
}

export async function deletePanels(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { panels } = await import("../drizzle/schema");
  const { inArray } = await import("drizzle-orm");
  await db.delete(panels).where(inArray(panels.id, ids));
}

// Bank account queries
export async function getAllBankAccounts(
  timePeriod: "today" | "yesterday" | "7d" | "30d" | "all" = "today",
  timezone: string = "GMT+5:30"
) {
  const db = await getDb();
  if (!db) return [];
  const { bankAccounts } = await import("../drizzle/schema");
  const { gte, and } = await import("drizzle-orm");

  const timezoneOffset = getTimezoneOffset(timezone);

  // Calculate date range based on time period and timezone
  const now = new Date();
  const localTime = new Date(
    now.getTime() + now.getTimezoneOffset() * 60000 + timezoneOffset * 60000
  );
  let startDate: Date | null = null;

  switch (timePeriod) {
    case "today":
      // Start from today at 00:00:00 in the local timezone
      startDate = new Date(localTime);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "yesterday":
      // Start from yesterday at 00:00:00 in the local timezone
      startDate = new Date(localTime);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      // End time is yesterday at 23:59:59
      const endDate = new Date(localTime);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      // We'll handle the end date in the query
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

  // Convert back to UTC for database queries
  const utcStart = startDate
    ? new Date(
        startDate.getTime() -
          timezoneOffset * 60000 -
          now.getTimezoneOffset() * 60000
      )
    : null;

  if (utcStart) {
    return db
      .select()
      .from(bankAccounts)
      .where(and(gte(bankAccounts.createdAt, utcStart)));
  } else {
    return db.select().from(bankAccounts);
  }
}

export async function getBankAccountById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { bankAccounts } = await import("../drizzle/schema");
  const result = await db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createBankAccount(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { bankAccounts } = await import("../drizzle/schema");
  
  // Debug log
  console.log('Backend received bank account data:', data);
  
  // Check for duplicate account number (accountNumber must be unique)
  const existingAccount = await db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.accountNumber, data.accountNumber))
    .limit(1);
  
  if (existingAccount.length > 0) {
    throw new Error(`Account number "${data.accountNumber}" already exists. Please use a different account number.`);
  }
  
  const result = await db.insert(bankAccounts).values(data);
  return result;
}

export async function updateBankAccount(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { bankAccounts } = await import("../drizzle/schema");
  
  // If updating accountNumber, check for duplicates
  if (data.accountNumber) {
    const existingAccount = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.accountNumber, data.accountNumber),
          ne(bankAccounts.id, id)
        )
      )
      .limit(1);
    
    if (existingAccount.length > 0) {
      throw new Error(`Account number "${data.accountNumber}" already exists. Please use a different account number.`);
    }
  }
  
  await db.update(bankAccounts).set(data).where(eq(bankAccounts.id, id));
}

export async function updateBankAccountFees(id: number, fees: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { bankAccounts } = await import("../drizzle/schema");
  await db
    .update(bankAccounts)
    .set({
      feeIMPS: fees.feeIMPS,
      feeRTGS: fees.feeRTGS,
      feeNEFT: fees.feeNEFT,
      feeUPI: fees.feeUPI,
      feePhonePe: fees.feePhonePe,
      feeGooglePay: fees.feeGooglePay,
      feePaytm: fees.feePaytm,
      updatedAt: new Date(),
    })
    .where(eq(bankAccounts.id, id));
}

export async function getTotalDepositsByBank(bankName: string) {
  const db = await getDb();
  if (!db) return 0;
  const { deposits } = await import("../drizzle/schema");
  const { sum } = await import("drizzle-orm");

  const result = await db
    .select({ total: sum(deposits.amount) })
    .from(deposits)
    .where(eq(deposits.bankName, bankName));

  return result[0]?.total || 0;
}

export async function getTotalDepositsByBankAccount(input: {
  bankName: string;
  accountNumber: string;
}) {
  const db = await getDb();
  if (!db) return 0;
  const { deposits } = await import("../drizzle/schema");
  const { sum } = await import("drizzle-orm");

  // Use accountNumber as the primary identifier since it's unique
  const result = await db
    .select({ total: sum(deposits.amount) })
    .from(deposits)
    .where(eq(deposits.accountNumber, input.accountNumber));

  return result[0]?.total || 0;
}

export async function getTotalWithdrawalsByBank(bankName: string) {
  const db = await getDb();
  if (!db) return 0;
  const { withdrawals } = await import("../drizzle/schema");
  const { sum } = await import("drizzle-orm");

  const result = await db
    .select({ total: sum(withdrawals.amount) })
    .from(withdrawals)
    .where(eq(withdrawals.bankName, bankName));

  return result[0]?.total || 0;
}

export async function getTotalWithdrawalsByBankAccount(input: {
  bankName: string;
  accountNumber: string;
}) {
  const db = await getDb();
  if (!db) return 0;
  const { withdrawals } = await import("../drizzle/schema");
  const { sum } = await import("drizzle-orm");

  // Use accountNumber as the primary identifier since it's unique
  const result = await db
    .select({ total: sum(withdrawals.amount) })
    .from(withdrawals)
    .where(eq(withdrawals.accountNumber, input.accountNumber));

  return result[0]?.total || 0;
}

// Player queries
export async function getAllPlayers() {
  const db = await getDb();
  if (!db) return [];
  const { players } = await import("../drizzle/schema");
  return db.select().from(players);
}

export async function getPlayerByUserId(userId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const { players } = await import("../drizzle/schema");
  const result = await db
    .select()
    .from(players)
    .where(eq(players.userId, userId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createPlayer(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { players } = await import("../drizzle/schema");
  const { or } = await import("drizzle-orm");

  // Check if player with this userId or name already exists
  const conditions = [eq(players.userId, data.userId)];
  if (data.name) {
    conditions.push(eq(players.name, data.name));
  }

  const existingPlayer = await db
    .select()
    .from(players)
    .where(or(...conditions))
    .limit(1);
  if (existingPlayer.length > 0) {
    if (existingPlayer[0].userId === data.userId) {
      throw new Error(`Player with User ID "${data.userId}" already exists`);
    }
    if (existingPlayer[0].name === data.name) {
      throw new Error(`Player with name "${data.name}" already exists`);
    }
  }

  const result = await db.insert(players).values(data);
  return result;
}

export async function updatePlayer(data: {
  id: number;
  userId: string;
  name?: string;
  panelName: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { players } = await import("../drizzle/schema");
  const result = await db
    .update(players)
    .set({
      userId: data.userId,
      name: data.name,
      panelName: data.panelName,
      updatedAt: new Date(),
    })
    .where(eq(players.id, data.id));
  return result;
}

export async function getPlayersByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  const { players } = await import("../drizzle/schema");
  const { and, gte, lt } = await import("drizzle-orm");
  return db
    .select()
    .from(players)
    .where(
      and(gte(players.createdAt, startDate), lt(players.createdAt, endDate))
    );
}

export async function deletePlayers(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { players } = await import("../drizzle/schema");
  const { inArray } = await import("drizzle-orm");
  await db.delete(players).where(inArray(players.id, ids));
}

export async function deleteBankAccounts(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { bankAccounts } = await import("../drizzle/schema");
  const { inArray } = await import("drizzle-orm");
  await db.delete(bankAccounts).where(inArray(bankAccounts.id, ids));
}

// Deposit queries
export async function getAllDeposits(
  timePeriod: "today" | "yesterday" | "7d" | "30d" | "all" = "today",
  timezone: string = "GMT+5:30"
) {
  const db = await getDb();
  if (!db) return [];
  const { deposits } = await import("../drizzle/schema");
  const { gte, lte, and } = await import("drizzle-orm");

  const timezoneOffset = getTimezoneOffset(timezone);

  // Calculate date range based on time period and timezone
  const now = new Date();
  const localTime = new Date(
    now.getTime() + now.getTimezoneOffset() * 60000 + timezoneOffset * 60000
  );
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  switch (timePeriod) {
    case "today":
      // Start from today at 00:00:00 in the local timezone
      startDate = new Date(localTime);
      startDate.setHours(0, 0, 0, 0);
      // Don't set endDate for "today" to include all records up to now
      break;
    case "yesterday":
      // Start from yesterday at 00:00:00 in the local timezone
      startDate = new Date(localTime);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      // End time is yesterday at 23:59:59
      endDate = new Date(localTime);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "7d":
      startDate = new Date(localTime.getTime() - 7 * 24 * 60 * 60 * 1000);
      // Don't set endDate for "7d" to include all records up to now
      break;
    case "30d":
      startDate = new Date(localTime.getTime() - 30 * 24 * 60 * 60 * 1000);
      // Don't set endDate for "30d" to include all records up to now
      break;
    case "all":
      startDate = null;
      endDate = null;
      break;
  }

  // Convert back to UTC for database queries
  const utcStart = startDate
    ? new Date(
        startDate.getTime() -
          timezoneOffset * 60000 -
          now.getTimezoneOffset() * 60000
      )
    : null;
  
  const utcEnd = endDate
    ? new Date(
        endDate.getTime() -
          timezoneOffset * 60000 -
          now.getTimezoneOffset() * 60000
      )
    : null;

  if (utcStart && utcEnd) {
    return db
      .select()
      .from(deposits)
      .where(and(gte(deposits.createdAt, utcStart), lte(deposits.createdAt, utcEnd)));
  } else if (utcStart) {
    return db
      .select()
      .from(deposits)
      .where(and(gte(deposits.createdAt, utcStart)));
  } else {
    return db.select().from(deposits);
  }
}

export async function getDepositsByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  const { deposits } = await import("../drizzle/schema");
  const { and, gte, lte } = await import("drizzle-orm");
  return db
    .select()
    .from(deposits)
    .where(
      and(
        gte(deposits.depositDate, startDate),
        lte(deposits.depositDate, endDate)
      )
    );
}

export async function createDeposit(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { deposits, players, panels } = await import("../drizzle/schema");
  const { sql, or } = await import("drizzle-orm");

  // If depositDate is not provided, use current time in UTC
  if (!data.depositDate) {
    // Create a proper UTC date that represents current local time
    const now = new Date();
    const utcDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    data.depositDate = utcDate;
  }

  // Check for duplicate UTR number in both deposits and withdrawals
  if (data.utr) {
    const { withdrawals } = await import("../drizzle/schema");
    const existingDeposit = await db
      .select()
      .from(deposits)
      .where(eq(deposits.utr, data.utr))
      .limit(1);
    const existingWithdrawal = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.utr, data.utr))
      .limit(1);

    if (existingDeposit.length > 0 || existingWithdrawal.length > 0) {
      throw new Error(`UTR number '${data.utr}' already exists`);
    }
  }

  // Calculate total points (deposit + bonus)
  const totalPoints = data.amount + (data.bonusPoints || 0);

  // Check if panel has enough points
  if (data.panelName) {
    const panel = await db
      .select()
      .from(panels)
      .where(eq(panels.name, data.panelName))
      .limit(1);
    if (panel.length > 0) {
      if (panel[0].pointsBalance < totalPoints) {
        throw new Error(
          `Insufficient panel points. Panel has ${panel[0].pointsBalance} points but needs ${totalPoints} points (${data.amount} deposit + ${data.bonusPoints || 0} bonus)`
        );
      }
    }
  }

  // Insert the deposit
  const result = await db.insert(deposits).values(data);

  // Check if this is a backdated entry (date before today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const depositDate = new Date(data.depositDate);
  depositDate.setHours(0, 0, 0, 0);
  const isBackdated = depositDate < today;

  // Only update balances if this is not a backdated entry
  if (!isBackdated) {
    // Update player balance by adding total points (deposit + bonus)
    await db
      .update(players)
      .set({
        balance: sql`${players.balance} + ${totalPoints}`,
        updatedAt: new Date(),
      })
      .where(eq(players.userId, data.userId));

    // Update panel points: decrease by (deposit + bonus)
    if (data.panelName) {
      await db
        .update(panels)
        .set({
          pointsBalance: sql`${panels.pointsBalance} - ${totalPoints}`,
          closingBalance: sql`${panels.closingBalance} - ${totalPoints}`,
          updatedAt: new Date(),
        })
        .where(eq(panels.name, data.panelName));
    }

    // Update bank account closing balance: increase by deposit amount (cash only, not bonus)
    // Use accountNumber as the unique identifier
    if (data.accountNumber) {
      console.log('Updating bank balance for deposit:', {
        accountNumber: data.accountNumber,
        amount: data.amount,
        bankName: data.bankName
      });
      const { bankAccounts } = await import("../drizzle/schema");
      const updateResult = await db
        .update(bankAccounts)
        .set({
          closingBalance: sql`${bankAccounts.closingBalance} + ${data.amount}`,
          updatedAt: new Date(),
      })
      .where(eq(bankAccounts.accountNumber, data.accountNumber));
      console.log('Bank balance updated for deposit, affected rows:', updateResult[0].affectedRows);
    } else {
      console.log('Warning: Deposit created without accountNumber', data);
    }
  }

  return result;
}

// Withdrawal queries
export async function getAllWithdrawals(
  timePeriod: "today" | "yesterday" | "7d" | "30d" | "all" = "today",
  timezone: string = "GMT+5:30"
) {
  const db = await getDb();
  if (!db) return [];
  const { withdrawals } = await import("../drizzle/schema");
  const { gte, lte, and } = await import("drizzle-orm");

  const timezoneOffset = getTimezoneOffset(timezone);

  // Calculate date range based on time period and timezone
  const now = new Date();
  const localTime = new Date(
    now.getTime() + now.getTimezoneOffset() * 60000 + timezoneOffset * 60000
  );
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  switch (timePeriod) {
    case "today":
      // Start from today at 00:00:00 in the local timezone
      startDate = new Date(localTime);
      startDate.setHours(0, 0, 0, 0);
      // Don't set endDate for "today" to include all records up to now
      break;
    case "yesterday":
      // Start from yesterday at 00:00:00 in the local timezone
      startDate = new Date(localTime);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      // End time is yesterday at 23:59:59
      endDate = new Date(localTime);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "7d":
      startDate = new Date(localTime.getTime() - 7 * 24 * 60 * 60 * 1000);
      // Don't set endDate for "7d" to include all records up to now
      break;
    case "30d":
      startDate = new Date(localTime.getTime() - 30 * 24 * 60 * 60 * 1000);
      // Don't set endDate for "30d" to include all records up to now
      break;
    case "all":
      startDate = null;
      endDate = null;
      break;
  }

  // Convert back to UTC for database queries
  const utcStart = startDate
    ? new Date(
        startDate.getTime() -
          timezoneOffset * 60000 -
          now.getTimezoneOffset() * 60000
      )
    : null;
  
  const utcEnd = endDate
    ? new Date(
        endDate.getTime() -
          timezoneOffset * 60000 -
          now.getTimezoneOffset() * 60000
      )
    : null;

  if (utcStart && utcEnd) {
    return db
      .select()
      .from(withdrawals)
      .where(and(gte(withdrawals.createdAt, utcStart), lte(withdrawals.createdAt, utcEnd)));
  } else if (utcStart) {
    return db
      .select()
      .from(withdrawals)
      .where(and(gte(withdrawals.createdAt, utcStart)));
  } else {
    return db.select().from(withdrawals);
  }
}

export async function getWithdrawalsByDateRange(
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return [];
  const { withdrawals } = await import("../drizzle/schema");
  const { and, gte, lte } = await import("drizzle-orm");
  return db
    .select()
    .from(withdrawals)
    .where(
      and(
        gte(withdrawals.withdrawalDate, startDate),
        lte(withdrawals.withdrawalDate, endDate)
      )
    );
}

export async function createWithdrawal(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { withdrawals, players, panels } = await import("../drizzle/schema");
  const { sql } = await import("drizzle-orm");

  // Check for duplicate UTR number in both deposits and withdrawals
  if (data.utr) {
    const { deposits } = await import("../drizzle/schema");
    const existingDeposit = await db
      .select()
      .from(deposits)
      .where(eq(deposits.utr, data.utr))
      .limit(1);
    const existingWithdrawal = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.utr, data.utr))
      .limit(1);

    if (existingDeposit.length > 0 || existingWithdrawal.length > 0) {
      throw new Error(`UTR number '${data.utr}' already exists`);
    }
  }

  // Check if player exists and handle automatic win detection
  // Skip for backdated entries
  let player = null;
  let currentBalance = 0;
  
  // Check if this is a backdated entry (date before today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const withdrawalDate = new Date(data.withdrawalDate);
  withdrawalDate.setHours(0, 0, 0, 0);
  const isBackdated = withdrawalDate < today;
  
  if (!isBackdated) {
    player = await db
      .select()
      .from(players)
      .where(eq(players.userId, data.userId))
      .limit(1);
    if (player.length === 0) {
      throw new Error(`Player with User ID '${data.userId}' not found`);
    }

    currentBalance = Number(player[0].balance);
    const withdrawalAmount = Number(data.amount);

    // If withdrawal exceeds balance, automatically record the win
    if (withdrawalAmount > currentBalance) {
      const winAmount = withdrawalAmount - currentBalance;

      // Create gameplay transaction for the win
      const { gameplayTransactions } = await import("../drizzle/schema");
      await db.insert(gameplayTransactions).values({
        userId: data.userId,
        panelName: data.panelName,
        transactionType: "Win",
        amount: winAmount,
        notes: `Auto-detected win during withdrawal (Withdrawal: ${withdrawalAmount}, Final Balance: 0)`,
        transactionDate: new Date(),
      });

      // Update player balance to match withdrawal amount
      await db
        .update(players)
        .set({
          balance: sql`${players.balance} + ${winAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(players.userId, data.userId));
    }
  }

  // Check if bank has enough cash - use accountNumber as unique identifier
  if (data.accountNumber) {
    const { bankAccounts } = await import("../drizzle/schema");
    const bank = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.accountNumber, data.accountNumber))
      .limit(1);
    if (bank.length > 0) {
      if (bank[0].closingBalance < data.amount) {
        throw new Error(
          `Insufficient bank balance. Bank has ₹${bank[0].closingBalance} but needs ₹${data.amount} for withdrawal`
        );
      }
    }
  }

  // Insert the withdrawal
  const result = await db.insert(withdrawals).values(data);

  // Only update balances if this is not a backdated entry
  if (!isBackdated) {
    // Update player balance: decrease by withdrawal amount
    await db
      .update(players)
      .set({
        balance: sql`${players.balance} - ${data.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(players.userId, data.userId));

    // Update panel points: increase by withdrawal amount
    if (data.panelName) {
      await db
        .update(panels)
        .set({
          pointsBalance: sql`${panels.pointsBalance} + ${data.amount}`,
          closingBalance: sql`${panels.closingBalance} + ${data.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(panels.name, data.panelName));
    }

    // Update bank account: decrease closing balance and increase total charges
    // Use accountNumber as unique identifier
    if (data.accountNumber) {
      console.log('Updating bank balance for withdrawal:', {
        accountNumber: data.accountNumber,
        amount: data.amount,
        bankName: data.bankName,
        transactionCharge: data.transactionCharge || 0
      });
      const { bankAccounts } = await import("../drizzle/schema");
      const transactionCharge = data.transactionCharge || 0;

      const updateResult = await db
        .update(bankAccounts)
        .set({
          closingBalance: sql`${bankAccounts.closingBalance} - ${data.amount}`,
          totalCharges: sql`${bankAccounts.totalCharges} + ${transactionCharge}`,
          updatedAt: new Date(),
        })
        .where(eq(bankAccounts.accountNumber, data.accountNumber));
      console.log('Bank balance updated for withdrawal, affected rows:', updateResult[0].affectedRows);
    } else {
      console.log('Warning: Withdrawal created without accountNumber', data);
    }
  }

  return result;
}

export async function updateWithdrawalStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { withdrawals } = await import("../drizzle/schema");
  await db
    .update(withdrawals)
    .set({ status: status as any })
    .where(eq(withdrawals.id, id));
}

// Transaction queries
export async function getAllTransactions() {
  const db = await getDb();
  if (!db) return [];
  const { transactions } = await import("../drizzle/schema");
  return db.select().from(transactions);
}

export async function getTransactionsByDateRange(
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return [];
  const { transactions } = await import("../drizzle/schema");
  const { and, gte, lte } = await import("drizzle-orm");
  return db
    .select()
    .from(transactions)
    .where(
      and(
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      )
    );
}

export async function createTransaction(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { transactions } = await import("../drizzle/schema");
  const result = await db.insert(transactions).values(data);
  return result;
}

// Daily report queries
export async function getDailyReportByDate(reportDate: Date) {
  const db = await getDb();
  if (!db) return null;
  const { dailyReports } = await import("../drizzle/schema");
  const result = await db
    .select()
    .from(dailyReports)
    .where(eq(dailyReports.reportDate, reportDate))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getDepositsByPanelAndDateRange(
  panelName: string,
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return [];
  const { deposits } = await import("../drizzle/schema");
  const { and, gte, lte, eq } = await import("drizzle-orm");

  return db
    .select()
    .from(deposits)
    .where(
      and(
        gte(deposits.createdAt, startDate),
        lte(deposits.createdAt, endDate),
        eq(deposits.panelName, panelName)
      )
    );
}

export async function getWithdrawalsByPanelAndDateRange(
  panelName: string,
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return [];
  const { withdrawals } = await import("../drizzle/schema");
  const { and, gte, lte, eq } = await import("drizzle-orm");

  return db
    .select()
    .from(withdrawals)
    .where(
      and(
        gte(withdrawals.createdAt, startDate),
        lte(withdrawals.createdAt, endDate),
        eq(withdrawals.panelName, panelName)
      )
    );
}

export async function createDailyReport(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { dailyReports } = await import("../drizzle/schema");
  const result = await db.insert(dailyReports).values(data);
  return result;
}

// Gameplay Transaction queries
export async function getAllGameplayTransactions(
  timePeriod: "today" | "yesterday" | "7d" | "30d" | "all" = "today",
  timezone: string = "GMT+5:30"
) {
  const db = await getDb();
  if (!db) return [];
  const { gameplayTransactions } = await import("../drizzle/schema");
  const { desc, gte, lte, and } = await import("drizzle-orm");

  const timezoneOffset = getTimezoneOffset(timezone);

  // Calculate date range based on time period and timezone
  const now = new Date();
  const localTime = new Date(
    now.getTime() + now.getTimezoneOffset() * 60000 + timezoneOffset * 60000
  );
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  switch (timePeriod) {
    case "today":
      // Start from today at 00:00:00 in the local timezone
      startDate = new Date(localTime);
      startDate.setHours(0, 0, 0, 0);
      // Don't set endDate for "today" to include all records up to now
      break;
    case "yesterday":
      // Start from yesterday at 00:00:00 in the local timezone
      startDate = new Date(localTime);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      // End time is yesterday at 23:59:59
      endDate = new Date(localTime);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "7d":
      startDate = new Date(localTime.getTime() - 7 * 24 * 60 * 60 * 1000);
      // Don't set endDate for "7d" to include all records up to now
      break;
    case "30d":
      startDate = new Date(localTime.getTime() - 30 * 24 * 60 * 60 * 1000);
      // Don't set endDate for "30d" to include all records up to now
      break;
    case "all":
      startDate = null;
      endDate = null;
      break;
  }

  // Convert back to UTC for database queries
  const utcStart = startDate
    ? new Date(
        startDate.getTime() -
          timezoneOffset * 60000 -
          now.getTimezoneOffset() * 60000
      )
    : null;
  
  const utcEnd = endDate
    ? new Date(
        endDate.getTime() -
          timezoneOffset * 60000 -
          now.getTimezoneOffset() * 60000
      )
    : null;

  if (utcStart && utcEnd) {
    return db
      .select()
      .from(gameplayTransactions)
      .where(and(gte(gameplayTransactions.createdAt, utcStart), lte(gameplayTransactions.createdAt, utcEnd)))
      .orderBy(desc(gameplayTransactions.createdAt));
  } else if (utcStart) {
    return db
      .select()
      .from(gameplayTransactions)
      .where(and(gte(gameplayTransactions.createdAt, utcStart)))
      .orderBy(desc(gameplayTransactions.createdAt));
  } else {
    return db
      .select()
      .from(gameplayTransactions)
      .orderBy(desc(gameplayTransactions.createdAt));
  }
}

export async function getGameplayTransactionsByPlayer(userId: string) {
  const db = await getDb();
  if (!db) return [];
  const { gameplayTransactions } = await import("../drizzle/schema");
  const { desc } = await import("drizzle-orm");
  return await db
    .select()
    .from(gameplayTransactions)
    .where(eq(gameplayTransactions.userId, userId))
    .orderBy(desc(gameplayTransactions.transactionDate));
}

export async function getGameplayTransactionsByPanel(panelName: string) {
  const db = await getDb();
  if (!db) return [];
  const { gameplayTransactions } = await import("../drizzle/schema");
  const { desc } = await import("drizzle-orm");
  return await db
    .select()
    .from(gameplayTransactions)
    .where(eq(gameplayTransactions.panelName, panelName))
    .orderBy(desc(gameplayTransactions.transactionDate));
}

export async function createGameplayTransaction(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { gameplayTransactions, players } = await import("../drizzle/schema");
  const { sql } = await import("drizzle-orm");

  // Check if player exists
  const player = await db
    .select()
    .from(players)
    .where(eq(players.userId, data.userId))
    .limit(1);
  if (player.length === 0) {
    throw new Error(`Player with User ID '${data.userId}' not found`);
  }

  // For losses, check if player has enough balance
  if (data.transactionType === "Loss") {
    if (player[0].balance < data.amount) {
      throw new Error(
        `Insufficient player balance. Player has ${player[0].balance} points but trying to record loss of ${data.amount} points`
      );
    }
  }

  // Insert the gameplay transaction
  const result = await db.insert(gameplayTransactions).values(data);

  // Update player balance based on transaction type
  if (data.transactionType === "Win") {
    // Win: increase player balance
    await db
      .update(players)
      .set({
        balance: sql`${players.balance} + ${data.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(players.userId, data.userId));
  } else if (data.transactionType === "Loss") {
    // Loss: decrease player balance
    await db
      .update(players)
      .set({
        balance: sql`${players.balance} - ${data.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(players.userId, data.userId));
  }

  return result;
}

// Panel Daily Balance functions
export async function getPanelDailyBalance(
  panelId: number,
  date: Date,
  timezone: string = "GMT+5:30"
) {
  const db = await getDb();
  if (!db) return null;
  const { panelDailyBalances } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");
  
  // Create a new Date object at midnight for comparison
  const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const result = await db
    .select()
    .from(panelDailyBalances)
    .where(and(
      eq(panelDailyBalances.panelId, panelId),
      eq(panelDailyBalances.date, compareDate)
    ))
    .limit(1);
    
  return result.length > 0 ? result[0] : null;
}

export async function savePanelDailyBalance(
  panelId: number,
  data: {
    date: Date;
    openingBalance: number;
    closingBalance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    bonusPoints: number;
    topUp: number;
    extraDeposit: number;
    profitLoss: number;
    timezone: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { panelDailyBalances } = await import("../drizzle/schema");
  
  // Create a Date object at midnight for the date
  const dateValue = new Date(data.date.getFullYear(), data.date.getMonth(), data.date.getDate());
  
  const balanceData = {
    panelId,
    date: dateValue,
    openingBalance: data.openingBalance.toString(),
    closingBalance: data.closingBalance.toString(),
    totalDeposits: data.totalDeposits.toString(),
    totalWithdrawals: data.totalWithdrawals.toString(),
    bonusPoints: data.bonusPoints.toString(),
    topUp: data.topUp.toString(),
    extraDeposit: data.extraDeposit.toString(),
    profitLoss: data.profitLoss.toString(),
    timezone: data.timezone,
  };
  
  // Use ON DUPLICATE KEY UPDATE to handle both insert and update
  const result = await db.insert(panelDailyBalances)
    .values(balanceData)
    .onDuplicateKeyUpdate({
      set: balanceData
    });
    
  return result;
}

export async function getPreviousDayClosingBalance(
  panelId: number,
  currentDate: Date,
  timezone: string = "GMT+5:30"
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  // Get previous day's date
  const timezoneOffset = getTimezoneOffset(timezone);
  const localTime = new Date(
    currentDate.getTime() + currentDate.getTimezoneOffset() * 60000 + timezoneOffset * 60000
  );
  const previousDay = new Date(localTime);
  previousDay.setDate(previousDay.getDate() - 1);
  
  // Try to get previous day's balance from daily balances
  const previousBalance = await getPanelDailyBalance(panelId, previousDay, timezone);
  
  if (previousBalance) {
    return parseFloat(previousBalance.closingBalance.toString());
  }
  
  // If no record exists, calculate from transactions
  const { deposits, withdrawals } = await import("../drizzle/schema");
  const { sum, eq, gte, and } = await import("drizzle-orm");
  
  // Calculate date range for previous day
  const startOfDay = new Date(previousDay);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(previousDay);
  endOfDay.setHours(23, 59, 59, 999);
  
  // Convert to UTC
  const utcStart = new Date(
    startOfDay.getTime() - timezoneOffset * 60000 - currentDate.getTimezoneOffset() * 60000
  );
  const utcEnd = new Date(
    endOfDay.getTime() - timezoneOffset * 60000 - currentDate.getTimezoneOffset() * 60000
  );
  
  // Get panel name
  const panel = await getPanelById(panelId);
  const panelName = panel?.name || "";
  
  // Get totals for previous day
  const [depositResult, withdrawalResult] = await Promise.all([
    db
      .select({ total: sum(deposits.amount) })
      .from(deposits)
      .where(and(
        eq(deposits.panelName, panelName),
        gte(deposits.depositDate, utcStart)
      )),
    db
      .select({ total: sum(withdrawals.amount) })
      .from(withdrawals)
      .where(and(
        eq(withdrawals.panelName, panelName),
        gte(withdrawals.withdrawalDate, utcStart)
      )),
  ]);
  
  const totalDeposits = Number(depositResult[0]?.total || 0);
  const totalWithdrawals = Number(withdrawalResult[0]?.total || 0);
  
  // Return 0 if no previous data
  return totalDeposits - totalWithdrawals;
}

export async function getOpeningBalanceForDate(
  panelId: number,
  date: Date,
  timezone: string = "GMT+5:30"
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  // First, try to get the daily balance snapshot for this date
  const dailyBalance = await getPanelDailyBalance(panelId, date, timezone);
  
  if (dailyBalance) {
    return parseFloat(dailyBalance.openingBalance.toString());
  }
  
  // If no snapshot exists, check if this is the first day (panel creation date)
  const panel = await getPanelById(panelId);
  if (!panel) return 0;
  
  // Get panel creation date
  const panelCreatedDate = new Date(panel.createdAt || panel.createdAt);
  
  // Convert dates to compare (strip time)
  const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const createdDate = new Date(panelCreatedDate.getFullYear(), panelCreatedDate.getMonth(), panelCreatedDate.getDate());
  
  // If the requested date is the same as or before the panel creation date,
  // use the initial opening balance set when creating the panel
  if (compareDate <= createdDate) {
    return panel.openingBalance || 0;
  }
  
  // If no snapshot exists and it's after the creation date,
  // calculate from all transactions before this date
  const { deposits, withdrawals } = await import("../drizzle/schema");
  const { sum, eq, lt, and } = await import("drizzle-orm");
  
  const timezoneOffset = getTimezoneOffset(timezone);
  
  // Calculate the start of the given date in UTC
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const utcStart = new Date(
    startOfDay.getTime() - timezoneOffset * 60000 - date.getTimezoneOffset() * 60000
  );
  
  // Get panel name
  const panelName = panel.name;
  
  // Sum all deposits and withdrawals before this date
  const [depositResult, withdrawalResult] = await Promise.all([
    db
      .select({ total: sum(deposits.amount) })
      .from(deposits)
      .where(and(
        eq(deposits.panelName, panelName),
        lt(deposits.createdAt, utcStart)
      )),
    db
      .select({ total: sum(withdrawals.amount) })
      .from(withdrawals)
      .where(and(
        eq(withdrawals.panelName, panelName),
        lt(withdrawals.createdAt, utcStart)
      )),
  ]);
  
  const totalDeposits = Number(depositResult[0]?.total || 0);
  const totalWithdrawals = Number(withdrawalResult[0]?.total || 0);
  
  // Return the initial balance adjusted by transactions before this date
  // Formula: Initial Balance - Deposits - Bonus + Withdrawals
  const bonusResult = await db
    .select({ total: sum(deposits.bonusPoints) })
    .from(deposits)
    .where(and(
      eq(deposits.panelName, panelName),
      lt(deposits.createdAt, utcStart)
    ));
  
  const totalBonus = Number(bonusResult[0]?.total || 0);
  
  return (panel.openingBalance || 0) - (totalDeposits + totalBonus) + totalWithdrawals;
}

export async function generateDailyBalanceSnapshots(
  startDate: Date,
  endDate: Date,
  timezone: string = "GMT+5:30"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { panels, deposits, withdrawals } = await import("../drizzle/schema");
  const panelsList = await db.select().from(panels);
  const { sum, eq, gte, lt, and } = await import("drizzle-orm");
  
  const timezoneOffset = getTimezoneOffset(timezone);
  
  // Generate snapshots for each day in the range
  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  while (currentDate <= end) {
    for (const panel of panelsList) {
      // Check if snapshot already exists
      const existing = await getPanelDailyBalance(panel.id, currentDate, timezone);
      if (existing) continue;
      
      // Calculate opening balance (previous day's closing or 0 if first day)
      const openingBalance = await getOpeningBalanceForDate(panel.id, currentDate, timezone);
      
      // Calculate transactions for this day
      const startOfDay = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setDate(dayEnd.getDate() + 1);
      
      const utcStart = new Date(
        startOfDay.getTime() - timezoneOffset * 60000 - currentDate.getTimezoneOffset() * 60000
      );
      const utcEnd = new Date(
        dayEnd.getTime() - timezoneOffset * 60000 - currentDate.getTimezoneOffset() * 60000
      );
      
      const [depositResult, withdrawalResult, bonusResult] = await Promise.all([
        db
          .select({ total: sum(deposits.amount) })
          .from(deposits)
          .where(and(
            eq(deposits.panelName, panel.name),
            gte(deposits.createdAt, utcStart),
            lt(deposits.createdAt, utcEnd)
          )),
        db
          .select({ total: sum(withdrawals.amount) })
          .from(withdrawals)
          .where(and(
            eq(withdrawals.panelName, panel.name),
            gte(withdrawals.createdAt, utcStart),
            lt(withdrawals.createdAt, utcEnd)
          )),
        db
          .select({ total: sum(deposits.bonusPoints) })
          .from(deposits)
          .where(and(
            eq(deposits.panelName, panel.name),
            gte(deposits.createdAt, utcStart),
            lt(deposits.createdAt, utcEnd)
          )),
      ]);
      
      const totalDeposits = Number(depositResult[0]?.total || 0);
      const totalWithdrawals = Number(withdrawalResult[0]?.total || 0);
      const totalBonus = Number(bonusResult[0]?.total || 0);
      
      const closingBalance = openingBalance - (totalDeposits + totalBonus) + totalWithdrawals + (panel.topUp || 0);
      const profitLoss = (totalDeposits + totalBonus) - totalWithdrawals;
      
      // Save the snapshot
      await savePanelDailyBalance(panel.id, {
        date: currentDate,
        openingBalance,
        closingBalance,
        totalDeposits,
        totalWithdrawals,
        bonusPoints: totalBonus,
        topUp: panel.topUp || 0,
        extraDeposit: panel.extraDeposit || 0,
        profitLoss,
        timezone,
      });
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
}

// Get all daily balances for a specific panel
export async function getPanelDailyBalances(
  panelId: number,
  startDate?: Date,
  endDate?: Date
) {
  const db = await getDb();
  if (!db) return [];
  const { panelDailyBalances } = await import("../drizzle/schema");
  const { eq, and, gte, lte, desc } = await import("drizzle-orm");
  
  // Build the where conditions
  const conditions = [eq(panelDailyBalances.panelId, panelId)];
  
  if (startDate) {
    conditions.push(gte(panelDailyBalances.date, startDate));
  }
  
  if (endDate) {
    // Add one day to endDate to include the entire end date
    const endDateTime = new Date(endDate);
    endDateTime.setDate(endDateTime.getDate() + 1);
    conditions.push(lte(panelDailyBalances.date, endDateTime));
  }
  
  const results = await db
    .select()
    .from(panelDailyBalances)
    .where(and(...conditions))
    .orderBy(desc(panelDailyBalances.date), desc(panelDailyBalances.id));
  
  // Convert to proper format
  return results.map(r => ({
    id: r.id,
    panelId: r.panelId,
    date: r.date instanceof Date ? r.date.toLocaleDateString('en-CA') : new Date(r.date).toLocaleDateString('en-CA'),
    openingBalance: Number(r.openingBalance) || 0,
    closingBalance: Number(r.closingBalance) || 0,
    totalDeposits: Number(r.totalDeposits) || 0,
    totalWithdrawals: Number(r.totalWithdrawals) || 0,
    bonusPoints: Number(r.bonusPoints) || 0,
    topUp: Number(r.topUp) || 0,
    extraDeposit: Number(r.extraDeposit) || 0,
    profitLoss: Number(r.profitLoss) || 0,
    timezone: r.timezone,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

// Save top-up transaction
export async function saveTopUpHistory(data: {
  panelId: number;
  panelName: string;
  previousTopUp: number;
  amountAdded: number;
  newTopUp: number;
  previousClosingBalance: number;
  newClosingBalance: number;
  previousPointsBalance: number;
  newPointsBalance: number;
  createdBy: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Use raw SQL to avoid Drizzle inserting 'default' for auto-increment id
  const { sql } = await import("drizzle-orm");
  
  // Ensure createdBy is not empty
  const createdBy = data.createdBy || 'Unknown';
  
  console.log('Saving top-up history:', {
    ...data,
    createdBy
  });
  
  const result = await db.execute(sql`
    INSERT INTO topUpHistory (
      panelId, panelName, previousTopUp, amountAdded, newTopUp,
      previousClosingBalance, newClosingBalance,
      previousPointsBalance, newPointsBalance,
      createdBy, createdAt
    ) VALUES (
      ${data.panelId}, ${data.panelName}, ${data.previousTopUp}, ${data.amountAdded}, ${data.newTopUp},
      ${data.previousClosingBalance}, ${data.newClosingBalance},
      ${data.previousPointsBalance}, ${data.newPointsBalance},
      ${createdBy}, NOW()
    )
  `);
  
  return result;
}

// Get top-up history with filters
export async function getTopUpHistory(filters: {
  panelId?: number;
  dateRange?: "today" | "yesterday" | "7d" | "30d" | "all";
  search?: string;
  limit?: number;
  offset?: number;
  timezone?: string;
}) {
  const db = await getDb();
  if (!db) return { records: [], total: 0 };
  const { topUpHistory } = await import("../drizzle/schema");
  const { and, gte, lte, like, desc, eq, or, sql } = await import("drizzle-orm");
  
  // Apply filters
  const conditions = [];
  
  if (filters.panelId) {
    conditions.push(eq(topUpHistory.panelId, filters.panelId));
  }
  
  if (filters.search) {
    const searchPattern = `%${filters.search}%`;
    conditions.push(
      or(
        like(topUpHistory.panelName, searchPattern),
        like(topUpHistory.createdBy, searchPattern)
      )
    );
  }
  
  // Apply date filter with dynamic timezone
  if (filters.dateRange && filters.dateRange !== "all") {
    const now = new Date();
    const timezone = filters.timezone || "GMT+5:30"; // Default to GMT+5:30 if not provided
    
    // Parse timezone offset (e.g., "GMT+5:30" -> 5.5 hours)
    const offsetMatch = timezone.match(/GMT([+-]\d+):?(\d*)/);
    let offsetHours = 0;
    
    if (offsetMatch) {
      offsetHours = parseInt(offsetMatch[1]);
      if (offsetMatch[2]) {
        offsetHours += parseInt(offsetMatch[2]) / 60 * (offsetHours < 0 ? -1 : 1);
      }
    }
    
    // Convert to local timezone
    const offset = offsetHours * 60 * 60 * 1000; // Convert to milliseconds
    const localNow = new Date(now.getTime() + offset);
    const startOfToday = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate());
    // Convert back to UTC for database query
    const startOfTodayUTC = new Date(startOfToday.getTime() - offset);
    
    let startDate: Date;
    let endDate: Date | undefined;
    switch (filters.dateRange) {
      case "today":
        startDate = startOfTodayUTC;
        break;
      case "yesterday":
        // Start from yesterday at 00:00:00
        startDate = new Date(startOfTodayUTC.getTime() - 24 * 60 * 60 * 1000);
        // End at yesterday at 23:59:59
        endDate = new Date(startOfTodayUTC.getTime() - 1);
        break;
      case "7d":
        startDate = new Date(startOfTodayUTC.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(startOfTodayUTC.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }
    
    conditions.push(gte(topUpHistory.createdAt, startDate));
    
    // Add end date condition for "yesterday"
    if (endDate) {
      conditions.push(lte(topUpHistory.createdAt, endDate));
    }
  }
  
  // Build the query with conditions
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  // Get total count
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(topUpHistory)
    .where(whereClause);
  const total = totalResult[0]?.count || 0;
  
  // Get records with ordering and pagination
  const records = await db
    .select()
    .from(topUpHistory)
    .where(whereClause)
    .orderBy(desc(topUpHistory.createdAt))
    .limit(filters.limit || 1000)
    .offset(filters.offset || 0);
  
  return { records, total };
}
export async function saveDeposit(data: {
  panelName: string;
  userId: string;
  amount: number;
  bonusPoints: number;
  utr: string;
  bankName: string;
  depositDate: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const { deposits } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  
  await db.insert(deposits).values({
    panelName: data.panelName,
    userId: data.userId,
    amount: data.amount,
    bonusPoints: data.bonusPoints,
    utr: data.utr,
    bankName: data.bankName,
    depositDate: data.depositDate,
    createdAt: new Date(),
    updatedAt: new Date()
  });
}

// Save withdrawal transaction
export async function saveWithdrawal(data: {
  panelName: string;
  userId: string;
  amount: number;
  utr: string;
  bankName: string;
  withdrawalDate: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const { withdrawals } = await import("../drizzle/schema");
  
  await db.insert(withdrawals).values({
    panelName: data.panelName,
    userId: data.userId,
    amount: data.amount,
    utr: data.utr,
    bankName: data.bankName,
    status: 'approved',
    withdrawalDate: data.withdrawalDate,
    createdAt: new Date(),
    updatedAt: new Date()
  });
}
export async function getAllPanelDailyBalances(
  startDate?: Date,
  endDate?: Date,
  timezone: string = "GMT+5:30"
) {
  const db = await getDb();
  if (!db) return [];
  const { panelDailyBalances } = await import("../drizzle/schema");
  const { desc } = await import("drizzle-orm");
  
  const results = await db
    .select()
    .from(panelDailyBalances)
    .orderBy(panelDailyBalances.date);
  
  // Filter by date range if provided
  let filtered = results;
  if (startDate) {
    filtered = filtered.filter(r => new Date(r.date) >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter(r => new Date(r.date) <= endDate);
  }
  
  // Convert to proper format
  return filtered.map(r => ({
    id: r.id,
    panelId: r.panelId,
    date: r.date instanceof Date ? r.date.toLocaleDateString('en-CA') : new Date(r.date).toLocaleDateString('en-CA'),
    openingBalance: Number(r.openingBalance) || 0,
    closingBalance: Number(r.closingBalance) || 0,
    totalDeposits: Number(r.totalDeposits) || 0,
    totalWithdrawals: Number(r.totalWithdrawals) || 0,
    bonusPoints: Number(r.bonusPoints) || 0,
    topUp: Number(r.topUp) || 0,
    extraDeposit: Number(r.extraDeposit) || 0,
    profitLoss: Number(r.profitLoss) || 0,
    timezone: r.timezone,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}
