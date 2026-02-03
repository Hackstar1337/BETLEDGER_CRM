const mysql = require('mysql2/promise');
require('dotenv').config();

async function showDataSummary() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'khiladi_panel'
  });

  try {
    console.log('🎮 TIGER PANEL - Data Summary\n');
    console.log('============================\n');

    // Get panel info
    const [panel] = await connection.execute(
      'SELECT * FROM panels WHERE name = "TIGER PANEL"'
    );

    if (panel.length === 0) {
      console.log('❌ Panel not found!');
      return;
    }

    console.log(`Panel ID: ${panel[0].id}`);
    console.log(`Current Balance: ₹${Number(panel[0].pointsBalance).toLocaleString()}`);
    console.log(`Created: ${panel[0].createdAt}\n`);

    // Show daily balances
    const [dailyBalances] = await connection.execute(
      'SELECT * FROM panelDailyBalances WHERE panelId = ? ORDER BY date',
      [panel[0].id]
    );

    console.log('📅 Daily Balance Breakdown:');
    console.log('Date       | Opening   | Deposits | Withdrawals | Bonus    | Closing   | P/L');
    console.log('------------|-----------|----------|-------------|----------|-----------|------');
    
    dailyBalances.forEach(day => {
      const date = new Date(day.date).toISOString().split('T')[0];
      console.log(`${date} | ${Number(day.openingBalance).toLocaleString().padStart(9)} | ${Number(day.totalDeposits).toLocaleString().padStart(8)} | ${Number(day.totalWithdrawals).toLocaleString().padStart(11)} | ${Number(day.bonusPoints).toString().padStart(8)} | ${Number(day.closingBalance).toLocaleString().padStart(9)} | ${Number(day.profitLoss).toLocaleString().padStart(6)}`);
    });

    // Show unique players
    const [depositPlayers] = await connection.execute(
      'SELECT DISTINCT userId FROM deposits WHERE panelName = "TIGER PANEL"'
    );
    
    const [withdrawalPlayers] = await connection.execute(
      'SELECT DISTINCT userId FROM withdrawals WHERE panelName = "TIGER PANEL"'
    );
    
    const allPlayers = new Set([...depositPlayers.map(p => p.userId), ...withdrawalPlayers.map(p => p.userId)]);
    
    console.log(`\n👥 Active Players (${allPlayers.size}):`);
    
    // Show player details
    for (const playerId of allPlayers) {
      const [deposits] = await connection.execute(
        'SELECT COUNT(*) as count, SUM(amount) as total FROM deposits WHERE panelName = "TIGER PANEL" AND userId = ?',
        [playerId]
      );
      
      const [withdrawals] = await connection.execute(
        'SELECT COUNT(*) as count, SUM(amount) as total FROM withdrawals WHERE panelName = "TIGER PANEL" AND userId = ?',
        [playerId]
      );
      
      console.log(`   • ${playerId}: ${deposits[0].count} deposits (₹${Number(deposits[0].total).toLocaleString()}), ${withdrawals[0].count} withdrawals (₹${Number(withdrawals[0].total).toLocaleString()})`);
    }

    // Show banks
    const [banks] = await connection.execute(
      'SELECT DISTINCT bankName FROM deposits WHERE panelName = "TIGER PANEL" UNION SELECT DISTINCT bankName FROM withdrawals WHERE panelName = "TIGER PANEL"'
    );
    
    console.log(`\n🏦 Banks Used (${banks.length}):`);
    banks.forEach(bank => console.log(`   • ${bank.bankName}`));

    console.log('\n✅ Data is ready for testing in the Ledger Simulation!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

showDataSummary();
