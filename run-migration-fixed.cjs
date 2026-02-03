const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function runMigration() {
    console.log('🔄 Starting migration for bank account validation...\n');
    
    // Parse DATABASE_URL more carefully
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('❌ DATABASE_URL not found in environment variables');
        process.exit(1);
    }
    
    // Extract connection details - handle special characters in password
    const urlMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):?(\d+)?\/(.+)/);
    if (!urlMatch) {
        console.error('❌ Invalid DATABASE_URL format');
        process.exit(1);
    }
    
    const [, user, password, host, port, database] = urlMatch;
    
    console.log(`📊 Connecting to database: ${database}`);
    console.log(`🌐 Host: ${host}, Port: ${port || 3306}\n`);
    
    let connection;
    try {
        // Create connection
        connection = await mysql.createConnection({
            host,
            user,
            password,
            database,
            port: port || 3306,
            multipleStatements: true
        });
        
        console.log('✅ Connected to database successfully');
        
        // Step 1: Check if constraint already exists
        console.log('\n🔍 Checking existing constraints...');
        const [constraints] = await connection.execute(`
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bankaccounts' 
            AND CONSTRAINT_TYPE = 'UNIQUE'
        `, [database]);
        
        const hasUniqueConstraint = constraints.some(c => 
            c.CONSTRAINT_NAME === 'uq_account_holder_name' || 
            c.CONSTRAINT_NAME === 'accountHolderName'
        );
        
        if (hasUniqueConstraint) {
            console.log('✅ Unique constraint already exists on accountHolderName');
        } else {
            console.log('⚠️  No unique constraint found, applying migration...');
            
            // Step 2: Handle existing duplicates
            console.log('\n🔧 Handling existing duplicates...');
            const [updateResult] = await connection.execute(`
                UPDATE bankaccounts 
                SET accountHolderName = CONCAT(accountHolderName, '_', id)
                WHERE id IN (
                    SELECT a.id FROM (
                        SELECT id, accountHolderName,
                               ROW_NUMBER() OVER (PARTITION BY accountHolderName ORDER BY id) as rn
                        FROM bankaccounts
                    ) a 
                    WHERE a.rn > 1
                )
            `);
            
            if (updateResult.affectedRows > 0) {
                console.log(`✅ Updated ${updateResult.affectedRows} duplicate entries`);
            } else {
                console.log('✅ No duplicates found');
            }
            
            // Step 3: Add unique constraint
            console.log('\n🔐 Adding unique constraint...');
            await connection.execute(`
                ALTER TABLE bankaccounts 
                ADD UNIQUE KEY uq_account_holder_name (accountHolderName)
            `);
            
            console.log('✅ Unique constraint added successfully');
        }
        
        // Step 4: Verify
        console.log('\n🔍 Verifying migration...');
        const [indexes] = await connection.execute('SHOW INDEX FROM bankaccounts');
        const uniqueIndexes = indexes.filter(i => i.Key_name !== 'PRIMARY' && i.Non_unique === 0);
        
        console.log('\n📋 Current unique indexes:');
        uniqueIndexes.forEach(idx => {
            console.log(`  - ${idx.Key_name}: ${idx.Column_name}`);
        });
        
        console.log('\n✅ Migration completed successfully!');
        console.log('🎉 Bank accounts now have unique constraint on accountHolderName');
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        
        if (error.code === 'ER_DUP_ENTRY') {
            console.log('\n💡 There are still duplicate account holder names.');
            console.log('💡 Please manually resolve duplicates in the database.');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('\n💡 Check your database credentials in .env file');
        }
        
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Database connection closed');
        }
    }
}

runMigration();
