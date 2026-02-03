const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkPanelDailyData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'khiladi_panel'
  });

  try {
    const panelId = 8; // TIGER PANEL
    
    console.log('🔍 Checking Panel Daily Balances\n');
    console.log('==============================\n');

    // Get raw data from database
    const [rawData] = await connection.execute(
      'SELECT * FROM panelDailyBalances WHERE panelId = ? ORDER BY date',
      [panelId]
    );

    console.log('Raw data from database:');
    rawData.forEach(row => {
      console.log(`Date: ${row.date}, Opening: ${row.openingBalance}, Closing: ${row.closingBalance}, Deposits: ${row.totalDeposits}, Withdrawals: ${row.totalWithdrawals}`);
    });

    // Check if dates are stored correctly
    console.log('\n📅 Date Analysis:');
    rawData.forEach(row => {
      console.log(`Stored date: ${row.date} (Type: ${typeof row.date})`);
    });

    // Check the API response format
    console.log('\n🔄 API Response Format:');
    const formattedData = rawData.map(r => ({
      id: r.id,
      panelId: r.panelId,
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : new Date(r.date).toISOString().split('T')[0],
      openingBalance: Number(r.openingBalance) || 0,
      closingBalance: Number(r.closingBalance) || 0,
      totalDeposits: Number(r.totalDeposits) || 0,
      totalWithdrawals: Number(r.totalWithdrawals) || 0,
      bonusPoints: Number(r.bonusPoints) || 0,
      profitLoss: Number(r.profitLoss) || 0
    }));

    formattedData.forEach(d => {
      console.log(`Date: ${d.date}, Opening: ${d.openingBalance}, Closing: ${d.closingBalance}`);
    });

    // Verify balance carry forward
    console.log('\n✅ Balance Carry Forward Verification:');
    for (let i = 0; i < formattedData.length - 1; i++) {
      const current = formattedData[i];
      const next = formattedData[i + 1];
      const matches = current.closingBalance === next.openingBalance;
      console.log(`${current.date} → ${next.date}: ${matches ? '✅' : '❌'} (Closing: ${current.closingBalance}, Next Opening: ${next.openingBalance})`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

checkPanelDailyData();
