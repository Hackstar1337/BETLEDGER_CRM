import * as db from "../../db";
import { sql } from "drizzle-orm";
import { auditLog } from "./auditService";
import { ledgerCalculationService } from "./ledgerCalculationService";

/**
 * Transaction Service
 * Processes all financial events and updates the daily ledger
 * 
 * Core Principles:
 * 1. Every transaction creates a log entry
 * 2. Every transaction updates the daily ledger
 * 3. Transactions are never deleted
 * 4. All updates are atomic
 */
export class TransactionService {
    /**
     * Process a deposit transaction
     * Updates both panel and bank ledgers
     */
    async processDeposit(data: {
        userId: string;
        panelId: number;
        panelName: string;
        amount: number;
        bankAccountId: number;
        bankName: string;
        depositId: number;
        depositDate: Date;
        bonusPoints?: number;
    }): Promise<void> {
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");

        const ledgerDate = data.depositDate.toISOString().split('T')[0];
        
        await database.transaction(async (trx) => {
            try {
                // 1. Create transaction log for panel
                await trx.execute(sql`
                    INSERT INTO transaction_log (
                        transaction_date, ledger_date, entity_type, entity_id,
                        transaction_type, amount, reference_type, reference_id,
                        related_entity_type, related_entity_id, description
                    ) VALUES (${data.depositDate}, ${ledgerDate}, 'panel', ${data.panelId}, 'credit', ${data.amount}, 'deposit', ${data.depositId}, 'bank', ${data.bankAccountId}, ${data.panelName})
                `);

                // 2. Create transaction log for bank
                await trx.execute(sql`
                    INSERT INTO transaction_log (
                        transaction_date, ledger_date, entity_type, entity_id,
                        transaction_type, amount, reference_type, reference_id,
                        related_entity_type, related_entity_id, description
                    ) VALUES (${data.depositDate}, ${ledgerDate}, 'bank', ${data.bankAccountId}, 'debit', ${data.amount}, 'deposit', ${data.depositId}, 'panel', ${data.panelId}, ${data.bankName})
                `);

                // 3. Update panel ledger
                await trx.execute(sql`
                    UPDATE panel_daily_ledger 
                    SET 
                        total_deposits = total_deposits + ${data.amount},
                        points_balance = points_balance + ${data.amount},
                        closing_balance = closing_balance + ${data.amount},
                        bonus_points = bonus_points + ${data.bonusPoints || 0},
                        updated_at = CURRENT_TIMESTAMP
                    WHERE panel_id = ${data.panelId} AND ledger_date = ${ledgerDate}
                `);

                // 4. Update bank ledger
                await trx.execute(sql`
                    UPDATE bank_daily_ledger 
                    SET 
                        total_deposits = total_deposits + ${data.amount},
                        closing_balance = closing_balance + ${data.amount},
                        updated_at = CURRENT_TIMESTAMP
                    WHERE bank_account_id = ${data.bankAccountId} AND ledger_date = ${ledgerDate}
                `);

                // 5. Recalculate metrics
                await ledgerCalculationService.calculatePanelMetrics(data.panelId, ledgerDate);
                await ledgerCalculationService.calculateBankMetrics(data.bankAccountId, ledgerDate);

                // 6. Audit log
                await auditLog('DEPOSIT_PROCESSED', 'deposit', data.depositId, {
                    userId: data.userId,
                    panelId: data.panelId,
                    amount: data.amount
                }, { success: true }, data.userId);

            } catch (error) {
                await trx.rollback();
                throw error;
            }
        });
    }

    /**
     * Process a withdrawal transaction
     * Updates both panel and bank ledgers
     */
    async processWithdrawal(data: {
        userId: string;
        panelId: number;
        panelName: string;
        amount: number;
        bankAccountId: number;
        bankName: string;
        withdrawalId: number;
        withdrawalDate: Date;
        transactionCharge?: number;
    }): Promise<void> {
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");

        const ledgerDate = data.withdrawalDate.toISOString().split('T')[0];
        
        await database.transaction(async (trx) => {
            try {
                // 1. Create transaction log for panel
                await trx.execute(sql`
                    INSERT INTO transaction_log (
                        transaction_date, ledger_date, entity_type, entity_id,
                        transaction_type, amount, reference_type, reference_id,
                        related_entity_type, related_entity_id, description
                    ) VALUES (${data.withdrawalDate}, ${ledgerDate}, 'panel', ${data.panelId}, 'debit', ${data.amount}, 'withdrawal', ${data.withdrawalId}, 'bank', ${data.bankAccountId}, ${data.panelName})
                `);

                // 2. Create transaction log for bank
                await trx.execute(sql`
                    INSERT INTO transaction_log (
                        transaction_date, ledger_date, entity_type, entity_id,
                        transaction_type, amount, reference_type, reference_id,
                        related_entity_type, related_entity_id, description
                    ) VALUES (${data.withdrawalDate}, ${ledgerDate}, 'bank', ${data.bankAccountId}, 'credit', ${data.amount}, 'withdrawal', ${data.withdrawalId}, 'panel', ${data.panelId}, ${data.bankName})
                `);

                // 3. Update panel ledger
                await trx.execute(sql`
                    UPDATE panel_daily_ledger 
                    SET 
                        total_withdrawals = total_withdrawals + ${data.amount},
                        closing_balance = closing_balance - ${data.amount},
                        points_balance = points_balance - ${data.amount},
                        updated_at = CURRENT_TIMESTAMP
                    WHERE panel_id = ${data.panelId} AND ledger_date = ${ledgerDate}
                `);

                // 4. Update bank ledger
                await trx.execute(sql`
                    UPDATE bank_daily_ledger 
                    SET 
                        total_withdrawals = total_withdrawals + ${data.amount},
                        total_charges = total_charges + ${data.transactionCharge || 0},
                        closing_balance = closing_balance - ${data.amount},
                        updated_at = CURRENT_TIMESTAMP
                    WHERE bank_account_id = ${data.bankAccountId} AND ledger_date = ${ledgerDate}
                `);

                // 5. Recalculate metrics
                await ledgerCalculationService.calculatePanelMetrics(data.panelId, ledgerDate);
                await ledgerCalculationService.calculateBankMetrics(data.bankAccountId, ledgerDate);

                // 6. Audit log
                await auditLog('WITHDRAWAL_PROCESSED', 'withdrawal', data.withdrawalId, {
                    userId: data.userId,
                    panelId: data.panelId,
                    amount: data.amount,
                    charge: data.transactionCharge
                }, { success: true }, data.userId);

            } catch (error) {
                await trx.rollback();
                throw error;
            }
        });
    }

