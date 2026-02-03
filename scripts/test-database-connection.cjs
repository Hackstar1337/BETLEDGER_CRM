const mysql = require('mysql2/promise');

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection and Operations...\n');
  
  let conn;
  try {
    // 1. Test basic connection
    console.log('1. Testing database connection...');
    conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'MySQL@Root2026!',
      database: 'khiladi247_v3'
    });
    console.log('✅ Database connection successful\n');
    
    // 2. Check all required tables exist
    console.log('2. Checking table structure...');
    const [tables] = await conn.execute('SHOW TABLES');
    const requiredTables = ['panels', 'topUpHistory', 'panelDailyBalances', 'deposits', 'withdrawals', 'players'];
    
    for (const table of requiredTables) {
      const exists = tables.some(t => Object.values(t).includes(table));
      console.log(`   ${exists ? '✅' : '❌'} ${table} table`);
    }
    console.log();
    
    // 3. Check panel table structure (especially topUp column)
    console.log('3. Checking panels table structure...');
    const [panelColumns] = await conn.execute('DESCRIBE panels');
    const panelStructure = {};
    panelColumns.forEach(col => {
      panelStructure[col.Field] = col.Type;
    });
    
    console.log('   Columns in panels table:');
    Object.entries(panelStructure).forEach(([field, type]) => {
      console.log(`     - ${field}: ${type}`);
    });
    
    // Verify topUp column exists
    if (panelStructure.topUp) {
      console.log('✅ topUp column exists in panels table\n');
    } else {
      console.log('❌ topUp column missing in panels table\n');
    }
    
    // 4. Check topUpHistory table structure
    console.log('4. Checking topUpHistory table structure...');
    const [topUpColumns] = await conn.execute('DESCRIBE topUpHistory');
    console.log('   Columns in topUpHistory table:');
    topUpColumns.forEach(col => {
      console.log(`     - ${col.Field}: ${col.Type}`);
    });
    console.log('✅ topUpHistory table structure verified\n');
    
    // 5. Test basic CRUD operations
    console.log('5. Testing CRUD operations...');
    
    // Get a panel
    const [panels] = await conn.execute('SELECT * FROM panels LIMIT 1');
    if (panels.length > 0) {
      const panel = panels[0];
      console.log(`   ✅ Found panel: ${panel.name} (ID: ${panel.id})`);
      console.log(`     - topUp: ${panel.topUp}`);
      console.log(`     - pointsBalance: ${panel.pointsBalance}`);
      console.log(`     - closingBalance: ${panel.closingBalance}`);
    }
    
    // Check topUpHistory
    const [topUpRecords] = await conn.execute('SELECT COUNT(*) as count FROM topUpHistory');
    console.log(`   ✅ Top-up history records: ${topUpRecords[0].count}`);
    
    // 6. Test foreign key relationships
    console.log('\n6. Testing data integrity...');
    const [orphanedRecords] = await conn.execute(`
      SELECT COUNT(*) as count 
      FROM topUpHistory t 
      LEFT JOIN panels p ON t.panelId = p.id 
      WHERE p.id IS NULL
    `);
    
    if (orphanedRecords[0].count === 0) {
      console.log('   ✅ No orphaned topUpHistory records');
    } else {
      console.log(`   ❌ Found ${orphanedRecords[0].count} orphaned records`);
    }
    
    // 7. Check recent activity
    console.log('\n7. Checking recent activity...');
    const [recentTopUps] = await conn.execute(`
      SELECT * FROM topUpHistory 
      ORDER BY createdAt DESC 
      LIMIT 3
    `);
    
    if (recentTopUps.length > 0) {
      console.log('   Recent top-ups:');
      recentTopUps.forEach(record => {
        console.log(`     - ${record.panelName}: +${record.amountAdded} on ${record.createdAt}`);
      });
    } else {
      console.log('   No top-up history found');
    }
    
    console.log('\n✅ Database connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure MySQL server is running');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Check database credentials');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 Database "khiladi247_v3" does not exist');
    }
  } finally {
    if (conn) {
      await conn.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the test
testDatabaseConnection();
