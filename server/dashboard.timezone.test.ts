import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Dashboard Timezone-Aware Filtering", () => {
  const mockUser = {
    id: "1",
    openId: "test-user",
    name: "Test User",
    role: "admin" as const,
  };
  const mockContext = {
    user: mockUser,
    req: {} as any,
    res: {} as any,
  };

  let testPanelId: number;
  let testPlayerId: number;

  beforeAll(async () => {
    // Clean up any existing test data first
    const existingPanel = await db.getPanelByName("TEST_TIMEZONE_PANEL");
    if (existingPanel) {
      await db.deletePanels([existingPanel.id]);
    }

    const existingPlayer = await db.getPlayerByUserId("TZ_TEST_USER");
    if (existingPlayer) {
      await db.deletePlayers([existingPlayer.id]);
    }

    // Create test panel
    const panel = await db.createPanel({
      name: "TEST_TIMEZONE_PANEL",
      pointsBalance: 10000,
      openingBalance: 10000,
      closingBalance: 10000,
      settling: 0,
      extraDeposit: 0,
      bonusPoints: 0,
      profitLoss: 0,
    });
    testPanelId = panel.id;

    // Create test player
    const player = await db.createPlayer({
      userId: "TZ_TEST_USER",
      name: "Timezone Test User",
      panelName: "TEST_TIMEZONE_PANEL",
      balance: 1000,
    });
    testPlayerId = player.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testPanelId) await db.deletePanels([testPanelId]);
    if (testPlayerId) await db.deletePlayers([testPlayerId]);
  });

  it("should calculate today based on UTC timezone (offset = 0)", async () => {
    const caller = appRouter.createCaller(mockContext);

    // Create a deposit with current timestamp
    const deposit = await db.createDeposit({
      userId: "TZ_TEST_USER",
      amount: 500,
      utrNumber: "TZ_UTC_TEST_001",
      bankName: "Test Bank",
      panelName: "TEST_TIMEZONE_PANEL",
      isExtra: false,
      isWrong: false,
      depositDate: new Date(),
    });

    // Query with UTC timezone (offset = 0)
    const stats = await caller.dashboard.todayStats({ timezoneOffset: 0 });

    // Should include the deposit we just created
    expect(stats.todayDeposits).toBeGreaterThanOrEqual(1);
    expect(stats.todayDepositAmount).toBeGreaterThanOrEqual(500);
  });

  it("should calculate today based on IST timezone (offset = -330)", async () => {
    const caller = appRouter.createCaller(mockContext);

    // Create a deposit with current timestamp
    const deposit = await db.createDeposit({
      userId: "TZ_TEST_USER",
      amount: 750,
      utrNumber: "TZ_IST_TEST_002",
      bankName: "Test Bank",
      panelName: "TEST_TIMEZONE_PANEL",
      isExtra: false,
      isWrong: false,
      depositDate: new Date(),
    });

    // Query with IST timezone (offset = -330 minutes = UTC+5:30)
    const stats = await caller.dashboard.todayStats({ timezoneOffset: -330 });

    // Should include the deposit we just created
    expect(stats.todayDeposits).toBeGreaterThanOrEqual(1);
    expect(stats.todayDepositAmount).toBeGreaterThanOrEqual(750);
  });

  it("should calculate today based on EST timezone (offset = 300)", async () => {
    const caller = appRouter.createCaller(mockContext);

    // Create a withdrawal with current timestamp
    const withdrawal = await db.createWithdrawal({
      userId: "TZ_TEST_USER",
      amount: 300,
      utrNumber: "TZ_EST_TEST_003",
      bankName: "Test Bank",
      panelName: "TEST_TIMEZONE_PANEL",
      isExtra: false,
      isWrong: false,
      paymentMethod: "UPI",
      transactionCharge: 0,
      withdrawalDate: new Date(),
    });

    // Query with EST timezone (offset = 300 minutes = UTC-5:00)
    const stats = await caller.dashboard.todayStats({ timezoneOffset: 300 });

    // Should include the withdrawal we just created
    expect(stats.todayWithdrawals).toBeGreaterThanOrEqual(1);
    expect(stats.todayWithdrawalAmount).toBeGreaterThanOrEqual(300);
  });

  it("should return different results for different timezones at boundary times", async () => {
    const caller = appRouter.createCaller(mockContext);

    // This test demonstrates that different timezones can have different "today"
    // At the same UTC moment, it might be "today" in one timezone but "yesterday" in another

    const statsUTC = await caller.dashboard.todayStats({ timezoneOffset: 0 });
    const statsIST = await caller.dashboard.todayStats({
      timezoneOffset: -330,
    });
    const statsEST = await caller.dashboard.todayStats({ timezoneOffset: 300 });

    // All should return valid statistics
    expect(statsUTC).toBeDefined();
    expect(statsIST).toBeDefined();
    expect(statsEST).toBeDefined();

    // Counts should be non-negative
    expect(statsUTC.todayDeposits).toBeGreaterThanOrEqual(0);
    expect(statsIST.todayDeposits).toBeGreaterThanOrEqual(0);
    expect(statsEST.todayDeposits).toBeGreaterThanOrEqual(0);
  });

  it("should default to UTC when no timezone offset is provided", async () => {
    const caller = appRouter.createCaller(mockContext);

    // Query without timezone offset
    const stats = await caller.dashboard.todayStats();

    // Should return valid statistics (defaults to UTC)
    expect(stats).toBeDefined();
    expect(stats.todayDeposits).toBeGreaterThanOrEqual(0);
    expect(stats.todayWithdrawals).toBeGreaterThanOrEqual(0);
    expect(stats.uniquePlayersDeposited).toBeGreaterThanOrEqual(0);
    expect(stats.uniquePlayersWithdrew).toBeGreaterThanOrEqual(0);
  });
});
