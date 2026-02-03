#!/usr/bin/env node

import mysql from "mysql2/promise";

// Database configuration from environment or defaults
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "khiladi247",
};

async function checkDatabase() {
  console.log("🔍 Checking database connection...");
  
  try {
    // Connect to database
    const connection = await mysql.createConnection(dbConfig);
    console.log("✅ Database connected successfully!");
    
    // Check if admin_users table exists
    const [tables] = await connection.execute("SHOW TABLES LIKE 'admin_users'");
    if (tables.length === 0) {
      console.log("❌ admin_users table not found");
      await connection.end();
      return;
    }
    console.log("✅ admin_users table found");
    
    // Get all admin users
    const [admins] = await connection.execute(
      "SELECT id, username, email, full_name, is_active, created_at FROM admin_users"
    );
    
    if (admins.length === 0) {
      console.log("❌ No admin users found in database");
      console.log("\n💡 To create an admin user, run: npm run db:setup");
    } else {
      console.log(`\n📋 Found ${admins.length} admin user(s):`);
      console.log("─".repeat(80));
      
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. ID: ${admin.id}`);
        console.log(`   Username: ${admin.username}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Full Name: ${admin.full_name}`);
        console.log(`   Active: ${admin.is_active ? 'Yes' : 'No'}`);
        console.log(`   Created: ${admin.created_at}`);
        console.log("");
      });
      
      console.log("💡 To reset password, you can run: node scripts/create-admin-standalone.mjs");
    }
    
    await connection.end();
  } catch (error) {
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log("❌ Access denied. Check your database credentials in .env file");
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log("❌ Database 'khiladi247' not found");
      console.log("💡 To create database, run: npm run db:setup");
    } else {
      console.log("❌ Error:", error.message);
    }
  }
}

checkDatabase();
