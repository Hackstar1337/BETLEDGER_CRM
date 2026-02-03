import * as db from "../../db";
import { sql } from "drizzle-orm";
import { auditLog } from "./auditService";

/**
 * Validation Service
 * Ensures ledger integrity by preventing unauthorized modifications
 * 
 * Core Rules:
 * 1. Closed ledgers cannot be modified
 * 2. Transactions cannot be added to closed dates
 * 3. Balance calculations must be valid
 * 4. All operations must be auditable
 */
export class ValidationService {
    /**
     * Check if a ledger can be modified
     * Returns true if the ledger is OPEN and can be modified
     */
    async canModifyLedger(
        entityType: 'panel' | 'bank',
        entityId: number,
        ledgerDate: string
    ): Promise<{ canModify: boolean; reason?: string }> {
        const database = await db.getDb();
        if (!database) return { canModify: false, reason: "Database not available" };

        const tableName = entityType === 'panel' ? 'panel_daily_ledger' : 'bank_daily_ledger';
        const entityIdField = entityType === 'panel' ? 'panel_id' : 'bank_account_id';

        const [ledgers] = await database.execute(sql`
            SELECT status FROM ${sql.raw(tableName)}
            WHERE ${sql.raw(entityIdField)} = ${entityId} AND ledger_date = ${ledgerDate}
        `) as any[];

        if (!ledgers.length) {
            return { canModify: false, reason: `No ledger found for ${entityType} ${entityId} on ${ledgerDate}` };
        }

        const ledger = ledgers[0];

        if (ledger.status === 'CLOSED') {
            return { canModify: false, reason: `Ledger for ${ledgerDate} is closed and cannot be modified` };
        }

        // Check if the date is in the past (before today)
        const today = new Date().toISOString().split('T')[0];
        if (ledgerDate < today) {
            return { canModify: false, reason: `Cannot modify past ledgers (${ledgerDate})` };
        }

        return { canModify: true };
    }

    /**
     * Validate a transaction before processing
     */
    async validateTransaction(
        entityType: 'panel' | 'bank',
        entityId: number,
        transactionDate: Date,
        amount: number,
        transactionType: 'credit' | 'debit'
    ): Promise<{ valid: boolean; errors: string[] }> {
        const errors: string[] = [];
        const ledgerDate = transactionDate.toISOString().split('T')[0];

        // 1. Check if ledger can be modified
        const ledgerCheck = await this.canModifyLedger(entityType, entityId, ledgerDate);
        if (!ledgerCheck.canModify) {
            errors.push(ledgerCheck.reason || "Ledger cannot be modified");
        }

        // 2. Validate amount
        if (amount <= 0) {
            errors.push("Transaction amount must be greater than 0");
        }

        // 3. For debits, check if sufficient balance
        if (transactionType === 'debit') {
            const database = await db.getDb();
            if (database) {
                const tableName = entityType === 'panel' ? 'panel_daily_ledger' : 'bank_daily_ledger';
                const entityIdField = entityType === 'panel' ? 'panel_id' : 'bank_account_id';

                const [ledgers] = await database.execute(sql`
                    SELECT points_balance, closing_balance FROM ${sql.raw(tableName)}
                    WHERE ${sql.raw(entityIdField)} = ${entityId} AND ledger_date = ${ledgerDate} AND status = 'OPEN'
                `) as any[];

                if (ledgers.length > 0) {
                    const currentBalance = entityType === 'panel' 
                        ? ledgers[0].points_balance 
                        : ledgers[0].closing_balance;

                    if (currentBalance < amount) {
                        errors.push(`Insufficient balance: Available ${currentBalance}, Required ${amount}`);
                    }
                }
            }
        }

        // 4. Validate transaction date (not too far in future)
        const maxFutureDays = 1; // Allow 1 day in future for timezone differences
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + maxFutureDays);
        
