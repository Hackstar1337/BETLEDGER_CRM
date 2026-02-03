import * as db from "../../db";
import { sql } from "drizzle-orm";

/**
 * Ledger Query Service
 * Handles all queries for ledger data with filtering capabilities
 * 
 * Supports filtering by:
 * - Date (single day or range)
 * - Panel or Bank Account
 * - Transaction type
 * - Status (OPEN/CLOSED)
 */
export class LedgerQueryService {
    /**
     * Get panel ledger history with filters
     */
    async getPanelLedgerHistory(filters: {
        panelId?: number;
        dateFrom?: string;
        dateTo?: string;
        status?: 'OPEN' | 'CLOSED';
        limit?: number;
        offset?: number;
    } = {}) {
        const database = await db.getDb();
        if (!database) return [];

        const [ledgers] = await database.execute(sql`
            SELECT 
                p.*,
                pan.name as panel_name
            FROM panel_daily_ledger p
            JOIN panels pan ON p.panel_id = pan.id
            WHERE 1=1
            ${filters.panelId ? sql`AND p.panel_id = ${filters.panelId}` : sql``}
            ${filters.dateFrom ? sql`AND p.ledger_date >= ${filters.dateFrom}` : sql``}
            ${filters.dateTo ? sql`AND p.ledger_date <= ${filters.dateTo}` : sql``}
            ${filters.status ? sql`AND p.status = ${filters.status}` : sql``}
            ORDER BY p.ledger_date DESC, p.panel_id
            ${filters.limit ? sql`LIMIT ${filters.limit}` : sql``}
            ${filters.offset ? sql`OFFSET ${filters.offset}` : sql``}
        `) as any[];
        return ledgers;
    }

    /**
     * Get bank ledger history with filters
     */
    async getBankLedgerHistory(filters: {
        bankAccountId?: number;
        dateFrom?: string;
        dateTo?: string;
        status?: 'OPEN' | 'CLOSED';
        limit?: number;
        offset?: number;
    } = {}) {
        const database = await db.getDb();
        if (!database) return [];

        const [ledgers] = await database.execute(sql`
            SELECT 
                b.*,
                ba.bankName as bank_name,
                ba.accountNumber as account_number,
                ba.accountType as account_type
            FROM bank_daily_ledger b
            JOIN bankaccounts ba ON b.bank_account_id = ba.id
            WHERE 1=1
            ${filters.bankAccountId ? sql`AND b.bank_account_id = ${filters.bankAccountId}` : sql``}
            ${filters.dateFrom ? sql`AND b.ledger_date >= ${filters.dateFrom}` : sql``}
            ${filters.dateTo ? sql`AND b.ledger_date <= ${filters.dateTo}` : sql``}
            ${filters.status ? sql`AND b.status = ${filters.status}` : sql``}
            ORDER BY b.ledger_date DESC, b.bank_account_id
            ${filters.limit ? sql`LIMIT ${filters.limit}` : sql``}
            ${filters.offset ? sql`OFFSET ${filters.offset}` : sql``}
        `) as any[];
        return ledgers;
    }

    /**
     * Get transaction log with filters
     */
    async getTransactionHistory(filters: {
        entityType?: 'panel' | 'bank';
        entityId?: number;
        dateFrom?: string;
        dateTo?: string;
        transactionType?: 'credit' | 'debit';
        referenceType?: 'deposit' | 'withdrawal' | 'bonus' | 'topup' | 'charge' | 'transfer';
        limit?: number;
        offset?: number;
    } = {}) {
        const database = await db.getDb();
        if (!database) return [];

        const [transactions] = await database.execute(sql`
            SELECT 
                tl.*,
                CASE 
                    WHEN tl.entity_type = 'panel' THEN p.name
                    WHEN tl.entity_type = 'bank' THEN ba.bankName
                END as entity_name,
                CASE 
                    WHEN tl.entity_type = 'panel' THEN p.name
                    WHEN tl.entity_type = 'bank' THEN ba.bankName
                END as related_entity_name
            FROM transaction_log tl
            LEFT JOIN panels p ON tl.entity_type = 'panel' AND tl.entity_id = p.id
            LEFT JOIN bankaccounts ba ON tl.entity_type = 'bank' AND tl.entity_id = ba.id
            WHERE 1=1
            ${filters.entityType ? sql`AND tl.entity_type = ${filters.entityType}` : sql``}
            ${filters.entityId ? sql`AND tl.entity_id = ${filters.entityId}` : sql``}
            ${filters.dateFrom ? sql`AND tl.ledger_date >= ${filters.dateFrom}` : sql``}
            ${filters.dateTo ? sql`AND tl.ledger_date <= ${filters.dateTo}` : sql``}
            ${filters.transactionType ? sql`AND tl.transaction_type = ${filters.transactionType}` : sql``}
            ${filters.referenceType ? sql`AND tl.reference_type = ${filters.referenceType}` : sql``}
            ORDER BY tl.transaction_date DESC
            ${filters.limit ? sql`LIMIT ${filters.limit}` : sql``}
            ${filters.offset ? sql`OFFSET ${filters.offset}` : sql``}
        `) as any[];
        return transactions;
    }

