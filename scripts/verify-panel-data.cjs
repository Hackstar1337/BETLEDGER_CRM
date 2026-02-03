const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyPanelData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'khiladi_panel',
    multipleStatements: true
  });

  try {
    console.log('🔍 Verifying TEST_PANEL_LEDGER data...\n');

    // Get panel info
    const [panel] = await connection.execute(
      'SELECT * FROM panels WHERE name = "TEST_PANEL_LEDGER"'
    );

    if (panel.length === 0) {
      console.log('❌ Test panel not found. Run test-ledger-system.cjs first.');
      return;
    }

    console.log('📊 Panel Info:');
    console.log(`   ID: ${panel[0].id}`);
    console.log(`   Name: ${panel[0].name}`);
    console.log(`   Current Points Balance: ${panel[0].pointsBalance}`);
    console.log(`   Opening Balance: ${panel[0].openingBalance}`);
    console.log(`   Created: ${panel[0].createdAt}\n`);

    // Get all transactions
    const [transactions] = await connection.execute(`
      SELECT 
        'deposit' as type,
        amount,
        bonusPoints,
        createdAt,
        panelName
      FROM deposits 
      WHERE panelName = 'TEST_PANEL_LEDGER'
      UNION ALL
      SELECT 
        'withdrawal' as type,
        amount,
        0 as bonusPoints,
        createdAt,
        panelName
      FROM withdrawals 
      WHERE panelName = 'TEST_PANEL_LEDGER'
      ORDER BY createdAt
    `);

    console.log('💳 All Transactions:');
    transactions.forEach(tx => {
      const date = new Date(tx.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
      console.log(`   ${date} | ${tx.type.toUpperCase()} | ₹${tx.amount.toLocaleString()}${tx.bonusPoints > 0 ? ` (Bonus: ${tx.bonusPoints})` : ''}`);
    });

    // Get daily snapshots
    const [snapshots] = await connection.execute(
      'SELECT * FROM panelDailyBalances WHERE panelId = ? ORDER BY date',
      [panel[0].id]
    );

    console.log('\n📈 Daily Balance Snapshots:');
    snapshots.forEach(snapshot => {
      const date = new Date(snapshot.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
      console.log(`   ${date}`);
      console.log(`      Opening: ₹${snapshot.openingBalance.toLocaleString()}`);
      console.log(`      Deposits: ₹${snapshot.totalDeposits.toLocaleString()}`);
      console.log(`      Withdrawals: ₹${snapshot.totalWithdrawals.toLocaleString()}`);
      console.log(`      Closing: ₹${snapshot.closingBalance.toLocaleString()}`);
      console.log(`      P/L: ₹${snapshot.profitLoss.toLocaleString()}`);
    });

    // Verify calculations
    console.log('\n🧮 Verification:');
    
    // Today's data
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const [todaySnapshot] = await connection.execute(
      'SELECT * FROM panelDailyBalances WHERE panelId = ? AND date = ?',
      [panel[0].id, todayStr]
    );

    if (todaySnapshot.length > 0) {
      const snapshot = todaySnapshot[0];
      const calculatedClosing = Number(snapshot.openingBalance) - (Number(snapshot.totalDeposits) + Number(snapshot.bonusPoints)) + Number(snapshot.totalWithdrawals);
      
      console.log(`   Today's Closing Balance:`);
      console.log(`      Opening: ₹${Number(snapshot.openingBalance).toLocaleString()}`);
      console.log(`      Deposits: ₹${Number(snapshot.totalDeposits).toLocaleString()}`);
      console.log(`      Bonus: ${Number(snapshot.bonusPoints)}`);
      console.log(`      Withdrawals: ₹${Number(snapshot.totalWithdrawals).toLocaleString()}`);
      console.log(`      Stored: ₹${Number(snapshot.closingBalance).toLocaleString()}`);
      console.log(`      Calculated: ₹${calculatedClosing.toLocaleString()}`);
      console.log(`      ✅ ${Number(snapshot.closingBalance) == calculatedClosing ? 'MATCHES' : 'DOES NOT MATCH'}`);
    }

    // Check panel's current opening balance
    console.log(`\n   Panel's Opening Balance in DB: ₹${panel[0].openingBalance.toLocaleString()}`);
    console.log(`   Auto-updated? ${panel[0].openingBalance > 0 ? 'YES' : 'NO'}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

// Run verification
verifyPanelData();
