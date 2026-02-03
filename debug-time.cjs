const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugTime() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log('=== Debugging Time Issue ===\n');
    
    // Check MySQL timezone
    const [timeResult] = await connection.execute('SELECT NOW() as mysql_now, UTC_TIMESTAMP() as utc_now');
    console.log('MySQL NOW():', timeResult[0].mysql_now);
    console.log('MySQL UTC_TIMESTAMP():', timeResult[0].utc_now);
    
    // Check timezone variables
    const [tzResult] = await connection.execute('SELECT @@global.time_zone as global_tz, @@session.time_zone as session_tz');
    console.log('\nMySQL Global Timezone:', tzResult[0].global_tz);
    console.log('MySQL Session Timezone:', tzResult[0].session_tz);
    
    // Check recent top-up history
    const [topUpResult] = await connection.execute(`
      SELECT id, panelName, createdBy, createdAt, 
      DATE_FORMAT(createdAt, '%Y-%m-%d %H:%i:%s') as formatted_date
      FROM topUpHistory 
      ORDER BY id DESC 
      LIMIT 5
    `);
    
    console.log('\n=== Recent Top-Up Records ===');
    topUpResult.forEach(record => {
      console.log(`ID: ${record.id}`);
      console.log(`Panel: ${record.panelName}`);
      console.log(`Created By: ${record.createdBy}`);
      console.log(`Raw createdAt: ${record.createdAt}`);
      console.log(`Formatted: ${record.formatted_date}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

debugTime();
