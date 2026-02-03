const mysql = require('mysql2/promise');

async function debugPanelData() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'MySQL@Root2026!',
    database: 'khiladi247_v3'
  });
  
  try {
    // Test with different date ranges
    console.log('=== Testing Date Ranges ===');
    
    // Today (Feb 3)
    const today = new Date().toISOString().split('T')[0];
    console.log('Today:', today);
    
    const [todayDeposits] = await conn.execute(
      'SELECT COUNT(*) as count FROM deposits WHERE panelName = ? AND DATE(depositDate) = ?',
      ['Tiger Panel', today]
    );
    console.log('Deposits today:', todayDeposits[0].count);
    
    // Last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    console.log('Yesterday:', yesterdayStr);
    
    const [last24h] = await conn.execute(
      'SELECT COUNT(*) as count FROM deposits WHERE panelName = ? AND depositDate >= ?',
      ['Tiger Panel', yesterday.toISOString()]
    );
    console.log('Deposits last 24h:', last24h[0].count);
    
    // Last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    console.log('Week ago:', weekAgo.toISOString().split('T')[0]);
    
    const [last7d] = await conn.execute(
      'SELECT COUNT(*) as count FROM deposits WHERE panelName = ? AND DATE(depositDate) >= ?',
      ['Tiger Panel', weekAgo.toISOString().split('T')[0]]
    );
    console.log('Deposits last 7 days:', last7d[0].count);
    
    // All deposits
    const [allDeposits] = await conn.execute(
      'SELECT COUNT(*) as count, SUM(amount) as total, SUM(bonusPoints) as bonus FROM deposits WHERE panelName = ?',
      ['Tiger Panel']
    );
    console.log('\\nAll deposits:', allDeposits[0]);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await conn.end();
  }
}

debugPanelData().catch(console.error);
