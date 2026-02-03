const mysql = require('mysql2/promise');
require('dotenv').config();

async function createRealisticData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'khiladi_panel',
    multipleStatements: true
  });

  try {
    console.log('🎮 Creating Realistic Gaming Panel Data\n');
    console.log('====================================\n');

    // Define banks
    const banks = [
      'State Bank of India',
      'HDFC Bank',
      'ICICI Bank',
      'Axis Bank',
      'Punjab National Bank'
    ];

    // Define players with their details
    const players = [
      { id: 'player001', name: 'Rajesh Kumar', phone: '9876543210' },
      { id: 'player002', name: 'Amit Singh', phone: '9876543211' },
      { id: 'player003', name: 'Priya Sharma', phone: '9876543212' },
      { id: 'player004', name: 'Vikram Gupta', phone: '9876543213' },
      { id: 'player005', name: 'Neha Patel', phone: '9876543214' },
      { id: 'player006', name: 'Rohit Verma', phone: '9876543215' },
      { id: 'player007', name: 'Anjali Nair', phone: '9876543216' },
      { id: 'player008', name: 'Karan Malhotra', phone: '9876543217' },
      { id: 'player009', name: 'Sneha Reddy', phone: '9876543218' },
      { id: 'player010', name: 'Mohammed Ali', phone: '9876543219' }
    ];

    // Panel details
    const panelName = 'TIGER PANEL';
    let panelId = 7; // Assuming panel exists
    
    // Check if panel exists, if not create it
    const [existingPanel] = await connection.execute(
      'SELECT id FROM panels WHERE name = ?',
      [panelName]
    );

    if (existingPanel.length === 0) {
      const [result] = await connection.execute(
        `INSERT INTO panels (name, pointsBalance, openingBalance, settling, extraDeposit, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [panelName, 50000, 50000, 0, 0]
      );
      panelId = result.insertId;
      console.log(`✅ Created new panel: ${panelName} with ID ${panelId}`);
    } else {
      panelId = existingPanel[0].id;
      console.log(`✅ Using existing panel: ${panelName} with ID ${panelId}`);
    }

    // Clear existing data for clean start
    await connection.execute('DELETE FROM deposits WHERE panelName = ?', [panelName]);
    await connection.execute('DELETE FROM withdrawals WHERE panelName = ?', [panelName]);
    await connection.execute('DELETE FROM panelDailyBalances WHERE panelId = ?', [panelId]);
    console.log('✅ Cleared existing data');

    // Generate data from Jan 31 to today
    const startDate = new Date('2026-01-31');
    const endDate = new Date();
    const daysToGenerate = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    console.log(`\n📅 Generating data for ${daysToGenerate} days (Jan 31 - Today)\n`);

    let openingBalance = 50000;
    const dailyData = [];

    for (let dayIndex = 0; dayIndex < daysToGenerate; dayIndex++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + dayIndex);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Simulate daily activity
      const numTransactions = Math.floor(Math.random() * 8) + 3; // 3-10 transactions per day
      let dayDeposits = 0;
      let dayWithdrawals = 0;
      let dayBonus = 0;
      
      console.log(`\n📊 ${dateStr} - Processing ${numTransactions} transactions...`);
      
      // Generate transactions for the day
      for (let i = 0; i < numTransactions; i++) {
        const isDeposit = Math.random() > 0.4; // 60% chance of deposit
        const player = players[Math.floor(Math.random() * players.length)];
        const bank = banks[Math.floor(Math.random() * banks.length)];
        
        if (isDeposit) {
          const amount = Math.floor(Math.random() * 15000) + 5000; // ₹5,000 - ₹20,000
          const bonus = Math.floor(amount * 0.05); // 5% bonus
          
          await connection.execute(
            `INSERT INTO deposits (panelName, userId, amount, bonusPoints, utr, bankName, depositDate, createdAt, updatedAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [panelName, player.id, amount, bonus, `UTR${Date.now()}${i}`, bank, dateStr]
          );
          
          dayDeposits += amount;
          dayBonus += bonus;
          console.log(`   💰 Deposit: ${player.name} - ₹${amount.toLocaleString()} (Bonus: ${bonus}) via ${bank}`);
        } else {
          const amount = Math.floor(Math.random() * 10000) + 2000; // ₹2,000 - ₹12,000
          
          await connection.execute(
            `INSERT INTO withdrawals (panelName, userId, amount, utr, bankName, status, withdrawalDate, createdAt, updatedAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [panelName, player.id, amount, `UTRW${Date.now()}${i}`, bank, 'approved', dateStr]
          );
          
          dayWithdrawals += amount;
          console.log(`   💸 Withdrawal: ${player.name} - ₹${amount.toLocaleString()} via ${bank}`);
        }
      }
      
      // Calculate closing balance
      const closingBalance = openingBalance - dayDeposits - dayBonus + dayWithdrawals;
      const profitLoss = dayDeposits - dayWithdrawals;
      
      // Save daily balance
      await connection.execute(
        `INSERT INTO panelDailyBalances 
         (panelId, date, openingBalance, closingBalance, totalDeposits, totalWithdrawals, 
          bonusPoints, settling, extraDeposit, profitLoss, timezone, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 'GMT+5:30', NOW(), NOW())`,
        [panelId, dateStr, openingBalance, closingBalance, dayDeposits, dayWithdrawals, dayBonus, profitLoss]
      );
      
      dailyData.push({
        date: dateStr,
        openingBalance,
        deposits: dayDeposits,
        withdrawals: dayWithdrawals,
        bonus: dayBonus,
        closingBalance,
        profitLoss
      });
      
      openingBalance = closingBalance;
    }

    // Update panel balance
    await connection.execute(
      'UPDATE panels SET pointsBalance = ?, updatedAt = NOW() WHERE id = ?',
      [openingBalance, panelId]
    );

    // Display summary
    console.log('\n📈 Summary Report');
    console.log('================');
    console.log(`Panel: ${panelName}`);
    console.log(`Starting Balance: ₹50,000`);
    console.log(`Ending Balance: ₹${openingBalance.toLocaleString()}`);
    console.log(`Total Days: ${dailyData.length}`);
    
    const totalDeposits = dailyData.reduce((sum, d) => sum + d.deposits, 0);
    const totalWithdrawals = dailyData.reduce((sum, d) => sum + d.withdrawals, 0);
    const totalBonus = dailyData.reduce((sum, d) => sum + d.bonus, 0);
    
    console.log(`\nTotals:`);
    console.log(`• Deposits: ${dailyData.reduce((sum, d) => sum + (d.deposits > 0 ? 1 : 0), 0)} transactions totaling ₹${totalDeposits.toLocaleString()}`);
    console.log(`• Withdrawals: ${dailyData.reduce((sum, d) => sum + (d.withdrawals > 0 ? 1 : 0), 0)} transactions totaling ₹${totalWithdrawals.toLocaleString()}`);
    console.log(`• Bonus Points: ${totalBonus.toLocaleString()}`);
    console.log(`• Net P/L: ₹${(totalDeposits - totalWithdrawals).toLocaleString()}`);
    
    console.log('\n🎯 Active Players:');
    const uniquePlayers = [...new Set(players)];
    console.log(`• ${uniquePlayers.length} players participated`);
    console.log(`• ${banks.length} banks used for transactions`);
    
    console.log('\n✅ Realistic data generation complete!');
    console.log('\n💡 Test the Ledger Simulation with:');
    console.log('   • Different time periods (24h, 7d, 30d, All)');
    console.log('   • Auto-refresh feature');
    console.log('   • Transaction details');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

createRealisticData();
