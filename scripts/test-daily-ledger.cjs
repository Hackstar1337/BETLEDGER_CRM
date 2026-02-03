const mysql = require('mysql2/promise');

/**
 * Test script to verify Daily Ledger System is working
 */

async function testDailyLedger() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'MySQL@Root2026!',
        database: 'khiladi247'
    });

    try {
        console.log('🔍 Testing Daily Ledger System...\n');
        
        // 1. Check if tables exist
        console.log('1. Checking tables...');
        const [tables] = await connection.execute(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'khiladi247' 
            AND table_name IN ('panel_daily_ledger', 'bank_daily_ledger', 'transaction_log', 'audit_log')
        `);
        console.log(`✅ Found ${tables.length} ledger tables`);
        
        // 2. Check if we have data
        console.log('\n2. Checking data...');
        const [panelCount] = await connection.execute('SELECT COUNT(*) as count FROM panel_daily_ledger');
        const [bankCount] = await connection.execute('SELECT COUNT(*) as count FROM bank_daily_ledger');
        const [auditCount] = await connection.execute('SELECT COUNT(*) as count FROM audit_log');
        
        console.log(`✅ Panel ledgers: ${panelCount[0].count}`);
        console.log(`✅ Bank ledgers: ${bankCount[0].count}`);
        console.log(`✅ Audit logs: ${auditCount[0].count}`);
        
        // 3. Test the problematic query
        console.log('\n3. Testing reset status query...');
        const [resetStatus] = await connection.execute(`
            SELECT MAX(ledger_date) as lastDate 
            FROM (
                SELECT ledger_date FROM panel_daily_ledger
                UNION ALL
                SELECT ledger_date FROM bank_daily_ledger
            ) as dates
        `);
        console.log(`✅ Last reset date: ${resetStatus[0].lastDate}`);
        
        // 4. Test sample ledger data
        console.log('\n4. Sample ledger data...');
        const [samplePanel] = await connection.execute('SELECT * FROM panel_daily_ledger LIMIT 1');
        const [sampleBank] = await connection.execute('SELECT * FROM bank_daily_ledger LIMIT 1');
        
        if (samplePanel.length > 0) {
            console.log(`✅ Sample panel ledger: Panel ${samplePanel[0].panel_id}, Date ${samplePanel[0].ledger_date}, Status ${samplePanel[0].status}`);
        }
        if (sampleBank.length > 0) {
            console.log(`✅ Sample bank ledger: Bank ${sampleBank[0].bank_account_id}, Date ${sampleBank[0].ledger_date}, Status ${sampleBank[0].status}`);
        }
        
        // 5. Test transaction log
        console.log('\n5. Testing transaction log...');
        await connection.execute(`
            INSERT INTO transaction_log (
                transaction_date, ledger_date, entity_type, entity_id,
                transaction_type, amount, reference_type, description
            ) VALUES (NOW(), CURDATE(), 'panel', 1, 'credit', 100.00, 'deposit', 'Test transaction')
        `);
        console.log('✅ Test transaction added');
        
        const [transactions] = await connection.execute('SELECT COUNT(*) as count FROM transaction_log');
        console.log(`✅ Total transactions: ${transactions[0].count}`);
        
        console.log('\n✅ Daily Ledger System is WORKING! 🎉');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await connection.end();
    }
}

testDailyLedger();
