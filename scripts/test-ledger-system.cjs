const mysql = require('mysql2/promise');
require('dotenv').config();

async function testLedgerSystem() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'khiladi_panel',
    multipleStatements: true
  });

  try {
    console.log('🧪 Starting Ledger System Test\n');

    // 1. Create a test panel
    console.log('1️⃣ Creating test panel...');
    const [panelResult] = await connection.execute(`
      INSERT INTO panels (name, pointsBalance, openingBalance, closingBalance, settling, extraDeposit, bonusPoints, profitLoss)
      VALUES ('TEST_PANEL_LEDGER', 100000, 0, 0, 0, 0, 0, 0)
    `);
    const panelId = panelResult.insertId;
    console.log(`✅ Created test panel with ID: ${panelId}\n`);

    // 2. Simulate transactions over 3 days
    console.log('2️⃣ Creating test transactions over 3 days...');
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBefore = new Date(today);
    dayBefore.setDate(dayBefore.getDate() - 2);

    // Day 1 (2 days ago) - Initial transactions
    console.log(`   📅 Day 1 (${dayBefore.toISOString().split('T')[0]}):`);
    await connection.execute(`
      INSERT INTO deposits (userId, amount, utr, bankName, panelName, bonusPoints, depositDate, createdAt, updatedAt)
      VALUES ('test_user_1', 10000, 'UTR001', 'Test Bank', 'TEST_PANEL_LEDGER', 500, ?, ?, ?)
    `, [dayBefore, dayBefore, dayBefore]);
    console.log(`      - Deposit: ₹10,000 (Bonus: 500 pts)`);

    await connection.execute(`
      INSERT INTO withdrawals (userId, amount, utr, bankName, panelName, paymentMethod, withdrawalDate, createdAt, updatedAt)
      VALUES ('test_user_2', 5000, 'UTR002', 'Test Bank', 'TEST_PANEL_LEDGER', 'IMPS', ?, ?, ?)
    `, [dayBefore, dayBefore, dayBefore]);
    console.log(`      - Withdrawal: ₹5,000`);

    // Day 2 (yesterday) - More transactions
    console.log(`   📅 Day 2 (${yesterday.toISOString().split('T')[0]}):`);
    await connection.execute(`
      INSERT INTO deposits (userId, amount, utr, bankName, panelName, bonusPoints, depositDate, createdAt, updatedAt)
      VALUES ('test_user_3', 15000, 'UTR003', 'Test Bank', 'TEST_PANEL_LEDGER', 750, ?, ?, ?)
    `, [yesterday, yesterday, yesterday]);
    console.log(`      - Deposit: ₹15,000 (Bonus: 750 pts)`);

    await connection.execute(`
      INSERT INTO withdrawals (userId, amount, utr, bankName, panelName, paymentMethod, withdrawalDate, createdAt, updatedAt)
      VALUES ('test_user_4', 8000, 'UTR004', 'Test Bank', 'TEST_PANEL_LEDGER', 'UPI', ?, ?, ?)
    `, [yesterday, yesterday, yesterday]);
    console.log(`      - Withdrawal: ₹8,000`);

    // Day 3 (today) - Current transactions
    console.log(`   📅 Day 3 (${today.toISOString().split('T')[0]}):`);
    await connection.execute(`
      INSERT INTO deposits (userId, amount, utr, bankName, panelName, bonusPoints, depositDate, createdAt, updatedAt)
      VALUES ('test_user_5', 20000, 'UTR005', 'Test Bank', 'TEST_PANEL_LEDGER', 1000, ?, ?, ?)
    `, [today, today, today]);
    console.log(`      - Deposit: ₹20,000 (Bonus: 1,000 pts)`);

    console.log('\n3️⃣ Running backfill to create daily snapshots...');
    // Run the backfill logic for our test dates
    const startDate = new Date(dayBefore);
    startDate.setDate(startDate.getDate() - 1);
    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);

    // Generate snapshots for each day
    const currentDate = new Date(dayBefore);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Calculate opening balance
      let openingBalance = 0;
      if (currentDate > dayBefore) {
        const prevDate = new Date(currentDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const [prevClosing] = await connection.execute(
          'SELECT closingBalance FROM panelDailyBalances WHERE panelId = ? AND date = ?',
          [panelId, prevDate.toISOString().split('T')[0]]
        );
        if (prevClosing.length > 0) {
          openingBalance = Number(prevClosing[0].closingBalance);
        }
      }

      // Calculate day's transactions
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const [transactions] = await connection.execute(`
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) as totalDeposits,
          COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) as totalWithdrawals,
          COALESCE(SUM(bonusPoints), 0) as totalBonus
        FROM (
          SELECT 'deposit' as type, amount, bonusPoints, createdAt, panelName
          FROM deposits 
          WHERE panelName = 'TEST_PANEL_LEDGER' AND createdAt >= ? AND createdAt < ?
          UNION ALL
          SELECT 'withdrawal' as type, amount, 0 as bonusPoints, createdAt, panelName
          FROM withdrawals 
          WHERE panelName = 'TEST_PANEL_LEDGER' AND createdAt >= ? AND createdAt < ?
        ) t
      `, [dayStart, dayEnd, dayStart, dayEnd]);

      const { totalDeposits, totalWithdrawals, totalBonus } = transactions[0];
      const closingBalance = openingBalance - (Number(totalDeposits) + Number(totalBonus)) + Number(totalWithdrawals);
      const profitLoss = Number(totalDeposits) - Number(totalWithdrawals);

      // Save snapshot
      await connection.execute(`
        INSERT INTO panelDailyBalances 
        (panelId, date, openingBalance, closingBalance, totalDeposits, totalWithdrawals, 
         bonusPoints, settling, extraDeposit, profitLoss, timezone, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'GMT+5:30', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
        openingBalance = VALUES(openingBalance),
        closingBalance = VALUES(closingBalance),
        totalDeposits = VALUES(totalDeposits),
        totalWithdrawals = VALUES(totalWithdrawals),
        bonusPoints = VALUES(bonusPoints),
        profitLoss = VALUES(profitLoss),
        updatedAt = NOW()
      `, [
        panelId,
        dateStr,
        openingBalance,
        closingBalance,
        Number(totalDeposits),
        Number(totalWithdrawals),
        Number(totalBonus),
        0,
        0,
        profitLoss
      ]);

      console.log(`   📊 ${dateStr}: Opening=${openingBalance}, Deposits=${totalDeposits}, Withdrawals=${totalWithdrawals}, Closing=${closingBalance}`);
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('\n4️⃣ Testing different time period views...');
    
    // Test 24h view
    console.log('\n   📅 24-Hour View (Today):');
    const today24h = new Date(today);
    today24h.setHours(today24h.getHours() - 24);
    
    const [day24Transactions] = await connection.execute(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) as totalDeposits,
        COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) as totalWithdrawals,
        COALESCE(SUM(bonusPoints), 0) as totalBonus
      FROM (
        SELECT 'deposit' as type, amount, bonusPoints, createdAt, panelName
        FROM deposits 
        WHERE panelName = 'TEST_PANEL_LEDGER' AND createdAt >= ?
        UNION ALL
        SELECT 'withdrawal' as type, amount, 0 as bonusPoints, createdAt, panelName
        FROM withdrawals 
        WHERE panelName = 'TEST_PANEL_LEDGER' AND createdAt >= ?
      ) t
    `, [today24h, today24h]);

    const day24 = day24Transactions[0];
    const day24Opening = 10000 - 500 + 5000; // Previous day's closing
    const day24Closing = day24Opening - (Number(day24.totalDeposits) + Number(day24.totalBonus)) + Number(day24.totalWithdrawals);
    
    console.log(`      Opening Balance: ₹${day24Opening.toLocaleString()}`);
    console.log(`      Deposits: ₹${Number(day24.totalDeposits).toLocaleString()} (Bonus: ${day24.totalBonus} pts)`);
    console.log(`      Withdrawals: ₹${Number(day24.totalWithdrawals).toLocaleString()}`);
    console.log(`      Closing Balance: ₹${day24Closing.toLocaleString()}`);
    console.log(`      Profit/Loss: ₹${(Number(day24.totalDeposits) - Number(day24.totalWithdrawals)).toLocaleString()}`);

    // Test 7d view
    console.log('\n   📅 7-Day View (should show all transactions):');
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const [weekTransactions] = await connection.execute(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) as totalDeposits,
        COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) as totalWithdrawals,
        COALESCE(SUM(bonusPoints), 0) as totalBonus
      FROM (
        SELECT 'deposit' as type, amount, bonusPoints, createdAt, panelName
        FROM deposits 
        WHERE panelName = 'TEST_PANEL_LEDGER' AND createdAt >= ?
        UNION ALL
        SELECT 'withdrawal' as type, amount, 0 as bonusPoints, createdAt, panelName
        FROM withdrawals 
        WHERE panelName = 'TEST_PANEL_LEDGER' AND createdAt >= ?
      ) t
    `, [weekAgo, weekAgo]);

    const week = weekTransactions[0];
    const weekClosing = 0 - (Number(week.totalDeposits) + Number(week.totalBonus)) + Number(week.totalWithdrawals);
    
    console.log(`      Opening Balance: ₹0 (start of period)`);
    console.log(`      Total Deposits: ₹${Number(week.totalDeposits).toLocaleString()} (Bonus: ${week.totalBonus} pts)`);
    console.log(`      Total Withdrawals: ₹${Number(week.totalWithdrawals).toLocaleString()}`);
    console.log(`      Closing Balance: ₹${weekClosing.toLocaleString()}`);
    console.log(`      Total Profit/Loss: ₹${(Number(week.totalDeposits) - Number(week.totalWithdrawals)).toLocaleString()}`);

    console.log('\n5️⃣ Testing auto-update for today...');
    // Simulate what happens when viewing 24h - auto-update opening balance
    const [currentPanel] = await connection.execute(
      'SELECT openingBalance FROM panels WHERE id = ?',
      [panelId]
    );

    if (currentPanel[0].openingBalance === 0) {
      console.log('   ⚡ Auto-updating today\'s opening balance...');
      await connection.execute(
        'UPDATE panels SET openingBalance = ? WHERE id = ?',
        [day24Opening, panelId]
      );
      console.log(`   ✅ Updated opening balance to: ₹${day24Opening.toLocaleString()}`);
    }

    console.log('\n6️⃣ Final verification - checking daily snapshots:');
    const [snapshots] = await connection.execute(`
      SELECT date, openingBalance, closingBalance, totalDeposits, totalWithdrawals, profitLoss
      FROM panelDailyBalances 
      WHERE panelId = ? 
      ORDER BY date ASC
    `, [panelId]);

    console.log('   📊 Daily Balance History:');
    snapshots.forEach(snapshot => {
      console.log(`      ${snapshot.date}: Open=${snapshot.openingBalance}, Close=${snapshot.closingBalance}, P/L=${snapshot.profitLoss}`);
    });

    console.log('\n✅ Test completed successfully!');
    console.log('\n📝 To verify in the UI:');
    console.log('   1. Start the application: npm run dev');
    console.log('   2. Go to the Panels page');
    console.log('   3. Look for "TEST_PANEL_LEDGER"');
    console.log('   4. Switch between time periods (24h, 7d, 30d, All)');
    console.log('   5. Observe how opening/closing balances change');
    console.log('   6. Check for "Auto" badge on 24h view');

    // Cleanup option
    console.log('\n🗑️  To clean up test data, run:');
    console.log(`   DELETE FROM panelDailyBalances WHERE panelId = ${panelId};`);
    console.log(`   DELETE FROM withdrawals WHERE panelName = 'TEST_PANEL_LEDGER';`);
    console.log(`   DELETE FROM deposits WHERE panelName = 'TEST_PANEL_LEDGER';`);
    console.log(`   DELETE FROM panels WHERE id = ${panelId};`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await connection.end();
  }
}

// Run the test
testLedgerSystem();
