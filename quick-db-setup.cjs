const { execSync } = require("child_process");
const fs = require("fs");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function setupDatabase() {
  console.log("🚀 Quick Database Setup for Khiladi247\n");
  
  // Get MySQL password from user
  const mysqlPassword = await question("Enter your MySQL root password (press Enter if no password): ");
  
  // Test connection
  console.log("\n🔌 Testing MySQL connection...");
  try {
    const testCmd = mysqlPassword 
      ? `"C:\\tools\\mysql\\current\\bin\\mysql.exe" -u root -p"${mysqlPassword}" -e "SELECT 1;"`
      : `"C:\\tools\\mysql\\current\\bin\\mysql.exe" -u root -e "SELECT 1;"`;
    
    execSync(testCmd, { stdio: 'pipe' });
    console.log("✅ MySQL connection successful!");
  } catch (error) {
    console.log("❌ MySQL connection failed. Please check your password.");
    rl.close();
    return;
  }
  
  // Update .env file
  console.log("\n📝 Updating .env file...");
  const envContent = fs.readFileSync(".env", "utf8");
  const newDbUrl = `DATABASE_URL=mysql://root:${mysqlPassword}@localhost:3306/khiladi247`;
  
  const updatedContent = envContent.replace(
    /DATABASE_URL=.*/g,
    newDbUrl
  );
  
  fs.writeFileSync(".env", updatedContent);
  console.log("✅ .env file updated!");
  
  // Create database and run setup
  console.log("\n🏗️ Creating database and tables...");
  try {
    // Create database
    const createDbCmd = mysqlPassword
      ? `"C:\\tools\\mysql\\current\\bin\\mysql.exe" -u root -p"${mysqlPassword}" -e "CREATE DATABASE IF NOT EXISTS khiladi247 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"`
      : `"C:\\tools\\mysql\\current\\bin\\mysql.exe" -u root -e "CREATE DATABASE IF NOT EXISTS khiladi247 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"`;
    
    execSync(createDbCmd, { stdio: 'inherit' });
    
    // Run migrations and create admin
    console.log("\n📊 Running database migrations...");
    execSync("npm run db:push", { stdio: 'inherit' });
    
    console.log("\n👤 Creating admin user...");
    const bcrypt = require("bcryptjs");
    const mysql = require("mysql2/promise");
    
    const connection = await mysql.createConnection({
      host: "localhost",
      port: 3306,
      user: "root",
      password: mysqlPassword,
      database: "khiladi247"
    });
    
    // Check if admin exists
    const [existing] = await connection.execute(
      "SELECT id FROM admin_users WHERE username = 'admin'"
    );
    
    if (existing.length === 0) {
      const defaultPassword = "admin123";
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      await connection.execute(
        "INSERT INTO admin_users (username, password_hash, email, full_name, is_active) VALUES (?, ?, ?, ?, ?)",
        ["admin", hashedPassword, "admin@khiladi247.com", "System Administrator", 1]
      );
      
      console.log("\n✅ Admin user created!");
      console.log("🔑 Username: admin");
      console.log("🔑 Password: admin123");
      console.log("⚠️ Please change this password after first login!");
    } else {
      console.log("\nℹ️ Admin user already exists");
    }
    
    await connection.end();
    
    console.log("\n🎉 Database setup complete!");
    console.log("📝 You can now login with:");
    console.log("   Username: admin");
    console.log("   Password: admin123");
    console.log("\n🌐 Server is running at: http://localhost:3001");
    
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
  }
  
  rl.close();
}

setupDatabase();
