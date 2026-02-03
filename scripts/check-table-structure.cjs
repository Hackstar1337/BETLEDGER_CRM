const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'khiladi_panel'
  });
  
  try {
    console.log('📋 Deposits table structure:');
    const [deposits] = await connection.execute('DESCRIBE deposits');
    deposits.forEach(col => console.log(`  ${col.Field}: ${col.Type}`));
    
    console.log('\n📋 Withdrawals table structure:');
    const [withdrawals] = await connection.execute('DESCRIBE withdrawals');
    withdrawals.forEach(col => console.log(`  ${col.Field}: ${col.Type}`));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkTables();
