import * as db from "../../db";
import { sql } from "drizzle-orm";

/**
 * Ledger Calculation Service
 * Calculates all daily metrics according to the business formulas
 * 
 * All calculations follow the strict formulas defined in the system:
 * - Panel Expected Closing = Opening - Deposits + Withdrawals
 * - Panel Profit/Loss = Deposits - Withdrawals
 * - Panel Utilization = (Points / (Opening + Points)) × 100
 * - Panel ROI = ((Points - Opening) / Opening) × 100
 * - Bank Net Balance = Closing - Charges
 * - Bank ROI = ((Net - Opening) / Opening) × 100
 */
export class LedgerCalculationService {
    /**
     * Calculate and update panel metrics for a specific date
     */
    async calculatePanelMetrics(panelId: number, ledgerDate: string): Promise<void> {
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");

        // Get current ledger data
        const [ledgerRows] = await database.execute(sql`
            SELECT * FROM panel_daily_ledger 
            WHERE panel_id = ${panelId} AND ledger_date = ${ledgerDate} AND status = 'OPEN'
        `) as any[];

        if (!ledgerRows.length) {
            throw new Error(`No open ledger found for panel ${panelId} on ${ledgerDate}`);
        }

        const ledger = ledgerRows[0];

        // 1. Calculate Profit/Loss
        const profitLoss = ledger.total_deposits - ledger.total_withdrawals;

        // 2. Calculate Utilization %
        let utilization = 0;
        const totalBalance = ledger.opening_balance + ledger.points_balance;
        if (totalBalance > 0) {
            utilization = (ledger.points_balance / totalBalance) * 100;
        }

        // 3. Calculate ROI %
        let roi = 0;
        if (ledger.opening_balance > 0) {
            roi = ((ledger.points_balance - ledger.opening_balance) / ledger.opening_balance) * 100;
        }

        // 4. Validate Expected Closing Balance
        const expectedClosing = ledger.opening_balance - ledger.total_deposits + ledger.total_withdrawals;
        const balanceDiff = Math.abs(ledger.closing_balance - expectedClosing);

        if (balanceDiff > 0.01) {
            console.warn(`⚠️ Balance mismatch for panel ${panelId} on ${ledgerDate}: Expected ${expectedClosing}, Actual ${ledger.closing_balance}`);
        }

        // 5. Update ledger with calculations
        await database.execute(sql`
            UPDATE panel_daily_ledger 
            SET 
                profit_loss = ${profitLoss},
                roi = ${roi},
                utilization = ${utilization},
                updated_at = CURRENT_TIMESTAMP
            WHERE panel_id = ${panelId} AND ledger_date = ${ledgerDate}
        `);

        console.log(`📊 Panel ${panelId} metrics calculated for ${ledgerDate}: P/L=${profitLoss}, ROI=${roi.toFixed(2)}%, Util=${utilization.toFixed(2)}%`);
    }

    /**
     * Calculate and update bank metrics for a specific date
     */
    async calculateBankMetrics(bankAccountId: number, ledgerDate: string): Promise<void> {
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");

        // Get current ledger data
        const [ledgerRows] = await database.execute(sql`
            SELECT * FROM bank_daily_ledger 
            WHERE bank_account_id = ${bankAccountId} AND ledger_date = ${ledgerDate} AND status = 'OPEN'
        `) as any[];

        if (!ledgerRows.length) {
            throw new Error(`No open ledger found for bank account ${bankAccountId} on ${ledgerDate}`);
        }

        const ledger = ledgerRows[0];

        // 1. Calculate Net Balance
        const netBalance = ledger.closing_balance - ledger.total_charges;

        // 2. Calculate Profit/Loss
        const profitLoss = ledger.total_deposits - ledger.total_withdrawals;

        // 3. Calculate ROI %
        let roi = 0;
        if (ledger.opening_balance > 0) {
            roi = ((netBalance - ledger.opening_balance) / ledger.opening_balance) * 100;
        }

        // 4. Update ledger with calculations
        await database.execute(sql`
            UPDATE bank_daily_ledger 
            SET 
                profit_loss = ${profitLoss},
                roi = ${roi},
                updated_at = CURRENT_TIMESTAMP
            WHERE bank_account_id = ${bankAccountId} AND ledger_date = ${ledgerDate}
        `);

        console.log(`🏦 Bank ${bankAccountId} metrics calculated for ${ledgerDate}: P/L=${profitLoss}, ROI=${roi.toFixed(2)}%`);
    }

    /**
     * Calculate metrics for all panels on a specific date
     */
    async calculateAllPanelMetrics(ledgerDate: string): Promise<void> {
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");

        // Get all panels with open ledgers for this date
        const [panels] = await database.execute(sql`
            SELECT DISTINCT panel_id FROM panel_daily_ledger 
            WHERE ledger_date = ${ledgerDate} AND status = 'OPEN'
        `) as any[];

        console.log(`📊 Calculating metrics for ${panels.length} panels on ${ledgerDate}`);

        for (const panel of panels) {
            try {
                await this.calculatePanelMetrics(panel.panel_id, ledgerDate);
            } catch (error) {
                console.error(`Failed to calculate metrics for panel ${panel.panel_id}:`, error);
            }
        }
    }

