const mysql = require('mysql2/promise');

/**
 * Simple script to create initial empty ledger records
 */

async function createInitialLedgers() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'MySQL@Root2026!',
        database: process.env.DB_NAME || 'khiladi247'
    });

    try {
        console.log('🚀 Creating initial ledger records...');
        
        const today = new Date().toISOString().split('T')[0];
        console.log(`📅 Creating ledger records for date: ${today}`);
        
        // 1. Create panel ledger records
        console.log('\n📊 Creating Panel Daily Ledger records...');
        const [panels] = await connection.execute('SELECT id, name, pointsBalance, openingBalance, closingBalance FROM panels');
        
        for (const panel of panels) {
            await connection.execute(`
                INSERT IGNORE INTO panel_daily_ledger (
                    panel_id, ledger_date, opening_balance, closing_balance, points_balance,
                    total_deposits, total_withdrawals, bonus_points, top_up, profit_loss,
                    roi, utilization, status
                ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 'OPEN')
            `, [panel.id, today, panel.openingBalance, panel.closingBalance, panel.pointsBalance]);
        }
        
        console.log(`✅ Created ${panels.length} panel ledger records`);
        
        // 2. Create bank ledger records
        console.log('\n🏦 Creating Bank Daily Ledger records...');
        const [banks] = await connection.execute('SELECT id, bankName, accountNumber, closingBalance FROM bankaccounts WHERE isActive = 1');
        
        for (const bank of banks) {
            await connection.execute(`
                INSERT IGNORE INTO bank_daily_ledger (
                    bank_account_id, ledger_date, opening_balance, closing_balance,
                    total_deposits, total_withdrawals, total_charges, profit_loss,
                    roi, status
                ) VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0, 'OPEN')
            `, [bank.id, today, bank.closingBalance, bank.closingBalance]);
        }
        
        console.log(`✅ Created ${banks.length} bank ledger records`);
        
        // 3. Create audit log entry
        await connection.execute(`
            INSERT INTO audit_log (operation, entity_type, entity_id, data, result, user_id)
            VALUES ('INITIAL_LEDGER_SETUP', 'system', NULL, ?, ?, 'system')
        `, [JSON.stringify({ date: today, panels: panels.length, banks: banks.length }), 
            JSON.stringify({ success: true })]);
        
        console.log('\n✅ Initial ledger setup completed successfully!');
        
    } catch (error) {
        console.error('❌ Setup failed:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

createInitialLedgers().catch(console.error);