    /**
     * Get panel ledger for a specific date
     */
    async getPanelLedger(panelId: number, ledgerDate: string): Promise<any> {
        const database = await db.getDb();
        if (!database) return null;

        const [ledgers] = await database.execute(sql`
            SELECT p.*, pan.name as panel_name 
            FROM panel_daily_ledger p
            JOIN panels pan ON p.panel_id = pan.id
            WHERE p.panel_id = ${panelId} AND p.ledger_date = ${ledgerDate}
        `) as any[];

        return ledgers[0] || null;
    }

    /**
     * Get bank ledger for a specific date
     */
    async getBankLedger(bankAccountId: number, ledgerDate: string): Promise<any> {
        const database = await db.getDb();
        if (!database) return null;

        const [ledgers] = await database.execute(sql`
            SELECT b.*, ba.bankName as bank_name, ba.accountNumber as account_number 
            FROM bank_daily_ledger b
            JOIN bankaccounts ba ON b.bank_account_id = ba.id
            WHERE b.bank_account_id = ${bankAccountId} AND b.ledger_date = ${ledgerDate}
        `) as any[];

        return ledgers[0] || null;
    }

    /**
     * Get ledger summary for multiple dates
     */
    async getLedgerSummaryByDateRange(dateFrom: string, dateTo: string): Promise<{
        dates: Array<{
            date: string;
            panelSummary: any;
            bankSummary: any;
        }>;
        grandTotal: {
            panels: any;
            banks: any;
        };
    }> {
        const database = await db.getDb();
        if (!database) return { dates: [], grandTotal: { panels: {}, banks: {} } };

        // Get all dates in range
        const [dates] = await database.execute(sql`
            SELECT DISTINCT ledger_date as date 
            FROM (
                SELECT ledger_date FROM panel_daily_ledger
                UNION ALL
                SELECT ledger_date FROM bank_daily_ledger
            ) as all_dates
            WHERE ledger_date BETWEEN ${dateFrom} AND ${dateTo}
            ORDER BY ledger_date DESC
        `) as any[];

        const results = [];
        let grandPanels = { totalDeposits: 0, totalWithdrawals: 0, totalProfitLoss: 0 };
        let grandBanks = { totalDeposits: 0, totalWithdrawals: 0, totalCharges: 0, totalProfitLoss: 0 };

        for (const dateRow of dates) {
            // Panel summary for this date
            const [panelSummary] = await database.execute(sql`
                SELECT 
                    COUNT(*) as total,
                    COALESCE(SUM(total_deposits), 0) as totalDeposits,
                    COALESCE(SUM(total_withdrawals), 0) as totalWithdrawals,
                    COALESCE(SUM(profit_loss), 0) as totalProfitLoss,
                    COALESCE(AVG(roi), 0) as averageROI
                FROM panel_daily_ledger 
                WHERE ledger_date = ${dateRow.date}
            `) as any[];

            // Bank summary for this date
            const [bankSummary] = await database.execute(sql`
                SELECT 
                    COUNT(*) as total,
                    COALESCE(SUM(total_deposits), 0) as totalDeposits,
                    COALESCE(SUM(total_withdrawals), 0) as totalWithdrawals,
                    COALESCE(SUM(total_charges), 0) as totalCharges,
                    COALESCE(SUM(profit_loss), 0) as totalProfitLoss,
                    COALESCE(AVG(roi), 0) as averageROI
                FROM bank_daily_ledger 
                WHERE ledger_date = ${dateRow.date}
            `) as any[];

            results.push({
                date: dateRow.date,
                panelSummary: panelSummary[0],
                bankSummary: bankSummary[0]
            });

            // Add to grand totals
            grandPanels.totalDeposits += panelSummary[0].totalDeposits;
            grandPanels.totalWithdrawals += panelSummary[0].totalWithdrawals;
            grandPanels.totalProfitLoss += panelSummary[0].totalProfitLoss;

            grandBanks.totalDeposits += bankSummary[0].totalDeposits;
            grandBanks.totalWithdrawals += bankSummary[0].totalWithdrawals;
            grandBanks.totalCharges += bankSummary[0].totalCharges;
            grandBanks.totalProfitLoss += bankSummary[0].totalProfitLoss;
        }

        return {
            dates: results,
            grandTotal: {
                panels: grandPanels,
                banks: grandBanks
            }
        };
    }

