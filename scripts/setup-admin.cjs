const mysql = require("mysql2/promise");

const config = {
  host: "interchange.proxy.rlwy.net",
  port: 36975,
  user: "root",
  password: "FLMEoZBnWNtqRyIfdeAPLSkvAXybVvOE",
  database: "railway",
  ssl: { rejectUnauthorized: false },
};

async function setup() {
  let connection;
  try {
    console.log("🔌 Connecting to MySQL...");
    connection = await mysql.createConnection(config);
    console.log("✅ Connected!");

    // Create table
    console.log("🗄️  Creating admin_users table...");
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(320),
        full_name VARCHAR(100),
        is_active TINYINT(1) DEFAULT 1,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        lastLoginAt TIMESTAMP NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log("✅ Table created!");

    // Insert admin
    console.log("👤 Creating admin user...");
    await connection.execute(
      `
      INSERT INTO admin_users (username, password_hash, email, full_name, is_active, createdAt, updatedAt) 
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE 
        password_hash = VALUES(password_hash),
        updatedAt = NOW()
    `,
      [
        "admin",
        "$2b$10$yT08DDnLhuq7hGna06Rht.hwJ01pwZ0e6Y8TMda9UJLnXTVZbgKSu",
        "admin@khiladi247.com",
        "System Administrator",
        1,
      ]
    );
    console.log("✅ Admin user created!");

    // Verify
    const [rows] = await connection.execute(
      "SELECT id, username, email, is_active FROM admin_users WHERE username = ?",
      ["admin"]
    );

    console.log("\n🎉 SUCCESS! Admin user created:");
    console.log("═══════════════════════════════════════");
    console.log("  Username: admin");
    console.log("  Password: admin123");
    console.log("═══════════════════════════════════════");
    console.log(
      "\n👉 Login at: https://khiladi247-app-production.up.railway.app"
    );
    console.log("⚠️  Change password after first login!");

    await connection.end();
  } catch (err) {
    console.error("❌ Error:", err.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

setup();
