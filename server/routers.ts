import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { authenticateAdmin, getAdminUserById } from "./standalone-auth";
import { enhancedPanelsRouter } from "./routers/enhancedPanels";
import { panelDailyBalancesRouter } from "./routers/panelDailyBalances";
import { topUpRouter } from "./routers/topUp";
import { ledgerRouter } from "./routers/ledger";
import { getWebSocketManager } from "./_core/websocket";
import { triggerPostDeployment, getPostDeploymentStatus } from "./_core/postDeployment";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  enhancedPanels: enhancedPanelsRouter,
  panelDailyBalances: panelDailyBalancesRouter,
  topUp: topUpRouter,
  ledger: ledgerRouter,

  // Post-deployment management
  postDeployment: router({
    trigger: publicProcedure.mutation(async ({ ctx }) => {
      return await triggerPostDeployment(ctx.req, ctx.res);
    }),
    status: publicProcedure.query(async ({ ctx }) => {
      return await getPostDeploymentStatus(ctx.req, ctx.res);
    }),
  }),

  // Standalone authentication (replaces OAuth)
  standaloneAuth: router({
    login: publicProcedure
      .input(
        z.object({
          username: z.string().min(1),
          password: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const admin = await authenticateAdmin(input.username, input.password);

        if (!admin) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid username or password",
          });
        }

        // Set session cookie with admin ID
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie("admin_session", String(admin.id), {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return {
          success: true,
          user: {
            id: admin.id,
            username: admin.username,
            email: admin.email,
            fullName: admin.fullName,
          },
        };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie("admin_session", cookieOptions);
      return { success: true };
    }),

    me: publicProcedure.query(async ({ ctx }) => {
      const adminId = ctx.req.cookies["admin_session"];
      if (!adminId) return null;

      const admin = await getAdminUserById(Number(adminId));
      if (!admin || !admin.isActive) return null;

      return {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        fullName: admin.fullName,
        role: "admin" as const,
      };
    }),

    changePassword: protectedProcedure
      .input(
        z.object({
          currentPassword: z.string().min(1),
          newPassword: z
            .string()
            .min(8, "Password must be at least 8 characters"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const adminId = ctx.req.cookies["admin_session"];
        if (!adminId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Not authenticated",
          });
        }

        const admin = await getAdminUserById(Number(adminId));
        if (!admin) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Admin not found",
          });
        }

        // Verify current password
        const isValid = await authenticateAdmin(
          admin.username,
          input.currentPassword
        );
        if (!isValid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Current password is incorrect",
          });
        }

        // Update password
        const bcrypt = await import("bcryptjs");
        const hashedPassword = await bcrypt.hash(input.newPassword, 10);

        const { getDb } = await import("./db");
        const { adminUsers } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        const dbClient = await getDb();
        if (!dbClient) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        await dbClient
          .update(adminUsers)
          .set({ passwordHash: hashedPassword })
          .where(eq(adminUsers.id, admin.id));

        return { success: true, message: "Password changed successfully" };
      }),
  }),

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, cookieOptions);
      return {
        success: true,
      } as const;
    }),
  }),

  // Panel management
  panels: router({
    list: protectedProcedure
      .input(
        z
          .object({
            timePeriod: z.enum(["today", "yesterday", "7d", "30d", "all"]).optional(),
            timezone: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await db.getAllPanels(
          input?.timePeriod || "today",
          input?.timezone || "GMT+5:30"
        );
      }),

    getByName: protectedProcedure
      .input(z.object({ name: z.string() }))
      .query(async ({ input }) => {
        return await db.getPanelByName(input.name);
      }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string(),
          pointsBalance: z.number().default(0),
          openingBalance: z.number().default(0),
          closingBalance: z.number().default(0),
          settling: z.number().default(0),
          extraDeposit: z.number().default(0),
          bonusPoints: z.number().default(0),
          profitLoss: z.number().default(0),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createPanel(input);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          pointsBalance: z.number().optional(),
          openingBalance: z.number().optional(),
          closingBalance: z.number().optional(),
          topUp: z.number().optional(),
          extraDeposit: z.number().optional(),
          bonusPoints: z.number().optional(),
          profitLoss: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        // Get current panel state before update
        const currentPanel = await db.getPanelById(id);
        if (!currentPanel) {
          throw new Error("Panel not found");
        }

        // Update the panel
        await db.updatePanel(id, data);

        // If topUp was increased, record the transaction
        if (data.topUp && data.topUp > currentPanel.topUp) {
          // Save to topUpHistory table
          await db.saveTopUpHistory({
            panelId: id,
            panelName: currentPanel.name,
            previousTopUp: currentPanel.topUp,
            amountAdded: data.topUp - currentPanel.topUp,
            newTopUp: data.topUp,
            previousClosingBalance: currentPanel.closingBalance,
            newClosingBalance: data.closingBalance || currentPanel.closingBalance,
            previousPointsBalance: currentPanel.pointsBalance,
            newPointsBalance: data.pointsBalance || currentPanel.pointsBalance,
            createdBy: ctx.user?.name || 'Unknown',
          });
        }

        // Get panel name for broadcast
        const panel = await db.getPanelById(id);
        if (panel) {
          // Emit real-time update
          const wsManager = getWebSocketManager();
          if (wsManager) {
            wsManager.broadcastPanelUpdate({
              panelName: panel.name,
              updates: data,
              updatedData: panel,
            });
          }
        }

        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        await db.deletePanels(input.ids);
        return { success: true };
      }),
  }),

  // Bank account management
  bankAccounts: router({
    list: protectedProcedure
      .input(
        z
          .object({
            timePeriod: z.enum(["today", "yesterday", "7d", "30d", "all"]).optional(),
            timezone: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await db.getAllBankAccounts(
          input?.timePeriod || "today",
          input?.timezone || "GMT+5:30"
        );
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getBankAccountById(input.id);
      }),

    getTotalDeposits: protectedProcedure
      .input(z.object({ bankName: z.string(), accountNumber: z.string() }))
      .query(async ({ input }) => {
        return await db.getTotalDepositsByBankAccount({
          bankName: input.bankName,
          accountNumber: input.accountNumber,
        });
      }),

    getTotalWithdrawals: protectedProcedure
      .input(z.object({ bankName: z.string(), accountNumber: z.string() }))
      .query(async ({ input }) => {
        return await db.getTotalWithdrawalsByBankAccount({
          bankName: input.bankName,
          accountNumber: input.accountNumber,
        });
      }),

    create: adminProcedure
      .input(
        z.object({
          accountHolderName: z.string(),
          accountNumber: z.string(),
          bankName: z.string(),
          accountType: z.enum(["Deposit", "Withdrawal", "Both"]).default("Both"),
          openingBalance: z.number().default(0),
          closingBalance: z.number().default(0),
          totalCharges: z.number().default(0),
          isActive: z.number().default(1),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createBankAccount(input);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          accountHolderName: z.string().optional(),
          accountNumber: z.string().optional(),
          bankName: z.string().optional(),
          accountType: z.enum(["Deposit", "Withdrawal", "Both"]).optional(),
          openingBalance: z.number().optional(),
          closingBalance: z.number().optional(),
          totalCharges: z.number().optional(),
          isActive: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateBankAccount(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        await db.deleteBankAccounts(input.ids);
        return { success: true };
      }),

    updateFees: adminProcedure
      .input(
        z.object({
          id: z.number(),
          feeIMPS: z.number(),
          feeRTGS: z.number(),
          feeNEFT: z.number(),
          feeUPI: z.number(),
          feePhonePe: z.number(),
          feeGooglePay: z.number(),
          feePaytm: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...fees } = input;
        await db.updateBankAccountFees(id, fees);
        return { success: true };
      }),
  }),

  // Player management
  players: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllPlayers();
    }),

    getByUserId: protectedProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ input }) => {
        return await db.getPlayerByUserId(input.userId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          userId: z.string(),
          name: z.string().optional(),
          panelName: z.string(),
          openingBalance: z.number().optional(),
          utr: z.string().optional(),
          bankName: z.string().optional(),
          accountNumber: z.string().optional(),
          bonusPoints: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { openingBalance, utr, bankName, accountNumber, bonusPoints, ...playerData } = input;

        // Create the player
        const player = await db.createPlayer(playerData);

        // If opening balance is provided and greater than 0, create a deposit
        if (openingBalance && openingBalance > 0) {
          await db.createDeposit({
            userId: input.userId,
            amount: openingBalance,
            utr: utr || null,
            bankName: bankName || null,
            accountNumber: accountNumber || null,
            panelName: input.panelName,
            bonusPoints: bonusPoints || 0,
            depositDate: new Date(),
            status: "approved",
          });
        }

        return player;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          userId: z.string(),
          name: z.string().optional(),
          panelName: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.updatePlayer(input);
      }),

    delete: adminProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        await db.deletePlayers(input.ids);
        return { success: true };
      }),
  }),

  // Deposit management
  deposits: router({
    list: protectedProcedure
      .input(
        z
          .object({
            timePeriod: z.enum(["today", "yesterday", "7d", "30d", "all"]).optional(),
            timezone: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await db.getAllDeposits(
          input?.timePeriod || "today",
          input?.timezone || "GMT+5:30"
        );
      }),

    getByDateRange: protectedProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ input }) => {
        return await db.getDepositsByDateRange(input.startDate, input.endDate);
      }),

    create: protectedProcedure
      .input(
        z.object({
          userId: z.string(),
          amount: z.number(),
          utr: z.string().optional(),
          accountNumber: z.string().optional(),
          bankName: z.string().optional(),
          panelName: z.string(),
          bonusPoints: z.number().default(0),
          isExtraDeposit: z.number().default(0),
          isWrongDeposit: z.number().default(0),
          depositDate: z.date().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createDeposit(input);
      }),

    statistics: protectedProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ input }) => {
        const deposits = await db.getDepositsByDateRange(
          input.startDate,
          input.endDate
        );
        const totalAmount = deposits.reduce((sum, d) => sum + d.amount, 0);
        const totalBonus = deposits.reduce((sum, d) => sum + (d.bonusPoints || 0), 0);
        const uniquePlayers = new Set(deposits.map(d => d.userId)).size;
        return {
          totalDeposits: deposits.length,
          totalAmount,
          totalBonus,
          uniquePlayers,
        };
      }),
  }),

  // Withdrawal management
  withdrawals: router({
    list: protectedProcedure
      .input(
        z
          .object({
            timePeriod: z.enum(["today", "yesterday", "7d", "30d", "all"]).optional(),
            timezone: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await db.getAllWithdrawals(
          input?.timePeriod || "today",
          input?.timezone || "GMT+5:30"
        );
      }),

    getByDateRange: protectedProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ input }) => {
        return await db.getWithdrawalsByDateRange(input.startDate, input.endDate);
      }),

    create: protectedProcedure
      .input(
        z.object({
          userId: z.string(),
          amount: z.number(),
          utr: z.string().optional(),
          accountNumber: z.string().optional(),
          bankName: z.string().optional(),
          panelName: z.string(),
          paymentMethod: z
            .enum(["IMPS", "RTGS", "NEFT", "UPI", "PhonePe", "GooglePay", "Paytm"])
            .optional(),
          transactionCharge: z.number().default(0),
          status: z.enum(["pending", "approved", "rejected"]).default("pending"),
          isExtraWithdrawal: z.number().default(0),
          isWrongWithdrawal: z.number().default(0),
          withdrawalDate: z.date(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createWithdrawal(input);
      }),

    updateStatus: adminProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["pending", "approved", "rejected"]),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateWithdrawalStatus(input.id, input.status);
        return { success: true };
      }),

    statistics: protectedProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ input }) => {
        const withdrawals = await db.getWithdrawalsByDateRange(
          input.startDate,
          input.endDate
        );
        const totalAmount = withdrawals.reduce((sum, w) => sum + w.amount, 0);
        const uniquePlayers = new Set(withdrawals.map(w => w.userId)).size;
        return {
          totalWithdrawals: withdrawals.length,
          totalAmount,
          uniquePlayers,
        };
      }),
  }),

  // Gameplay transactions management
  gameplayTransactions: router({
    list: protectedProcedure
      .input(
        z
          .object({
            timePeriod: z.enum(["today", "yesterday", "7d", "30d", "all"]).optional(),
            timezone: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await db.getAllGameplayTransactions(
          input?.timePeriod || "today",
          input?.timezone || "GMT+5:30"
        );
      }),

    getByPlayer: protectedProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ input }) => {
        return await db.getGameplayTransactionsByPlayer(input.userId);
      }),

    getByPanel: protectedProcedure
      .input(z.object({ panelName: z.string() }))
      .query(async ({ input }) => {
        return await db.getGameplayTransactionsByPanel(input.panelName);
      }),

    create: protectedProcedure
      .input(
        z.object({
          userId: z.string(),
          panelName: z.string(),
          transactionType: z.enum(["Win", "Loss"]),
          amount: z.number(),
          notes: z.string().optional(),
          transactionDate: z.date(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createGameplayTransaction(input);
      }),
  }),

  // Transaction ledger
  transactions: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllTransactions();
    }),

    getByDateRange: protectedProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ input }) => {
        return await db.getTransactionsByDateRange(
          input.startDate,
          input.endDate
        );
      }),

    create: protectedProcedure
      .input(
        z.object({
          type: z.enum(["deposit", "withdrawal", "incoming", "outgoing"]),
          amount: z.number(),
          utr: z.string().optional(),
          bankAccountId: z.number().optional(),
          panelName: z.string().optional(),
          userId: z.string().optional(),
          description: z.string().optional(),
          transactionDate: z.date(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createTransaction(input);
      }),
  }),

  // Dashboard statistics
  dashboard: router({
    overview: protectedProcedure.query(async () => {
      const panels = await db.getAllPanels();
      const bankAccounts = await db.getAllBankAccounts();
      const gameplayTransactions = await db.getAllGameplayTransactions();

      // Total panel points balance
      const totalPanelBalance = panels.reduce(
        (sum, p) => sum + (p.pointsBalance || 0),
        0
      );
      const totalBankBalance = bankAccounts.reduce(
        (sum, b) => sum + b.closingBalance,
        0
      );

      // Calculate actual profit/loss from gameplay
      // Panel profit = Player losses (negative for panel)
      // Panel loss = Player wins (positive for panel)
      const totalPlayerWins = gameplayTransactions
        .filter(t => t.transactionType === "Win")
        .reduce((sum, t) => sum + t.amount, 0);
      const totalPlayerLosses = gameplayTransactions
        .filter(t => t.transactionType === "Loss")
        .reduce((sum, t) => sum + t.amount, 0);

      // Panel profit/loss = Player losses - Player wins
      const totalProfitLoss = totalPlayerLosses - totalPlayerWins;

      return {
        totalPanelBalance,
        totalBankBalance,
        totalProfitLoss,
        panelCount: panels.length,
        bankAccountCount: bankAccounts.filter(b => b.isActive === 1).length,
      };
    }),

    todayStats: protectedProcedure
      .input(
        z
          .object({
            timezoneOffset: z.number().optional(), // Offset in minutes from UTC (e.g., -330 for IST)
          })
          .optional()
      )
      .query(async ({ input }) => {
        const timezoneOffset = input?.timezoneOffset ?? 0;

        // Calculate today's start and end in user's timezone
        const now = new Date();
        const localNow = new Date(now.getTime() - timezoneOffset * 60 * 1000);
        const today = new Date(
          localNow.getFullYear(),
          localNow.getMonth(),
          localNow.getDate()
        );
        const todayUTC = new Date(today.getTime() + timezoneOffset * 60 * 1000);
        const tomorrowUTC = new Date(todayUTC.getTime() + 24 * 60 * 60 * 1000);

        const deposits = await db.getDepositsByDateRange(todayUTC, tomorrowUTC);
        const withdrawals = await db.getWithdrawalsByDateRange(
          todayUTC,
          tomorrowUTC
        );

        return {
          todayDeposits: deposits.length,
          todayWithdrawals: withdrawals.length,
          todayDepositAmount: deposits.reduce((sum, d) => sum + d.amount, 0),
          todayWithdrawalAmount: withdrawals.reduce(
            (sum, w) => sum + w.amount,
            0
          ),
          uniquePlayersDeposited: new Set(deposits.map(d => d.userId)).size,
          uniquePlayersWithdrew: new Set(withdrawals.map(w => w.userId)).size,
        };
      }),

    bonusStats: protectedProcedure
      .input(
        z
          .object({
            timezoneOffset: z.number().optional(), // Offset in minutes from UTC (e.g., -330 for IST)
          })
          .optional()
      )
      .query(async ({ input }) => {
        const timezoneOffset = input?.timezoneOffset ?? 0;

        // Calculate last 24 hours in user's timezone
        const now = new Date();
        const localNow = new Date(now.getTime() - timezoneOffset * 60 * 1000);
        const today = new Date(
          localNow.getFullYear(),
          localNow.getMonth(),
          localNow.getDate()
        );
        const todayUTC = new Date(today.getTime() + timezoneOffset * 60 * 1000);
        const tomorrowUTC = new Date(todayUTC.getTime() + 24 * 60 * 60 * 1000);

        // Get all deposits from last 24 hours
        const deposits = await db.getDepositsByDateRange(todayUTC, tomorrowUTC);

        // Calculate total bonus and breakdown by panel
        const totalBonus = deposits.reduce(
          (sum, d) => sum + (d.bonusPoints || 0),
          0
        );

        // Group by panel
        const bonusByPanel = deposits.reduce(
          (acc, d) => {
            if (d.bonusPoints && d.bonusPoints > 0) {
              const panelName = d.panelName || "Unknown";
              if (!acc[panelName]) {
                acc[panelName] = 0;
              }
              acc[panelName] += d.bonusPoints;
            }
            return acc;
          },
          {} as Record<string, number>
        );

        // Convert to array format
        const panelBreakdown = Object.entries(bonusByPanel).map(
          ([panelName, bonus]) => ({
            panelName,
            bonus,
          })
        );

        return {
          totalBonus,
          panelBreakdown,
        };
      }),

    // Get real-time daily balances
    getRealTimeDailyBalances: protectedProcedure
      .input(
        z.object({
          panelId: z.number(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        try {
          // Get panel info
          const panel = await db.getPanelById(input.panelId);
          if (!panel) {
            throw new Error("Panel not found");
          }

          // Get all deposits and withdrawals for the period
          const deposits = await db.getDepositsByDateRange(
            input.startDate ? new Date(input.startDate) : new Date(0),
            input.endDate ? new Date(input.endDate + 'T23:59:59.999Z') : new Date()
          );

          const withdrawals = await db.getWithdrawalsByDateRange(
            input.startDate ? new Date(input.startDate) : new Date(0),
            input.endDate ? new Date(input.endDate + 'T23:59:59.999Z') : new Date()
          );

          // Filter by panel name
          const panelDeposits = deposits.filter(d => d.panelName === panel.name);
          const panelWithdrawals = withdrawals.filter(w => w.panelName === panel.name);

          // Group by date and calculate daily balances
          const dailyMap = new Map<string, any>();

          // Get opening balance for the period
          let openingBalance = panel.openingBalance || 0;
          if (input.startDate) {
            const prevDay = new Date(input.startDate);
            prevDay.setDate(prevDay.getDate() - 1);
            const prevBalance = await db.getPanelDailyBalance(input.panelId, prevDay, "GMT+5:30");
            if (prevBalance) {
              openingBalance = Number(prevBalance.closingBalance) || 0;
            }
          }

          // Process all transactions by date
          const allDates = new Set<string>();
          
          panelDeposits.forEach(dep => {
            const date = new Date(dep.depositDate).toISOString().split('T')[0];
            allDates.add(date);
          });

          panelWithdrawals.forEach(wit => {
            const date = new Date(wit.withdrawalDate).toISOString().split('T')[0];
            allDates.add(date);
          });

          // Sort dates
          const sortedDates = Array.from(allDates).sort();

          // Calculate daily balances
          let currentBalance = openingBalance;
          sortedDates.forEach(date => {
            const dayDeposits = panelDeposits
              .filter(d => new Date(d.depositDate).toISOString().split('T')[0] === date)
              .reduce((sum, d) => sum + (d.amount || 0), 0);
            
            const dayWithdrawals = panelWithdrawals
              .filter(w => new Date(w.withdrawalDate).toISOString().split('T')[0] === date)
              .reduce((sum, w) => sum + (w.amount || 0), 0);
            
            const dayBonus = panelDeposits
              .filter(d => new Date(d.depositDate).toISOString().split('T')[0] === date)
              .reduce((sum, d) => sum + (d.bonusPoints || 0), 0);

            const dayOpening = currentBalance;
            const dayClosing = dayOpening - (dayDeposits + dayBonus) + dayWithdrawals + (panel.topUp || 0);

            dailyMap.set(date, {
              date,
              openingBalance: dayOpening,
              deposits: dayDeposits,
              withdrawals: dayWithdrawals,
              bonusPoints: dayBonus,
              closingBalance: dayClosing,
              profitLoss: dayDeposits - dayWithdrawals
            });

            currentBalance = dayClosing;
          });

          // Convert to array and sort
          return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
        } catch (error) {
          console.error("Error getting real-time daily balances:", error);
          throw error;
        }
      }),
  }),

  // Daily report generation
  reports: router({
    generate: adminProcedure
      .input(
        z.object({
          reportDate: z.date(),
          panelName: z.string().optional(),
          timezone: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // Get timezone from input or default to GMT+5:30 (IST)
        const timezone = input.timezone || "GMT+5:30";

        // Convert timezone string to offset in minutes
        const getTimezoneOffset = (tz: string): number => {
          const match = tz.match(/GMT([+-]\d{2}):?(\d{2})/);
          if (!match) return 330; // Default to GMT+5:30 (330 minutes)
          const [, hours, minutes] = match;
          const offset = parseInt(hours) * 60 + parseInt(minutes);
          return offset;
        };

        const timezoneOffset = getTimezoneOffset(timezone);

        // Calculate date range based on timezone
        const now = new Date(input.reportDate);
        const localTime = new Date(
          now.getTime() +
            now.getTimezoneOffset() * 60000 +
            timezoneOffset * 60000
        );
        const startDate = new Date(localTime);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);

        // Convert back to UTC for database queries
        const utcStart = new Date(
          startDate.getTime() -
            timezoneOffset * 60000 -
            now.getTimezoneOffset() * 60000
        );
        const utcEnd = new Date(
          endDate.getTime() -
            timezoneOffset * 60000 -
            now.getTimezoneOffset() * 60000
        );

        // Get data based on panel filter
        let deposits, withdrawals, panels;

        if (input.panelName) {
          // Panel-specific report
          console.log(
            `Generating panel-specific report for: ${input.panelName}`
          );

          // Get the specific panel first
          const specificPanel = await db.getPanelByName(input.panelName);
          if (!specificPanel) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Panel "${input.panelName}" not found`,
            });
          }

          deposits = await db.getDepositsByPanelAndDateRange(
            input.panelName,
            utcStart,
            utcEnd
          );
          withdrawals = await db.getWithdrawalsByPanelAndDateRange(
            input.panelName,
            utcStart,
            utcEnd
          );
          panels = [specificPanel];

          console.log(
            `Found ${deposits.length} deposits and ${withdrawals.length} withdrawals for panel ${input.panelName}`
          );
        } else {
          // All panels report
          console.log("Generating report for all panels");
          deposits = await db.getDepositsByDateRange(utcStart, utcEnd);
          withdrawals = await db.getWithdrawalsByDateRange(utcStart, utcEnd);
          panels = await db.getAllPanels("all", timezone);

          console.log(
            `Found ${deposits.length} deposits and ${withdrawals.length} withdrawals for all panels`
          );
        }

        const bankAccounts = await db.getAllBankAccounts("all", timezone);

        // Calculate panel-wise statistics
        const panelStats = panels.map(panel => {
          const panelDeposits = deposits.filter(
            d => d.panelName === panel.name
          );
          const panelWithdrawals = withdrawals.filter(
            w => w.panelName === panel.name
          );

          return {
            panelName: panel.name,
            openingBalance: panel.openingBalance,
            closingBalance: panel.closingBalance,
            pointsBalance: panel.pointsBalance,
            profitLoss: panel.profitLoss,
            extraPurchasedPoints: panel.extraDeposit,
            totalDeposits: panelDeposits.reduce((sum, d) => sum + d.amount, 0),
            totalWithdrawals: panelWithdrawals.reduce(
              (sum, w) => sum + w.amount,
              0
            ),
            numberOfDeposits: panelDeposits.length,
            numberOfWithdrawals: panelWithdrawals.length,
            uniquePlayersDeposited: new Set(panelDeposits.map(d => d.userId))
              .size,
            uniquePlayersWithdrew: new Set(panelWithdrawals.map(w => w.userId))
              .size,
          };
        });

        const reportData = {
          panels,
          bankAccounts,
          deposits,
          withdrawals,
          panelStats,
          timezone,
          isPanelSpecific: !!input.panelName,
          selectedPanel: input.panelName,
        };

        const report = {
          reportDate: input.reportDate,
          panelName: input.panelName,
          timezone,
          totalDeposits: deposits.reduce((sum, d) => sum + d.amount, 0),
          totalWithdrawals: withdrawals.reduce((sum, w) => sum + w.amount, 0),
          totalProfitLoss: panels.reduce((sum, p) => sum + p.profitLoss, 0),
          numberOfDeposits: deposits.length,
          numberOfWithdrawals: withdrawals.length,
          uniquePlayersDeposited: new Set(deposits.map(d => d.userId)).size,
          uniquePlayersWithdrew: new Set(withdrawals.map(w => w.userId)).size,
          newIdsCreated: 0, // This would need additional tracking
          reportData: JSON.stringify(reportData),
        };

        return await db.createDailyReport(report);
      }),

    getByDate: protectedProcedure
      .input(
        z.object({
          reportDate: z.date(),
        })
      )
      .query(async ({ input }) => {
        return await db.getDailyReportByDate(input.reportDate);
      }),
  }),

  // Analytics & Real-time Dashboard
  analytics: router({
    getRealTimeMetrics: protectedProcedure
      .input(
        z
          .object({
            timezone: z.string().optional(),
            timeRange: z.enum(["1h", "6h", "24h", "7d"]).default("24h"),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const timezone = input?.timezone || "GMT+5:30";
        const timeRange = input?.timeRange || "24h";

        // Convert timezone string to offset in minutes
        const getTimezoneOffset = (tz: string): number => {
          const match = tz.match(/GMT([+-]\d{2}):?(\d{2})/);
          if (!match) return 330;
          const [, hours, minutes] = match;
          return parseInt(hours) * 60 + parseInt(minutes);
        };

        const timezoneOffset = getTimezoneOffset(timezone);

        // Calculate time range based on selection and timezone
        const now = new Date();
        const localTime = new Date(
          now.getTime() +
            now.getTimezoneOffset() * 60000 +
            timezoneOffset * 60000
        );
        let startDate: Date;

        switch (timeRange) {
          case "1h":
            startDate = new Date(localTime.getTime() - 60 * 60 * 1000);
            break;
          case "6h":
            startDate = new Date(localTime.getTime() - 6 * 60 * 60 * 1000);
            break;
          case "24h":
            startDate = new Date(localTime.getTime() - 24 * 60 * 60 * 1000);
            break;
          case "7d":
            startDate = new Date(localTime.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        }

        // Convert back to UTC for database queries
        const utcStart = new Date(
          startDate.getTime() -
            timezoneOffset * 60000 -
            now.getTimezoneOffset() * 60000
        );

        // Get all panels with their current data
        const panels = await db.getAllPanels("all", timezone);
        const deposits = await db.getDepositsByDateRange(utcStart, new Date());
        const withdrawals = await db.getWithdrawalsByDateRange(
          utcStart,
          new Date()
        );
        const gameplayTransactions = await db.getAllGameplayTransactions(
          "all",
          timezone
        );

        // Calculate real-time metrics for each panel
        const panelMetrics = await Promise.all(
          panels.map(async panel => {
            const panelDeposits = deposits.filter(
              d => d.panelName === panel.name
            );
            const panelWithdrawals = withdrawals.filter(
              w => w.panelName === panel.name
            );
            const panelGameplay = gameplayTransactions.filter(
              g => g.panelName === panel.name
            );

            // Calculate transaction velocity (transactions per hour)
            const hoursElapsed =
              (now.getTime() - utcStart.getTime()) / (1000 * 60 * 60);
            const transactionVelocity = (
              (panelDeposits.length + panelWithdrawals.length) /
              hoursElapsed
            ).toFixed(2);

            // Calculate active players (unique players in time range)
            const activePlayers = new Set([
              ...panelDeposits.map(d => d.userId),
              ...panelWithdrawals.map(w => w.userId),
              ...panelGameplay.map(g => g.userId),
            ]).size;

            // Calculate current hour performance
            const currentHour = new Date().getHours();
            const currentHourDeposits = panelDeposits.filter(
              d =>
                new Date(d.createdAt || d.depositDate).getHours() ===
                currentHour
            ).length;
            const currentHourWithdrawals = panelWithdrawals.filter(
              w =>
                new Date(w.createdAt || w.withdrawalDate).getHours() ===
                currentHour
            ).length;

            // Calculate trend (compare with previous period)
            const previousStart = new Date(
              utcStart.getTime() - (utcStart.getTime() - startDate.getTime())
            );
            const previousDeposits = await db.getDepositsByDateRange(
              previousStart,
              utcStart
            );
            const previousWithdrawals = await db.getWithdrawalsByDateRange(
              previousStart,
              utcStart
            );

            const previousPanelDeposits = previousDeposits.filter(
              d => d.panelName === panel.name
            );
            const previousPanelWithdrawals = previousWithdrawals.filter(
              w => w.panelName === panel.name
            );

            const previousTotal =
              previousPanelDeposits.reduce((sum, d) => sum + d.amount, 0) -
              previousPanelWithdrawals.reduce((sum, w) => sum + w.amount, 0);
            const currentTotal =
              panelDeposits.reduce((sum, d) => sum + d.amount, 0) -
              panelWithdrawals.reduce((sum, w) => sum + w.amount, 0);

            const trendPercentage =
              previousTotal !== 0
                ? (
                    ((currentTotal - previousTotal) / Math.abs(previousTotal)) *
                    100
                  ).toFixed(2)
                : "0";

            return {
              id: panel.id,
              name: panel.name,
              currentBalance: panel.closingBalance,
              profitLoss: panel.profitLoss,
              pointsBalance: panel.pointsBalance,
              totalDeposits: panelDeposits.reduce(
                (sum, d) => sum + d.amount,
                0
              ),
              totalWithdrawals: panelWithdrawals.reduce(
                (sum, w) => sum + w.amount,
                0
              ),
              totalDepositsCount: panelDeposits.length,
              totalWithdrawalsCount: panelWithdrawals.length,
              netCashFlow:
                panelDeposits.reduce((sum, d) => sum + d.amount, 0) -
                panelWithdrawals.reduce((sum, w) => sum + w.amount, 0),
              transactionCount: panelDeposits.length + panelWithdrawals.length,
              transactionVelocity: parseFloat(transactionVelocity),
              activePlayers,
              currentHourDeposits,
              currentHourWithdrawals,
              trendPercentage: parseFloat(trendPercentage),
              performance: panel.profitLoss >= 0 ? "profitable" : "loss",
              utilizationRate: (
                (panel.pointsBalance /
                  (panel.openingBalance + panel.pointsBalance)) *
                100
              ).toFixed(2),
              lastActivity:
                panelDeposits.length > 0
                  ? Math.max(
                      ...panelDeposits.map(d =>
                        new Date(d.createdAt || d.depositDate).getTime()
                      )
                    )
                  : panelWithdrawals.length > 0
                    ? Math.max(
                        ...panelWithdrawals.map(w =>
                          new Date(w.createdAt || w.withdrawalDate).getTime()
                        )
                      )
                    : panel.updatedAt?.getTime() || Date.now(),
            };
          })
        );

        // Calculate overall metrics
        const totalMetrics = {
          totalPanels: panels.length,
          totalProfitLoss: panels.reduce((sum, p) => sum + p.profitLoss, 0),
          totalDeposits: panelMetrics.reduce((sum, p) => sum + p.totalDeposits, 0),
          totalWithdrawals: panelMetrics.reduce((sum, p) => sum + p.totalWithdrawals, 0),
          totalDepositCount: panelMetrics.reduce((sum, p) => sum + p.totalDepositsCount || 0, 0),
          totalWithdrawalCount: panelMetrics.reduce((sum, p) => sum + p.totalWithdrawalsCount || 0, 0),
          totalActivePlayers: panelMetrics.reduce(
            (sum, p) => sum + p.activePlayers,
            0
          ),
          totalTransactionVolume: panelMetrics.reduce(
            (sum, p) => sum + p.transactionCount,
            0
          ),
          averageTransactionVelocity: (
            panelMetrics.reduce((sum, p) => sum + p.transactionVelocity, 0) /
            panels.length
          ).toFixed(2),
          profitablePanels: panelMetrics.filter(
            p => p.performance === "profitable"
          ).length,
          lossPanels: panelMetrics.filter(p => p.performance === "loss").length,
          totalNetCashFlow: panelMetrics.reduce(
            (sum, p) => sum + p.netCashFlow,
            0
          ),
          topPerformingPanel: panelMetrics.reduce(
            (max, p) => (p.profitLoss > max.profitLoss ? p : max),
            panelMetrics[0] || {}
          ),
          worstPerformingPanel: panelMetrics.reduce(
            (min, p) => (p.profitLoss < min.profitLoss ? p : min),
            panelMetrics[0] || {}
          ),
        };

        return {
          panelMetrics,
          totalMetrics,
          timeRange,
          timezone,
          lastUpdated: new Date(),
          dataFreshness: "real-time",
        };
      }),

    getPerformanceComparison: protectedProcedure
      .input(
        z.object({
          panelIds: z.array(z.number()).optional(),
          timezone: z.string().optional(),
          period: z
            .enum(["today", "yesterday", "week", "month"])
            .default("today"),
        })
      )
      .query(async ({ input }) => {
        const timezone = input.timezone || "GMT+5:30";
        const panelIds = input.panelIds;

        // Get panels to compare
        let panels;
        if (panelIds && panelIds.length > 0) {
          panels = await Promise.all(panelIds.map(id => db.getPanelById(id)));
          panels = panels.filter(p => p !== undefined);
        } else {
          panels = await db.getAllPanels("all", timezone);
        }

        // Calculate date ranges based on period
        const getTimeRange = (period: string) => {
          const now = new Date();
          const getTimezoneOffset = (tz: string): number => {
            const match = tz.match(/GMT([+-]\d{2}):?(\d{2})/);
            if (!match) return 330;
            const [, hours, minutes] = match;
            return parseInt(hours) * 60 + parseInt(minutes);
          };

          const timezoneOffset = getTimezoneOffset(timezone);
          const localTime = new Date(
            now.getTime() +
              now.getTimezoneOffset() * 60000 +
              timezoneOffset * 60000
          );
          let startDate: Date;
          let endDate: Date = new Date(localTime);

          switch (period) {
            case "today":
              startDate = new Date(localTime);
              startDate.setHours(0, 0, 0, 0);
              break;
            case "yesterday":
              endDate = new Date(localTime);
              endDate.setHours(0, 0, 0, 0);
              startDate = new Date(endDate);
              startDate.setDate(startDate.getDate() - 1);
              break;
            case "week":
              startDate = new Date(localTime);
              startDate.setDate(startDate.getDate() - 7);
              break;
            case "month":
              startDate = new Date(localTime);
              startDate.setMonth(startDate.getMonth() - 1);
              break;
            default:
              startDate = new Date(localTime);
              startDate.setHours(0, 0, 0, 0);
          }

          // Convert back to UTC for database queries
          const utcStart = new Date(
            startDate.getTime() -
              timezoneOffset * 60000 -
              now.getTimezoneOffset() * 60000
          );
          const utcEnd = new Date(
            endDate.getTime() -
              timezoneOffset * 60000 -
              now.getTimezoneOffset() * 60000
          );

          return { start: utcStart, end: utcEnd };
        };

        const dateRange = getTimeRange(input.period);

        // Get transaction data for the period
        const deposits = await db.getDepositsByDateRange(
          dateRange.start,
          dateRange.end
        );
        const withdrawals = await db.getWithdrawalsByDateRange(
          dateRange.start,
          dateRange.end
        );

        // Calculate comparison metrics
        const comparisonData = panels.map(panel => {
          const panelDeposits = deposits.filter(
            d => d.panelName === panel.name
          );
          const panelWithdrawals = withdrawals.filter(
            w => w.panelName === panel.name
          );

          return {
            id: panel.id,
            name: panel.name,
            profitLoss: panel.profitLoss,
            currentBalance: panel.closingBalance,
            periodDeposits: panelDeposits.reduce((sum, d) => sum + d.amount, 0),
            periodWithdrawals: panelWithdrawals.reduce(
              (sum, w) => sum + w.amount,
              0
            ),
            periodNetCashFlow:
              panelDeposits.reduce((sum, d) => sum + d.amount, 0) -
              panelWithdrawals.reduce((sum, w) => sum + w.amount, 0),
            periodTransactionCount:
              panelDeposits.length + panelWithdrawals.length,
            uniquePlayers: new Set([
              ...panelDeposits.map(d => d.userId),
              ...panelWithdrawals.map(w => w.userId),
            ]).size,
            averageTransactionSize:
              panelDeposits.length + panelWithdrawals.length > 0
                ? (panelDeposits.reduce((sum, d) => sum + d.amount, 0) +
                    panelWithdrawals.reduce((sum, w) => sum + w.amount, 0)) /
                  (panelDeposits.length + panelWithdrawals.length)
                : 0,
            performanceRank: 0, // Will be calculated below
            growthRate: 0, // Will be calculated based on historical data
          };
        });

        // Sort by profit/loss and assign ranks
        comparisonData.sort((a, b) => b.profitLoss - a.profitLoss);
        comparisonData.forEach((panel, index) => {
          panel.performanceRank = index + 1;
        });

        return {
          comparisonData,
          period: input.period,
          timezone,
          dateRange: {
            start: dateRange.start,
            end: dateRange.end,
          },
          generatedAt: new Date(),
        };
      }),
  }),
  todaysPlayersReport: router({
    getStats: protectedProcedure
      .input(z.object({ timezone: z.string().optional() }).optional())
      .query(async ({ input }) => {
        // Get timezone from input or default to GMT+5:30 (IST)
        const timezone = input?.timezone || "GMT+5:30";

        // Convert timezone string to offset in minutes
        const getTimezoneOffset = (tz: string): number => {
          const match = tz.match(/GMT([+-]\d{2}):?(\d{2})/);
          if (!match) return 330; // Default to GMT+5:30 (330 minutes)
          const [, hours, minutes] = match;
          const offset = parseInt(hours) * 60 + parseInt(minutes);
          return offset;
        };

        const timezoneOffset = getTimezoneOffset(timezone);

        // Get current time in the specified timezone
        const now = new Date();
        const localTime = new Date(
          now.getTime() +
            now.getTimezoneOffset() * 60000 +
            timezoneOffset * 60000
        );
        const twentyFourHoursAgo = new Date(
          localTime.getTime() - 24 * 60 * 60 * 1000
        );

        // Convert back to UTC for database queries
        const utcStart = new Date(
          twentyFourHoursAgo.getTime() -
            timezoneOffset * 60000 -
            now.getTimezoneOffset() * 60000
        );
        const utcEnd = new Date(
          localTime.getTime() -
            timezoneOffset * 60000 -
            now.getTimezoneOffset() * 60000
        );

        // Get deposits and withdrawals from last 24 hours in specified timezone
        const deposits = await db.getDepositsByDateRange(utcStart, utcEnd);
        const withdrawals = await db.getWithdrawalsByDateRange(
          utcStart,
          utcEnd
        );

        // Get new players created in last 24 hours in specified timezone
        const newPlayers = await db.getPlayersByDateRange(utcStart, utcEnd);

        // Calculate unique players
        const uniquePlayersDeposited = new Set(deposits.map(d => d.userId))
          .size;
        const uniquePlayersWithdrew = new Set(withdrawals.map(w => w.userId))
          .size;

        return {
          numberOfDeposits: deposits.length,
          numberOfPlayersDeposited: uniquePlayersDeposited,
          numberOfWithdrawals: withdrawals.length,
          numberOfPlayersWithdrew: uniquePlayersWithdrew,
          numberOfNewIdsCreated: newPlayers.length,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
