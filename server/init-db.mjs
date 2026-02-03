import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

async function initDatabase() {
  console.log("🗄️  Initializing database...");

  let connection;
  try {
    connection = await mysql.createConnection(DATABASE_URL);
    const db = drizzle(connection);

    // Import schema
    const { adminUsers } = await import("../drizzle/schema.ts");
    const { eq } = await import("drizzle-orm");

    // Check if admin exists
    const existing = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, "admin"))
      .limit(1);

    if (existing.length > 0) {
      console.log("✅ Admin user already exists");
      await connection.end();
      return;
    }

    // Create admin user
    const password = "admin123";
    const passwordHash = await bcrypt.hash(password, 10);

    await db.insert(adminUsers).values({
      username: "admin",
      passwordHash,
      email: "admin@khiladi247.com",
      fullName: "System Administrator",
      isActive: true,
    });

    console.log("");
    console.log("═══════════════════════════════════════");
    console.log("  ✅ ADMIN USER CREATED");
    console.log("═══════════════════════════════════════");
    console.log("  Username: admin");
    console.log("  Password: admin123");
    console.log("═══════════════════════════════════════");
    console.log("");

    await connection.end();
  } catch (error) {
    console.error("❌ Database init error:", error.message);
    if (connection) await connection.end();
  }
}

initDatabase();
