import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  clearAllRecords: adminProcedure.mutation(async () => {
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const {
      panels,
      players,
      bankAccounts,
      deposits,
      withdrawals,
      gameplayTransactions,
      topUpHistory,
      panelDailyBalances,
    } = await import("../../drizzle/schema");
    const { sql } = await import("drizzle-orm");

    // Delete all records from all tables
    await db.delete(gameplayTransactions);
    await db.delete(topUpHistory);
    await db.delete(panelDailyBalances);
    await db.delete(deposits);
    await db.delete(withdrawals);
    await db.delete(players);
    await db.delete(bankAccounts);
    await db.delete(panels);

    return {
      success: true,
    } as const;
  }),

  setupAdmin: publicProcedure.mutation(async () => {
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { adminUsers } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const bcrypt = await import("bcryptjs");

      // Check if admin exists
      const existing = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.username, "admin"))
        .limit(1);

      if (existing.length > 0) {
        return {
          success: true,
          message: "Admin user already exists",
          username: "admin",
        };
      }

      // Create admin user
      const password = "admin123";
      const passwordHash = await bcrypt.hash(password, 10);

      await db.insert(adminUsers).values({
        username: "admin",
        passwordHash,
        email: "admin@khiladi247.com",
        fullName: "System Administrator",
        isActive: true,
      });

      return {
        success: true,
        message: "Admin user created successfully",
        username: "admin",
        password: password,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }),
});
