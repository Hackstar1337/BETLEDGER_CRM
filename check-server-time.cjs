const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkServerTime() {
  console.log('=== Checking Server Time ===\n');
  
  // Check Node.js time
  console.log('Node.js new Date():', new Date());
  console.log('Node.js toISOString():', new Date().toISOString());
  console.log('Node.js toString():', new Date().toString());
  
  // Check database time
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const [result] = await connection.execute('SELECT NOW() as mysql_now, UTC_TIMESTAMP() as utc_now');
    console.log('\nMySQL NOW():', result[0].mysql_now);
    console.log('MySQL UTC_TIMESTAMP():', result[0].utc_now);
    
    // Check recent deposit
    const [deposits] = await connection.execute(`
      SELECT depositDate, createdAt, 
      DATE_FORMAT(depositDate, '%Y-%m-%d %H:%i:%s') as formatted_deposit,
      DATE_FORMAT(createdAt, '%Y-%m-%d %H:%i:%s') as formatted_created
      FROM deposits 
      ORDER BY id DESC 
      LIMIT 3
    `);
    
    console.log('\n=== Recent Deposits ===');
    deposits.forEach(deposit => {
      console.log('Deposit Date (raw):', deposit.depositDate);
      console.log('Deposit Date (formatted):', deposit.formatted_deposit);
      console.log('Created At (raw):', deposit.createdAt);
      console.log('Created At (formatted):', deposit.formatted_created);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkServerTime();
