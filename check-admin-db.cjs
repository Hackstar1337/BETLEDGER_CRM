const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'MySQL@Root2026!',
  database: 'khiladi247_v3'
};

async function checkAdminPassword() {
  console.log('🔍 Checking admin user from database...\n');
  
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // Get admin user details
    const [adminUsers] = await connection.execute(
      'SELECT * FROM admin_users WHERE username = ?',
      ['admin']
    );
    
    if (adminUsers.length === 0) {
      console.log('❌ No admin user found in database');
      return;
    }
    
    const admin = adminUsers[0];
    
    console.log('📋 Admin User Details:');
    console.log('====================');
    console.log(`Columns found: ${Object.keys(admin).join(', ')}`);
    console.log(`\nID: ${admin.id}`);
    console.log(`Username: ${admin.username}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Full Name: ${admin.full_name}`);
    console.log(`Active: ${admin.is_active ? 'Yes' : 'No'}`);
    if (admin.createdAt) console.log(`Created At: ${admin.createdAt}`);
    if (admin.created_at) console.log(`Created At: ${admin.created_at}`);
    console.log(`\n🔐 Password Hash: ${admin.password_hash ? admin.password_hash.substring(0, 50) + '...' : 'Not found'}`);
    
    // Verify the default password
    if (admin.password_hash) {
      const isDefaultPassword = await bcrypt.compare('admin123', admin.password_hash);
      console.log(`\n✅ Default password 'admin123' valid: ${isDefaultPassword ? 'YES' : 'NO'}`);
    } else {
      console.log('\n❌ No password hash found!');
    }
    
    console.log('\n⚠️ SECURITY REMINDER:');
    console.log('- Change the default password immediately after first login');
    console.log('- Use a strong password with at least 8 characters');
    console.log('- Include uppercase, lowercase, numbers, and symbols');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkAdminPassword();
