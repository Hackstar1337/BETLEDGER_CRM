const mysql = require('mysql2/promise');
require('dotenv').config();

async function generateHistoricalData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'khiladi_panel',
    multipleStatements: true
  });

  try {
    const panelId = 7; // TIGER PANEL
    const daysToGenerate = 10; // Generate data for last 10 days
    
    console.log(`📅 Generating historical data for last ${daysToGenerate} days`);
    console.log(`📋 Panel ID: ${panelId} (TIGER PANEL)\n`);

    // Get panel info
    const [panel] = await connection.execute(
      'SELECT name FROM panels WHERE id = ?',
      [panelId]
    );

    if (panel.length === 0) {
      console.error('❌ Panel not found!');
      return;
    }

    let openingBalance = 50000; // Start with ₹50,000
    const historicalData = [];

    // Generate data for each day
    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Random daily transactions
      const deposits = Math.floor(Math.random() * 20000) + 5000; // ₹5,000 - ₹25,000
      const withdrawals = Math.floor(Math.random() * 15000) + 2000; // ₹2,000 - ₹17,000
      const bonusPoints = Math.floor(deposits * 0.05); // 5% bonus
      
      // Calculate closing balance
      const closingBalance = openingBalance - deposits - bonusPoints + withdrawals;
      const profitLoss = deposits - withdrawals;

      historicalData.push({
        date: dateStr,
        openingBalance,
        deposits,
        withdrawals,
        bonusPoints,
        closingBalance,
        profitLoss
      });

      openingBalance = closingBalance; // Next day's opening balance
    }

    // Clear existing daily balances for this panel
    await connection.execute(
      'DELETE FROM panelDailyBalances WHERE panelId = ?',
      [panelId]
    );
    console.log('✅ Cleared existing daily balances');

    // Insert historical data
    for (const day of historicalData) {
      await connection.execute(
        `INSERT INTO panelDailyBalances 
         (panelId, date, openingBalance, closingBalance, totalDeposits, totalWithdrawals, 
          bonusPoints, settling, extraDeposit, profitLoss, timezone, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 'GMT+5:30', NOW(), NOW())`,
        [panelId, day.date, day.openingBalance, day.closingBalance, day.deposits, 
         day.withdrawals, day.bonusPoints, day.profitLoss]
      );
    }

    console.log(`✅ Generated ${historicalData.length} days of historical data\n`);

    // Display summary
    console.log('📊 Historical Data Summary:');
    console.log('Date          | Opening   | Deposits  | Withdrawals | Bonus    | Closing   | P/L');
    console.log('--------------|-----------|-----------|-------------|----------|-----------|------');
    
    historicalData.forEach(day => {
      console.log(`${day.date} | ${day.openingBalance.toLocaleString().padStart(9)} | ${day.deposits.toLocaleString().padStart(9)} | ${day.withdrawals.toLocaleString().padStart(11)} | ${day.bonusPoints.toString().padStart(8)} | ${day.closingBalance.toLocaleString().padStart(9)} | ${day.profitLoss.toLocaleString().padStart(6)}`);
    });

    // Update current panel balance
    const lastDay = historicalData[historicalData.length - 1];
    await connection.execute(
      'UPDATE panels SET pointsBalance = ?, updatedAt = NOW() WHERE id = ?',
      [lastDay.closingBalance, panelId]
    );

    console.log(`\n✅ Updated panel balance to: ${lastDay.closingBalance}`);
    console.log('\n💡 Now you can test different time periods in the Ledger Simulation:');
    console.log('   • Last 24h: Will show today\'s data');
    console.log('   • Last 7d: Will show the last 7 days');
    console.log('   • Last 30d: Will show all 10 days (since we only generated 10)');
    console.log('   • All Time: Will show all 10 days with the initial opening balance');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

generateHistoricalData();
