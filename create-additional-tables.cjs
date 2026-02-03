const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function createAdditionalTables() {
  console.log("🔧 Creating Additional Tables\n");
  
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    multipleStatements: true,
  });
  
  try {
    // Read and execute SQL file
    const sql = fs.readFileSync('./create-additional-tables.sql', 'utf8');

    console.log("Executing SQL file...");
    await connection.query(sql);
    console.log("✅ SQL file executed");
    
    // Verify tables were created
    console.log("\n📋 Verifying created tables:");
    const [tables] = await connection.execute('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    
    const newTables = [
      'sessions',
      'logs',
      'audit_trail',
      'notifications',
      'settings',
      'roles',
      'user_roles'
    ];
    
    newTables.forEach(table => {
      if (tableNames.includes(table)) {
        console.log(`✅ ${table} - created`);
      } else {
        console.log(`❌ ${table} - not found`);
      }
    });
    
    // Show sample data from settings and roles
    console.log("\n📊 Sample Data:");
    
    const [settings] = await connection.execute('SELECT `key`, value, category FROM settings LIMIT 5');
    console.log("\nSettings:");
    settings.forEach(s => {
      console.log(`  - ${s.key}: ${s.value} (${s.category})`);
    });
    
    const [roles] = await connection.execute('SELECT name, displayName, isActive FROM roles');
    console.log("\nRoles:");
    roles.forEach(r => {
      console.log(`  - ${r.name}: ${r.displayName} (${r.isActive ? 'Active' : 'Inactive'})`);
    });
    
    console.log("\n✅ All additional tables created successfully!");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await connection.end();
  }
}

createAdditionalTables();
