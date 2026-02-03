import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";

// Helper function to update subsequent days
async function updateSubsequentDays(panelId: number, fromDate: Date, newClosingBalance: number) {
  const subsequentDays = await db.getPanelDailyBalances(panelId, fromDate);
  
  let previousClosing = newClosingBalance;
  
  for (const day of subsequentDays) {
    if (new Date(day.date) > fromDate) {
      const newOpening = previousClosing;
      const diff = newOpening - Number(day.openingBalance);
      const newClosing = Number(day.closingBalance) + diff;
      
      await db.savePanelDailyBalance(day.panelId, {
        date: new Date(day.date),
        openingBalance: newOpening,
        closingBalance: newClosing,
        totalDeposits: Number(day.totalDeposits),
        totalWithdrawals: Number(day.totalWithdrawals),
        bonusPoints: Number(day.bonusPoints),
        topUp: Number(day.topUp),
        extraDeposit: Number(day.extraDeposit),
        profitLoss: Number(day.profitLoss),
        timezone: day.timezone
      });
      
      previousClosing = newClosing;
    }
  }
}

/**
 * Panel Daily Balances Router
 */
export const panelDailyBalancesRouter = router({
  // Get daily balances for a specific panel
  getByPanel: protectedProcedure
    .input(
      z.object({
        panelId: z.number(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const dailyBalances = await db.getPanelDailyBalances(
          input.panelId,
          input.startDate ? new Date(input.startDate) : undefined,
          input.endDate ? new Date(input.endDate) : undefined
        );

        return dailyBalances || [];
      } catch (error) {
        console.error("[PanelDailyBalances] Error getting daily balances:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch daily balances",
        });
      }
    }),

  // Get all daily balances (for all panels)
  getAll: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        timezone: z.string().default("GMT+5:30"),
      })
    )
    .query(async ({ input }) => {
      try {
        const allBalances = await db.getAllPanelDailyBalances(
          input.startDate ? new Date(input.startDate) : undefined,
          input.endDate ? new Date(input.endDate) : undefined,
          input.timezone
        );

        return allBalances || [];
      } catch (error) {
        console.error("[PanelDailyBalances] Error getting all daily balances:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch all daily balances",
        });
      }
    }),

  // Save daily balance for a panel
  save: protectedProcedure
    .input(
      z.object({
        panelId: z.number(),
        data: z.object({
          date: z.string(),
          openingBalance: z.number(),
          closingBalance: z.number(),
          totalDeposits: z.number(),
          totalWithdrawals: z.number(),
          bonusPoints: z.number(),
          settling: z.number().default(0),
          extraDeposit: z.number().default(0),
          profitLoss: z.number(),
        }),
        timezone: z.string().default("GMT+5:30"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const dataWithTimezone = {
          ...input.data,
          date: new Date(input.data.date),
          timezone: input.timezone,
          // Transform settling to topUp for database compatibility
          topUp: input.data.settling,
          // Remove settling from the data
          settling: undefined
        };
        // Remove the undefined settling property
        delete (dataWithTimezone as any).settling;
        await db.savePanelDailyBalance(input.panelId, dataWithTimezone);

        return { success: true, message: "Daily balance saved successfully" };
      } catch (error) {
        console.error("[PanelDailyBalances] Error saving daily balance:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save daily balance",
        });
      }
    }),

  // Generate daily balance snapshots for a date range
  generateSnapshots: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        timezone: z.string().default("GMT+5:30"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await db.generateDailyBalanceSnapshots(
          new Date(input.startDate),
          new Date(input.endDate),
          input.timezone
        );

        return { success: true, message: "Daily balance snapshots generated successfully" };
      } catch (error) {
        console.error("[PanelDailyBalances] Error generating snapshots:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate daily balance snapshots",
        });
      }
    }),

  // Add a new procedure for creating backdated entries
  addBackdatedEntry: protectedProcedure
    .input(
      z.object({
        panelId: z.number(),
        date: z.string(),
        deposit: z.number().default(0),
        withdrawal: z.number().default(0),
        bonus: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Get existing daily balance or create new one
        const existing = await db.getPanelDailyBalance(input.panelId, new Date(input.date));
        
        let openingBalance = 0;
        if (existing) {
          openingBalance = Number(existing.openingBalance);
        } else {
          // Get previous day's closing balance
          const prevDate = new Date(input.date);
          prevDate.setDate(prevDate.getDate() - 1);
          const prevBalance = await db.getPreviousDayClosingBalance(input.panelId, prevDate);
          openingBalance = prevBalance;
        }

        // Calculate new closing balance
        const newDeposit = Number(input.deposit);
        const newWithdrawal = Number(input.withdrawal);
        const newBonus = Number(input.bonus);
        const closingBalance = openingBalance - newDeposit - newBonus + newWithdrawal;
        const profitLoss = newDeposit - newWithdrawal;

        // Save or update daily balance
        await db.savePanelDailyBalance(input.panelId, {
          date: new Date(input.date),
          openingBalance,
          closingBalance,
          totalDeposits: existing ? Number(existing.totalDeposits) + newDeposit : newDeposit,
          totalWithdrawals: existing ? Number(existing.totalWithdrawals) + newWithdrawal : newWithdrawal,
          bonusPoints: existing ? Number(existing.bonusPoints) + newBonus : newBonus,
          topUp: existing ? Number(existing.topUp) : 0,
          extraDeposit: existing ? Number(existing.extraDeposit) : 0,
          profitLoss: existing ? Number(existing.profitLoss) + profitLoss : profitLoss,
          timezone: "GMT+5:30"
        });

        // Add transaction records
        const panel = await db.getPanelById(input.panelId);
        if (panel && newDeposit > 0) {
          await db.saveDeposit({
            panelName: panel.name,
            userId: "backdate-entry",
            amount: newDeposit,
            bonusPoints: newBonus,
            utr: `BACKDATE-${Date.now()}`,
            bankName: "Backdate Entry",
            depositDate: new Date(input.date)
          });
        }

        if (panel && newWithdrawal > 0) {
          await db.saveWithdrawal({
            panelName: panel.name,
            userId: "backdate-entry",
            amount: newWithdrawal,
            utr: `BACKDATE-W-${Date.now()}`,
            bankName: "Backdate Entry",
            withdrawalDate: new Date(input.date)
          });
        }

        // Update subsequent days' opening balances
        await updateSubsequentDays(input.panelId, new Date(input.date), closingBalance);

        return { success: true, message: "Backdated entry added successfully" };
      } catch (error) {
        console.error("[PanelDailyBalances] Error adding backdated entry:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add backdated entry",
        });
      }
    }),
});
