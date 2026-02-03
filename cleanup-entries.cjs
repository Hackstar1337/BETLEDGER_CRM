const mysql = require('mysql2/promise');

async function cleanUpEntries() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'MySQL@Root2026!',
    database: 'khiladi247_v3'
  });
  
  try {
    // Delete duplicate entries (keep only the one with actual data)
    await conn.execute('DELETE FROM panelDailyBalances WHERE panelId = 35 AND id IN (32, 33)');
    console.log('Deleted duplicate entries');
    
    // Update the remaining entry to have correct date (today in local timezone)
    await conn.execute(
      'UPDATE panelDailyBalances SET date = ? WHERE id = 40',
      ['2026-02-03 18:30:00']
    );
    console.log('Updated date for entry ID 40');
    
    // Verify final state
    const [final] = await conn.execute(
      'SELECT id, DATE(date) as date, openingBalance, totalDeposits, totalWithdrawals, bonusPoints, closingBalance FROM panelDailyBalances WHERE panelId = 35 ORDER BY date DESC'
    );
    
    console.log('\nFinal entries:');
    console.log(final);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await conn.end();
  }
}

cleanUpEntries().catch(console.error);
