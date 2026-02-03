const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 MySQL User Setup Script');
console.log('========================\n');

// Create a temporary SQL script to set up the user
const sqlScript = `
-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS khiladi247 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create a dedicated user for the application
CREATE USER IF NOT EXISTS 'khiladi_user'@'localhost' IDENTIFIED BY 'khiladi_pass_2024';

-- Grant all privileges on the khiladi247 database
GRANT ALL PRIVILEGES ON khiladi247.* TO 'khiladi_user'@'localhost';

-- Flush privileges to apply changes
FLUSH PRIVILEGES;

-- Show the created user
SELECT User, Host FROM mysql.user WHERE User = 'khiladi_user';
`;

// Write the SQL script to a temporary file
const tempSqlFile = path.join(__dirname, 'temp_setup.sql');
fs.writeFileSync(tempSqlFile, sqlScript);

console.log('📝 This script will:');
console.log('1. Create a database named "khiladi247"');
console.log('2. Create a MySQL user "khiladi_user" with password "khiladi_pass_2024"');
console.log('3. Grant necessary privileges');
console.log('\n⚠️ You will be prompted for MySQL root password...');
console.log('   (If you don\'t have a password, just press Enter)\n');

try {
  // Execute the SQL script
  execSync(`mysql -u root -p < "${tempSqlFile}"`, { stdio: 'inherit' });
  
  console.log('\n✅ MySQL user setup completed!');
  console.log('\n📝 Updating .env file with new credentials...');
  
  // Update the .env file
  const envPath = path.join(__dirname, '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Update database credentials
  const lines = envContent.split('\n');
  let updated = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('DATABASE_URL=')) {
      lines[i] = 'DATABASE_URL=mysql://khiladi_user:khiladi_pass_2024@localhost:3306/khiladi247';
      updated = true;
    }
  }
  
  if (!updated) {
    lines.unshift('DATABASE_URL=mysql://khiladi_user:khiladi_pass_2024@localhost:3306/khiladi247');
  }
  
  fs.writeFileSync(envPath, lines.join('\n'));
  
  console.log('✅ .env file updated with new credentials');
  console.log('\n🔑 New Database Credentials:');
  console.log('   Username: khiladi_user');
  console.log('   Password: khiladi_pass_2024');
  console.log('   Database: khiladi247');
  console.log('\n🚀 You can now run: npm run db:setup');
  
} catch (error) {
  console.error('\n❌ Failed to set up MySQL user:', error.message);
  console.log('\n🔧 Manual setup:');
  console.log('1. Open MySQL shell: mysql -u root -p');
  console.log('2. Run the commands in temp_setup.sql manually');
} finally {
  // Clean up the temporary file
  if (fs.existsSync(tempSqlFile)) {
    fs.unlinkSync(tempSqlFile);
  }
}
