const mysql = require('mysql2/promise');

async function backfillTopUpHistory() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'MySQL@Root2026!',
    database: 'khiladi247_v3'
  });

  try {
    console.log('Creating top-up history from panel changes...');
    
    // Get the current panel state
    const [panels] = await conn.execute('SELECT * FROM panels WHERE topUp > 0');
    
    for (const panel of panels) {
      // Check if we already have a record for this panel
      const [existing] = await conn.execute(
        'SELECT * FROM topUpHistory WHERE panelId = ? ORDER BY createdAt DESC LIMIT 1',
        [panel.id]
      );
      
      // If no existing record or the last recorded topUp is different, create a new record
      if (existing.length === 0 || existing[0].newTopUp !== panel.topUp) {
        console.log(`Recording top-up for ${panel.name}: ${panel.topUp}`);
        
        await conn.execute(`
          INSERT INTO topUpHistory (
            panelId, panelName, previousTopUp, amountAdded, newTopUp,
            previousClosingBalance, newClosingBalance,
            previousPointsBalance, newPointsBalance,
            createdBy, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
          panel.id,
          panel.name,
          existing.length > 0 ? existing[0].newTopUp : 0,
          existing.length > 0 ? panel.topUp - existing[0].newTopUp : panel.topUp,
          panel.topUp,
          panel.closingBalance,
          panel.closingBalance,
          panel.pointsBalance,
          panel.pointsBalance,
          'System (Backfill)'
        ]);
      }
    }
    
    console.log('Top-up history backfill completed!');
    
    // Show the records
    const [history] = await conn.execute('SELECT * FROM topUpHistory ORDER BY createdAt DESC');
    console.log('\nTop-Up History:');
    console.log(history);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await conn.end();
  }
}

backfillTopUpHistory();
