const fs = require('fs');
const path = require('path');

// Read the current .env file
const envPath = path.join(__dirname, '.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

// Update or add the DATABASE_URL
const dbUrlLine = 'DATABASE_URL=mysql://root:@localhost:3306/khiladi247';
const lines = envContent.split('\n');
let dbUrlExists = false;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith('DATABASE_URL=')) {
    lines[i] = dbUrlLine;
    dbUrlExists = true;
    break;
  }
}

if (!dbUrlExists) {
  lines.unshift(dbUrlLine);
}

// Write back to .env
fs.writeFileSync(envPath, lines.join('\n'));
console.log('✅ Updated .env file with database configuration');
console.log('📝 DATABASE_URL set to: mysql://root:@localhost:3306/khiladi247');
console.log('\n⚠️ If your MySQL root user has a password, please update the .env file:');
console.log('   Change DATABASE_URL to: mysql://root:YOUR_PASSWORD@localhost:3306/khiladi247');
