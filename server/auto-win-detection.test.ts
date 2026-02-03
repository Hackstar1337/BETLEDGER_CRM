import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import * as db from "./db";
import {
  players,
  panels,
  bankAccounts,
  gameplayTransactions,
} from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Automatic Win Detection on Withdrawal", () => {
  let testPlayerUserId: string;
  let testPanelName: string;
  let testBankName: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    testPlayerUserId = `TEST_AUTO_WIN_PLAYER_${timestamp}`;
    testPanelName = `TEST_AUTO_WIN_PANEL_${timestamp}`;
    testBankName = `TEST_AUTO_WIN_BANK_${timestamp}`;

    // Create test panel
    await db.createPanel({
      name: testPanelName,
      pointsBalance: 100000,
      openingBalance: 0,
      closingBalance: 0,
      settling: 0,
      extraDeposit: 0,
      bonusPoints: 0,
      profitLoss: 0,
    });

    // Create test bank account
    await db.createBankAccount({
      bankName: testBankName,
      accountNumber: `ACC${timestamp}`,
      accountHolderName: "Test Holder",
      ifscCode: "TEST0000",
      openingBalance: 50000,
      closingBalance: 50000,
      accountType: "Withdrawal",
    });

    // Create test player with initial balance
    await db.createPlayer({
      userId: testPlayerUserId,
      name: `Test Auto Win Player ${timestamp}`,
      panelName: testPanelName,
      balance: 500, // Start with 500 points
    });
  });

  it("should allow withdrawal equal to current balance without creating gameplay transaction", async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    // Get initial balance
    const playerBefore = await database
      .select()
      .from(players)
      .where(eq(players.userId, testPlayerUserId))
      .limit(1);
    const initialBalance = Number(playerBefore[0].balance);

    // Withdraw exact balance (500)
    await db.createWithdrawal({
      userId: testPlayerUserId,
      panelName: testPanelName,
      bankName: testBankName,
      amount: initialBalance,
      paymentMethod: "IMPS",
      withdrawalDate: new Date(),
    });

    // Check balance is now 0
    const playerAfter = await database
      .select()
      .from(players)
      .where(eq(players.userId, testPlayerUserId))
      .limit(1);
    expect(Number(playerAfter[0].balance)).toBe(0);

    // Check no gameplay transaction was created (balance matched withdrawal)
    const gameplayTxns = await database
      .select()
      .from(gameplayTransactions)
      .where(eq(gameplayTransactions.userId, testPlayerUserId));
    expect(gameplayTxns.length).toBe(0);
  });

  it("should automatically detect win when withdrawal exceeds balance", async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    // Deposit 500 to give player balance again
    await db.createDeposit({
      userId: testPlayerUserId,
      panelName: testPanelName,
      bankName: testBankName,
      amount: 500,
      bonusPoints: 0,
      paymentMethod: "IMPS",
      depositDate: new Date(),
    });

    // Get current balance (should be 500)
    const playerBefore = await database
      .select()
      .from(players)
      .where(eq(players.userId, testPlayerUserId))
      .limit(1);
    const currentBalance = Number(playerBefore[0].balance);
    expect(currentBalance).toBe(500);

    // Try to withdraw 1000 (500 more than balance)
    await db.createWithdrawal({
      userId: testPlayerUserId,
      panelName: testPanelName,
      bankName: testBankName,
      amount: 1000,
      paymentMethod: "IMPS",
      withdrawalDate: new Date(),
    });

    // Check gameplay transaction was created for the win
    const gameplayTxns = await database
      .select()
      .from(gameplayTransactions)
      .where(eq(gameplayTransactions.userId, testPlayerUserId));

    expect(gameplayTxns.length).toBe(1);
    expect(gameplayTxns[0].transactionType).toBe("Win");
    expect(gameplayTxns[0].amount).toBe(500); // 1000 - 500 = 500 win
    expect(gameplayTxns[0].notes).toContain("Auto-detected win");

    // Check player balance is now 0 (1000 - 1000 withdrawal)
    const playerAfter = await database
      .select()
      .from(players)
      .where(eq(players.userId, testPlayerUserId))
      .limit(1);
    expect(Number(playerAfter[0].balance)).toBe(0);
  });

  it("should handle multiple withdrawals with automatic win detection", async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    // Deposit 300 to give player balance
    await db.createDeposit({
      userId: testPlayerUserId,
      panelName: testPanelName,
      bankName: testBankName,
      amount: 300,
      bonusPoints: 0,
      paymentMethod: "IMPS",
      depositDate: new Date(),
    });

    // Current balance: 300
    const playerBefore = await database
      .select()
      .from(players)
      .where(eq(players.userId, testPlayerUserId))
      .limit(1);
    expect(Number(playerBefore[0].balance)).toBe(300);

    // Withdraw 800 (500 more than balance)
    await db.createWithdrawal({
      userId: testPlayerUserId,
      panelName: testPanelName,
      bankName: testBankName,
      amount: 800,
      paymentMethod: "IMPS",
      withdrawalDate: new Date(),
    });

    // Check gameplay transaction was created
    const gameplayTxns = await database
      .select()
      .from(gameplayTransactions)
      .where(eq(gameplayTransactions.userId, testPlayerUserId));

    // Should have 2 total (1 from previous test + 1 new)
    expect(gameplayTxns.length).toBe(2);

    // Find the new one
    const newWin = gameplayTxns.find(t => t.amount === 500);
    expect(newWin).toBeDefined();
    expect(newWin?.transactionType).toBe("Win");

    // Check final balance is 0
    const playerAfter = await database
      .select()
      .from(players)
      .where(eq(players.userId, testPlayerUserId))
      .limit(1);
    expect(Number(playerAfter[0].balance)).toBe(0);
  });

  it("should correctly update panel points when player wins", async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    // Get initial panel points
    const panelBefore = await database
      .select()
      .from(panels)
      .where(eq(panels.name, testPanelName))
      .limit(1);
    const initialPanelPoints = Number(panelBefore[0].pointsBalance);

    // Deposit 400
    await db.createDeposit({
      userId: testPlayerUserId,
      panelName: testPanelName,
      bankName: testBankName,
      amount: 400,
      bonusPoints: 0,
      paymentMethod: "IMPS",
      depositDate: new Date(),
    });

    // Panel should have lost 400 points
    const panelAfterDeposit = await database
      .select()
      .from(panels)
      .where(eq(panels.name, testPanelName))
      .limit(1);
    const panelPointsAfterDeposit = Number(panelAfterDeposit[0].pointsBalance);
    expect(panelPointsAfterDeposit).toBe(initialPanelPoints - 400);

    // Withdraw 900 (player won 500)
    await db.createWithdrawal({
      userId: testPlayerUserId,
      panelName: testPanelName,
      bankName: testBankName,
      amount: 900,
      paymentMethod: "IMPS",
      withdrawalDate: new Date(),
    });

    // Panel should gain back 900 points
    const panelAfterWithdrawal = await database
      .select()
      .from(panels)
      .where(eq(panels.name, testPanelName))
      .limit(1);
    const finalPanelPoints = Number(panelAfterWithdrawal[0].pointsBalance);

    // Net: -400 (deposit) + 900 (withdrawal) = +500 from initial
    expect(finalPanelPoints).toBe(initialPanelPoints + 500);
  });
});
