const mysql = require('mysql2/promise');
require('dotenv').config();

async function addTransactionsForDays() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'khiladi_panel',
    multipleStatements: true
  });

  try {
    const panelId = 7; // TIGER PANEL
    const panelName = 'TIGER PANEL';
    
    console.log('📝 Adding sample transactions for historical days...\n');

    // Get existing daily balances
    const [balances] = await connection.execute(
      'SELECT * FROM panelDailyBalances WHERE panelId = ? ORDER BY date',
      [panelId]
    );

    for (const balance of balances) {
      if (balance.totalDeposits > 0) {
        // Add deposit transactions
        const numDeposits = Math.min(Math.floor(Math.random() * 3) + 1, 3); // 1-3 deposits
        let remainingDeposit = Number(balance.totalDeposits);
        
        for (let i = 0; i < numDeposits; i++) {
          const amount = i === numDeposits - 1 ? remainingDeposit : Math.floor(remainingDeposit / (numDeposits - i));
          const bonus = Math.floor(amount * 0.05);
          remainingDeposit -= amount;
          
          await connection.execute(
            `INSERT INTO deposits (panelName, userId, amount, bonusPoints, utr, bankName, depositDate, createdAt, updatedAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [panelName, `user-${balance.date}-${i}`, amount, bonus, `UTR-${balance.date}-${i}`, 'Bank XYZ', balance.date]
          );
        }
        
        console.log(`✅ Added ${numDeposits} deposit(s) for ${balance.date} (Total: ₹${balance.totalDeposits})`);
      }

      if (balance.totalWithdrawals > 0) {
        // Add withdrawal transactions
        const numWithdrawals = Math.min(Math.floor(Math.random() * 3) + 1, 3); // 1-3 withdrawals
        let remainingWithdrawal = Number(balance.totalWithdrawals);
        
        for (let i = 0; i < numWithdrawals; i++) {
          const amount = i === numWithdrawals - 1 ? remainingWithdrawal : Math.floor(remainingWithdrawal / (numWithdrawals - i));
          remainingWithdrawal -= amount;
          
          await connection.execute(
            `INSERT INTO withdrawals (panelName, userId, amount, utr, bankName, status, withdrawalDate, createdAt, updatedAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [panelName, `user-${balance.date}-${i}`, amount, `UTR-W-${balance.date}-${i}`, 'Bank XYZ', 'approved', balance.date]
          );
        }
        
        console.log(`✅ Added ${numWithdrawals} withdrawal(s) for ${balance.date} (Total: ₹${balance.totalWithdrawals})`);
      }
    }

    console.log('\n🎉 Sample transactions added for all historical days!');
    console.log('\n💡 Now the Ledger Simulation will show realistic transaction data');
    console.log('   Check the "All Transactions" tab to see the individual transactions');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

addTransactionsForDays();
