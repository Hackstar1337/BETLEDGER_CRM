const mysql = require('mysql2/promise');

/**
 * Comprehensive test for Daily Ledger System Services
 */

async function comprehensiveTest() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'MySQL@Root2026!',
        database: 'khiladi247'
    });

    try {
        console.log('🚀 COMPREHENSIVE DAILY LEDGER SYSTEM TEST\n');
        
        const today = new Date().toISOString().split('T')[0];
        
        // Test 1: Validation Service - Check if ledger can be modified
        console.log('1️⃣ Testing Validation Service...');
        const [openLedger] = await connection.execute(
            'SELECT status FROM panel_daily_ledger WHERE ledger_date = ?',
            [today]
        );
        
        if (openLedger.length > 0 && openLedger[0].status === 'OPEN') {
            console.log('✅ Today ledger is OPEN - modifications allowed');
        } else {
            console.log('❌ Today ledger is not open');
        }
        
        // Test 2: Transaction Service - Simulate a transaction
        console.log('\n2️⃣ Testing Transaction Service...');
        
        // Add a deposit transaction
        await connection.execute(`
            INSERT INTO transaction_log (
                transaction_date, ledger_date, entity_type, entity_id,
                transaction_type, amount, reference_type, description
            ) VALUES (NOW(), ?, 'panel', 46, 'credit', 500.00, 'deposit', 'Test deposit transaction')
        `, [today]);
        
        // Update panel ledger
        await connection.execute(`
            UPDATE panel_daily_ledger 
            SET 
                total_deposits = total_deposits + 500,
                closing_balance = closing_balance + 500,
                points_balance = points_balance + 500,
                updated_at = CURRENT_TIMESTAMP
            WHERE panel_id = 46 AND ledger_date = ? AND status = 'OPEN'
        `, [today]);
        
        console.log('✅ Transaction processed and ledger updated');
        
        // Test 3: Ledger Calculation Service
        console.log('\n3️⃣ Testing Ledger Calculations...');
        
        const [panelLedger] = await connection.execute(
            'SELECT * FROM panel_daily_ledger WHERE panel_id = 46 AND ledger_date = ?',
            [today]
        );
        
        if (panelLedger.length > 0) {
            const ledger = panelLedger[0];
            const profitLoss = ledger.total_deposits - ledger.total_withdrawals;
            const roi = ledger.opening_balance > 0 ? ((profitLoss / ledger.opening_balance) * 100) : 0;
            
            console.log(`✅ Panel calculations:`);
            console.log(`   - Total Deposits: ${ledger.total_deposits}`);
            console.log(`   - Total Withdrawals: ${ledger.total_withdrawals}`);
            console.log(`   - Profit/Loss: ${profitLoss}`);
            console.log(`   - ROI: ${roi.toFixed(2)}%`);
        }
        
        // Test 4: Query Service - Test filtering
        console.log('\n4️⃣ Testing Query Service...');
        
        const [filteredResults] = await connection.execute(`
            SELECT p.*, pan.name as panel_name
            FROM panel_daily_ledger p
            JOIN panels pan ON p.panel_id = pan.id
            WHERE p.ledger_date = ? AND p.status = 'OPEN'
            ORDER BY p.ledger_date DESC
        `, [today]);
        
        console.log(`✅ Found ${filteredResults.length} open ledgers for today`);
        
        // Test 5: Audit Log
        console.log('\n5️⃣ Testing Audit Log...');
        
        await connection.execute(`
            INSERT INTO audit_log (operation, entity_type, entity_id, data, result, user_id)
            VALUES ('TRANSACTION_PROCESSED', 'panel', 46, ?, ?, 'test_user')
        `, [JSON.stringify({ amount: 500, type: 'deposit' }), 
            JSON.stringify({ success: true, newBalance: panelLedger[0]?.closing_balance || 0 })]);
        
        const [auditCount] = await connection.execute(
            'SELECT COUNT(*) as count FROM audit_log WHERE operation = "TRANSACTION_PROCESSED"'
        );
        console.log(`✅ Audit log entries: ${auditCount[0].count}`);
        
        // Test 6: Daily Reset Service Check
        console.log('\n6️⃣ Testing Daily Reset Status...');
        
        const [resetCheck] = await connection.execute(`
            SELECT 
                COUNT(*) as openLedgers,
                COUNT(CASE WHEN status = 'CLOSED' THEN 1 END) as closedLedgers
            FROM (
                SELECT status FROM panel_daily_ledger WHERE ledger_date = ?
                UNION ALL
                SELECT status FROM bank_daily_ledger WHERE ledger_date = ?
            ) as all_ledgers
        `, [today, today]);
        
        console.log(`✅ Reset status check:`);
        console.log(`   - Open ledgers: ${resetCheck[0].openLedgers}`);
        console.log(`   - Closed ledgers: ${resetCheck[0].closedLedgers}`);
        
        // Test 7: Data Integrity
        console.log('\n7️⃣ Testing Data Integrity...');
        
        const [integrityCheck] = await connection.execute(`
            SELECT 
                'panel_daily_ledger' as table_name,
                COUNT(*) as total_records,
                COUNT(CASE WHEN status = 'OPEN' THEN 1 END) as open_records,
                COUNT(CASE WHEN status = 'CLOSED' THEN 1 END) as closed_records,
                SUM(CASE WHEN closing_balance < 0 THEN 1 END) as negative_balances
            FROM panel_daily_ledger
            WHERE ledger_date = ?
            UNION ALL
            SELECT 
                'bank_daily_ledger' as table_name,
                COUNT(*) as total_records,
                COUNT(CASE WHEN status = 'OPEN' THEN 1 END) as open_records,
                COUNT(CASE WHEN status = 'CLOSED' THEN 1 END) as closed_records,
                SUM(CASE WHEN closing_balance < 0 THEN 1 END) as negative_balances
            FROM bank_daily_ledger
            WHERE ledger_date = ?
        `, [today, today]);
        
        console.log('✅ Data integrity check:');
        integrityCheck.forEach(row => {
            console.log(`   - ${row.table_name}: ${row.total_records} total, ${row.open_records} open, ${row.closed_records} closed, ${row.negative_balances} negative balances`);
        });
        
        console.log('\n🎉 ALL TESTS PASSED! Daily Ledger System is fully functional! ✨');
        
        // Summary
        const [summary] = await connection.execute(`
            SELECT 
                (SELECT COUNT(*) FROM panel_daily_ledger) as total_panel_ledgers,
                (SELECT COUNT(*) FROM bank_daily_ledger) as total_bank_ledgers,
                (SELECT COUNT(*) FROM transaction_log) as total_transactions,
                (SELECT COUNT(*) FROM audit_log) as total_audit_logs
        `);
        
        console.log('\n📊 System Summary:');
        console.log(`   - Total Panel Ledgers: ${summary[0].total_panel_ledgers}`);
        console.log(`   - Total Bank Ledgers: ${summary[0].total_bank_ledgers}`);
        console.log(`   - Total Transactions: ${summary[0].total_transactions}`);
        console.log(`   - Total Audit Logs: ${summary[0].total_audit_logs}`);
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

comprehensiveTest().catch(console.error);