    /**
     * Calculate metrics for all bank accounts on a specific date
     */
    async calculateAllBankMetrics(ledgerDate: string): Promise<void> {
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");

        // Get all bank accounts with open ledgers for this date
        const [banks] = await database.execute(sql`
            SELECT DISTINCT bank_account_id FROM bank_daily_ledger 
            WHERE ledger_date = ${ledgerDate} AND status = 'OPEN'
        `) as any[];

        console.log(`🏦 Calculating metrics for ${banks.length} bank accounts on ${ledgerDate}`);

        for (const bank of banks) {
            try {
                await this.calculateBankMetrics(bank.bank_account_id, ledgerDate);
            } catch (error) {
                console.error(`Failed to calculate metrics for bank ${bank.bank_account_id}:`, error);
            }
        }
    }

    /**
     * Recalculate all metrics for a date (for correction purposes)
     */
    async recalculateAllMetrics(ledgerDate: string): Promise<void> {
        console.log(`🔄 Recalculating all metrics for ${ledgerDate}`);
        
        await this.calculateAllPanelMetrics(ledgerDate);
        await this.calculateAllBankMetrics(ledgerDate);
        
        console.log(`✅ All metrics recalculated for ${ledgerDate}`);
    }

    /**
     * Validate ledger integrity
     * Checks if all calculations are correct
     */
    async validateLedgerIntegrity(ledgerDate: string): Promise<{
        valid: boolean;
        errors: Array<{
            type: 'panel' | 'bank';
            id: number;
            issue: string;
            expected: any;
            actual: any;
        }>;
    }> {
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");

        const errors = [];

        // Validate panel ledgers
        const [panels] = await database.execute(sql`
            SELECT * FROM panel_daily_ledger 
            WHERE ledger_date = ${ledgerDate}
        `) as any[];

        for (const panel of panels) {
            // Check expected closing balance
            const expectedClosing = panel.opening_balance - panel.total_deposits + panel.total_withdrawals;
            if (Math.abs(panel.closing_balance - expectedClosing) > 0.01) {
                errors.push({
                    type: 'panel',
                    id: panel.panel_id,
                    issue: 'Closing balance mismatch',
                    expected: expectedClosing,
                    actual: panel.closing_balance
                });
            }

            // Check profit/loss calculation
            const expectedPL = panel.total_deposits - panel.total_withdrawals;
            if (panel.profit_loss !== expectedPL) {
                errors.push({
                    type: 'panel',
                    id: panel.panel_id,
                    issue: 'Profit/Loss calculation error',
                    expected: expectedPL,
                    actual: panel.profit_loss
                });
            }
        }

        // Validate bank ledgers
        const [banks] = await database.execute(sql`
            SELECT * FROM bank_daily_ledger 
            WHERE ledger_date = ${ledgerDate}
        `) as any[];

        for (const bank of banks) {
            // Check profit/loss calculation
            const expectedPL = bank.total_deposits - bank.total_withdrawals;
            if (bank.profit_loss !== expectedPL) {
                errors.push({
                    type: 'bank',
                    id: bank.bank_account_id,
                    issue: 'Profit/Loss calculation error',
                    expected: expectedPL,
                    actual: bank.profit_loss
                });
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get ledger summary for reporting
     */
    async getLedgerSummary(ledgerDate: string): Promise<{
        panels: {
            total: number;
            totalDeposits: number;
            totalWithdrawals: number;
            totalProfitLoss: number;
            averageROI: number;
        };
        banks: {
            total: number;
            totalDeposits: number;
            totalWithdrawals: number;
            totalCharges: number;
            totalProfitLoss: number;
            averageROI: number;
        };
    }> {
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");

        // Panel summary
        const [panelSummary] = await database.execute(sql`
            SELECT 
                COUNT(*) as total,
                COALESCE(SUM(total_deposits), 0) as totalDeposits,
                COALESCE(SUM(total_withdrawals), 0) as totalWithdrawals,
                COALESCE(SUM(profit_loss), 0) as totalProfitLoss,
                COALESCE(AVG(roi), 0) as averageROI
            FROM panel_daily_ledger 
            WHERE ledger_date = ${ledgerDate}
        `) as any[];

        const [bankSummary] = await database.execute(sql`
            SELECT 
                COUNT(*) as total,
                COALESCE(SUM(total_deposits), 0) as totalDeposits,
                COALESCE(SUM(total_withdrawals), 0) as totalWithdrawals,
                COALESCE(SUM(total_charges), 0) as totalCharges,
                COALESCE(SUM(profit_loss), 0) as totalProfitLoss,
                COALESCE(AVG(roi), 0) as averageROI
            FROM bank_daily_ledger 
            WHERE ledger_date = ${ledgerDate}
        `) as any[];

        return {
            panels: panelSummary[0],
            banks: bankSummary[0]
        };
    }
}

// Export singleton instance
export const ledgerCalculationService = new LedgerCalculationService();
