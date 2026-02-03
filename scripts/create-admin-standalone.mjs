#!/usr/bin/env node
/**
 * Create Admin User - Standalone Script (No external dependencies)
 * Run this with: node scripts/create-admin-standalone.mjs
 *
 * This script connects directly to MySQL and creates the admin user
 * without requiring drizzle-orm or other packages to be installed locally.
 */

import mysql from "mysql2/promise";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required");
  console.error("Example: mysql://user:pass@host:port/database");
  process.exit(1);
}

// Simple password hashing using crypto (bcrypt alternative for standalone script)
async function hashPassword(password) {
  // Create a SHA-256 hash with salt
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha256")
    .toString("hex");
  return `sha256:${salt}:${hash}`;
}

async function createAdmin() {
  console.log("🔍 Connecting to database...");

  let connection;
  try {
    // Parse connection URL
    const url = new URL(DATABASE_URL);
    const config = {
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: decodeURIComponent(url.password),
      database: url.pathname.slice(1), // Remove leading /
    };

    console.log(`📡 Connecting to ${config.host}:${config.port}...`);

    // Connect to database
    connection = await mysql.createConnection(config);
    console.log("✅ Connected to database!");

    // Check if admin_users table exists
    const [tables] = await connection.execute("SHOW TABLES LIKE 'admin_users'");

    if (tables.length === 0) {
      console.log("🗄️  Creating admin_users table...");
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          email VARCHAR(320),
          full_name VARCHAR(100),
          is_active BOOLEAN DEFAULT TRUE,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          lastLoginAt TIMESTAMP NULL
        )
      `);
      console.log("✅ admin_users table created!");
    }

    // Check if admin user already exists
    const [existing] = await connection.execute(
      "SELECT * FROM admin_users WHERE username = ?",
      ["admin"]
    );

    if (existing.length > 0) {
      console.log("✅ Admin user already exists!");
      console.log("");
      console.log("═══════════════════════════════════════");
      console.log("  ADMIN ALREADY EXISTS");
      console.log("═══════════════════════════════════════");
      console.log("  Username: admin");
      console.log("  (Use existing password or reset via database)");
      console.log("═══════════════════════════════════════");
      await connection.end();
      return;
    }

    // Generate secure password
    const password = crypto.randomBytes(12).toString("base64").slice(0, 16);

    // For bcrypt compatibility, we'll use a simpler approach
    // In production, the app uses bcryptjs, but for initial setup we'll use a temporary hash
    // The app will handle proper hashing when the user logs in
    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
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

    console.log("✅ Admin user created successfully!");
    console.log("");
    console.log("═══════════════════════════════════════");
    console.log("  ⚠️  ADMIN CREDENTIALS - SAVE THESE!");
    console.log("═══════════════════════════════════════");
    console.log(`  Username: admin`);
    console.log(`  Password: ${password}`);
    console.log("═══════════════════════════════════════");
    console.log("");
    console.log("⚠️  IMPORTANT:");
    console.log("   1. Save these credentials securely!");
    console.log(
      "   2. Login at: https://khiladi247-app-production.up.railway.app"
    );
    console.log("   3. Change password immediately after first login");
    console.log("   4. Go to Settings > Change Password");
    console.log("");

    // Save to file
    const credentialsFile = path.join(process.cwd(), "ADMIN_CREDENTIALS.txt");
    const credentialsContent = `
Khiladi247 Management Panel - Admin Credentials
================================================
Created: ${new Date().toISOString()}

Username: admin
Password: ${password}

Login URL: https://khiladi247-app-production.up.railway.app

IMPORTANT SECURITY NOTES:
1. Change this password immediately after first login
2. Go to Settings > Change Password after logging in
3. Delete this file after saving the credentials securely
4. Never commit this file to version control
`;

    fs.writeFileSync(credentialsFile, credentialsContent);
    console.log(`📄 Credentials saved to: ${credentialsFile}`);

    await connection.end();
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

createAdmin();
