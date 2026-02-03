const mysql = require('mysql2/promise');
require('dotenv').config();

async function backfillDailyBalances() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'khiladi_panel',
    multipleStatements: true
  });

  try {
    console.log('🔍 Finding earliest transaction date...');
    
    // Get the earliest transaction date
    const [earliestResult] = await connection.execute(`
      SELECT MIN(CASE 
        WHEN d.createdAt IS NOT NULL THEN d.createdAt
        WHEN w.createdAt IS NOT NULL THEN w.createdAt
      END) as earliest_date
      FROM panels p
      LEFT JOIN deposits d ON p.name = d.panelName
      LEFT JOIN withdrawals w ON p.name = w.panelName
      WHERE d.createdAt IS NOT NULL OR w.createdAt IS NOT NULL
    `);

    const earliestDate = earliestResult[0]?.earliest_date;
    
    if (!earliestDate) {
      console.log('ℹ️ No transactions found. Nothing to backfill.');
      return;
    }

    console.log(`📅 Earliest transaction found: ${earliestDate.toISOString()}`);
    
    // Calculate start date (30 days before earliest transaction or earliest date itself)
    const startDate = new Date(earliestDate);
    startDate.setDate(startDate.getDate() - 30);
    
    // End date is yesterday
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1);
    endDate.setHours(23, 59, 59, 999);

    console.log(`🔄 Backfilling daily balances from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Get all panels
    const [panels] = await connection.execute('SELECT * FROM panels');
    
    if (panels.length === 0) {
      console.log('ℹ️ No panels found.');
      return;
    }

    console.log(`📊 Found ${panels.length} panels`);

    // Process each day
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);
    
    let totalDays = 0;
    let totalSnapshots = 0;

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      console.log(`\n📝 Processing ${dateStr}...`);
      
      for (const panel of panels) {
        // Check if snapshot already exists
        const [existing] = await connection.execute(
          'SELECT id FROM panelDailyBalances WHERE panelId = ? AND date = ?',
          [panel.id, dateStr]
        );
        
        if (existing.length > 0) {
          continue; // Skip if already exists
        }

        // Calculate opening balance (previous day's closing or 0)
        let openingBalance = 0;
        
        if (currentDate > startDate) {
          const prevDate = new Date(currentDate);
          prevDate.setDate(prevDate.getDate() - 1);
          const prevDateStr = prevDate.toISOString().split('T')[0];
          
          const [prevClosing] = await connection.execute(
            'SELECT closingBalance FROM panelDailyBalances WHERE panelId = ? AND date = ?',
            [panel.id, prevDateStr]
          );
          
          if (prevClosing.length > 0) {
            openingBalance = Number(prevClosing[0].closingBalance);
          }
        }

        // Calculate transactions for this day
        const dayStart = new Date(currentDate);
        const dayEnd = new Date(currentDate);
        dayEnd.setDate(dayEnd.getDate() + 1);
        
        const [transactions] = await connection.execute(`
          SELECT 
            COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) as totalDeposits,
            COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) as totalWithdrawals,
            COALESCE(SUM(bonusPoints), 0) as totalBonus
          FROM (
            SELECT 'deposit' as type, amount, bonusPoints, createdAt, panelName
            FROM deposits 
            WHERE panelName = ? AND createdAt >= ? AND createdAt < ?
            UNION ALL
            SELECT 'withdrawal' as type, amount, 0 as bonusPoints, createdAt, panelName
            FROM withdrawals 
            WHERE panelName = ? AND createdAt >= ? AND createdAt < ?
          ) t
        `, [panel.name, dayStart, dayEnd, panel.name, dayStart, dayEnd]);

        const { totalDeposits, totalWithdrawals, totalBonus } = transactions[0];
        
        const closingBalance = openingBalance - (Number(totalDeposits) + Number(totalBonus)) + Number(totalWithdrawals);
        const profitLoss = Number(totalDeposits) - Number(totalWithdrawals);

        // Save the snapshot
        await connection.execute(`
          INSERT INTO panelDailyBalances 
          (panelId, date, openingBalance, closingBalance, totalDeposits, totalWithdrawals, 
           bonusPoints, settling, extraDeposit, profitLoss, timezone, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'GMT+5:30', NOW(), NOW())
        `, [
          panel.id,
          dateStr,
          openingBalance,
          closingBalance,
          Number(totalDeposits),
          Number(totalWithdrawals),
          Number(totalBonus),
          panel.settling || 0,
          panel.extraDeposit || 0,
          profitLoss
        ]);

        totalSnapshots++;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
      totalDays++;
    }

    console.log(`\n✅ Backfill complete!`);
    console.log(`📊 Processed ${totalDays} days`);
    console.log(`📈 Created ${totalSnapshots} daily balance snapshots`);

  } catch (error) {
    console.error('❌ Error during backfill:', error);
  } finally {
    await connection.end();
  }
}

// Run the backfill
backfillDailyBalances();
