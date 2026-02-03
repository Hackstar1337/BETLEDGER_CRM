const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDailyBalances() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'khiladi_panel',
    multipleStatements: true
  });

  try {
    console.log('🔍 Checking panelDailyBalances table...\n');

    // Get all daily balances
    const [balances] = await connection.execute(
      'SELECT * FROM panelDailyBalances ORDER BY panelId, date DESC LIMIT 20'
    );

    console.log(`📊 Found ${balances.length} daily balance records:`);
    
    balances.forEach((balance, index) => {
      console.log(`\n${index + 1}. Panel ${balance.panelId} - ${balance.date}`);
      console.log(`   Opening: ${balance.openingBalance}`);
      console.log(`   Deposits: ${balance.totalDeposits}`);
      console.log(`   Withdrawals: ${balance.totalWithdrawals}`);
      console.log(`   Bonus: ${balance.bonusPoints}`);
      console.log(`   Closing: ${balance.closingBalance}`);
      console.log(`   P/L: ${balance.profitLoss}`);
    });

    // Check if there are any panels
    const [panels] = await connection.execute('SELECT id, name FROM panels LIMIT 10');
    console.log(`\n📋 Available panels:`);
    panels.forEach(panel => {
      console.log(`   ID: ${panel.id}, Name: ${panel.name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

checkDailyBalances();
