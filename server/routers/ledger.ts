import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { sql } from "drizzle-orm";
import { ledgerQueryService } from "../_core/services/ledgerQueryService";
import { validationService } from "../_core/services/validationService";
import { ledgerCalculationService } from "../_core/services/ledgerCalculationService";
import { dailyResetService } from "../_core/services/dailyResetService";
import { auditLog } from "../_core/services/auditService";
import * as db from "../db";

/**
 * Ledger Router
 * API endpoints for the Daily Ledger System
 */
export const ledgerRouter = router({
    // Get panel ledger history
    getPanelLedger: protectedProcedure
        .input(z.object({
            panelId: z.number().optional(),
            dateFrom: z.string().optional(),
            dateTo: z.string().optional(),
            status: z.enum(['OPEN', 'CLOSED']).optional(),
            limit: z.number().optional(),
            offset: z.number().optional()
        }))
        .query(async ({ input, ctx }) => {
            return await ledgerQueryService.getPanelLedgerHistory(input);
        }),

    // Get bank ledger history
    getBankLedger: protectedProcedure
        .input(z.object({
            bankAccountId: z.number().optional(),
            dateFrom: z.string().optional(),
            dateTo: z.string().optional(),
            status: z.enum(['OPEN', 'CLOSED']).optional(),
            limit: z.number().optional(),
            offset: z.number().optional()
        }))
        .query(async ({ input }) => {
            return await ledgerQueryService.getBankLedgerHistory(input);
        }),

    // Get transaction log
    getTransactions: protectedProcedure
        .input(z.object({
            entityType: z.enum(['panel', 'bank']).optional(),
            entityId: z.number().optional(),
            dateFrom: z.string().optional(),
            dateTo: z.string().optional(),
            transactionType: z.enum(['credit', 'debit']).optional(),
            referenceType: z.enum(['deposit', 'withdrawal', 'bonus', 'topup', 'charge', 'transfer']).optional(),
            limit: z.number().optional(),
            offset: z.number().optional()
        }))
        .query(async ({ input }) => {
            return await ledgerQueryService.getTransactionHistory(input);
        }),

    // Get ledger summary by date range
    getLedgerSummary: protectedProcedure
        .input(z.object({
            dateFrom: z.string(),
            dateTo: z.string()
        }))
        .query(async ({ input }) => {
            return await ledgerQueryService.getLedgerSummaryByDateRange(input.dateFrom, input.dateTo);
        }),

    // Get top performing panels
    getTopPerformingPanels: protectedProcedure
        .input(z.object({
            dateFrom: z.string(),
            dateTo: z.string(),
            limit: z.number().default(10)
        }))
        .query(async ({ input }) => {
            return await ledgerQueryService.getTopPerformingPanels(input.dateFrom, input.dateTo, input.limit);
        }),

    // Get transaction statistics
    getTransactionStatistics: protectedProcedure
        .input(z.object({
            dateFrom: z.string(),
            dateTo: z.string()
        }))
        .query(async ({ input }) => {
            return await ledgerQueryService.getTransactionStatistics(input.dateFrom, input.dateTo);
        }),

    // Get specific panel ledger for a date
    getPanelLedgerByDate: protectedProcedure
        .input(z.object({
            panelId: z.number(),
            date: z.string()
        }))
        .query(async ({ input }) => {
            return await ledgerQueryService.getPanelLedger(input.panelId, input.date);
        }),

    // Get specific bank ledger for a date
    getBankLedgerByDate: protectedProcedure
        .input(z.object({
            bankAccountId: z.number(),
            date: z.string()
        }))
        .query(async ({ input }) => {
            return await ledgerQueryService.getBankLedger(input.bankAccountId, input.date);
        }),

    // Validate ledger integrity
    validateLedger: adminProcedure
        .input(z.object({
            date: z.string().optional()
        }))
        .mutation(async ({ input, ctx }) => {
            const date = input.date || new Date().toISOString().split('T')[0];
            
            await auditLog('VALIDATION_ALL_LEDGERS', 'system', null, { date }, { started: true }, ctx.user.id);
            
            const result = await validationService.validateAllLedgers(date);
            
            await auditLog('VALIDATION_ALL_LEDGERS', 'system', null, { 
                date, 
                valid: result.valid,
                errorCount: result.errors.length 
            }, { completed: true, result }, ctx.user.id);
            
            return result;
        }),

    // Recalculate metrics for a date (admin only)
    recalculateMetrics: adminProcedure
        .input(z.object({
            date: z.string()
        }))
        .mutation(async ({ input, ctx }) => {
            await auditLog('RECALCULATE_METRICS', 'system', null, { date: input.date }, { started: true }, ctx.user.id);
            
            await ledgerCalculationService.recalculateAllMetrics(input.date);
            
            await auditLog('RECALCULATE_METRICS', 'system', null, { date: input.date }, { completed: true }, ctx.user.id);
            
            return { success: true, message: `Metrics recalculated for ${input.date}` };
        }),

    // Perform manual daily reset (admin only)
    performDailyReset: adminProcedure
        .input(z.object({
            targetDate: z.string().optional()
        }))
        .mutation(async ({ input, ctx }) => {
            await auditLog('MANUAL_DAILY_RESET', 'system', null, input, { started: true }, ctx.user.id);
            
            await dailyResetService.manualReset(input.targetDate);
            
            await auditLog('MANUAL_DAILY_RESET', 'system', null, input, { completed: true }, ctx.user.id);
            
            return { success: true, message: "Daily reset completed" };
        }),

    // Get reset status
    getResetStatus: protectedProcedure
        .query(async () => {
            return await dailyResetService.getResetStatus();
        }),

    // Get validation status
    getValidationStatus: protectedProcedure
        .query(async () => {
            return await validationService.getValidationStatus();
        }),

    // Check if ledger can be modified
    canModifyLedger: protectedProcedure
        .input(z.object({
            entityType: z.enum(['panel', 'bank']),
            entityId: z.number(),
            date: z.string()
        }))
        .query(async ({ input }) => {
            return await validationService.canModifyLedger(input.entityType, input.entityId, input.date);
        }),

    // Get audit logs
    getAuditLogs: adminProcedure
        .input(z.object({
            operation: z.string().optional(),
            entityType: z.string().optional(),
            entityId: z.number().optional(),
            dateFrom: z.string().optional(),
            dateTo: z.string().optional(),
            limit: z.number().default(100)
        }))
        .query(async ({ input }) => {
            const { getAuditLogs } = await import("../_core/services/auditService");
            return await getAuditLogs(input);
        }),

    // Export ledger data (admin only)
    exportLedger: adminProcedure
        .input(z.object({
            entityType: z.enum(['panel', 'bank']),
            dateFrom: z.string(),
            dateTo: z.string(),
            format: z.enum(['json', 'csv']).default('json')
        }))
        .mutation(async ({ input, ctx }) => {
            await auditLog('LEDGER_EXPORT', input.entityType, null, input, { started: true }, ctx.user.id);
            
            let data;
            if (input.entityType === 'panel') {
                data = await ledgerQueryService.getPanelLedgerHistory({
                    dateFrom: input.dateFrom,
                    dateTo: input.dateTo
                });
            } else {
                data = await ledgerQueryService.getBankLedgerHistory({
                    dateFrom: input.dateFrom,
                    dateTo: input.dateTo
                });
            }
            
            await auditLog('LEDGER_EXPORT', input.entityType, null, {
                ...input,
                recordCount: data.length
            }, { completed: true }, ctx.user.id);
            
            if (input.format === 'csv') {
                // Convert to CSV format
                const headers = Object.keys(data[0] || {}).join(',');
                const rows = data.map(row => Object.values(row).join(','));
                return { data: [headers, ...rows].join('\n'), format: 'csv' };
            }
            
            return { data, format: 'json' };
        }),

    // Lock/unlock ledgers (emergency admin function)
    lockLedger: adminProcedure
        .input(z.object({
            entityType: z.enum(['panel', 'bank']),
            entityId: z.number(),
            date: z.string(),
            lock: z.boolean()
        }))
        .mutation(async ({ input, ctx }) => {
            const database = await db.getDb();
            if (!database) throw new Error("Database not available");
            
            const tableName = input.entityType === 'panel' ? 'panel_daily_ledger' : 'bank_daily_ledger';
            const entityIdField = input.entityType === 'panel' ? 'panel_id' : 'bank_account_id';
            
            await database.execute(sql`
                UPDATE ${sql.raw(tableName)}
                SET status = ${input.lock ? 'CLOSED' : 'OPEN'}, updated_at = CURRENT_TIMESTAMP
                WHERE ${sql.raw(entityIdField)} = ${input.entityId} AND ledger_date = ${input.date}
            `);
            
            await auditLog('LEDGER_LOCK_CHANGED', input.entityType, input.entityId, {
                date: input.date,
                locked: input.lock
            }, { success: true }, ctx.user.id);
            
            return { success: true, message: `Ledger ${input.lock ? 'locked' : 'unlocked'} successfully` };
        })
});
