const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'khiladi_user',
  password: 'khiladi_pass_2024',
  database: 'khiladi247',
};

async function resetAdminPassword() {
  console.log('🔧 Resetting admin password...\n');
  
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // Hash the new password
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the password
    const [result] = await connection.execute(
      'UPDATE admin_users SET password_hash = ?, updatedAt = NOW() WHERE username = ?',
      [hashedPassword, 'admin']
    );
    
    if (result.affectedRows > 0) {
      console.log('✅ Admin password reset successfully!');
      console.log('\n📋 New Login Details:');
      console.log('=====================');
      console.log(`Username: admin`);
      console.log(`Password: ${newPassword}`);
      console.log('\n⚠️ Please change this password after logging in!');
      
      // Verify the new password
      const [adminUsers] = await connection.execute(
        'SELECT password_hash FROM admin_users WHERE username = ?',
        ['admin']
      );
      
      const isValid = await bcrypt.compare(newPassword, adminUsers[0].password_hash);
      console.log(`\n✅ Password verification: ${isValid ? 'SUCCESS' : 'FAILED'}`);
      
    } else {
      console.log('❌ Failed to update password - admin user not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

resetAdminPassword();
