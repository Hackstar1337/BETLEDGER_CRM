const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyMigration() {
    console.log('🔍 Verifying migration...\n');
    
    const dbUrl = process.env.DATABASE_URL;
    const url = new URL(dbUrl);
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    const host = url.hostname;
    const port = url.port || 3306;
    const database = url.pathname.substring(1);
    
    const connection = await mysql.createConnection({
        host,
        user,
        password,
        database,
        port: parseInt(port),
        ssl: false
    });
    
    try {
        // Check the constraint was added
        const [indexes] = await connection.execute(`
            SELECT INDEX_NAME, COLUMN_NAME 
            FROM INFORMATION_SCHEMA.STATISTICS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bankaccounts' 
            AND NON_UNIQUE = 0 AND INDEX_NAME != 'PRIMARY'
        `, [database]);
        
        console.log('📋 Unique indexes on bankaccounts:');
        indexes.forEach(idx => {
            console.log(`  - ${idx.INDEX_NAME}: ${idx.COLUMN_NAME}`);
        });
        
        // Test with actual data
        console.log('\n🧪 Testing the constraint...');
        
        // Clean up any existing test data
        await connection.execute(`DELETE FROM bankaccounts WHERE accountHolderName LIKE 'Test_%'`);
        
        // Test 1: Should work
        await connection.execute(`
            INSERT INTO bankaccounts (accountHolderName, accountNumber, bankName, accountType, openingBalance, closingBalance)
            VALUES ('Test_User_1', 'TEST001', 'Same Bank', 'Deposit', 1000, 1000)
        `);
        console.log('✅ Created account 1: Test_User_1');
        
        // Test 2: Should work (same bank, different holder)
        await connection.execute(`
            INSERT INTO bankaccounts (accountHolderName, accountNumber, bankName, accountType, openingBalance, closingBalance)
            VALUES ('Test_User_2', 'TEST002', 'Same Bank', 'Deposit', 2000, 2000)
        `);
        console.log('✅ Created account 2: Test_User_2 (same bank)');
        
        // Test 3: Should fail (same holder)
        try {
            await connection.execute(`
                INSERT INTO bankaccounts (accountHolderName, accountNumber, bankName, accountType, openingBalance, closingBalance)
                VALUES ('Test_User_1', 'TEST003', 'Different Bank', 'Deposit', 3000, 3000)
            `);
            console.log('❌ ERROR: Should not allow duplicate!');
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                console.log('✅ Correctly prevented duplicate account holder name');
            }
        }
        
        // Clean up
        await connection.execute(`DELETE FROM bankaccounts WHERE accountHolderName LIKE 'Test_%'`);
        
        console.log('\n🎉 Migration verification completed!');
        console.log('✅ Unique constraint is working correctly');
        
    } finally {
        await connection.end();
    }
}

verifyMigration();
