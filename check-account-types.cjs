const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAccountTypes() {
    console.log('🔍 Checking bank account types...\n');
    
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
        const [accounts] = await connection.execute(`
            SELECT id, accountHolderName, bankName, accountNumber, accountType
            FROM bankaccounts
            ORDER BY id DESC
            LIMIT 10
        `);
        
        console.log('📋 Recent bank accounts:');
        accounts.forEach(acc => {
            console.log(`  ID: ${acc.id}`);
            console.log(`  Holder: ${acc.accountHolderName}`);
            console.log(`  Bank: ${acc.bankName}`);
            console.log(`  Account: ${acc.accountNumber}`);
            console.log(`  Type: ${acc.accountType}`);
            console.log('  ---');
        });
        
        // Check specifically for accounts with "Both" type
        const [bothAccounts] = await connection.execute(`
            SELECT COUNT(*) as count
            FROM bankaccounts
            WHERE accountType = 'Both'
        `);
        
        console.log(`\n📊 Accounts with type 'Both': ${bothAccounts[0].count}`);
        
    } finally {
        await connection.end();
    }
}

checkAccountTypes().catch(console.error);
