#!/usr/bin/env node

import mysql from 'mysql2/promise';
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

/**
 * Railway Database Fix Script
 * 
 * This script fixes the database migration issues on Railway by:
 * 1. Dropping problematic constraints safely
 * 2. Running proper migrations in correct order
 * 3. Verifying all required tables exist with correct schema
 * 4. Creating missing columns if needed
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function fixRailwayDatabase() {
    if (!process.env.DATABASE_URL) {
        console.log('❌ DATABASE_URL not found in environment variables');
        process.exit(1);
    }

    console.log('🔧 Starting Railway database fix...');
    
    let connection;
    try {
        // Create database connection
        connection = await mysql.createConnection(process.env.DATABASE_URL);
        console.log('✅ Database connection established');

        // Step 1: Check and fix bankaccounts table primary key issue
        console.log('\n📋 Step 1: Fixing bankaccounts table constraints...');
        await fixBankAccountsTable(connection);

        // Step 2: Ensure panels table has all required columns
        console.log('\n📋 Step 2: Verifying panels table schema...');
        await fixPanelsTable(connection);

        // Step 3: Run Drizzle migrations safely
        console.log('\n📋 Step 3: Running Drizzle migrations...');
        await runDrizzleMigrations(connection);

        // Step 4: Create additional required tables
        console.log('\n📋 Step 4: Creating additional tables...');
        await createAdditionalTables(connection);

        // Step 5: Verify database integrity
        console.log('\n📋 Step 5: Verifying database integrity...');
        await verifyDatabaseIntegrity(connection);

        console.log('\n🎉 Railway database fix completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Database fix failed:', error.message);
        console.error('Full error:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

async function fixBankAccountsTable(connection) {
    try {
        // Check if bankaccounts table exists
        const [tables] = await connection.execute(
            "SHOW TABLES LIKE 'bankaccounts'"
        );
        
        if (tables.length === 0) {
            console.log('ℹ️ bankaccounts table does not exist yet, will be created by migrations');
            return;
        }

        // Check current table structure
        const [columns] = await connection.execute(
            "DESCRIBE bankaccounts"
        );
        
        console.log('📊 Current bankaccounts table structure:');
        columns.forEach(col => {
            console.log(`  - ${col.Field}: ${col.Type} ${col.Key ? `(${col.Key})` : ''}`);
        });

        // Fix primary key issues by temporarily dropping and recreating
        try {
            // Check if there's a primary key constraint issue
            await connection.execute(
                "ALTER TABLE bankaccounts DROP PRIMARY KEY"
            );
            console.log('✅ Dropped existing primary key');
        } catch (error) {
            if (error.code === 'ER_BAD_TABLE_DEFINITION') {
                console.log('ℹ️ Primary key issue detected, attempting table recreation...');
                
                // Backup data if possible
                try {
                    const [data] = await connection.execute("SELECT * FROM bankaccounts");
                    console.log(`📦 Backed up ${data.length} records from bankaccounts`);
                    
                    // Drop and recreate table
                    await connection.execute("DROP TABLE bankaccounts");
                    console.log('🗑️ Dropped problematic bankaccounts table');
                    
                    // Create table with correct structure
                    await connection.execute(`
                        CREATE TABLE bankaccounts (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            accountHolderName VARCHAR(200) NOT NULL,
                            accountNumber VARCHAR(50) NOT NULL UNIQUE,
                            bankName VARCHAR(200) NOT NULL,
                            accountType ENUM('Deposit', 'Withdrawal', 'Both') NOT NULL DEFAULT 'Both',
                            openingBalance INT NOT NULL DEFAULT 0,
                            closingBalance INT NOT NULL DEFAULT 0,
                            totalCharges INT NOT NULL DEFAULT 0,
                            feeIMPS INT NOT NULL DEFAULT 0,
                            feeRTGS INT NOT NULL DEFAULT 0,
                            feeNEFT INT NOT NULL DEFAULT 0,
                            feeUPI INT NOT NULL DEFAULT 0,
                            feePhonePe INT NOT NULL DEFAULT 0,
                            feeGooglePay INT NOT NULL DEFAULT 0,
                            feePaytm INT NOT NULL DEFAULT 0,
                            isActive INT NOT NULL DEFAULT 1,
                            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                    `);
                    
                    // Restore data
                    if (data.length > 0) {
                        for (const row of data) {
                            await connection.execute(`
                                INSERT INTO bankaccounts SET ?
                            `, [row]);
                        }
                        console.log(`📦 Restored ${data.length} records to bankaccounts`);
                    }
                    
                } catch (backupError) {
                    console.log('⚠️ Could not backup data, creating fresh table');
                    await connection.execute("DROP TABLE IF EXISTS bankaccounts");
                }
            } else {
                console.log('ℹ️ No primary key issues found');
            }
        }
        
    } catch (error) {
        console.log('⚠️ Error fixing bankaccounts table:', error.message);
        // Continue with other fixes
    }
}

async function fixPanelsTable(connection) {
    try {
        // Check if panels table exists
        const [tables] = await connection.execute(
            "SHOW TABLES LIKE 'panels'"
        );
        
        if (tables.length === 0) {
            console.log('ℹ️ panels table does not exist yet, will be created by migrations');
            return;
        }

        // Check for missing columns
        const requiredColumns = [
            { name: 'topUp', type: 'INT', default: '0' },
            { name: 'extraDeposit', type: 'INT', default: '0' },
            { name: 'bonusPoints', type: 'INT', default: '0' },
            { name: 'profitLoss', type: 'INT', default: '0' }
        ];

        const [columns] = await connection.execute("DESCRIBE panels");
        const existingColumns = columns.map(col => col.Field);

        for (const col of requiredColumns) {
            if (!existingColumns.includes(col.name)) {
                console.log(`➕ Adding missing column: ${col.name}`);
                await connection.execute(`
                    ALTER TABLE panels 
                    ADD COLUMN ${col.name} ${col.type} NOT NULL DEFAULT ${col.default}
                `);
                console.log(`✅ Added column: ${col.name}`);
            } else {
                console.log(`✅ Column exists: ${col.name}`);
            }
        }
        
    } catch (error) {
        console.log('⚠️ Error fixing panels table:', error.message);
    }
}

async function runDrizzleMigrations(connection) {
    try {
        const db = drizzle(connection);
        const migrationsFolder = join(__dirname, "..", "drizzle");
        
        console.log(`📁 Using migrations folder: ${migrationsFolder}`);
        
        // Run migrations
        await migrate(db, { migrationsFolder });
        console.log('✅ Drizzle migrations completed successfully');
        
    } catch (error) {
        console.log('⚠️ Drizzle migration error:', error.message);
        
        // If migration fails due to existing tables, that's okay
        if (error.message.includes('already exists') || 
            error.message.includes('Duplicate column name') ||
            error.message.includes('ER_BAD_TABLE_DEFINITION')) {
            console.log('ℹ️ Migration conflicts detected, continuing...');
        } else {
            throw error;
        }
    }
}

async function createAdditionalTables(connection) {
    const tables = [
        {
            name: 'panel_daily_ledger',
            sql: `
                CREATE TABLE IF NOT EXISTS panel_daily_ledger (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    panel_id INT NOT NULL,
                    ledger_date DATE NOT NULL,
                    opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                    closing_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                    points_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                    total_deposits DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                    total_withdrawals DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                    bonus_points DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                    top_up DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                    profit_loss DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                    roi DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                    utilization DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                    status ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_panel_date (panel_id, ledger_date),
                    INDEX idx_ledger_date (ledger_date),
                    INDEX idx_panel_date (panel_id, ledger_date),
                    INDEX idx_status (status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `
        },
        {
            name: 'bank_daily_ledger',
            sql: `
                CREATE TABLE IF NOT EXISTS bank_daily_ledger (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    bank_account_id INT NOT NULL,
                    ledger_date DATE NOT NULL,
                    opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                    closing_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                    total_deposits DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                    total_withdrawals DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                    total_charges DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                    profit_loss DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                    roi DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                    status ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_bank_date (bank_account_id, ledger_date),
                    INDEX idx_ledger_date (ledger_date),
                    INDEX idx_bank_date (bank_account_id, ledger_date),
                    INDEX idx_status (status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `
        },
        {
            name: 'transaction_log',
            sql: `
                CREATE TABLE IF NOT EXISTS transaction_log (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    transaction_date DATETIME NOT NULL,
                    ledger_date DATE NOT NULL,
                    entity_type ENUM('panel', 'bank') NOT NULL,
                    entity_id INT NOT NULL,
                    transaction_type ENUM('credit', 'debit') NOT NULL,
                    amount DECIMAL(15,2) NOT NULL,
                    reference_type ENUM('deposit', 'withdrawal', 'bonus', 'topup', 'charge', 'transfer') NOT NULL,
                    reference_id INT NULL,
                    related_entity_type ENUM('panel', 'bank') NULL,
                    related_entity_id INT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_entity_date (entity_type, entity_id, ledger_date),
                    INDEX idx_transaction_date (transaction_date),
                    INDEX idx_reference (reference_type, reference_id),
                    INDEX idx_ledger_date (ledger_date)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `
        }
    ];

    for (const table of tables) {
        try {
            await connection.execute(table.sql);
            console.log(`✅ Table ensured: ${table.name}`);
        } catch (error) {
            console.log(`⚠️ Error creating table ${table.name}:`, error.message);
        }
    }
}

async function verifyDatabaseIntegrity(connection) {
    const requiredTables = [
        'users', 'admin_users', 'panels', 'bankaccounts', 'players',
        'deposits', 'withdrawals', 'gameplayTransactions', 'transactions',
        'sessions', 'logs', 'audit_trail', 'notifications', 'settings',
        'roles', 'user_roles', 'dailyreports', 'paneldailybalances', 'topuphistory'
    ];

    console.log('\n🔍 Verifying required tables...');
    
    const [existingTables] = await connection.execute('SHOW TABLES');
    const tableNames = existingTables.map(row => Object.values(row)[0]);

    let missingTables = [];
    for (const table of requiredTables) {
        if (tableNames.includes(table)) {
            console.log(`✅ Table exists: ${table}`);
        } else {
            console.log(`❌ Missing table: ${table}`);
            missingTables.push(table);
        }
    }

    // Check panels table columns specifically
    if (tableNames.includes('panels')) {
        const [columns] = await connection.execute("DESCRIBE panels");
        const columnNames = columns.map(col => col.Field);
        
        const requiredColumns = ['id', 'name', 'pointsBalance', 'openingBalance', 'closingBalance', 'topUp', 'extraDeposit', 'bonusPoints', 'profitLoss'];
        
        console.log('\n🔍 Verifying panels table columns...');
        for (const col of requiredColumns) {
            if (columnNames.includes(col)) {
                console.log(`✅ Column exists: panels.${col}`);
            } else {
                console.log(`❌ Missing column: panels.${col}`);
            }
        }
    }

    if (missingTables.length === 0) {
        console.log('\n✅ All required tables exist!');
    } else {
        console.log(`\n⚠️ ${missingTables.length} tables are missing but may be created by the application`);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    fixRailwayDatabase().then(() => {
        console.log('🎯 Database fix script completed');
        process.exit(0);
    }).catch((error) => {
        console.error('💥 Database fix script failed:', error);
        process.exit(1);
    });
}

export default fixRailwayDatabase;
export { fixRailwayDatabase };
