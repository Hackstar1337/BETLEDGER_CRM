#!/usr/bin/env node
/**
 * Ensure Admin User Script
 * Automatically creates admin user if it doesn't exist
 * Safe to run multiple times - only creates if missing
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

async function ensureAdmin() {
  console.log("🔍 Checking for existing admin user...");

  let connection;
  try {
    // Connect to database
    connection = await mysql.createConnection(DATABASE_URL);
    const db = drizzle(connection);

    // Import schema dynamically
    const { adminUsers } = await import("../drizzle/schema.ts").catch(() => {
      // If .ts import fails, try to query directly
      return { adminUsers: null };
    });

    if (!adminUsers) {
      console.log("⚠️  Could not load schema, checking manually...");
      // Check if admin_users table exists by trying to query it
      try {
        const [rows] = await connection.execute(
          "SELECT * FROM admin_users WHERE username = ?",
          ["admin"]
        );
        if (rows.length > 0) {
          console.log("✅ Admin user already exists");
          await connection.end();
          return;
        }
      } catch (e) {
        // Table might not exist
        console.log("⚠️  admin_users table might not exist yet");
      }
    } else {
      // Check if admin user exists using drizzle
      const { eq } = await import("drizzle-orm");
      const existingAdmin = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.username, "admin"))
        .limit(1);

      if (existingAdmin.length > 0) {
        console.log("✅ Admin user already exists");
        await connection.end();
        return;
      }
    }

    // Generate random secure password
    const password = crypto.randomBytes(12).toString("base64").slice(0, 16);
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user using raw SQL
    await connection.execute(
      `INSERT INTO admin_users (username, password_hash, email, full_name, is_active, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        "admin",
        passwordHash,
        "admin@khiladi247.com",
        "System Administrator",
        true,
        new Date(),
        new Date(),
      ]
    );

    console.log("✅ Admin user created successfully!");
    console.log("");
    console.log("═══════════════════════════════════════");
    console.log("  ADMIN CREDENTIALS");
    console.log("═══════════════════════════════════════");
    console.log(`  Username: admin`);
    console.log(`  Password: ${password}`);
    console.log("═══════════════════════════════════════");
    console.log("");
    console.log("⚠️  IMPORTANT: Save these credentials securely!");
    console.log("⚠️  Change the password after first login via Settings");
    console.log("");

    // Save credentials to file
    const credentialsFile = path.join(process.cwd(), "ADMIN_CREDENTIALS.txt");
    const credentialsContent = `
Khiladi247 Management Panel - Admin Credentials
================================================

Username: admin
Password: ${password}

Created: ${new Date().toISOString()}

IMPORTANT SECURITY NOTES:
1. Change this password immediately after first login
2. Go to Settings > Change Password after logging in
3. Delete this file after saving the credentials securely
4. Never commit this file to version control

Login URL: http://localhost:3000 (or your deployed URL)
`;

    fs.writeFileSync(credentialsFile, credentialsContent);
    console.log(`📄 Credentials saved to: ${credentialsFile}`);

    await connection.end();
  } catch (error) {
    console.error("❌ Error ensuring admin user:", error.message);
    if (connection) await connection.end();
    // Don't exit with error - let the app start anyway
    process.exit(0);
  }
}

ensureAdmin();
