const mysql = require('mysql2/promise');
require('dotenv').config();

async function addMoreData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'khiladi_panel',
    multipleStatements: true
  });

  try {
    const today = new Date().toISOString().split('T')[0];
    const panelId = 6; // TIGER PANEL
    
    console.log(`📅 Adding more test data for today: ${today}`);
    
    // Get current panel info
    const [panel] = await connection.execute(
      'SELECT name, pointsBalance FROM panels WHERE id = ?',
      [panelId]
    );

    const currentBalance = Number(panel[0].pointsBalance);
    console.log(`Current panel balance: ${currentBalance}`);

    // Add another deposit
    const depositAmount = 8000;
    const bonusPoints = 400;
    
    await connection.execute(
      `INSERT INTO deposits (panelName, userId, amount, bonusPoints, utr, bankName, depositDate, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
      [panel[0].name, 'test-user-003', depositAmount, bonusPoints, 'TEST-UTR-003', 'Test Bank 2']
    );

    console.log(`✅ Added another deposit: ₹${depositAmount} with ${bonusPoints} bonus points`);

    // Update panel balance
    const newBalance = currentBalance - depositAmount - bonusPoints;
    
    await connection.execute(
      'UPDATE panels SET pointsBalance = ?, updatedAt = NOW() WHERE id = ?',
      [newBalance, panelId]
    );

    console.log(`✅ Updated panel balance to: ${newBalance}`);

    // Update today's daily balance snapshot
    const [todaySnapshot] = await connection.execute(
      'SELECT * FROM panelDailyBalances WHERE panelId = ? AND DATE(date) = ?',
      [panelId, today]
    );

    if (todaySnapshot.length > 0) {
      const current = todaySnapshot[0];
      const newTotalDeposits = Number(current.totalDeposits) + depositAmount;
      const newBonusPoints = Number(current.bonusPoints) + bonusPoints;
      const newClosingBalance = Number(current.openingBalance) - newTotalDeposits - newBonusPoints + Number(current.totalWithdrawals);
      const newProfitLoss = newTotalDeposits - Number(current.totalWithdrawals);

      await connection.execute(
        `UPDATE panelDailyBalances 
         SET totalDeposits = ?, bonusPoints = ?, closingBalance = ?, profitLoss = ?, updatedAt = NOW()
         WHERE panelId = ? AND DATE(date) = ?`,
        [newTotalDeposits, newBonusPoints, newClosingBalance, newProfitLoss, panelId, today]
      );

      console.log(`✅ Updated today's daily balance snapshot`);
      console.log(`\n📊 Updated summary for today:`);
      console.log(`   • Total Deposits: ₹${newTotalDeposits}`);
      console.log(`   • Total Withdrawals: ₹${current.totalWithdrawals}`);
      console.log(`   • Total Bonus: ${newBonusPoints} pts`);
      console.log(`   • Closing Balance: ₹${newClosingBalance}`);
      console.log(`   • Profit/Loss: ₹${newProfitLoss}`);
    }

    console.log('\n💡 Refresh the Ledger Simulation to see the updated data!');
    console.log('   With auto-refresh enabled, it should update automatically within 30 seconds.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

// Ask user if they want to continue adding data
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔄 This script will add more test data to see real-time updates.');
console.log('   Make sure the Ledger Simulation is open with auto-refresh enabled!\n');

rl.question('Press Enter to add more data (or Ctrl+C to exit)...', () => {
  addMoreData().then(() => {
    rl.close();
  });
});
