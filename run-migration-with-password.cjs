const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
    console.log('🔄 Starting migration for bank account validation...\n');
    
    // Get DATABASE_URL and properly decode it
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('❌ DATABASE_URL not found');
        process.exit(1);
    }
    
    // Parse the URL with proper decoding
    try {
        // The password contains special characters, so we need to be careful
        const url = new URL(dbUrl);
        const user = decodeURIComponent(url.username);
        const password = decodeURIComponent(url.password);
        const host = url.hostname;
        const port = url.port || 3306;
        const database = url.pathname.substring(1);
        
        console.log(`📊 Database: ${database}`);
        console.log(`🌐 Host: ${host}:${port}`);
        console.log(`👤 User: ${user}\n`);
        
        let connection;
        try {
            // Create connection with explicit settings
            connection = await mysql.createConnection({
                host,
                user,
                password,
                database,
                port: parseInt(port),
                ssl: false,
                multipleStatements: true,
                charset: 'utf8mb4'
            });
            
            console.log('✅ Connected to database successfully\n');
            
            // Check if table exists
            const [tables] = await connection.execute(`
                SELECT TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bankaccounts'
            `, [database]);
            
            if (tables.length === 0) {
                console.log('❌ bankaccounts table not found');
                process.exit(1);
            }
            
            // Check existing constraints
            console.log('🔍 Checking existing constraints...');
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
                console.log('✅ Unique constraint already exists');
            } else {
                console.log('⚠️  Applying unique constraint...\n');
                
                // Handle duplicates first
                console.log('🔧 Checking for duplicates...');
                const [duplicates] = await connection.execute(`
                    SELECT accountHolderName, COUNT(*) as count
                    FROM bankaccounts
                    GROUP BY accountHolderName
                    HAVING COUNT(*) > 1
                `);
                
                if (duplicates.length > 0) {
                    console.log(`Found ${duplicates.length} duplicate account holder names`);
                    console.log('Making them unique...');
                    
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
                    
                    console.log(`✅ Updated ${updateResult.affectedRows} duplicates\n`);
                } else {
                    console.log('✅ No duplicates found\n');
                }
                
                // Add the constraint
                console.log('🔐 Adding unique constraint...');
                await connection.execute(`
                    ALTER TABLE bankaccounts 
                    ADD UNIQUE KEY uq_account_holder_name (accountHolderName)
                `);
                
                console.log('✅ Unique constraint added successfully!\n');
            }
            
            // Final verification
            console.log('🔍 Final verification...');
            const [indexes] = await connection.execute(`
                SELECT Key_name, Column_name 
                FROM INFORMATION_SCHEMA.STATISTICS 
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bankaccounts' 
                AND Non_unique = 0 AND Index_name != 'PRIMARY'
            `, [database]);
            
            console.log('\n📋 Unique indexes on bankaccounts:');
            indexes.forEach(idx => {
                console.log(`  - ${idx.Key_name}: ${idx.Column_name}`);
            });
            
            console.log('\n🎉 Migration completed successfully!');
            console.log('✅ Bank accounts now enforce unique account holder names');
            
        } catch (error) {
            console.error('\n❌ Error:', error.message);
            
            if (error.code === 'ER_DUP_ENTRY') {
                console.log('\n⚠️  Duplicate entries still exist');
                console.log('💡 Please manually resolve in database');
            }
            
            throw error;
        } finally {
            if (connection) {
                await connection.end();
            }
        }
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();
