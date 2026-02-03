const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'khiladi_user',
  password: 'khiladi_pass_2024',
  database: 'khiladi247',
  multipleStatements: true,
};

async function cleanAndApplyMigrations() {
  console.log('🔧 Cleaning and applying migrations...\n');
  
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    const migrationFiles = [
      "0000_pale_quentin_quire.sql",
      "0001_thankful_the_twelve.sql",
      "0002_colossal_living_lightning.sql",
      "0003_colorful_blindfold.sql",
      "0004_boring_clea.sql",
      "0005_fantastic_korg.sql",
      "0006_tearful_ego.sql",
      "0007_lively_vapor.sql",
    ];
    
    for (const file of migrationFiles) {
      console.log(`📄 Processing migration: ${file}`);
      
      const filePath = path.join(__dirname, 'drizzle', file);
      let migrationSQL = fs.readFileSync(filePath, 'utf8');
      
      // Remove Drizzle statement breakpoints
      migrationSQL = migrationSQL.replace(/--> statement-breakpoint/g, '');
      
      // Split into individual statements and execute one by one
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await connection.execute(statement + ';');
          } catch (error) {
            if (error.code === 'ER_TABLE_EXISTS_ERROR' || 
                error.code === 'ER_DUP_ENTRY' || 
                error.code === 'ER_DUP_FIELDNAME') {
              console.log(`   ℹ️ Already exists or skipped: ${error.code}`);
            } else {
              console.log(`   ⚠️ Warning: ${error.message.substring(0, 100)}...`);
            }
          }
        }
      }
      
      console.log(`   ✅ Migration processed: ${file}\n`);
    }
    
    // Verify tables
    console.log('🔍 Verifying tables...');
    const [tables] = await connection.execute(`SHOW TABLES FROM \`${dbConfig.database}\``);
    const tableNames = tables.map(row => Object.values(row)[0]);
    
    console.log('📊 Tables created:', tableNames.join(', '));
    
    // Create default admin if not exists
    console.log('\n👤 Creating default admin user...');
    const bcrypt = require('bcryptjs');
    const defaultPassword = "admin123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    try {
      await connection.execute(
        `INSERT IGNORE INTO admin_users (username, password_hash, email, full_name, is_active) VALUES (?, ?, ?, ?, ?)`,
        ["admin", hashedPassword, "admin@khiladi247.com", "System Administrator", 1]
      );
      console.log('   ✅ Default admin user created (or already exists)');
      console.log('   🔑 Username: admin');
      console.log('   🔑 Password: admin123');
    } catch (error) {
      console.log('   ℹ️ Admin user already exists');
    }
    
    // Create default panels
    console.log('\n🎯 Creating default panels...');
    const defaultPanels = [
      { name: "Panel A", pointsBalance: 100000, openingBalance: 100000, closingBalance: 100000 },
      { name: "Panel B", pointsBalance: 100000, openingBalance: 100000, closingBalance: 100000 },
      { name: "Panel C", pointsBalance: 100000, openingBalance: 100000, closingBalance: 100000 },
    ];
    
    for (const panel of defaultPanels) {
      try {
        await connection.execute(
          `INSERT IGNORE INTO panels (name, pointsBalance, openingBalance, closingBalance) VALUES (?, ?, ?, ?)`,
          [panel.name, panel.pointsBalance, panel.openingBalance, panel.closingBalance]
        );
        console.log(`   ✅ Created panel: ${panel.name}`);
      } catch (error) {
        console.log(`   ℹ️ Panel already exists: ${panel.name}`);
      }
    }
    
    console.log('\n🎉 Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

cleanAndApplyMigrations().catch(console.error);
