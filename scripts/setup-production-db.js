import mysql from 'mysql2/promise';
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

/**
 * Production Database Setup Script
 * This script automatically creates the necessary tables and initial data
 */

async function setupProductionDatabase() {
    if (!process.env.DATABASE_URL) {
        console.log('❌ DATABASE_URL not found, skipping database setup');
        return;
    }

    console.log('🚀 Setting up production database...');
    
    try {
        // Create connection
        const connection = await mysql.createConnection(process.env.DATABASE_URL);

        // Run Drizzle migrations (creates core tables like panels, bankaccounts, admin_users, etc.)
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const migrationsFolder = join(__dirname, "..", "drizzle");
        const db = drizzle(connection);
        await migrate(db, { migrationsFolder });
        
        // Create panel_daily_ledger table
        await connection.execute(`
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
        `);
        
        // Create bank_daily_ledger table
        await connection.execute(`
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
        `);
        
        // Create transaction_log table
        await connection.execute(`
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
        `);
        
        // Create audit_log table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS audit_log (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                operation VARCHAR(100) NOT NULL,
                entity_type VARCHAR(50) NOT NULL,
                entity_id INT,
                data JSON,
                result JSON,
                user_id VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_operation (operation),
                INDEX idx_entity (entity_type, entity_id),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        
        console.log('✅ Database tables created/verified');
        
        // Create initial records if needed
        const today = new Date().toISOString().split('T')[0];
        
        // Check if panels table exists and create ledger records
        try {
            const [panels] = await connection.execute('SELECT id, openingBalance, closingBalance, pointsBalance FROM panels');
            
            for (const panel of panels) {
                await connection.execute(`
                    INSERT IGNORE INTO panel_daily_ledger (
                        panel_id, ledger_date, opening_balance, closing_balance, points_balance
                    ) VALUES (?, ?, ?, ?, ?)
                `, [panel.id, today, panel.openingBalance || 0, panel.closingBalance || 0, panel.pointsBalance || 0]);
            }
            
            console.log(`✅ Created ledger records for ${panels.length} panels`);
        } catch (error) {
            console.log('ℹ️ Panels table not found, skipping panel ledger creation');
        }
        
        // Check if bankaccounts table exists and create ledger records
        try {
            const [banks] = await connection.execute('SELECT id, closingBalance FROM bankaccounts WHERE isActive = 1');
            
            for (const bank of banks) {
                await connection.execute(`
                    INSERT IGNORE INTO bank_daily_ledger (
                        bank_account_id, ledger_date, opening_balance, closing_balance
                    ) VALUES (?, ?, ?, ?)
                `, [bank.id, today, bank.closingBalance || 0, bank.closingBalance || 0]);
            }
            
            console.log(`✅ Created ledger records for ${banks.length} bank accounts`);
        } catch (error) {
            console.log('ℹ️ Bank accounts table not found, skipping bank ledger creation');
        }
        
        // Create initial audit log entry
        await connection.execute(`
            INSERT INTO audit_log (operation, entity_type, entity_id, data, result, user_id)
            VALUES ('SYSTEM_DEPLOY', 'system', NULL, ?, ?, 'system')
        `, [JSON.stringify({ date: today, environment: process.env.NODE_ENV || 'production' }), 
            JSON.stringify({ success: true })]);
        
        console.log('✅ Initial setup complete');
        
        await connection.end();
    } catch (error) {
        console.error('❌ Database setup failed:', error);
        throw error;
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    setupProductionDatabase().then(() => {
        console.log('🎉 Database setup completed successfully');
        process.exit(0);
    }).catch((error) => {
        console.error('💥 Database setup failed:', error);
        process.exit(1);
    });
}

export default setupProductionDatabase;
