const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDatabaseTimezone() {
    console.log('🔧 Fixing database timezone and date consistency...\n');
    
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
        // Set session timezone to UTC for consistency
        await connection.execute('SET time_zone = "+00:00"');
        console.log('✅ Database session timezone set to UTC');
        
        // Check the change
        const [currentTime] = await connection.execute('SELECT NOW() AS `db_utc_time`, UTC_TIMESTAMP() AS `utc_time`');
        console.log('\nCurrent Time (after setting UTC):');
        console.log(`  Database UTC time: ${currentTime[0].db_utc_time}`);
        console.log(`  UTC timestamp: ${currentTime[0].utc_time}`);
        console.log(`  Node.js UTC time: ${new Date().toISOString()}`);
        
        // Create a summary of date/time issues
        console.log('\n📋 Date/Time Storage Guidelines:');
        console.log('1. All timestamps should be stored in UTC');
        console.log('2. Convert to local timezone only when displaying');
        console.log('3. Use JavaScript Date() objects for consistency');
        console.log('4. Always include timezone in API responses');
        
        console.log('\n🔍 Checking for inconsistent dates...');
        
        // Check for records with future dates
        const [futureDeposits] = await connection.execute(`
            SELECT COUNT(*) as count FROM deposits 
            WHERE depositDate > NOW()
        `);
        
        const [futureWithdrawals] = await connection.execute(`
            SELECT COUNT(*) as count FROM withdrawals 
            WHERE withdrawalDate > NOW()
        `);
        
        console.log(`\nFuture dates found:`);
        console.log(`  Deposits with future dates: ${futureDeposits[0].count}`);
        console.log(`  Withdrawals with future dates: ${futureWithdrawals[0].count}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

fixDatabaseTimezone().catch(console.error);
