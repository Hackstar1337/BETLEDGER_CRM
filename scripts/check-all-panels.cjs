const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAllPanels() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'khiladi_panel'
  });
  
  try {
    const [panels] = await connection.execute('SELECT * FROM panels');
    console.log('All panels in database:');
    console.log('ID | Name                | Points Balance | Created At');
    console.log('---|---------------------|----------------|------------');
    
    if (panels.length === 0) {
      console.log('No panels found! Creating a test panel...');
      
      // Create a test panel
      await connection.execute(
        `INSERT INTO panels (name, pointsBalance, openingBalance, settling, extraDeposit, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        ['TIGER PANEL', 50000, 50000, 0, 0]
      );
      
      console.log('✅ Created TIGER PANEL with ID 1');
    } else {
      panels.forEach(p => {
        console.log(`${p.id.toString().padStart(2)} | ${p.name.padEnd(19)} | ${p.pointsBalance?.toString().padStart(14) || 'NULL'.padStart(14)} | ${p.createdAt}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkAllPanels();
