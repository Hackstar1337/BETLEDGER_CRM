const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function runMigration() {
    console.log('🔄 Starting migration for bank account validation...\n');
    
    // Get DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('❌ DATABASE_URL not found in environment variables');
        process.exit(1);
    }
    
    // Use URL class to properly parse
    try {
        const url = new URL(dbUrl);
        const user = url.username;
        const password = url.password;
        const host = url.hostname;
        const port = url.port || 3306;
        const database = url.pathname.substring(1); // Remove leading /
        
        console.log(`📊 Connecting to database: ${database}`);
        console.log(`🌐 Host: ${host}, Port: ${port}\n`);
        
        let connection;
        try {
            // Create connection
            connection = await mysql.createConnection({
                host,
                user,
                password,
                database,
                port: parseInt(port),
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
            const [indexes] = await connection.execute('SHOW INDEX FROM bankaccounts WHERE Non_unique = 0 AND Key_name != "PRIMARY"');
            
            console.log('\n📋 Current unique indexes:');
            indexes.forEach(idx => {
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
            } else if (error.code === 'ER_NO_SUCH_TABLE') {
                console.log('\n💡 The bankaccounts table does not exist. Please run the initial setup first.');
            }
            
            process.exit(1);
        } finally {
            if (connection) {
                await connection.end();
                console.log('\n🔌 Database connection closed');
            }
        }
    } catch (parseError) {
        console.error('❌ Failed to parse DATABASE_URL:', parseError.message);
        console.log('\n💡 Please check your .env file format');
        process.exit(1);
    }
}

runMigration();
