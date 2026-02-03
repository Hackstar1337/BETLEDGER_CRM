const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

async function createAdmin() {
  console.log("🔧 Debug: Creating admin user...");

  try {
    // Read database URL from .env
    const fs = require("fs");
    const envContent = fs.readFileSync(".env", "utf8");
    const dbUrlMatch = envContent.match(
      /DATABASE_URL=mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/
    );

    if (!dbUrlMatch) {
      throw new Error("Could not parse DATABASE_URL");
    }

    const [, username, password, host, port, database] = dbUrlMatch;
    console.log(`🔧 Debug: Connecting to ${database} as ${username}`);

    // Create database connection
    const connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user: username,
      password,
      database,
    });

    console.log("✅ Debug: Database connected successfully");

    // Generate password
    function generateSecurePassword(length = 16) {
      const charset =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
      let password = "";
      const array = new Uint8Array(length);
      crypto.getRandomValues(array);

      for (let i = 0; i < length; i++) {
        password += charset[array[i] % charset.length];
      }
      return password;
    }

    const plainPassword = generateSecurePassword(16);
    console.log(`🔧 Debug: Generated password: ${plainPassword}`);

    // Hash password
    const passwordHash = await bcrypt.hash(plainPassword, 10);
    console.log("✅ Debug: Password hashed successfully");

    // Check if admin exists
    const [existing] = await connection.execute(
      "SELECT * FROM admin_users WHERE username = ?",
      ["admin"]
    );

    if (existing.length > 0) {
      console.log("✅ Debug: Admin user already exists");
      console.log(`   Username: admin`);
      console.log(`   Email: ${existing[0].email || "Not set"}`);
      console.log(`   Created: ${existing[0].createdAt}`);
      return;
    }

    // Insert admin user
    await connection.execute(
      `INSERT INTO admin_users (username, password_hash, email, full_name, is_active, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        "admin",
        passwordHash,
        "admin@khiladi247.com",
        "System Administrator",
        true,
      ]
    );

    console.log("✅ Debug: Admin user inserted successfully");

    // Verify insertion
    const [verify] = await connection.execute(
      "SELECT * FROM admin_users WHERE username = ?",
      ["admin"]
    );

    if (verify.length > 0) {
      console.log("✅ Admin user created successfully!\n");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("   🔑 ADMIN CREDENTIALS");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`   Username: admin`);
      console.log(`   Password: ${plainPassword}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      console.log("⚠️  IMPORTANT: Save these credentials securely!");
    } else {
      console.error("❌ Failed to verify admin user creation");
    }

    await connection.end();
  } catch (error) {
    console.error("❌ Debug: Error creating admin:", error.message);
    console.error("Stack:", error.stack);
  }
}

createAdmin();
