const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDatabaseTimezone() {
    console.log('🕐 Checking database timezone and date settings...\n');
    
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
        // Check database timezone
        const [timezone] = await connection.execute('SELECT @@global.time_zone, @@session.time_zone');
        console.log('Database Timezone:');
        console.log(`  Global timezone: ${timezone[0]['@@global.time_zone']}`);
        console.log(`  Session timezone: ${timezone[0]['@@session.time_zone']}`);
        
        // Check current time
        const [dbTime] = await connection.execute('SELECT NOW() AS db_time, UTC_TIMESTAMP() AS `utc_time`');
        console.log('\nCurrent Time:');
        console.log(`  Database time: ${dbTime[0].db_time}`);
        console.log(`  UTC time: ${dbTime[0].utc_time}`);
        console.log(`  Node.js time: ${new Date().toISOString()}`);
        
        // Check recent records with dates
        console.log('\n📊 Recent Records:');
        
        // Check deposits
        const [deposits] = await connection.execute(`
            SELECT id, userId, amount, depositDate, createdAt 
            FROM deposits 
            ORDER BY createdAt DESC 
            LIMIT 3
        `);
        console.log('\nDeposits:');
        deposits.forEach(d => {
            console.log(`  ID: ${d.id} - depositDate: ${d.depositDate} - createdAt: ${d.createdAt}`);
        });
        
        // Check withdrawals
        const [withdrawals] = await connection.execute(`
            SELECT id, userId, amount, withdrawalDate, createdAt 
            FROM withdrawals 
            ORDER BY createdAt DESC 
            LIMIT 3
        `);
        console.log('\nWithdrawals:');
        withdrawals.forEach(w => {
            console.log(`  ID: ${w.id} - withdrawalDate: ${w.withdrawalDate} - createdAt: ${w.createdAt}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

checkDatabaseTimezone().catch(console.error);
