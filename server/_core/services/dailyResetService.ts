import * as db from "../../db";
import { sql } from "drizzle-orm";
import { auditLog } from "./auditService";

/**
 * Daily Reset Service
 * Handles the midnight boundary transition for the Daily Ledger System
 * 
 * Core Responsibilities:
 * 1. Close all OPEN ledgers from previous day
 * 2. Create new ledger records for current day
 * 3. Set opening balances from previous day's closing balances
 * 4. Reset daily counters to zero
 */
export class DailyResetService {
    /**
     * Perform the complete daily reset at midnight
     * This should be called exactly at 00:00:00 every day
     */
    async performMidnightReset(): Promise<void> {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        
        let error: Error | unknown = null;
        
        try {
            // Step 1: Close yesterday's ledgers
            await this.closeYesterdayLedgers(yesterdayStr);
            
            // Step 2: Create today's ledgers
            await this.createTodayLedgers(today);
            
            // Step 3: Set opening balances
            await this.setOpeningBalances(today);
            
            // Step 4: Reset daily counters
            await this.resetDailyCounters(today);
            
            // Step 5: Audit log the reset
            await auditLog('DAILY_RESET', 'system', null, {
                yesterday: yesterdayStr,
                today: today,
                success: true
            }, { success: true });

            console.log(`✅ Daily reset completed successfully for ${today}`);

        } catch (err) {
            error = err;
            console.error('Failed to close yesterday ledgers:', error);
            throw new Error(`Failed to close yesterday ledgers: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            if (error) {
                await auditLog('DAILY_RESET', 'system', null, {
                    yesterday: yesterdayStr,
                    today: today,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                }, { success: false, error: error instanceof Error ? error.message : 'Unknown error' });
            }
        }
    }

    /**
     * Close all OPEN ledgers from yesterday
     * This freezes yesterday's data permanently
     */
    private async closeYesterdayLedgers(yesterday: string): Promise<void> {
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");

        // Close panel ledgers
        const [panelResult] = await database.execute(sql`
            UPDATE panel_daily_ledger 
            SET status = 'CLOSED', updated_at = CURRENT_TIMESTAMP
            WHERE ledger_date = ${yesterday} AND status = 'OPEN'
        `);

        // Close bank ledgers
        const [bankResult] = await database.execute(sql`
            UPDATE bank_daily_ledger 
            SET status = 'CLOSED', updated_at = CURRENT_TIMESTAMP
            WHERE ledger_date = ${yesterday} AND status = 'OPEN'
        `);

        console.log(`📊 Closed ${panelResult.affectedRows} panel ledgers`);
        console.log(`🏦 Closed ${bankResult.affectedRows} bank ledgers`);
    }

    /**
     * Create new ledger records for today
     * One record per panel and bank account
     */
    private async createTodayLedgers(today: string): Promise<void> {
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");

        // Create panel ledgers for all active panels
        const [panelResult] = await database.execute(sql`
            INSERT IGNORE INTO panel_daily_ledger (panel_id, ledger_date)
            SELECT id, ${today} FROM panels
        `);

        // Create bank ledgers for all bank accounts
        const [bankResult] = await database.execute(sql`
            INSERT IGNORE INTO bank_daily_ledger (bank_account_id, ledger_date)
            SELECT id, ${today} FROM bankaccounts
        `);

        console.log(`📊 Created ${panelResult.affectedRows} panel ledgers for ${today}`);
        console.log(`🏦 Created ${bankResult.affectedRows} bank ledgers for ${today}`);
    }

    /**
     * Set opening balances from yesterday's closing balances
     * This is the critical carry-over step
     */
    private async setOpeningBalances(today: string): Promise<void> {
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");

        // Set panel opening balances
        await database.execute(sql`
            UPDATE panel_daily_ledger p1
            JOIN panel_daily_ledger p2 ON p1.panel_id = p2.panel_id
            SET p1.opening_balance = p2.closing_balance,
                p1.points_balance = p2.closing_balance,
                p1.updated_at = CURRENT_TIMESTAMP
            WHERE p1.ledger_date = ${today} 
            AND p2.ledger_date = DATE_SUB(${today}, INTERVAL 1 DAY)
            AND p2.status = 'CLOSED'
        `);

        // Set bank opening balances
        await database.execute(sql`
            UPDATE bank_daily_ledger b1
            JOIN bank_daily_ledger b2 ON b1.bank_account_id = b2.bank_account_id
            SET b1.opening_balance = b2.closing_balance,
                b1.updated_at = CURRENT_TIMESTAMP
            WHERE b1.ledger_date = ${today} 
            AND b2.ledger_date = DATE_SUB(${today}, INTERVAL 1 DAY)
            AND b2.status = 'CLOSED'
        `);

        console.log(`💰 Opening balances set from yesterday's closing balances`);
    }

    /**
     * Reset all daily counters to zero
     * These will accumulate during the day
     */
    private async resetDailyCounters(today: string): Promise<void> {
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");

        // Reset panel daily counters
        await database.execute(sql`
            UPDATE panel_daily_ledger 
            SET 
                total_deposits = 0,
                total_withdrawals = 0,
                bonus_points = 0,
                top_up = 0,
                profit_loss = 0,
                roi = 0,
                utilization = 0,
                closing_balance = opening_balance,
                updated_at = CURRENT_TIMESTAMP
            WHERE ledger_date = ${today} AND status = 'OPEN'
        `);

        // Reset bank daily counters
        await database.execute(sql`
            UPDATE bank_daily_ledger 
            SET 
                total_deposits = 0,
                total_withdrawals = 0,
                total_charges = 0,
                profit_loss = 0,
                roi = 0,
                closing_balance = opening_balance,
                updated_at = CURRENT_TIMESTAMP
            WHERE ledger_date = ${today} AND status = 'OPEN'
        `);

        console.log(`🔄 Daily counters reset to zero`);
    }

    /**
     * Check if daily reset has been performed for today
     */
    async isResetComplete(today?: string): Promise<boolean> {
        const database = await db.getDb();
        if (!database) return false;

        const checkDate = today || new Date().toISOString().split('T')[0];

        // Check if panel ledgers exist for today
        const [panelLedgers] = await database.execute(sql`
            SELECT COUNT(*) as count FROM panel_daily_ledger 
            WHERE ledger_date = ${checkDate}
        `) as any[];

        // Check if bank ledgers exist for today
        const [bankLedgers] = await database.execute(sql`
            SELECT COUNT(*) as count FROM bank_daily_ledger 
            WHERE ledger_date = ${checkDate}
        `) as any[];

        const panelCount = panelLedgers[0]?.count || 0;
        const bankCount = bankLedgers[0]?.count || 0;

        // Get total panels and banks to compare
        const [totalPanels] = await database.execute(sql`SELECT COUNT(*) as count FROM panels`) as any[];
        const [totalBanks] = await database.execute(sql`SELECT COUNT(*) as count FROM bankaccounts`) as any[];

        return panelCount === totalPanels[0]?.count && bankCount === totalBanks[0]?.count;
    }

    /**
     * Get reset status for monitoring
     */
    async getResetStatus(): Promise<{
        lastReset: string | null;
        todayComplete: boolean;
        openLedgers: number;
        nextReset: string;
    }> {
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");

        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextReset = tomorrow.toISOString().split('T')[0] + ' 00:00:00';

        // Get last reset date
        const [lastResetResult] = await database.execute(sql`
            SELECT MAX(ledger_date) as lastDate 
            FROM (
                SELECT ledger_date FROM panel_daily_ledger
                UNION ALL
                SELECT ledger_date FROM bank_daily_ledger
            ) as dates
        `) as any[];

        const lastReset = lastResetResult[0]?.lastDate || null;
        const todayComplete = await this.isResetComplete(today);

        // Count open ledgers
        const [openLedgersResult] = await database.execute(sql`
            SELECT COUNT(*) as count 
            FROM (
                SELECT COUNT(*) FROM panel_daily_ledger WHERE status = 'OPEN'
                UNION ALL
                SELECT COUNT(*) FROM bank_daily_ledger WHERE status = 'OPEN'
            ) as open_counts
        `) as any[];

        const openLedgers = openLedgersResult.reduce((sum: number, row: any) => sum + row.count, 0);

        return {
            lastReset,
            todayComplete,
            openLedgers,
            nextReset
        };
    }

    /**
     * Manual reset trigger (for admin use if automated reset fails)
     */
    async manualReset(targetDate?: string): Promise<void> {
        const resetDate = targetDate || new Date().toISOString().split('T')[0];
        
        console.log(`🔧 Manual reset triggered for date: ${resetDate}`);
        
        // For manual reset, we need to be more careful
        // Check if there are already closed ledgers for this date
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");

        const [closedPanels] = await database.execute(sql`
            SELECT COUNT(*) as count FROM panel_daily_ledger 
            WHERE ledger_date = ${resetDate} AND status = 'CLOSED'
        `) as any[];

        if (closedPanels[0]?.count > 0) {
            throw new Error(`Cannot perform manual reset: Ledgers for ${resetDate} are already closed`);
        }

        // Perform the reset
        await this.performMidnightReset();
        
        console.log(`✅ Manual reset completed for ${resetDate}`);
    }
}

// Export singleton instance
export const dailyResetService = new DailyResetService();
