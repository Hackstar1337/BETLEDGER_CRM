// Simple script to check what database we're using and apply migration
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking database configuration...\n');

// Read .env file
const envContent = fs.readFileSync('.env', 'utf8');
console.log('Found .env file');

// Check for DATABASE_URL
if (envContent.includes('DATABASE_URL')) {
    const dbUrlLine = envContent.split('\n').find(line => line.startsWith('DATABASE_URL'));
    console.log('DATABASE_URL found:', dbUrlLine.substring(0, 50) + '...');
    
    if (dbUrlLine.includes('sqlite')) {
        console.log('✅ Detected SQLite database');
        console.log('💡 SQLite does not need the unique constraint migration');
        console.log('💡 The Drizzle schema already has .unique() on accountHolderName');
    } else if (dbUrlLine.includes('mysql')) {
        console.log('✅ Detected MySQL database');
        console.log('⚠️  Please manually run the SQL from setup-bank-validation.sql');
        console.log('   in your MySQL client (Workbench, phpMyAdmin, etc.)');
    }
}

// Check if server is using SQLite by looking for .db files
const dbFiles = fs.readdirSync('.').filter(f => f.endsWith('.db') || f.endsWith('.sqlite'));
if (dbFiles.length > 0) {
    console.log('\n📁 Found local database files:', dbFiles);
    console.log('💡 Using SQLite - no manual migration needed');
}

console.log('\n📋 Next Steps:');
console.log('1. If using MySQL: Run setup-bank-validation.sql in your MySQL client');
console.log('2. Start the server with: npm run dev');
console.log('3. Test the validation at: http://localhost:3000/bank-accounts');
