const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read the .env file to get database info
const envContent = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL=mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

if (!dbUrlMatch) {
    console.error('❌ Could not parse DATABASE_URL from .env file');
    process.exit(1);
}

const [, user, password, host, port, database] = dbUrlMatch;

console.log('🔄 Applying bank account validation migration...\n');

// Create the SQL content
const sqlContent = `
-- Handle existing duplicates
UPDATE bankaccounts 
SET accountHolderName = CONCAT(accountHolderName, '_', id)
WHERE id IN (
    SELECT a.id FROM (
        SELECT id, accountHolderName,
               ROW_NUMBER() OVER (PARTITION BY accountHolderName ORDER BY id) as rn
        FROM bankaccounts
    ) a 
    WHERE a.rn > 1
);

-- Add unique constraint
ALTER TABLE bankaccounts 
ADD UNIQUE KEY uq_account_holder_name (accountHolderName);

-- Verify
SHOW INDEX FROM bankaccounts;
`;

// Write SQL to temporary file
const tempSqlFile = path.join(__dirname, 'temp_migration.sql');
fs.writeFileSync(tempSqlFile, sqlContent);

try {
    // Execute MySQL command
    const mysqlCmd = `mysql -h${host} -P${port} -u${user} -p${password} ${database} < "${tempSqlFile}"`;
    console.log('🔧 Executing migration SQL...');
    execSync(mysqlCmd, { stdio: 'inherit' });
    
    console.log('\n✅ Migration completed successfully!');
    console.log('✅ Unique constraint added to bankAccounts.accountHolderName');
} catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\n💡 Please manually run the SQL in setup-bank-validation.sql');
} finally {
    // Clean up temp file
    if (fs.existsSync(tempSqlFile)) {
        fs.unlinkSync(tempSqlFile);
    }
}
