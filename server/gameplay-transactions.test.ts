import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import * as db from "./db";
import { gameplayTransactions, players, panels } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Gameplay Transactions Feature", () => {
  let testPlayerUserId: string;
  let testPanelName: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    testPlayerUserId = `TEST_GAMEPLAY_PLAYER_${timestamp}`;
    testPanelName = `TEST_GAMEPLAY_PANEL_${timestamp}`;

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

    // Create test player with initial balance
    await db.createPlayer({
      userId: testPlayerUserId,
      name: `Test Gameplay Player ${timestamp}`,
      panelName: testPanelName,
      balance: 1000, // Start with 1000 points
    });
  });

  it("should record a win and increase player balance", async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    // Get initial balance
    const playerBefore = await database
      .select()
      .from(players)
      .where(eq(players.userId, testPlayerUserId))
      .limit(1);
    const initialBalance = playerBefore[0].balance;

    // Record a win
    await db.createGameplayTransaction({
      userId: testPlayerUserId,
      panelName: testPanelName,
      transactionType: "Win",
      amount: 500,
      notes: "Test win transaction",
      transactionDate: new Date(),
    });

    // Check balance increased
    const playerAfter = await database
      .select()
      .from(players)
      .where(eq(players.userId, testPlayerUserId))
      .limit(1);
    const finalBalance = playerAfter[0].balance;

    expect(Number(finalBalance)).toBe(Number(initialBalance) + 500);
  });

  it("should record a loss and decrease player balance", async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    // Get current balance
    const playerBefore = await database
      .select()
      .from(players)
      .where(eq(players.userId, testPlayerUserId))
      .limit(1);
    const initialBalance = playerBefore[0].balance;

    // Record a loss
    await db.createGameplayTransaction({
      userId: testPlayerUserId,
      panelName: testPanelName,
      transactionType: "Loss",
      amount: 300,
      notes: "Test loss transaction",
      transactionDate: new Date(),
    });

    // Check balance decreased
    const playerAfter = await database
      .select()
      .from(players)
      .where(eq(players.userId, testPlayerUserId))
      .limit(1);
    const finalBalance = playerAfter[0].balance;

    expect(Number(finalBalance)).toBe(Number(initialBalance) - 300);
  });

  it("should prevent recording loss when player has insufficient balance", async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    // Get current balance
    const player = await database
      .select()
      .from(players)
      .where(eq(players.userId, testPlayerUserId))
      .limit(1);
    const currentBalance = player[0].balance;

    // Try to record a loss greater than current balance
    await expect(
      db.createGameplayTransaction({
        userId: testPlayerUserId,
        panelName: testPanelName,
        transactionType: "Loss",
        amount: Number(currentBalance) + 1000, // More than available
        notes: "Test insufficient balance",
        transactionDate: new Date(),
      })
    ).rejects.toThrow("Insufficient player balance");
  });

  it("should retrieve all gameplay transactions", async () => {
    const transactions = await db.getAllGameplayTransactions();

    // Should have at least the 2 transactions we created (win and loss)
    expect(transactions.length).toBeGreaterThanOrEqual(2);

    // Check that our test transactions are in the list
    const testTransactions = transactions.filter(
      t => t.userId === testPlayerUserId
    );
    expect(testTransactions.length).toBeGreaterThanOrEqual(2);
  });

  it("should retrieve gameplay transactions by player", async () => {
    const transactions =
      await db.getGameplayTransactionsByPlayer(testPlayerUserId);

    // All transactions should be for our test player
    expect(transactions.every(t => t.userId === testPlayerUserId)).toBe(true);
    expect(transactions.length).toBeGreaterThanOrEqual(2);
  });

  it("should retrieve gameplay transactions by panel", async () => {
    const transactions = await db.getGameplayTransactionsByPanel(testPanelName);

    // All transactions should be for our test panel
    expect(transactions.every(t => t.panelName === testPanelName)).toBe(true);
    expect(transactions.length).toBeGreaterThanOrEqual(2);
  });

  it("should correctly calculate final balance after multiple transactions", async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    // Get current balance
    const playerBefore = await database
      .select()
      .from(players)
      .where(eq(players.userId, testPlayerUserId))
      .limit(1);
    const initialBalance = Number(playerBefore[0].balance);

    // Record multiple transactions
    await db.createGameplayTransaction({
      userId: testPlayerUserId,
      panelName: testPanelName,
      transactionType: "Win",
      amount: 200,
      transactionDate: new Date(),
    });

    await db.createGameplayTransaction({
      userId: testPlayerUserId,
      panelName: testPanelName,
      transactionType: "Loss",
      amount: 100,
      transactionDate: new Date(),
    });

    await db.createGameplayTransaction({
      userId: testPlayerUserId,
      panelName: testPanelName,
      transactionType: "Win",
      amount: 150,
      transactionDate: new Date(),
    });

    // Check final balance
    const playerAfter = await database
      .select()
      .from(players)
      .where(eq(players.userId, testPlayerUserId))
      .limit(1);
    const finalBalance = Number(playerAfter[0].balance);

    // Initial + 200 - 100 + 150 = Initial + 250
    expect(finalBalance).toBe(initialBalance + 250);
  });

  it("should prevent recording transaction for non-existent player", async () => {
    await expect(
      db.createGameplayTransaction({
        userId: "NON_EXISTENT_PLAYER",
        panelName: testPanelName,
        transactionType: "Win",
        amount: 100,
        transactionDate: new Date(),
      })
    ).rejects.toThrow("Player with User ID 'NON_EXISTENT_PLAYER' not found");
  });
});
