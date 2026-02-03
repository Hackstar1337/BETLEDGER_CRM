const fs = require("fs");
const mysql = require("mysql2/promise");

console.log("🔍 Checking database configuration...\n");

// Read .env file
try {
  const envContent = fs.readFileSync(".env", "utf8");
  console.log("✅ .env file found\n");
  
  // Extract DATABASE_URL
  const dbUrlMatch = envContent.match(/DATABASE_URL=mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  
  if (dbUrlMatch) {
    const [, username, password, host, port, database] = dbUrlMatch;
    
    console.log("📋 Database Configuration:");
    console.log(`   Host: ${host}`);
    console.log(`   Port: ${port}`);
    console.log(`   Database: ${database}`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password ? "***" : "(not set)"}\n`);
    
    // Test connection
    console.log("🔌 Testing database connection...");
    mysql.createConnection({
      host,
      port: parseInt(port),
      user: username,
      password,
      database
    })
    .then(async (connection) => {
      console.log("✅ Database connection successful!\n");
      
      // Check for admin users
      const [admins] = await connection.execute(
        "SELECT id, username, email, full_name, is_active FROM admin_users"
      );
      
      if (admins.length > 0) {
        console.log("👤 Admin Users Found:");
        admins.forEach(admin => {
          console.log(`   - Username: ${admin.username} (ID: ${admin.id})`);
          console.log(`     Email: ${admin.email}`);
          console.log(`     Name: ${admin.full_name}`);
          console.log(`     Active: ${admin.is_active ? 'Yes' : 'No'}\n`);
        });
      } else {
        console.log("❌ No admin users found. Run 'npm run db:setup' to create one.\n");
      }
      
      await connection.end();
    })
    .catch(error => {
      console.log("❌ Connection failed:", error.message);
      console.log("\n💡 Please check:");
      console.log("   1. MySQL server is running");
      console.log("   2. Credentials in .env are correct");
      console.log("   3. Database exists or can be created");
    });
    
  } else {
    console.log("❌ Could not find DATABASE_URL in .env file");
    console.log("\n💡 Please add: DATABASE_URL=mysql://user:password@localhost:3306/khiladi247");
  }
  
} catch (error) {
  console.log("❌ .env file not found");
  console.log("\n💡 Please create .env file with your database configuration");
}
