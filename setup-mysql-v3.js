#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("🚀 Setting up MySQL database for khiladi247_v3...");

// Try to create database with common MySQL setups
const passwords = ["", "root", "password", "123456", "mysql"];
const users = ["root", "mysql"];

async function tryMySQLConnection(user, password) {
  try {
    console.log(`🔍 Trying connection with user: ${user}, password: ${password || "(empty)"}`);
    
    // Test connection
    execSync(`mysql -u${user}${password ? " -p" + password : ""} -e "SELECT 1;"`, { 
      stdio: "pipe",
      timeout: 5000 
    });
    
    console.log("✅ Connection successful!");
    
    // Create database
    execSync(`mysql -u${user}${password ? " -p" + password : ""} -e "CREATE DATABASE IF NOT EXISTS khiladi247_v3 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"`, {
      stdio: "inherit"
    });
    console.log("✅ Database created: khiladi247_v3");
    
    // Update .env file with correct credentials
    const envContent = `# Database Configuration (MySQL)
DATABASE_URL=mysql://${user}:${password}@localhost:3306/khiladi247_v3

# JWT Secret
JWT_SECRET=khiladi247-super-secret-jwt-key-v3-2025

# Server Configuration
NODE_ENV=development
PORT=3001

# Database Host Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=${user}
DB_PASSWORD=${password}
DB_NAME=khiladi247_v3
`;
    
    fs.writeFileSync(".env", envContent);
    console.log("✅ .env file updated with correct credentials");
    
    return true;
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`);
    return false;
  }
}

async function main() {
  for (const user of users) {
    for (const password of passwords) {
      if (await tryMySQLConnection(user, password)) {
        console.log("\n🎉 MySQL setup completed successfully!");
        console.log("✅ Database 'khiladi247_v3' is ready");
        console.log("");
        console.log("📝 Next steps:");
        console.log("1. Run migrations: npm run db:setup");
        console.log("2. Start the application: npm run dev");
        return;
      }
    }
  }
  
  console.log("\n❌ Could not connect to MySQL with any default credentials");
  console.log("");
  console.log("🔧 Manual setup required:");
  console.log("1. Open MySQL Workbench or command line");
  console.log("2. Create database: CREATE DATABASE khiladi247_v3;");
  console.log("3. Update .env file with your MySQL credentials");
  console.log("4. Run: npm run db:setup");
}

main().catch(console.error);
