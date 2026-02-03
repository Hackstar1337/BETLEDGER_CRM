#!/usr/bin/env node

import "dotenv/config";
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse DATABASE_URL
const dbUrl = process.env.DATABASE_URL || "mysql://root:@localhost:3306/khiladi247_v3";
const match = dbUrl.match(/mysql:\/\/([^:]+):?([^@]*)@([^:]+):(\d+)\/(.+)/);
if (!match) {
  console.error("❌ Invalid DATABASE_URL format");
  process.exit(1);
}

const [, user, password, host, port, database] = match;

const dbConfig = {
  host,
  port: parseInt(port),
  user,
  password,
  database,
  multipleStatements: true,
};

console.log("🚀 Running migrations for khiladi247_v3...");

async function runMigrations() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // Read and execute migration files
    const migrationFiles = [
      "0000_pale_quentin_quire.sql",
      "0001_thankful_the_twelve.sql",
      "0002_colossal_living_lightning.sql",
      "0003_colorful_blindfold.sql",
      "0004_boring_clea.sql",
      "0005_fantastic_korg.sql",
      "0006_tearful_ego.sql",
      "0007_lively_vapor.sql",
    ];

    for (const file of migrationFiles) {
      const filePath = path.join(__dirname, "drizzle", file);
      try {
        const migrationSQL = fs.readFileSync(filePath, "utf8");
        await connection.execute(migrationSQL);
        console.log(`✅ Applied migration: ${file}`);
      } catch (error) {
        if (error.code === "ER_TABLE_EXISTS_ERROR" || error.code === "ER_DUP_ENTRY") {
          console.log(`ℹ️ Migration already applied or skipped: ${file}`);
        } else {
          console.error(`❌ Failed to apply migration ${file}:`, error.message);
        }
      }
    }

    // Create default admin user
    console.log("👤 Creating default admin user...");
    
    const [existingAdmins] = await connection.execute(
      "SELECT id FROM admin_users WHERE username = ?",
      ["admin"]
    );

    if (existingAdmins.length === 0) {
      const defaultPassword = "admin123";
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      await connection.execute(
        `INSERT INTO admin_users (username, password_hash, email, full_name, is_active) VALUES (?, ?, ?, ?, ?)`,
        [
          "admin",
          hashedPassword,
          "admin@khiladi247.com",
          "System Administrator",
          1,
        ]
      );
      
      console.log("✅ Default admin user created successfully");
      console.log("🔑 Username: admin");
      console.log("🔑 Password: admin123");
      console.log("⚠️ Please change the default password after first login!");
    } else {
      console.log("ℹ️ Default admin user already exists");
    }

    // Create default panels
    console.log("🎯 Creating default panels...");
    
    const defaultPanels = [
      { name: "Panel A", pointsBalance: 100000, openingBalance: 100000, closingBalance: 100000 },
      { name: "Panel B", pointsBalance: 100000, openingBalance: 100000, closingBalance: 100000 },
      { name: "Panel C", pointsBalance: 100000, openingBalance: 100000, closingBalance: 100000 },
    ];

    for (const panel of defaultPanels) {
      const [existingPanels] = await connection.execute(
        "SELECT id FROM panels WHERE name = ?",
        [panel.name]
      );

      if (existingPanels.length === 0) {
        await connection.execute(
          `INSERT INTO panels (name, pointsBalance, openingBalance, closingBalance) VALUES (?, ?, ?, ?)`,
          [
            panel.name,
            panel.pointsBalance,
            panel.openingBalance,
            panel.closingBalance,
          ]
        );
        console.log(`✅ Created panel: ${panel.name}`);
      } else {
        console.log(`ℹ️ Panel already exists: ${panel.name}`);
      }
    }

    console.log("\n🎉 Database setup completed successfully!");
    console.log("✅ Your Khiladi247 v3 database is ready to use.");
    
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigrations().catch(console.error);
