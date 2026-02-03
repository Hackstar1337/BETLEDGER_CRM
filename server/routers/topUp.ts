import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new Error("Admin access required");
  }
  return next({ ctx });
});

export const topUpRouter = router({
  // Get all top-up records with filtering
  getAll: protectedProcedure
    .input(
      z.object({
        panelId: z.number().optional(),
        dateRange: z.enum(["today", "yesterday", "7d", "30d", "all"]).default("today"),
        search: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
        timezone: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const result = await db.getTopUpHistory(input);
      return result;
    }),

  // Get top-up statistics
  getStats: protectedProcedure
    .input(
      z.object({
        dateRange: z.enum(["today", "yesterday", "7d", "30d", "all"]).default("today"),
        timezone: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      // Get the actual data from database
      const result = await db.getTopUpHistory({
        dateRange: input.dateRange,
        timezone: input.timezone,
        limit: 1000, // Get more records for accurate stats
      });
      
      const totalAmount = result.records.reduce((sum, r) => sum + r.amountAdded, 0);
      const totalTransactions = result.records.length;
      
      // Find most active panel
      const panelCounts = result.records.reduce((acc: Record<string, number>, r) => {
        acc[r.panelName] = (acc[r.panelName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const mostActivePanel = Object.entries(panelCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] || "None";
      
      const averageAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;
      
      return {
        totalAmount,
        totalTransactions,
        mostActivePanel,
        averageAmount,
      };
    }),

  // Record a top-up transaction
  record: adminProcedure
    .input(
      z.object({
        panelId: z.number(),
        panelName: z.string(),
        amountAdded: z.number(),
        previousTopUp: z.number(),
        newTopUp: z.number(),
        previousClosingBalance: z.number(),
        newClosingBalance: z.number(),
        previousPointsBalance: z.number(),
        newPointsBalance: z.number(),
        createdBy: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db.saveTopUpHistory(input);
      return { success: true, id: result[0]?.insertId || Date.now() };
    }),
});
