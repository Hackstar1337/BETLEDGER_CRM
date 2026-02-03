const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'MySQL@Root2026!',
  database: 'khiladi247_v3'
};

async function testPanelCreation() {
  console.log('🔍 Testing panel creation in database...\n');
  
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // Check existing panels
    const [existingPanels] = await connection.execute('SELECT * FROM panels');
    console.log('📋 Existing panels:', existingPanels.length);
    existingPanels.forEach(p => console.log(`  - ${p.name} (ID: ${p.id})`));
    
    // Try to create a test panel
    const testPanelName = 'TEST_PANEL_' + Date.now();
    console.log(`\n🧪 Creating test panel: ${testPanelName}`);
    
    const [result] = await connection.execute(
      `INSERT INTO panels (name, pointsBalance, openingBalance, closingBalance, settling, extraDeposit, bonusPoints, profitLoss) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [testPanelName, 50000, 50000, 0, 0, 0, 0, 0]
    );
    
    console.log('✅ Panel created successfully!');
    console.log('Insert ID:', result.insertId);
    
    // Verify the panel was created
    const [newPanel] = await connection.execute('SELECT * FROM panels WHERE name = ?', [testPanelName]);
    console.log('\n📋 New panel details:', newPanel[0]);
    
    // Clean up - delete the test panel
    await connection.execute('DELETE FROM panels WHERE name = ?', [testPanelName]);
    console.log('\n🧹 Test panel deleted');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('SQL State:', error.sqlState);
    console.error('Error Code:', error.code);
  } finally {
    await connection.end();
  }
}

testPanelCreation();
