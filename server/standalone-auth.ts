import bcrypt from "bcryptjs";
import { adminUsers, type AdminUser } from "../drizzle/schema";
import { getDb } from "./db";
import { eq } from "drizzle-orm";

/**
 * Standalone authentication helper functions
 * For independent deployment without Manus OAuth
 */

/**
 * Hash a plain text password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a plain text password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create a new admin user
 */
export async function createAdminUser(
  username: string,
  password: string,
  email?: string,
  fullName?: string
): Promise<AdminUser | null> {
  const db = await getDb();
  if (!db) return null;

  const passwordHash = await hashPassword(password);

  await db.insert(adminUsers).values({
    username,
    passwordHash,
    email,
    fullName,
    isActive: true,
  });

  // Fetch the created user by username
  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.username, username));

  return user || null;
}

/**
 * Authenticate admin user with username and password
 */
export async function authenticateAdmin(
  username: string,
  password: string
): Promise<AdminUser | null> {
  const db = await getDb();
  if (!db) return null;

  // Find user by username
  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.username, username))
    .limit(1);

  if (!user || !user.isActive) {
    return null;
  }

  // Verify password
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  // Update last login time
  await db
    .update(adminUsers)
    .set({ lastLoginAt: new Date() })
    .where(eq(adminUsers.id, user.id));

  return user;
}

/**
 * Get admin user by ID
 */
export async function getAdminUserById(id: number): Promise<AdminUser | null> {
  const db = await getDb();
  if (!db) return null;

  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);

  return user || null;
}

/**
 * Get admin user by username
 */
export async function getAdminUserByUsername(
  username: string
): Promise<AdminUser | null> {
  const db = await getDb();
  if (!db) return null;

  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.username, username))
    .limit(1);

  return user || null;
}

/**
 * Update admin password
 */
export async function updateAdminPassword(
  userId: number,
  newPassword: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const passwordHash = await hashPassword(newPassword);

  await db
    .update(adminUsers)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(adminUsers.id, userId));

  return true;
}

/**
 * Generate a random secure password
 */
export function generateSecurePassword(length: number = 16): string {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }

  return password;
}
