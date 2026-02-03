#!/usr/bin/env node

/**
 * Database Setup and Migration Script
 * This script will:
 * 1. Create database if it doesn't exist
 * 2. Run all migrations
 * 3. Create default admin user
 * 4. Verify all tables exist
 */

import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import bcrypt from "bcryptjs";
import * as schema from "../drizzle/schema.ts";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "khiladi247",
  multipleStatements: true,
};

async function createDatabaseIfNotExists() {
  console.log("🔍 Checking if database exists...");

  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
  });

  try {
    await connection.execute(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log("✅ Database created or already exists");
  } catch (error) {
    console.error("❌ Failed to create database:", error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

async function runMigrations() {
  console.log("🔄 Running database migrations...");

  const connection = await mysql.createConnection(dbConfig);
  const db = drizzle(connection, { schema, mode: "default" });

  try {
    // Run migrations
    await migrate(db, { migrationsFolder: join(__dirname, "../drizzle") });
    console.log("✅ Migrations completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

async function verifyTables() {
  console.log("🔍 Verifying all tables exist...");

  const connection = await mysql.createConnection(dbConfig);

  try {
    const [tables] = await connection.execute(
      `SHOW TABLES FROM \`${dbConfig.database}\``
    );
    const tableNames = tables.map(row => Object.values(row)[0]);

    const expectedTables = [
      "users",
      "admin_users",
      "panels",
      "bankAccounts",
      "players",
      "deposits",
      "withdrawals",
      "gameplayTransactions",
      "transactions",
      "dailyReports",
    ];

    const missingTables = expectedTables.filter(
      table => !tableNames.includes(table)
    );

    if (missingTables.length > 0) {
      console.error("❌ Missing tables:", missingTables);
      throw new Error(`Missing tables: ${missingTables.join(", ")}`);
    }

    console.log("✅ All tables verified successfully");
    console.log("📊 Tables found:", tableNames.join(", "));
  } catch (error) {
    console.error("❌ Table verification failed:", error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

async function createDefaultAdmin() {
  console.log("👤 Creating default admin user...");

  const connection = await mysql.createConnection(dbConfig);

  try {
    // Check if admin user already exists
    const [existingAdmins] = await connection.execute(
      "SELECT id FROM admin_users WHERE username = ?",
      ["admin"]
    );

    if (existingAdmins.length > 0) {
      console.log("ℹ️ Default admin user already exists");
      return;
    }

    // Create default admin user
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
  } catch (error) {
    console.error("❌ Failed to create admin user:", error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

async function createDefaultPanels() {
  console.log("🎯 Creating default panels...");

  const connection = await mysql.createConnection(dbConfig);

  try {
    const defaultPanels = [
      {
        name: "Panel A",
        pointsBalance: 100000,
        openingBalance: 100000,
        closingBalance: 100000,
      },
      {
        name: "Panel B",
        pointsBalance: 100000,
        openingBalance: 100000,
        closingBalance: 100000,
      },
      {
        name: "Panel C",
        pointsBalance: 100000,
        openingBalance: 100000,
        closingBalance: 100000,
      },
    ];

    for (const panel of defaultPanels) {
      // Check if panel already exists
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
  } catch (error) {
    console.error("❌ Failed to create default panels:", error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

async function getDatabaseStatus() {
  console.log("📊 Getting database status...");

  const connection = await mysql.createConnection(dbConfig);

  try {
    const status = {
      database: dbConfig.database,
      tables: {},
      totalRecords: 0,
    };

    // Get record counts for each table
    const tables = [
      "users",
      "admin_users",
      "panels",
      "bankAccounts",
      "players",
      "deposits",
      "withdrawals",
      "gameplayTransactions",
      "transactions",
      "dailyReports",
    ];

    for (const table of tables) {
      try {
        const [result] = await connection.execute(
          `SELECT COUNT(*) as count FROM \`${table}\``
        );
        const count = result[0].count;
        status.tables[table] = count;
        status.totalRecords += count;
      } catch (error) {
        status.tables[table] = "Error";
      }
    }

    console.log("📈 Database Status:");
    console.log(`   Database: ${status.database}`);
    console.log(`   Total Records: ${status.totalRecords}`);
    console.log("   Table Counts:");

    for (const [table, count] of Object.entries(status.tables)) {
      console.log(`     ${table}: ${count}`);
    }

    return status;
  } catch (error) {
    console.error("❌ Failed to get database status:", error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

async function main() {
  console.log("🚀 Starting database setup and migration...\n");

  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.log("⚠️ DATABASE_URL not found in environment variables");
      console.log("💡 Please set DATABASE_URL in your .env file");
      console.log(
        "   Example: DATABASE_URL=mysql://user:password@localhost:3306/khiladi247"
      );
      process.exit(1);
    }

    console.log("📋 Configuration:");
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   Port: ${dbConfig.port}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   User: ${dbConfig.user}`);
    console.log("");

    // Step 1: Create database
    await createDatabaseIfNotExists();

    // Step 2: Run migrations
    await runMigrations();

    // Step 3: Verify tables
    await verifyTables();

    // Step 4: Create default admin
    await createDefaultAdmin();

    // Step 5: Create default panels
    await createDefaultPanels();

    // Step 6: Get status
    const status = await getDatabaseStatus();

    console.log("\n🎉 Database setup completed successfully!");
    console.log("✅ Your Khiladi247 database is ready to use.");
    console.log("");
    console.log("📝 Next steps:");
    console.log("1. Start the application: npm run dev");
    console.log("2. Login with admin credentials");
    console.log("3. Change the default admin password");
    console.log("4. Configure your panels and bank accounts");
  } catch (error) {
    console.error("\n💥 Database setup failed:", error.message);
    console.log("");
    console.log("🔧 Troubleshooting:");
    console.log("1. Ensure MySQL server is running");
    console.log("2. Check database credentials in .env file");
    console.log("3. Verify database user has sufficient privileges");
    console.log("4. Make sure the database port is accessible");
    process.exit(1);
  }
}

// Run the setup
main().catch(console.error);
