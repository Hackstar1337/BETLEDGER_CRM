const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Parse DATABASE_URL if available
function parseDatabaseUrl(url) {
  if (!url) return null;
  
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) return null;
  
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5]
  };
}

async function runMigration() {
  const dbUrl = process.env.DATABASE_URL;
  const dbConfig = parseDatabaseUrl(dbUrl);
  
  const connection = await mysql.createConnection({
    host: dbConfig?.host || process.env.DB_HOST || 'localhost',
    user: dbConfig?.user || process.env.DB_USER || 'root',
    password: dbConfig?.password || process.env.DB_PASSWORD || '',
    database: dbConfig?.database || process.env.DB_NAME || 'casino_panel',
    port: dbConfig?.port || 3306,
    multipleStatements: true
  });

  try {
    console.log('Running migration: Add unique constraint on accountHolderName');
    
    const migrationPath = path.join(__dirname, '2026-02-02_add_unique_constraint_account_holder_name.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await connection.execute(migrationSQL);
    console.log('✅ Migration completed successfully');
    console.log('✅ Unique constraint added to bankAccounts.accountHolderName');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
