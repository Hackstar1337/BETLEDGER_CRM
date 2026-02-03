const mysql = require('mysql2/promise');
require('dotenv').config();

// Parse DATABASE_URL if available
function parseDatabaseUrl(url) {
  if (!url) return null;
  
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) return null;
  
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5]
  };
}

async function checkDatabaseConstraints() {
  const dbUrl = process.env.DATABASE_URL;
  const dbConfig = parseDatabaseUrl(dbUrl);
  
  const connection = await mysql.createConnection({
    host: dbConfig?.host || process.env.DB_HOST || 'localhost',
    user: dbConfig?.user || process.env.DB_USER || 'root',
    password: dbConfig?.password || process.env.DB_PASSWORD || '',
    database: dbConfig?.database || process.env.DB_NAME || 'casino_panel',
    port: dbConfig?.port || 3306,
    multipleStatements: true
  });

  try {
    console.log('Checking bankaccounts table constraints...\n');
    
    // Check table structure
    console.log('1. Table structure:');
    const [structure] = await connection.execute('DESCRIBE bankaccounts');
    console.table(structure);
    
    // Check indexes
    console.log('\n2. Indexes and constraints:');
    const [indexes] = await connection.execute('SHOW INDEX FROM bankaccounts');
    console.table(indexes);
    
    // Check unique constraints specifically
    console.log('\n3. Unique constraints:');
    const [constraints] = await connection.execute(`
      SELECT CONSTRAINT_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_NAME = 'bankaccounts' 
      AND CONSTRAINT_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME != 'PRIMARY'
    `);
    console.table(constraints);
    
    // Test with sample data
    console.log('\n4. Testing duplicate bank names with different holders:');
    
    // Clean up any existing test data
    await connection.execute(`DELETE FROM bankaccounts WHERE accountHolderName LIKE 'Test_%'`);
    
    // Create first account
    await connection.execute(`
      INSERT INTO bankaccounts (accountHolderName, accountNumber, bankName, accountType, openingBalance, closingBalance)
      VALUES ('Test_User_1', 'TEST001', 'Same Bank Name', 'Deposit', 1000, 1000)
    `);
    console.log('✅ Created account 1: Test_User_1 with bank "Same Bank Name"');
    
    // Create second account with same bank but different holder
    try {
      await connection.execute(`
        INSERT INTO bankaccounts (accountHolderName, accountNumber, bankName, accountType, openingBalance, closingBalance)
        VALUES ('Test_User_2', 'TEST002', 'Same Bank Name', 'Deposit', 2000, 2000)
      `);
      console.log('✅ Created account 2: Test_User_2 with bank "Same Bank Name" (same bank, different holder)');
    } catch (error) {
      console.log('❌ Failed to create account with same bank name:', error.message);
    }
    
    // Try to create duplicate holder
    try {
      await connection.execute(`
        INSERT INTO bankaccounts (accountHolderName, accountNumber, bankName, accountType, openingBalance, closingBalance)
        VALUES ('Test_User_1', 'TEST003', 'Different Bank', 'Deposit', 3000, 3000)
      `);
      console.log('❌ ERROR: Should not allow duplicate account holder name!');
    } catch (error) {
      console.log('✅ Correctly prevented duplicate account holder name:', error.message);
    }
    
    // Clean up
    await connection.execute(`DELETE FROM bankaccounts WHERE accountHolderName LIKE 'Test_%'`);
    console.log('\n✅ Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkDatabaseConstraints();
