import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { adminUsers } from "./drizzle/schema.ts";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const admin = await db
  .select()
  .from(adminUsers)
  .where(eq(adminUsers.username, "admin"))
  .limit(1);

if (admin.length > 0) {
  console.log("Admin user found:");
  console.log("Username:", admin[0].username);
  console.log("Email:", admin[0].email);
  console.log("Password hash:", admin[0].passwordHash.substring(0, 20) + "...");

  // Test old password
  const oldPasswordMatch = await bcrypt.compare(
    "xxdXZZsyrL*S3cD8",
    admin[0].passwordHash
  );
  console.log("\nOld password (xxdXZZsyrL*S3cD8) matches:", oldPasswordMatch);

  // Test new password
  const newPasswordMatch = await bcrypt.compare(
    "NewPassword@123",
    admin[0].passwordHash
  );
  console.log("New password (NewPassword@123) matches:", newPasswordMatch);
} else {
  console.log("No admin user found");
}

await connection.end();
