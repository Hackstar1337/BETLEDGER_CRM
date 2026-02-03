const mysql = require('mysql2/promise');
require('dotenv').config();

async function addTodayTestData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'khiladi_panel',
    multipleStatements: true
  });

  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const panelId = 6; // TIGER PANEL
    
    console.log(`📅 Adding test data for today: ${today}`);
    console.log(`📋 Panel ID: ${panelId} (TIGER PANEL)\n`);

    // Get current panel info
    const [panel] = await connection.execute(
      'SELECT name, pointsBalance FROM panels WHERE id = ?',
      [panelId]
    );

    if (panel.length === 0) {
      console.error('❌ Panel not found!');
      return;
    }

    console.log(`Current panel balance: ${panel[0].pointsBalance}`);

    // Add a test deposit for today
    const depositAmount = 5000;
    const bonusPoints = 250;
    
    await connection.execute(
      `INSERT INTO deposits (panelName, userId, amount, bonusPoints, utr, bankName, depositDate, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
      [panel[0].name, 'test-user-001', depositAmount, bonusPoints, 'TEST-UTR-001', 'Test Bank']
    );

    console.log(`✅ Added deposit: ₹${depositAmount} with ${bonusPoints} bonus points`);

    // Add a test withdrawal for today
    const withdrawalAmount = 3000;
    
    await connection.execute(
      `INSERT INTO withdrawals (panelName, userId, amount, utr, bankName, status, withdrawalDate, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
      [panel[0].name, 'test-user-002', withdrawalAmount, 'TEST-UTR-002', 'Test Bank', 'approved']
    );

    console.log(`✅ Added withdrawal: ₹${withdrawalAmount}`);

    // Update panel balance
    const newBalance = Number(panel[0].pointsBalance) - depositAmount - bonusPoints + withdrawalAmount;
    
    await connection.execute(
      'UPDATE panels SET pointsBalance = ?, updatedAt = NOW() WHERE id = ?',
      [newBalance, panelId]
    );

    console.log(`✅ Updated panel balance to: ${newBalance}`);

    // Create/update today's daily balance snapshot
    const [existingSnapshot] = await connection.execute(
      'SELECT * FROM panelDailyBalances WHERE panelId = ? AND DATE(date) = ?',
      [panelId, today]
    );

    if (existingSnapshot.length > 0) {
      // Update existing snapshot
      const current = existingSnapshot[0];
      const newTotalDeposits = Number(current.totalDeposits) + depositAmount;
      const newTotalWithdrawals = Number(current.totalWithdrawals) + withdrawalAmount;
      const newBonusPoints = Number(current.bonusPoints) + bonusPoints;
      const newClosingBalance = Number(current.openingBalance) - newTotalDeposits - newBonusPoints + newTotalWithdrawals;
      const newProfitLoss = newTotalDeposits - newTotalWithdrawals;

      await connection.execute(
        `UPDATE panelDailyBalances 
         SET totalDeposits = ?, totalWithdrawals = ?, bonusPoints = ?, 
             closingBalance = ?, profitLoss = ?, updatedAt = NOW()
         WHERE panelId = ? AND DATE(date) = ?`,
        [newTotalDeposits, newTotalWithdrawals, newBonusPoints, newClosingBalance, newProfitLoss, panelId, today]
      );

      console.log(`✅ Updated today's daily balance snapshot`);
    } else {
      // Create new snapshot
      const [yesterdaySnapshot] = await connection.execute(
        'SELECT closingBalance FROM panelDailyBalances WHERE panelId = ? ORDER BY date DESC LIMIT 1',
        [panelId]
      );

      const openingBalance = yesterdaySnapshot.length > 0 ? Number(yesterdaySnapshot[0].closingBalance) : 0;
      const closingBalance = openingBalance - depositAmount - bonusPoints + withdrawalAmount;
      const profitLoss = depositAmount - withdrawalAmount;

      await connection.execute(
        `INSERT INTO panelDailyBalances 
         (panelId, date, openingBalance, closingBalance, totalDeposits, totalWithdrawals, bonusPoints, settling, extraDeposit, profitLoss, timezone, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 'GMT+5:30', NOW(), NOW())`,
        [panelId, today, openingBalance, closingBalance, depositAmount, withdrawalAmount, bonusPoints, profitLoss]
      );

      console.log(`✅ Created new daily balance snapshot for today`);
    }

    console.log('\n🎉 Test data added successfully!');
    console.log('\n📊 Summary for today:');
    console.log(`   • Deposit: +₹${depositAmount} (with ${bonusPoints} bonus)`);
    console.log(`   • Withdrawal: -₹${withdrawalAmount}`);
    console.log(`   • Net effect: ${depositAmount - withdrawalAmount > 0 ? '+' : ''}₹${depositAmount - withdrawalAmount}`);
    console.log('\n💡 Check the Ledger Simulation with auto-refresh enabled to see the updates!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

addTodayTestData();