    /**
     * Process a top-up transaction (add points to panel)
     */
    async processTopUp(data: {
        panelId: number;
        pointsToAdd: number;
        userId: string;
    }): Promise<void> {
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");

        const today = new Date().toISOString().split('T')[0];
        
        await database.transaction(async (trx) => {
            try {
                // 1. Create transaction log
                await trx.execute(sql`
                    INSERT INTO transaction_log (
                        transaction_date, ledger_date, entity_type, entity_id,
                        transaction_type, amount, reference_type, reference_id, description
                    ) VALUES (NOW(), ${today}, 'panel', ${data.panelId}, 'credit', ${data.pointsToAdd}, 'topup', null, ${`Top-up of ${data.pointsToAdd} points`})
                `);

                // 2. Update panel ledger
                await trx.execute(sql`
                    UPDATE panel_daily_ledger 
                    SET 
                        top_up = top_up + ${data.pointsToAdd},
                        closing_balance = closing_balance + ${data.pointsToAdd},
                        points_balance = points_balance + ${data.pointsToAdd},
                        updated_at = CURRENT_TIMESTAMP
                    WHERE panel_id = ${data.panelId} AND ledger_date = ${today}
                `);

                // 3. Recalculate metrics
                await ledgerCalculationService.calculatePanelMetrics(data.panelId, today);

                // 4. Audit log
                await auditLog('TOPUP_PROCESSED', 'panel', data.panelId, {
                    pointsToAdd: data.pointsToAdd
                }, { success: true }, data.userId);

            } catch (error) {
                await trx.rollback();
                throw error;
            }
        });
    }

    /**
     * Process a bonus points transaction
     */
    async processBonus(data: {
        panelId: number;
        bonusPoints: number;
        referenceId?: number;
        description?: string;
    }): Promise<void> {
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");

        const today = new Date().toISOString().split('T')[0];
        
        await database.transaction(async (trx) => {
            try {
                // 1. Create transaction log
                await trx.execute(sql`
                    INSERT INTO transaction_log (
                        transaction_date, ledger_date, entity_type, entity_id,
                        transaction_type, amount, reference_type, reference_id, description
                    ) VALUES (NOW(), ${today}, 'panel', ${data.panelId}, 'credit', ${data.bonusPoints}, 'bonus', ${data.referenceId || null}, ${data.description || `Bonus of ${data.bonusPoints} points`})
                `);

                // 2. Update panel ledger
                await trx.execute(sql`
                    UPDATE panel_daily_ledger 
                    SET 
                        bonus_points = bonus_points + ${data.bonusPoints},
                        closing_balance = closing_balance + ${data.bonusPoints},
                        points_balance = points_balance + ${data.bonusPoints},
                        updated_at = CURRENT_TIMESTAMP
                    WHERE panel_id = ${data.panelId} AND ledger_date = ${today}
                `);

                // 3. Recalculate metrics
                await ledgerCalculationService.calculatePanelMetrics(data.panelId, today);

                // 4. Audit log
                await auditLog('BONUS_PROCESSED', 'panel', data.panelId, {
                    bonusPoints: data.bonusPoints
                }, { success: true });

            } catch (error) {
                await trx.rollback();
                throw error;
            }
        });
    }

    /**
     * Get transaction history for an entity
     */
    async getTransactionHistory(params: {
        entityType: 'panel' | 'bank';
        entityId: number;
        dateFrom?: string;
        dateTo?: string;
        limit?: number;
    }) {
        const database = await db.getDb();
        if (!database) return [];

        const [transactions] = await database.execute(sql`
            SELECT * FROM transaction_log 
            WHERE entity_type = ${params.entityType} AND entity_id = ${params.entityId}
            ${params.dateFrom ? sql`AND ledger_date >= ${params.dateFrom}` : sql``}
            ${params.dateTo ? sql`AND ledger_date <= ${params.dateTo}` : sql``}
            ORDER BY transaction_date DESC
            ${params.limit ? sql`LIMIT ${params.limit}` : sql``}
        `) as any[];
        return transactions;
    }
}

// Export singleton instance
export const transactionService = new TransactionService();
