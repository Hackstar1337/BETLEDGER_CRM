const mysql = require('mysql2/promise');
require('dotenv').config();

async function addBothAccountType() {
    console.log('🔄 Adding "Both" account type option...\n');
    
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
        ssl: false,
        multipleStatements: true
    });
    
    try {
        // Step 1: Check current enum values
        console.log('🔍 Checking current accountType enum values...');
        const [enumValues] = await connection.execute(`
            SELECT COLUMN_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bankaccounts' AND COLUMN_NAME = 'accountType'
        `, [database]);
        
        console.log('Current enum:', enumValues[0]?.COLUMN_TYPE);
        
        // Step 2: Modify the enum to add "Both" option
        console.log('\n🔧 Adding "Both" option to accountType enum...');
        try {
            await connection.execute(`
                ALTER TABLE bankaccounts 
                MODIFY COLUMN accountType ENUM('Deposit', 'Withdrawal', 'Both') NOT NULL DEFAULT 'Both'
            `);
            console.log('✅ Added "Both" option to accountType');
        } catch (e) {
            if (e.code === 'ER_WRONG_SPEC_NAME') {
                console.log('⚠️  Enum already contains "Both" or needs different approach');
            } else {
                throw e;
            }
        }
        
        // Step 3: Update existing accounts to "Both" if they're not already
        console.log('\n🔄 Updating existing accounts to "Both" type...');
        const [updateResult] = await connection.execute(`
            UPDATE bankaccounts 
            SET accountType = 'Both' 
            WHERE accountType != 'Both'
        `);
        
        if (updateResult.affectedRows > 0) {
            console.log(`✅ Updated ${updateResult.affectedRows} accounts to "Both" type`);
        } else {
            console.log('✅ All accounts already have "Both" type');
        }
        
        // Step 4: Verify the changes
        console.log('\n🔍 Verifying changes...');
        const [accounts] = await connection.execute(`
            SELECT accountHolderName, accountNumber, bankName, accountType
            FROM bankaccounts
            ORDER BY id DESC
            LIMIT 10
        `);
        
        console.log('\n📋 Recent bank accounts:');
        accounts.forEach(acc => {
            console.log(`  - ${acc.accountHolderName} | ${acc.bankName} | ${acc.accountNumber} | Type: ${acc.accountType}`);
        });
        
        console.log('\n🎉 Migration completed successfully!');
        console.log('\n📝 Summary:');
        console.log('  - Added "Both" account type option');
        console.log('  - Updated all existing accounts to "Both" type');
        console.log('  - Single bank account can now handle both deposits and withdrawals');
        
    } finally {
        await connection.end();
    }
}

addBothAccountType().catch(console.error);
