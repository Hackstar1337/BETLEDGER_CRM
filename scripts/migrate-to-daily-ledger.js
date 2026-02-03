const mysql = require('mysql2/promise');

/**
 * Migration Script: Convert existing data to Daily Ledger System
 * This script creates initial ledger records from existing panel and bank data
 */

async function migrateToDailyLedger() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'MySQL@Root2026!',
        database: process.env.DB_NAME || 'khiladi247_v3'
    });

    try {
        console.log('🚀 Starting migration to Daily Ledger System...');
        
        const today = new Date().toISOString().split('T')[0];
        console.log(`📅 Creating ledger records for date: ${today}`);
        
        // 1. Create panel ledger records
        console.log('\n📊 Creating Panel Daily Ledger records...');
        const [panels] = await connection.execute('SELECT id, name, pointsBalance, openingBalance, closingBalance, topUp, extraDeposit, bonusPoints, profitLoss, totalDeposits, totalWithdrawals FROM panels');
        
        for (const panel of panels) {
            // Calculate utilization
            const utilization = panel.openingBalance > 0 
                ? ((panel.pointsBalance / (panel.openingBalance + panel.pointsBalance)) * 100).toFixed(2)
                : 0;
            
            // Calculate ROI
            const roi = panel.openingBalance > 0
                ? (((panel.pointsBalance - panel.openingBalance) / panel.openingBalance) * 100).toFixed(2)
                : 0;
            
            await connection.execute(`
                INSERT INTO panel_daily_ledger (
                    panel_id, ledger_date, opening_balance, closing_balance, points_balance,
                    total_deposits, total_withdrawals, bonus_points, top_up, profit_loss,
                    roi, utilization, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')
                ON DUPLICATE KEY UPDATE
                opening_balance = VALUES(opening_balance),
                closing_balance = VALUES(closing_balance),
                points_balance = VALUES(points_balance),
                total_deposits = VALUES(total_deposits),
                total_withdrawals = VALUES(total_withdrawals),
                bonus_points = VALUES(bonus_points),
                top_up = VALUES(top_up),
                profit_loss = VALUES(profit_loss),
                roi = VALUES(roi),
                utilization = VALUES(utilization),
                updated_at = CURRENT_TIMESTAMP
            `, [
                panel.id, today, panel.openingBalance, panel.closingBalance, panel.pointsBalance,
                panel.totalDeposits, panel.totalWithdrawals, panel.bonusPoints, panel.topUp, panel.profitLoss,
                roi, utilization
            ]);
            
            console.log(`✅ Panel "${panel.name}" ledger created`);
        }
        
        // 2. Create bank ledger records
        console.log('\n🏦 Creating Bank Daily Ledger records...');
        const [bankAccounts] = await connection.execute('SELECT id, bankName, accountNumber, openingBalance, closingBalance, totalCharges, totalDeposits, totalWithdrawals FROM bank_accounts');
        
        for (const account of bankAccounts) {
            // Calculate net balance
            const netBalance = account.closingBalance - account.totalCharges;
            
            // Calculate ROI
            const roi = account.openingBalance > 0
                ? (((netBalance - account.openingBalance) / account.openingBalance) * 100).toFixed(2)
                : 0;
            
            // Calculate profit/loss
            const profitLoss = account.totalDeposits - account.totalWithdrawals;
            
            await connection.execute(`
                INSERT INTO bank_daily_ledger (
                    bank_account_id, ledger_date, opening_balance, closing_balance,
                    total_deposits, total_withdrawals, total_charges, profit_loss,
                    roi, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')
                ON DUPLICATE KEY UPDATE
                opening_balance = VALUES(opening_balance),
                closing_balance = VALUES(closing_balance),
                total_deposits = VALUES(total_deposits),
                total_withdrawals = VALUES(total_withdrawals),
                total_charges = VALUES(total_charges),
                profit_loss = VALUES(profit_loss),
                roi = VALUES(roi),
                updated_at = CURRENT_TIMESTAMP
            `, [
                account.id, today, account.openingBalance, account.closingBalance,
                account.totalDeposits, account.totalWithdrawals, account.totalCharges,
                profitLoss, roi
            ]);
            
            console.log(`✅ Bank Account "${account.bankName} - ${account.accountNumber}" ledger created`);
        }
        
        // 3. Create initial transaction logs for today's existing transactions
        console.log('\n📝 Creating Transaction Log entries...');
        
        // Log existing deposits
        const [deposits] = await connection.execute(`
            SELECT id, userId, panelName, amount, depositDate, bankName, 'deposit' as type 
            FROM deposits 
            WHERE DATE(depositDate) = ?
        `, [today]);
        
        for (const deposit of deposits) {
            const panel = panels.find(p => p.name === deposit.panelName);
            if (panel) {
                await connection.execute(`
                    INSERT INTO transaction_log (
                        transaction_date, ledger_date, entity_type, entity_id,
                        transaction_type, amount, reference_type, reference_id, description
                    ) VALUES (?, ?, 'panel', ?, 'credit', ?, 'deposit', ?, ?)
                `, [
                    deposit.depositDate, today, panel.id, deposit.amount,
                    deposit.id, `Deposit from ${deposit.bankName}`
                ]);
            }
        }
        
        // Log existing withdrawals
        const [withdrawals] = await connection.execute(`
            SELECT id, userId, panelName, amount, withdrawalDate, bankName, 'withdrawal' as type 
            FROM withdrawals 
            WHERE DATE(withdrawalDate) = ?
        `, [today]);
        
        for (const withdrawal of withdrawals) {
            const panel = panels.find(p => p.name === withdrawal.panelName);
            if (panel) {
                await connection.execute(`
                    INSERT INTO transaction_log (
                        transaction_date, ledger_date, entity_type, entity_id,
                        transaction_type, amount, reference_type, reference_id, description
                    ) VALUES (?, ?, 'panel', ?, 'debit', ?, 'withdrawal', ?, ?)
                `, [
                    withdrawal.withdrawalDate, today, panel.id, withdrawal.amount,
                    withdrawal.id, `Withdrawal to ${withdrawal.bankName}`
                ]);
            }
        }
        
        console.log(`\n✅ Migration completed successfully!`);
        console.log(`📊 ${panels.length} Panel ledgers created`);
        console.log(`🏦 ${bankAccounts.length} Bank ledgers created`);
        console.log(`📝 ${deposits.length + withdrawals.length} Transaction logs created`);
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateToDailyLedger()
        .then(() => {
            console.log('\n🎉 Daily Ledger System migration completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateToDailyLedger };
