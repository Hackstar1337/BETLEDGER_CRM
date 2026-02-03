const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'MySQL@Root2026!',
  database: 'khiladi247_v3'
};

async function testAuth() {
  console.log('🔍 Testing authentication...\n');
  
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // Get admin user
    const [adminUsers] = await connection.execute(
      'SELECT * FROM admin_users WHERE username = ?',
      ['admin']
    );
    
    if (adminUsers.length === 0) {
      console.log('❌ No admin user found');
      return;
    }
    
    const admin = adminUsers[0];
    console.log('📋 Admin User:', {
      id: admin.id,
      username: admin.username,
      is_active: admin.is_active
    });
    
    // Test password
    const testPassword = 'admin123';
    const isValid = await bcrypt.compare(testPassword, admin.password_hash);
    
    console.log('\n🔐 Password Test:');
    console.log('Password to test:', testPassword);
    console.log('Hash matches:', isValid);
    
    // Test with different cases
    const testCases = ['admin', 'ADMIN', 'Admin', 'admin123', 'ADMIN123'];
    console.log('\n🧪 Testing different cases:');
    
    for (const testCase of testCases) {
      const valid = await bcrypt.compare(testCase, admin.password_hash);
      console.log(`"${testCase}": ${valid ? '✅' : '❌'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

testAuth();
