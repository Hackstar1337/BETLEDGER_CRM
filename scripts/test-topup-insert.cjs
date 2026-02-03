const mysql = require('mysql2/promise');

async function testTopUpInsert() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'MySQL@Root2026!',
    database: 'khiladi247_v3'
  });
  
  try {
    console.log('Testing top-up history insert...\n');
    
    // Get current panel state
    const [panels] = await conn.execute('SELECT * FROM panels LIMIT 1');
    if (!panels[0]) {
      console.log('No panels found in database');
      return;
    }
    
    const panel = panels[0];
    console.log('Using panel:', panel.id, panel.name);
    
    console.log('Current panel state:');
    console.log(`  - Name: ${panel.name}`);
    console.log(`  - TopUp: ${panel.topUp}`);
    console.log(`  - Points Balance: ${panel.pointsBalance}`);
    console.log(`  - Closing Balance: ${panel.closingBalance}\n`);
    
    // Test insert with explicit values (no 'default' for id)
    const result = await conn.execute(`
      INSERT INTO topUpHistory (
        panelId, panelName, previousTopUp, amountAdded, newTopUp,
        previousClosingBalance, newClosingBalance,
        previousPointsBalance, newPointsBalance,
        createdBy, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      panel.id,
      panel.name,
      panel.topUp,
      1000,
      panel.topUp + 1000,
      panel.closingBalance,
      panel.closingBalance,
      panel.pointsBalance,
      panel.pointsBalance,
      'Test User',
      new Date()
    ]);
    
    console.log('✅ Insert successful! Insert ID:', result[0].insertId);
    
    // Verify the record
    const [records] = await conn.execute('SELECT * FROM topUpHistory ORDER BY id DESC LIMIT 1');
    console.log('\nLatest record:');
    console.log(`  - ID: ${records[0].id}`);
    console.log(`  - Panel: ${records[0].panelName}`);
    console.log(`  - Amount Added: ${records[0].amountAdded}`);
    console.log(`  - Created By: ${records[0].createdBy}`);
    console.log(`  - Created At: ${records[0].createdAt}`);
    
    // Clean up test record
    await conn.execute('DELETE FROM topUpHistory WHERE id = ?', [result[0].insertId]);
    console.log('\n🧹 Test record cleaned up');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await conn.end();
  }
}

testTopUpInsert();