        if (transactionDate > maxDate) {
            errors.push(`Transaction date cannot be more than ${maxFutureDays} days in the future`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate balance calculation
     */
    async validateBalanceCalculation(
        entityType: 'panel' | 'bank',
        entityId: number,
        ledgerDate: string
    ): Promise<{ valid: boolean; expected?: number; actual?: number; error?: string }> {
        const database = await db.getDb();
        if (!database) return { valid: false, error: "Database not available" };

        const tableName = entityType === 'panel' ? 'panel_daily_ledger' : 'bank_daily_ledger';
        const entityIdField = entityType === 'panel' ? 'panel_id' : 'bank_account_id';

        const [ledgers] = await database.execute(sql`
            SELECT * FROM ${sql.raw(tableName)}
            WHERE ${sql.raw(entityIdField)} = ${entityId} AND ledger_date = ${ledgerDate}
        `) as any[];

        if (!ledgers.length) {
            return { valid: false, error: "Ledger not found" };
        }

        const ledger = ledgers[0];
        let expectedClosing: number;

        if (entityType === 'panel') {
            // Panel: Opening - Deposits + Withdrawals
            expectedClosing = ledger.opening_balance - ledger.total_deposits + ledger.total_withdrawals;
        } else {
            // Bank: Opening - Deposits + Withdrawals (charges are separate)
            expectedClosing = ledger.opening_balance - ledger.total_deposits + ledger.total_withdrawals;
        }

        const isValid = Math.abs(ledger.closing_balance - expectedClosing) < 0.01; // Allow for rounding

        return {
            valid: isValid,
            expected: expectedClosing,
            actual: ledger.closing_balance,
            error: isValid ? undefined : `Balance mismatch: Expected ${expectedClosing}, Actual ${ledger.closing_balance}`
        };
    }

    /**
     * Validate all ledgers for a specific date
     */
    async validateAllLedgers(ledgerDate: string): Promise<{
        valid: boolean;
        errors: Array<{
            entityType: 'panel' | 'bank';
            entityId: number;
            error: string;
        }>;
    }> {
        const database = await db.getDb();
        if (!database) return { valid: false, errors: [{ entityType: 'panel', entityId: 0, error: "Database not available" }] };

        const errors: Array<{
            entityType: 'panel' | 'bank';
            entityId: number;
            error: string;
        }> = [];

        // Validate all panel ledgers
        const [panels] = await database.execute(sql`
            SELECT panel_id FROM panel_daily_ledger 
            WHERE ledger_date = ${ledgerDate}
        `) as any[];

        for (const panel of panels) {
            const validation = await this.validateBalanceCalculation('panel', panel.panel_id, ledgerDate);
            if (!validation.valid) {
                errors.push({
                    entityType: 'panel',
                    entityId: panel.panel_id,
                    error: validation.error || 'Unknown error'
                });
            }
        }

        // Validate all bank ledgers
        const [banks] = await database.execute(sql`
            SELECT bank_account_id FROM bank_daily_ledger 
            WHERE ledger_date = ${ledgerDate}
        `) as any[];

        for (const bank of banks) {
            const validation = await this.validateBalanceCalculation('bank', bank.bank_account_id, ledgerDate);
            if (!validation.valid) {
                errors.push({
                    entityType: 'bank',
                    entityId: bank.bank_account_id,
                    error: validation.error || 'Unknown error'
                });
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Middleware to validate before ledger operations
     */
    async validateBeforeOperation(
        operation: string,
        entityType: 'panel' | 'bank',
        entityId: number,
        ledgerDate: string,
        userId?: string
    ): Promise<boolean> {
        // Log the validation attempt
        await auditLog('VALIDATION_ATTEMPT', entityType, entityId, {
            operation,
            ledgerDate
        }, { attempt: true }, userId);

        // Check if can modify
        const canModify = await this.canModifyLedger(entityType, entityId, ledgerDate);
        
        if (!canModify.canModify) {
            await auditLog('VALIDATION_FAILED', entityType, entityId, {
                operation,
                ledgerDate,
                reason: canModify.reason
            }, { success: false, reason: canModify.reason }, userId);
            
            return false;
        }

        // Validate balance
        const balanceCheck = await this.validateBalanceCalculation(entityType, entityId, ledgerDate);
        
        if (!balanceCheck.valid) {
            await auditLog('VALIDATION_FAILED', entityType, entityId, {
                operation,
                ledgerDate,
                balanceError: balanceCheck.error
            }, { success: false, balanceError: balanceCheck.error }, userId);
            
            return false;
        }

        await auditLog('VALIDATION_PASSED', entityType, entityId, {
            operation,
            ledgerDate
        }, { success: true }, userId);

        return true;
    }

    /**
     * Check if a date is in the past (and should be locked)
     */
    async isDateLocked(date: string): Promise<boolean> {
        const today = new Date().toISOString().split('T')[0];
        return date < today;
    }

    /**
     * Get validation status for monitoring
     */
    async getValidationStatus(): Promise<{
        lastValidation: string | null;
        totalErrors: number;
        lockedDates: string[];
    }> {
        const database = await db.getDb();
        if (!database) return {
            lastValidation: null,
            totalErrors: 0,
            lockedDates: []
        };

        // Get last validation from audit log
        const [lastValidation] = await database.execute(sql`
            SELECT created_at FROM audit_log 
            WHERE operation = 'VALIDATION_ALL_LEDGERS'
            ORDER BY created_at DESC 
            LIMIT 1
        `) as any[];

        // Count recent validation errors
        const today = new Date().toISOString().split('T')[0];
        const [errorCount] = await database.execute(sql`
            SELECT COUNT(*) as count FROM audit_log 
            WHERE operation = 'VALIDATION_FAILED' 
            AND DATE(created_at) = ${today}
        `) as any[];

        // Get locked dates (past dates with open ledgers)
        const [lockedDates] = await database.execute(sql`
            SELECT DISTINCT ledger_date as date 
            FROM (
                SELECT ledger_date FROM panel_daily_ledger WHERE status = 'OPEN'
                UNION ALL
                SELECT ledger_date FROM bank_daily_ledger WHERE status = 'OPEN'
            ) as open_ledgers
            WHERE ledger_date < ${today}
            ORDER BY ledger_date DESC
        `) as any[];

        return {
            lastValidation: lastValidation[0]?.created_at || null,
            totalErrors: errorCount[0]?.count || 0,
            lockedDates: lockedDates.map((d: any) => d.date)
        };
    }
}

// Export singleton instance
export const validationService = new ValidationService();
