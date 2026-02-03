const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkPanels() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'khiladi_panel'
  });
  
  try {
    const [panels] = await connection.execute('SELECT id, name FROM panels ORDER BY id');
    console.log('Available panels:');
    panels.forEach(p => console.log(`  ID: ${p.id}, Name: ${p.name}`));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkPanels();
