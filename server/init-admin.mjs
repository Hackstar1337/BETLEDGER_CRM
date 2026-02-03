/**
 * Initialize default admin user
 * Run this script once to create the first admin account
 * Usage: node server/init-admin.mjs
 */

import {
  createAdminUser,
  generateSecurePassword,
  getAdminUserByUsername,
} from "./standalone-auth.ts";

async function initializeAdmin() {
  console.log("🔐 Initializing admin user...\n");

  try {
    // Check if admin already exists
    const existingAdmin = await getAdminUserByUsername("admin");
    if (existingAdmin) {
      console.log("✅ Admin user already exists!");
      console.log(`   Username: admin`);
      console.log(`   Email: ${existingAdmin.email || "Not set"}`);
      console.log(`   Created: ${existingAdmin.createdAt}`);
      console.log(
        "\n💡 To reset password, use the password change feature in the app."
      );
      return;
    }

    // Generate secure password
    const password = generateSecurePassword(16);

    // Create admin user
    const admin = await createAdminUser(
      "admin",
      password,
      "admin@khiladi247.com",
      "System Administrator"
    );

    if (admin) {
      console.log("✅ Admin user created successfully!\n");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("   🔑 ADMIN CREDENTIALS");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`   Username: admin`);
      console.log(`   Password: ${password}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      console.log("⚠️  IMPORTANT: Save these credentials securely!");
      console.log("   This password will not be shown again.");
      console.log("   You can change it after first login.\n");
    } else {
      console.error("❌ Failed to create admin user");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Initialization failed:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

// Run initialization
initializeAdmin()
  .then(() => {
    console.log("✨ Initialization complete!");
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ Initialization failed:", error);
    process.exit(1);
  });
