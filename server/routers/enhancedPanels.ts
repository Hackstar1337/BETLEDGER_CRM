import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { panelLoadBalancer, realtimeSyncManager } from "../_core/loadBalancer";
import { getWebSocketManager } from "../_core/websocket";
import * as db from "../db";

/**
 * Enhanced Panel Router with Load Balancing and Real-time Features
 */
export const enhancedPanelsRouter = router({
  // Add test data (panel and bank accounts)
  addTestData: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        // Check if test panel already exists
        const existingPanel = await db.getPanelByName("Tiger Panel");
        
        if (existingPanel) {
          return {
            success: false,
            message: "Test data already exists. Tiger Panel is already created.",
          };
        }

        // Create Tiger Panel
        const panel = await db.createPanel({
          name: "Tiger Panel",
          pointsBalance: 10000,
          openingBalance: 10000,
          closingBalance: 10000, // Set closing balance to match opening initially
          topUp: 0,
          extraDeposit: 0,
          bonusPoints: 0,
          profitLoss: 0,
        });

        // Create Bank Account 1 - DEPOSIT
        await db.createBankAccount({
          accountHolderName: "BOMBAY COLLECTION",
          accountNumber: "987654321",
          bankName: "AXIS BANK D",
          accountType: "Deposit",
          openingBalance: 10000,
          closingBalance: 10000,
        });

        // Create Bank Account 2 - WITHDRAWAL
        await db.createBankAccount({
          accountHolderName: "BOMBAY COLLECTION W",
          accountNumber: "123456789",
          bankName: "AXIS BANK W",
          accountType: "Withdrawal",
          openingBalance: 10000,
          closingBalance: 10000,
        });

        // Create Player SAGAR
        await db.createPlayer({
          userId: "SAGAR",
          name: "SAGAR",
          panelName: "Tiger Panel",
          balance: 1000,
        });

        // Create a deposit for SAGAR with proper updates
        console.log("Creating deposit with amount: 1000, bonus: 100");
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        console.log("Today's date:", today);
        console.log("Deposit date:", now);
        
        await db.createDeposit({
          userId: "SAGAR",
          panelName: "Tiger Panel",
          amount: 1000,
          bonusPoints: 100, // 10% of 1000
          utr: "653252565",
          bankName: "AXIS BANK D",
          depositDate: now, // Use current time to avoid backdated logic
        });
        
        // Verify the panel state after deposit
        const panelAfter = await db.getPanelByName("Tiger Panel");
        console.log("Panel after deposit:", panelAfter);

        return {
          success: true,
          message: "Test data created successfully",
          panel: "Tiger Panel",
          bankAccounts: [
            "BOMBAY COLLECTION - AXIS BANK D",
            "BOMBAY COLLECTION W - AXIS BANK W",
          ],
          player: "SAGAR (with opening balance of ₹1000 and ₹100 bonus)",
        };
      } catch (error) {
        console.error("Error creating test data:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        // Check if it's a unique constraint error
        if (errorMessage.includes('UNIQUE constraint failed')) {
          return {
            success: false,
            message: "Test data already exists. Some records may have been created previously.",
          };
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create test data: ${errorMessage}`,
        });
      }
    }),
  // Get panel with load balancing and caching
  get: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        useCache: z.boolean().default(true),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const panel = await panelLoadBalancer.getPanel(
          input.name,
          input.useCache
        );

        // Log access for analytics
        ctx.res.setHeader("X-Load-Balanced", "true");

        return {
          ...panel,
          _metadata: {
            cached: input.useCache,
            timestamp: new Date(),
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Panel "${input.name}" not found or unavailable`,
        });
      }
    }),

  // List panels with performance metrics
  list: protectedProcedure
    .input(
      z
        .object({
          timePeriod: z.enum(["today", "yesterday", "7d", "30d", "all"]).optional(),
          timezone: z.string().optional(),
          includeMetrics: z.boolean().default(false),
          useCache: z.boolean().default(true),
        })
        .optional()
    )
    .query(async ({ input }) => {
      try {
        const timePeriod = input?.timePeriod ?? "today";
        const timezone = input?.timezone ?? "GMT+5:30";
        const includeMetrics = input?.includeMetrics ?? false;

        // Get panels from database (with caching if enabled)
        const panels = await db.getAllPanels(timePeriod, timezone);

        let result = panels;

        // Include performance metrics if requested
        if (includeMetrics) {
          const metrics = panelLoadBalancer.getPanelMetrics() as Record<
            string,
            any
          >;
          result = panels.map(panel => ({
            ...panel,
            _metrics: metrics[panel.name] || {
              requestCount: 0,
              averageResponseTime: 0,
              errorRate: 0,
              lastAccess: new Date(),
              activeConnections: 0,
            },
          }));
        }

        return {
          panels: result,
          _systemMetrics: includeMetrics
            ? panelLoadBalancer.getSystemMetrics()
            : undefined,
          _timestamp: new Date(),
        };
      } catch (error) {
        console.error("[EnhancedPanels] Error listing panels:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve panels",
        });
      }
    }),

  // Create panel with real-time notifications
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        pointsBalance: z.number().default(0),
        openingBalance: z.number().default(0),
        closingBalance: z.number().default(0),
        topUp: z.number().default(0),
        extraDeposit: z.number().default(0),
        bonusPoints: z.number().default(0),
        profitLoss: z.number().default(0),
        notifyAdmins: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { notifyAdmins, ...panelData } = input;

        // Create panel in database
        await db.createPanel(panelData);
        const panel = await db.getPanelByName(panelData.name);
        if (!panel) {
          throw new Error("Panel creation failed");
        }

        // Update load balancer cache
        await panelLoadBalancer.getPanel(panelData.name, false);

        // Send real-time notifications
        if (notifyAdmins) {
          const wsManager = getWebSocketManager();
          if (wsManager) {
            wsManager.broadcastNotification({
              type: "success",
              title: "New Panel Created",
              message: `Panel "${input.name}" has been created successfully`,
              data: { panel },
            });
          }
        }

        // Emit real-time update
        realtimeSyncManager.emit("realtimeUpdate", {
          type: "panelCreated",
          panelName: input.name,
          data: panel,
          timestamp: new Date(),
        });

        return {
          ...panel,
          _metadata: {
            created: true,
            timestamp: new Date(),
          },
        };
      } catch (error) {
        console.error("[EnhancedPanels] Error creating panel:", error);

        if (
          error instanceof Error &&
          error.message.includes("Duplicate entry")
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Panel "${input.name}" already exists`,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create panel",
        });
      }
    }),

  // Update panel with load balancing and real-time sync
  update: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        updates: z.object({
          pointsBalance: z.number().optional(),
          openingBalance: z.number().optional(),
          closingBalance: z.number().optional(),
          topUp: z.number().optional(),
          extraDeposit: z.number().optional(),
          bonusPoints: z.number().optional(),
          profitLoss: z.number().optional(),
        }),
        notifyAdmins: z.boolean().default(true),
        forceSync: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Get panel ID from name
        const existingPanel = await db.getPanelByName(input.name);
        if (!existingPanel) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Panel "${input.name}" not found`,
          });
        }

        // Update panel with load balancer
        const updatedPanel = await panelLoadBalancer.updatePanel(
          input.name,
          input.updates
        );

        // Force sync if requested
        if (input.forceSync) {
          await realtimeSyncManager.forceFullSync();
        }

        // Send notifications for critical updates
        if (input.notifyAdmins) {
          const criticalUpdates = [
            "pointsBalance",
            "closingBalance",
            "profitLoss",
          ];
          const hasCriticalUpdates = criticalUpdates.some(
            key => key in input.updates
          );

          if (hasCriticalUpdates) {
            const wsManager = getWebSocketManager();
            if (wsManager) {
              wsManager.broadcastNotification({
                type: "info",
                title: "Panel Updated",
                message: `Panel "${input.name}" has been updated with critical changes`,
                data: {
                  panelName: input.name,
                  updates: input.updates,
                  updatedBy: ctx.user?.name || "Admin",
                },
              });
            }
          }
        }

        return {
          ...updatedPanel,
          _metadata: {
            updated: true,
            timestamp: new Date(),
            synced: true,
          },
        };
      } catch (error) {
        console.error("[EnhancedPanels] Error updating panel:", error);

        if (error instanceof Error && error.message.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Panel "${input.name}" not found`,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update panel",
        });
      }
    }),

  // Batch update panels for high-traffic operations
  batchUpdate: protectedProcedure
    .input(
      z.object({
        updates: z.array(
          z.object({
            name: z.string(),
            updates: z.object({
              pointsBalance: z.number().optional(),
              closingBalance: z.number().optional(),
              profitLoss: z.number().optional(),
            }),
          })
        ),
        notifyAdmins: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const results: Array<{ name: string; success: true; data: unknown }> = [];
      const errors: Array<{ name: string; success: false; error: string }> = [];

      try {
        // Process updates in parallel with concurrency control
        const batchSize = 5;
        for (let i = 0; i < input.updates.length; i += batchSize) {
          const batch = input.updates.slice(i, i + batchSize);

          const batchResults = await Promise.allSettled(
            batch.map(async ({ name, updates }) => {
              try {
                const result = await panelLoadBalancer.updatePanel(
                  name,
                  updates
                );
                return { name, success: true as const, data: result };
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : "Unknown error";
                return { name, success: false as const, error: message };
              }
            })
          );

          batchResults.forEach((result, index) => {
            if (result.status === "fulfilled") {
              if (result.value.success) {
                results.push(result.value);
              } else {
                errors.push(result.value);
              }
            } else {
              errors.push({
                name: batch[index].name,
                success: false,
                error:
                  result.reason instanceof Error
                    ? result.reason.message
                    : "Unknown error",
              });
            }
          });

          // Small delay between batches to prevent overwhelming
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Send summary notification
        if (input.notifyAdmins && (results.length > 0 || errors.length > 0)) {
          const wsManager = getWebSocketManager();
          if (wsManager) {
            wsManager.broadcastNotification({
              type:
                results.length === input.updates.length ? "success" : "warning",
              title: "Batch Update Completed",
              message: `Updated ${results.length} panels successfully${errors.length > 0 ? `, ${errors.length} failed` : ""}`,
              data: { results, errors },
            });
          }
        }

        return {
          results,
          errors,
          summary: {
            total: input.updates.length,
            successful: results.length,
            failed: errors.length,
          },
          _metadata: {
            timestamp: new Date(),
          },
        };
      } catch (error) {
        console.error("[EnhancedPanels] Error in batch update:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Batch update failed",
        });
      }
    }),

  // Get panel performance metrics
  getMetrics: protectedProcedure
    .input(
      z.object({
        panelName: z.string().optional(),
        includeSystem: z.boolean().default(false),
      })
    )
    .query(async ({ input }) => {
      try {
        const metrics = input.panelName
          ? panelLoadBalancer.getPanelMetrics(input.panelName)
          : panelLoadBalancer.getPanelMetrics();

        const result: any = { metrics };

        if (input.includeSystem) {
          result.system = panelLoadBalancer.getSystemMetrics();
          result.sync = realtimeSyncManager.getSyncStatus();
        }

        return result;
      } catch (error) {
        console.error("[EnhancedPanels] Error getting metrics:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve metrics",
        });
      }
    }),

  // Force synchronization
  forceSync: protectedProcedure
    .input(
      z.object({
        panelName: z.string().optional(),
        fullSync: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      try {
        if (input.fullSync) {
          await realtimeSyncManager.forceFullSync();
          return {
            message: "Full synchronization completed",
            timestamp: new Date(),
          };
        } else if (input.panelName) {
          await panelLoadBalancer.getPanel(input.panelName, false);
          return {
            message: `Panel "${input.panelName}" synchronized`,
            timestamp: new Date(),
          };
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Either panelName or fullSync must be specified",
          });
        }
      } catch (error) {
        console.error("[EnhancedPanels] Error forcing sync:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Synchronization failed",
        });
      }
    }),

  // Health check for panels system
  healthCheck: protectedProcedure.query(async () => {
    try {
      const health = await panelLoadBalancer.healthCheck();
      const wsManager = getWebSocketManager();

      return {
        loadBalancer: health,
        websocket: wsManager ? wsManager.getStats() : null,
        sync: realtimeSyncManager.getSyncStatus(),
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("[EnhancedPanels] Error in health check:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Health check failed",
      });
    }
  }),
});
