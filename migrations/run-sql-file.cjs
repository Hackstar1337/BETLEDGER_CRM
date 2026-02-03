const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function run() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node migrations/run-sql-file.cjs <sql-file-path>');
    process.exit(1);
  }

  const sql = fs.readFileSync(file, 'utf8');

  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    multipleStatements: true,
  });

  try {
    await conn.query(sql);
    console.log('✅ Migration applied:', file);
  } finally {
    await conn.end();
  }
}

run().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