    /**
     * Get top performing panels for a date range
     */
    async getTopPerformingPanels(dateFrom: string, dateTo: string, limit: number = 10): Promise<any[]> {
        const database = await db.getDb();
        if (!database) return [];

        const [panels] = await database.execute(sql`
            SELECT 
                p.panel_id,
                pan.name as panel_name,
                SUM(p.profit_loss) as totalProfitLoss,
                SUM(p.total_deposits) as totalDeposits,
                SUM(p.total_withdrawals) as totalWithdrawals,
                AVG(p.roi) as averageROI,
                COUNT(*) as daysActive
            FROM panel_daily_ledger p
            JOIN panels pan ON p.panel_id = pan.id
            WHERE p.ledger_date BETWEEN ${dateFrom} AND ${dateTo}
            GROUP BY p.panel_id, pan.name
            ORDER BY totalProfitLoss DESC
            ${sql.raw(limit ? `LIMIT ${limit}` : '')}
        `) as any[];

        return panels;
    }

    /**
     * Get transaction statistics
     */
    async getTransactionStatistics(dateFrom: string, dateTo: string): Promise<{
        totalTransactions: number;
        totalVolume: number;
        byType: Record<string, number>;
        byEntity: Record<string, number>;
    }> {
        const database = await db.getDb();
        if (!database) return {
            totalTransactions: 0,
            totalVolume: 0,
            byType: {},
            byEntity: {}
        };

        // Overall stats
        const [overall] = await database.execute(sql`
            SELECT 
                COUNT(*) as totalTransactions,
                COALESCE(SUM(amount), 0) as totalVolume
            FROM transaction_log
            WHERE ledger_date BETWEEN ${dateFrom} AND ${dateTo}
        `) as any[];

        // By transaction type
        const [byType] = await database.execute(sql`
            SELECT 
                reference_type,
                COUNT(*) as count,
                COALESCE(SUM(amount), 0) as volume
            FROM transaction_log
            WHERE ledger_date BETWEEN ${dateFrom} AND ${dateTo}
            GROUP BY reference_type
        `) as any[];

        // By entity type
        const [byEntity] = await database.execute(sql`
            SELECT 
                entity_type,
                COUNT(*) as count,
                COALESCE(SUM(amount), 0) as volume
            FROM transaction_log
            WHERE ledger_date BETWEEN ${dateFrom} AND ${dateTo}
            GROUP BY entity_type
        `) as any[];

        return {
            totalTransactions: overall[0]?.totalTransactions || 0,
            totalVolume: overall[0]?.totalVolume || 0,
            byType: byType.reduce((acc: any, row: any) => {
                acc[row.reference_type] = { count: row.count, volume: row.volume };
                return acc;
            }, {}),
            byEntity: byEntity.reduce((acc: any, row: any) => {
                acc[row.entity_type] = { count: row.count, volume: row.volume };
                return acc;
            }, {})
        };
    }
}

// Export singleton instance
export const ledgerQueryService = new LedgerQueryService();
