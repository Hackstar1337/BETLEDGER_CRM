const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'MySQL@Root2026!',
  database: 'khiladi247_v3'
};

async function testCommonPasswords() {
  console.log('🔍 Testing common passwords for admin user...\n');
  
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // Get the password hash
    const [adminUsers] = await connection.execute(
      'SELECT password_hash FROM admin_users WHERE username = ?',
      ['admin']
    );
    
    if (adminUsers.length === 0) {
      console.log('❌ No admin user found');
      return;
    }
    
    const passwordHash = adminUsers[0].password_hash;
    console.log('🔐 Password Hash found:', passwordHash.substring(0, 50) + '...\n');
    
    // Test common passwords
    const commonPasswords = [
      'admin123',
      'admin',
      'password',
      '123456',
      'root',
      'khiladi247',
      'Admin@123',
      'admin@123',
      'Admin123',
      'admin123!',
      'Admin123!',
      'khiladi',
      'khiladi@247',
      'manager',
      'Manager123',
      'manager123'
    ];
    
    console.log('🧪 Testing passwords:');
    console.log('===================');
    
    let foundPassword = null;
    
    for (const testPassword of commonPasswords) {
      const isValid = await bcrypt.compare(testPassword, passwordHash);
      if (isValid) {
        console.log(`✅ FOUND PASSWORD: "${testPassword}"`);
        foundPassword = testPassword;
        break;
      } else {
        console.log(`❌ "${testPassword}" - Incorrect`);
      }
    }
    
    if (!foundPassword) {
      console.log('\n❌ None of the common passwords matched.');
      console.log('\n💡 Options:');
      console.log('1. The password was changed to something unique');
      console.log('2. You may need to reset the password');
      console.log('3. Check if there\'s a password reset script or documentation');
      
      // Offer to reset password
      console.log('\n🔧 Would you like to reset the password to "admin123"?');
      console.log('   Run: node reset-admin-password.cjs');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

testCommonPasswords();
