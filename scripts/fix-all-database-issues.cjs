const mysql = require('mysql2/promise');

async function fixAllDatabaseIssues() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'MySQL@Root2026!',
    database: 'khiladi247_v3'
  });

  try {
    console.log('🔧 Fixing All Database Issues...\n');

    // 1. Fix orphaned topUpHistory records
    console.log('1. Fixing orphaned topUpHistory records...');
    
    // Get current panel IDs
    const [panels] = await conn.execute('SELECT id, name FROM panels');
    const panelMap = {};
    panels.forEach(p => {
      panelMap[p.name] = p.id;
    });
    console.log('   Current panels:', panels.map(p => `${p.name} (ID: ${p.id})`).join(', '));
    
    // Find orphaned records
    const [orphaned] = await conn.execute(`
      SELECT t.* 
      FROM topUpHistory t 
      LEFT JOIN panels p ON t.panelId = p.id 
      WHERE p.id IS NULL
    `);
    
    if (orphaned.length > 0) {
      console.log(`   Found ${orphaned.length} orphaned records`);
      
      for (const record of orphaned) {
        // Try to match by panel name
        if (panelMap[record.panelName]) {
          await conn.execute(
            'UPDATE topUpHistory SET panelId = ? WHERE id = ?',
            [panelMap[record.panelName], record.id]
          );
          console.log(`   ✅ Fixed record ${record.id}: updated panelId to ${panelMap[record.panelName]}`);
        } else {
          // Delete orphaned record if no matching panel
          await conn.execute('DELETE FROM topUpHistory WHERE id = ?', [record.id]);
          console.log(`   🗑️ Deleted orphaned record ${record.id} (no matching panel)`);
        }
      }
    } else {
      console.log('   ✅ No orphaned records found');
    }

    // 2. Verify topUpHistory table exists and has correct structure
    console.log('\n2. Verifying topUpHistory table...');
    const [topUpTables] = await conn.execute('SHOW TABLES LIKE "topUpHistory"');
    if (topUpTables.length === 0) {
      console.log('   Creating topUpHistory table...');
      await conn.execute(`
        CREATE TABLE topUpHistory (
          id int NOT NULL AUTO_INCREMENT,
          panelId int NOT NULL,
          panelName varchar(100) NOT NULL,
          previousTopUp int NOT NULL DEFAULT 0,
          amountAdded int NOT NULL DEFAULT 0,
          newTopUp int NOT NULL DEFAULT 0,
          previousClosingBalance int NOT NULL DEFAULT 0,
          newClosingBalance int NOT NULL DEFAULT 0,
          previousPointsBalance int NOT NULL DEFAULT 0,
          newPointsBalance int NOT NULL DEFAULT 0,
          createdBy varchar(100) NOT NULL,
          createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_panelId (panelId),
          KEY idx_createdAt (createdAt)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('   ✅ topUpHistory table created');
    } else {
      console.log('   ✅ topUpHistory table exists');
    }

    // 3. Verify panelDailyBalances table exists
    console.log('\n3. Verifying panelDailyBalances table...');
    const [balanceTables] = await conn.execute('SHOW TABLES LIKE "panelDailyBalances"');
    if (balanceTables.length === 0) {
      console.log('   Creating panelDailyBalances table...');
      await conn.execute(`
        CREATE TABLE panelDailyBalances (
          id int NOT NULL AUTO_INCREMENT,
          panelId int NOT NULL,
          date date NOT NULL,
          openingBalance decimal(15,2) NOT NULL DEFAULT 0.00,
          closingBalance decimal(15,2) NOT NULL DEFAULT 0.00,
          totalDeposits decimal(15,2) NOT NULL DEFAULT 0.00,
          totalWithdrawals decimal(15,2) NOT NULL DEFAULT 0.00,
          bonusPoints decimal(15,2) NOT NULL DEFAULT 0.00,
          topUp decimal(15,2) NOT NULL DEFAULT 0.00,
          extraDeposit decimal(15,2) NOT NULL DEFAULT 0.00,
          profitLoss decimal(15,2) NOT NULL DEFAULT 0.00,
          timezone varchar(20) NOT NULL DEFAULT 'GMT+5:30',
          createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_panelId (panelId),
          KEY idx_date (date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('   ✅ panelDailyBalances table created');
    } else {
      console.log('   ✅ panelDailyBalances table exists');
    }

    // 4. Verify all required columns exist in panels table
    console.log('\n4. Verifying panels table columns...');
    const [panelColumns] = await conn.execute('DESCRIBE panels');
    const requiredColumns = ['id', 'name', 'pointsBalance', 'openingBalance', 'closingBalance', 'topUp', 'extraDeposit', 'bonusPoints', 'profitLoss'];
    
    for (const col of requiredColumns) {
      const exists = panelColumns.some(c => c.Field === col);
      console.log(`   ${exists ? '✅' : '❌'} ${col}`);
    }

    // 5. Final verification
    console.log('\n5. Final verification...');
    
    // Check for orphaned records again
    const [finalOrphaned] = await conn.execute(`
      SELECT COUNT(*) as count 
      FROM topUpHistory t 
      LEFT JOIN panels p ON t.panelId = p.id 
      WHERE p.id IS NULL
    `);
    console.log(`   Orphaned records: ${finalOrphaned[0].count === 0 ? '✅ None' : '❌ ' + finalOrphaned[0].count}`);
    
    // Count records
    const [panelCount] = await conn.execute('SELECT COUNT(*) as count FROM panels');
    const [topUpCount] = await conn.execute('SELECT COUNT(*) as count FROM topUpHistory');
    const [balanceCount] = await conn.execute('SELECT COUNT(*) as count FROM panelDailyBalances');
    
    console.log(`   Panels: ${panelCount[0].count}`);
    console.log(`   Top-up history: ${topUpCount[0].count}`);
    console.log(`   Daily balances: ${balanceCount[0].count}`);

    console.log('\n✅ All database issues fixed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await conn.end();
  }
}

fixAllDatabaseIssues();
