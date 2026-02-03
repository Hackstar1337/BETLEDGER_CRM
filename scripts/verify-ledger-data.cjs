const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyLedgerData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'khiladi_panel'
  });

  try {
    const panelId = 7; // TIGER PANEL
    const panelName = 'TIGER PANEL';
    
    console.log('🔍 Verifying Ledger Data Integrity\n');
    console.log('=====================================\n');

    // Check panel balance
    const [panel] = await connection.execute(
      'SELECT pointsBalance FROM panels WHERE id = ?',
      [panelId]
    );
    
    console.log(`📊 Current Panel Balance: ₹${Number(panel[0].pointsBalance).toLocaleString()}\n`);

    // Check daily balances
    const [dailyBalances] = await connection.execute(
      'SELECT * FROM panelDailyBalances WHERE panelId = ? ORDER BY date',
      [panelId]
    );

    console.log(`📅 Daily Balances (${dailyBalances.length} days):`);
    console.log('Date       | Opening  | Deposits | Withdrawals | Bonus | Closing  | P/L');
    console.log('------------|----------|----------|-------------|-------|----------|------');
    
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalBonus = 0;
    
    dailyBalances.forEach(day => {
      const date = new Date(day.date).toISOString().split('T')[0];
      totalDeposits += Number(day.totalDeposits);
      totalWithdrawals += Number(day.totalWithdrawals);
      totalBonus += Number(day.bonusPoints);
      
      console.log(`${date} | ${Number(day.openingBalance).toLocaleString().padStart(8)} | ${Number(day.totalDeposits).toLocaleString().padStart(8)} | ${Number(day.totalWithdrawals).toLocaleString().padStart(11)} | ${Number(day.bonusPoints).toString().padStart(5)} | ${Number(day.closingBalance).toLocaleString().padStart(8)} | ${Number(day.profitLoss).toLocaleString().padStart(4)}`);
    });

    // Check transaction counts
    const [depositCount] = await connection.execute(
      'SELECT COUNT(*) as count, SUM(amount) as total FROM deposits WHERE panelName = ?',
      [panelName]
    );
    
    const [withdrawalCount] = await connection.execute(
      'SELECT COUNT(*) as count, SUM(amount) as total FROM withdrawals WHERE panelName = ?',
      [panelName]
    );

    console.log('\n📈 Transaction Summary:');
    console.log(`• Total Deposits: ${depositCount[0].count} transactions totaling ₹${Number(depositCount[0].total).toLocaleString()}`);
    console.log(`• Total Withdrawals: ${withdrawalCount[0].count} transactions totaling ₹${Number(withdrawalCount[0].total).toLocaleString()}`);
    console.log(`• Total Bonus Points: ${totalBonus.toLocaleString()}`);

    // Verify calculations
    const firstDay = dailyBalances[0];
    const lastDay = dailyBalances[dailyBalances.length - 1];
    const expectedBalance = Number(firstDay.openingBalance) - totalDeposits - totalBonus + totalWithdrawals;
    const actualBalance = Number(lastDay.closingBalance);
    
    console.log('\n✅ Balance Verification:');
    console.log(`   Initial Opening: ₹${Number(firstDay.openingBalance).toLocaleString()}`);
    console.log(`   Total Deposits: -₹${totalDeposits.toLocaleString()}`);
    console.log(`   Total Bonus: -${totalBonus.toLocaleString()}`);
    console.log(`   Total Withdrawals: +₹${totalWithdrawals.toLocaleString()}`);
    console.log(`   ---------------------------`);
    console.log(`   Expected Balance: ₹${expectedBalance.toLocaleString()}`);
    console.log(`   Actual Balance: ₹${actualBalance.toLocaleString()}`);
    console.log(`   ✅ ${expectedBalance === actualBalance ? 'BALANCES MATCH!' : '⚠️ MISMATCH DETECTED'}`);

    console.log('\n🎯 Testing Scenarios:');
    console.log('1. Open Ledger Simulation');
    console.log('2. Select "TIGER PANEL"');
    console.log('3. Test different time periods:');
    console.log('   • Last 24h: Should show Feb 2, 2026');
    console.log('   • Last 7d: Should show last 7 days');
    console.log('   • Last 30d: Should show all 10 days');
    console.log('   • All Time: Should show all 10 days');
    console.log('4. Check "Day-by-Day View" for daily breakdowns');
    console.log('5. Check "All Transactions" for individual transactions');
    console.log('6. Enable "Auto-refresh" and add new data to test real-time updates');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

verifyLedgerData();
