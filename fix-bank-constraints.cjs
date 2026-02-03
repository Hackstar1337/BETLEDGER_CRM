const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
    console.log('🔄 Fixing bank account constraints...\n');
    
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
        // Step 1: Check existing constraints
        console.log('🔍 Checking existing constraints...');
        const [constraints] = await connection.execute(`
            SELECT CONSTRAINT_NAME, COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bankaccounts'
            AND CONSTRAINT_NAME != 'PRIMARY'
        `, [database]);
        
        console.log('Current constraints:', constraints);
        
        // Step 2: Remove unique constraint on accountHolderName if exists
        const holderConstraint = constraints.find(c => c.COLUMN_NAME === 'accountHolderName');
        if (holderConstraint) {
            console.log(`\n🔧 Removing unique constraint on accountHolderName (${holderConstraint.CONSTRAINT_NAME})...`);
            try {
                await connection.execute(`ALTER TABLE bankaccounts DROP INDEX ${holderConstraint.CONSTRAINT_NAME}`);
                console.log('✅ Removed unique constraint on accountHolderName');
            } catch (e) {
                console.log('⚠️  Could not remove constraint:', e.message);
            }
        }
        
        // Step 3: Check if accountNumber already has unique constraint
        const numberConstraint = constraints.find(c => c.COLUMN_NAME === 'accountNumber');
        if (numberConstraint) {
            console.log('\n✅ Unique constraint already exists on accountNumber');
        } else {
            console.log('\n🔐 Adding unique constraint on accountNumber...');
            try {
                await connection.execute(`
                    ALTER TABLE bankaccounts 
                    ADD UNIQUE KEY uq_account_number (accountNumber)
                `);
                console.log('✅ Added unique constraint on accountNumber');
            } catch (e) {
                if (e.code === 'ER_DUP_ENTRY') {
                    console.log('❌ Cannot add constraint - duplicate account numbers exist');
                    console.log('Please fix duplicate account numbers first');
                } else {
                    console.log('❌ Error:', e.message);
                }
            }
        }
        
        // Step 4: Verify final state
        console.log('\n🔍 Verifying final constraints...');
        const [finalConstraints] = await connection.execute(`
            SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE
            FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bankaccounts'
            AND INDEX_NAME != 'PRIMARY'
        `, [database]);
        
        console.log('\n📋 Final indexes:');
        finalConstraints.forEach(c => {
            const type = c.NON_UNIQUE === 0 ? 'UNIQUE' : 'INDEX';
            console.log(`  - ${c.INDEX_NAME}: ${c.COLUMN_NAME} (${type})`);
        });
        
        console.log('\n🎉 Migration completed!');
        console.log('\n📝 Summary:');
        console.log('  - accountHolderName: CAN be duplicated');
        console.log('  - accountNumber: MUST be unique');
        console.log('  - bankName: CAN be duplicated');
        
    } finally {
        await connection.end();
    }
}

runMigration().catch(console.error);
