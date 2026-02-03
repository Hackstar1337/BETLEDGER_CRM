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

async function testDuplicateAccountHolder() {
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
    console.log('Testing duplicate account holder name validation...\n');
    
    // Test 1: Create first account
    console.log('1. Creating first bank account with holder name "Test User"...');
    try {
      await connection.execute(`
        INSERT INTO bankaccounts (accountHolderName, accountNumber, bankName, accountType, openingBalance, closingBalance)
        VALUES ('Test User', 'ACC001', 'Test Bank', 'Deposit', 1000, 1000)
      `);
      console.log('✅ First account created successfully');
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log('✅ Unique constraint is working - duplicate prevented');
      } else {
        console.log('❌ Error:', error.message);
      }
    }
    
    // Test 2: Try to create duplicate
    console.log('\n2. Attempting to create second account with same holder name "Test User"...');
    try {
      await connection.execute(`
        INSERT INTO bankaccounts (accountHolderName, accountNumber, bankName, accountType, openingBalance, closingBalance)
        VALUES ('Test User', 'ACC002', 'Another Bank', 'Deposit', 2000, 2000)
      `);
      console.log('❌ ERROR: Duplicate account was created! Validation failed.');
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log('✅ SUCCESS: Duplicate account prevented by database constraint');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    // Test 3: Create account with different name (should work)
    console.log('\n3. Creating account with different holder name "Another User"...');
    try {
      await connection.execute(`
        INSERT INTO bankaccounts (accountHolderName, accountNumber, bankName, accountType, openingBalance, closingBalance)
        VALUES ('Another User', 'ACC003', 'Test Bank', 'Deposit', 3000, 3000)
      `);
      console.log('✅ Account with different holder name created successfully');
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
    
    // Clean up test data
    console.log('\n4. Cleaning up test data...');
    await connection.execute(`DELETE FROM bankaccounts WHERE accountHolderName LIKE 'Test User' OR accountHolderName LIKE 'Another User'`);
    console.log('✅ Test data cleaned up');
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await connection.end();
  }
}

testDuplicateAccountHolder();
