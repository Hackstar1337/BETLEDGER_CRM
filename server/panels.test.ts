import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("panels router", () => {
  it("should allow authenticated users to list panels", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.panels.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should allow admin to create a panel", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const panelData = {
      name: `TEST_PANEL_${Date.now()}`,
      openingBalance: 10000,
      closingBalance: 12000,
      settling: 1000,
      extraDeposit: 500,
      bonusPoints: 100,
      profitLoss: 2000,
    };

    const result = await caller.panels.create(panelData);
    expect(result).toBeDefined();
  });

  it("should prevent non-admin users from creating panels", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const panelData = {
      name: `TEST_PANEL_${Date.now()}`,
      openingBalance: 10000,
      closingBalance: 12000,
      settling: 1000,
      extraDeposit: 500,
      bonusPoints: 100,
      profitLoss: 2000,
    };

    await expect(caller.panels.create(panelData)).rejects.toThrow();
  });
});

describe("dashboard router", () => {
  it("should return overview statistics", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.overview();
    expect(result).toHaveProperty("totalPanelBalance");
    expect(result).toHaveProperty("totalBankBalance");
    expect(result).toHaveProperty("totalProfitLoss");
    expect(result).toHaveProperty("panelCount");
    expect(result).toHaveProperty("bankAccountCount");
  });

  it("should return today's statistics", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.todayStats();
    expect(result).toHaveProperty("todayDeposits");
    expect(result).toHaveProperty("todayWithdrawals");
    expect(result).toHaveProperty("todayDepositAmount");
    expect(result).toHaveProperty("todayWithdrawalAmount");
    expect(result).toHaveProperty("uniquePlayersDeposited");
    expect(result).toHaveProperty("uniquePlayersWithdrew");
  });
});
