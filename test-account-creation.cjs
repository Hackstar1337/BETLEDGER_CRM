const mysql = require('mysql2/promise');
require('dotenv').config();

async function testAccountCreation() {
    console.log('🔍 Testing account creation...\n');
    
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
        // Test 1: Check if we can connect
        console.log('✅ Database connected successfully');
        
        // Test 2: Check the bankaccounts table structure
        const [columns] = await connection.execute(`
            DESCRIBE bankaccounts
        `);
        
        console.log('\n📋 Table structure:');
        columns.forEach(col => {
            console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key ? `(${col.Key})` : ''}`);
        });
        
        // Test 3: Check recent accounts
        const [accounts] = await connection.execute(`
            SELECT id, accountHolderName, bankName, accountNumber, accountType, createdAt
            FROM bankaccounts
            ORDER BY createdAt DESC
            LIMIT 5
        `);
        
        console.log('\n📝 Recent accounts:');
        if (accounts.length === 0) {
            console.log('  No accounts found');
        } else {
            accounts.forEach(acc => {
                console.log(`  ID: ${acc.id}`);
                console.log(`  Holder: ${acc.accountHolderName}`);
                console.log(`  Bank: ${acc.bankName}`);
                console.log(`  Account: ${acc.accountNumber}`);
                console.log(`  Type: ${acc.accountType}`);
                console.log(`  Created: ${acc.createdAt}`);
                console.log('  ---');
            });
        }
        
        // Test 4: Try to insert a test account
        console.log('\n🧪 Testing insert...');
        const testAccount = {
            accountHolderName: 'TEST ACCOUNT',
            accountNumber: 'TEST123456',
            bankName: 'TEST BANK',
            accountType: 'Both',
            openingBalance: 1000,
            closingBalance: 1000,
            totalCharges: 0,
            isActive: 1
        };
        
        const [result] = await connection.execute(`
            INSERT INTO bankaccounts 
            (accountHolderName, accountNumber, bankName, accountType, openingBalance, closingBalance, totalCharges, isActive)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            testAccount.accountHolderName,
            testAccount.accountNumber,
            testAccount.bankName,
            testAccount.accountType,
            testAccount.openingBalance,
            testAccount.closingBalance,
            testAccount.totalCharges,
            testAccount.isActive
        ]);
        
        console.log(`✅ Insert successful! New ID: ${result.insertId}`);
        
        // Clean up - delete the test account
        await connection.execute(`
            DELETE FROM bankaccounts WHERE id = ?
        `, [result.insertId]);
        console.log('🧹 Test account cleaned up');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

testAccountCreation().catch(console.error);
