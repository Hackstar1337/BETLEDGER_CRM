const mysql = require('mysql2/promise');

async function createTodayEntry() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'MySQL@Root2026!',
    database: 'khiladi247_v3'
  });
  
  try {
    // Get yesterday's closing balance
    const [yesterday] = await conn.execute(
      'SELECT closingBalance FROM panelDailyBalances WHERE panelId = 35 ORDER BY date DESC LIMIT 1'
    );
    
    const yesterdayClosing = Number(yesterday[0]?.closingBalance || 10000);
    console.log('Yesterday closing:', yesterdayClosing);
    
    // Get today's totals
    const [todayTotals] = await conn.execute(`
      SELECT 
        COALESCE(SUM(amount), 0) as totalDeposits,
        COALESCE(SUM(bonusPoints), 0) as totalBonus
      FROM deposits 
      WHERE panelName = 'Tiger Panel' AND DATE(depositDate) = CURDATE()
    `);
    
    const [withdrawalTotals] = await conn.execute(`
      SELECT COALESCE(SUM(amount), 0) as totalWithdrawals
      FROM withdrawals 
      WHERE panelName = 'Tiger Panel' AND DATE(withdrawalDate) = CURDATE()
    `);
    
    const deposits = Number(todayTotals[0].totalDeposits);
    const bonus = Number(todayTotals[0].totalBonus);
    const withdrawals = Number(withdrawalTotals[0].totalWithdrawals);
    
    console.log('Today - Deposits:', deposits, 'Bonus:', bonus, 'Withdrawals:', withdrawals);
    
    // Calculate closing balance
    const closingBalance = yesterdayClosing - (deposits + bonus) + withdrawals;
    
    // Insert today's entry
    const [result] = await conn.execute(`
      INSERT INTO panelDailyBalances (
        panelId, date, openingBalance, closingBalance,
        totalDeposits, totalWithdrawals, bonusPoints,
        settling, extraDeposit, profitLoss, timezone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      35,
      new Date(),
      yesterdayClosing,
      closingBalance,
      deposits,
      withdrawals,
      bonus,
      0,
      0,
      deposits - withdrawals,
      'GMT+5:30'
    ]);
    
    console.log('\nCreated today entry with ID:', result.insertId);
    console.log('Opening:', yesterdayClosing);
    console.log('Deposits:', deposits);
    console.log('Withdrawals:', withdrawals);
    console.log('Bonus:', bonus);
    console.log('Closing:', closingBalance);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await conn.end();
  }
}

createTodayEntry().catch(console.error);
