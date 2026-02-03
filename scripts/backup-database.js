#!/usr/bin/env node

/**
 * Database Backup Script
 * Creates comprehensive backups of the Khiladi247 database
 */

import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema.js";
import { writeFileSync, existsSync, mkdirSync } from "fs";
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
};

async function getDatabase() {
  const connection = await mysql.createConnection(dbConfig);
  return drizzle(connection, { schema, mode: "default" });
}

async function createFullBackup() {
  console.log("💾 Creating full database backup...");

  const db = await getDatabase();

  try {
    const backup = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        database: dbConfig.database,
        description: "Khiladi247 Full Database Backup",
      },
      data: {
        users: await db.select().from(schema.users),
        adminUsers: await db.select().from(schema.adminUsers),
        panels: await db.select().from(schema.panels),
        bankAccounts: await db.select().from(schema.bankAccounts),
        players: await db.select().from(schema.players),
        deposits: await db.select().from(schema.deposits),
        withdrawals: await db.select().from(schema.withdrawals),
        gameplayTransactions: await db
          .select()
          .from(schema.gameplayTransactions),
        transactions: await db.select().from(schema.transactions),
        dailyReports: await db.select().from(schema.dailyReports),
      },
      statistics: {},
    };

    // Calculate statistics
    backup.statistics = {
      totalUsers: backup.data.users.length,
      totalAdminUsers: backup.data.adminUsers.length,
      totalPanels: backup.data.panels.length,
      totalBankAccounts: backup.data.bankAccounts.length,
      totalPlayers: backup.data.players.length,
      totalDeposits: backup.data.deposits.length,
      totalWithdrawals: backup.data.withdrawals.length,
      totalGameplayTransactions: backup.data.gameplayTransactions.length,
      totalTransactions: backup.data.transactions.length,
      totalDailyReports: backup.data.dailyReports.length,
      totalProfitLoss: backup.data.panels.reduce(
        (sum, panel) => sum + (panel.profitLoss || 0),
        0
      ),
      totalDepositsAmount: backup.data.deposits.reduce(
        (sum, deposit) => sum + (deposit.amount || 0),
        0
      ),
      totalWithdrawalsAmount: backup.data.withdrawals.reduce(
        (sum, withdrawal) => sum + (withdrawal.amount || 0),
        0
      ),
    };

    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = join(
      __dirname,
      "../backups",
      `khiladi247-backup-${timestamp}.json`
    );

    // Ensure backups directory exists
    const backupsDir = dirname(backupPath);
    if (!existsSync(backupsDir)) {
      mkdirSync(backupsDir, { recursive: true });
    }

    // Write backup file
    writeFileSync(backupPath, JSON.stringify(backup, null, 2));

    console.log(`✅ Full backup created: ${backupPath}`);
    console.log(`📊 Backup Statistics:`);
    console.log(`   Users: ${backup.statistics.totalUsers}`);
    console.log(`   Admin Users: ${backup.statistics.totalAdminUsers}`);
    console.log(`   Panels: ${backup.statistics.totalPanels}`);
    console.log(`   Players: ${backup.statistics.totalPlayers}`);
    console.log(
      `   Deposits: ${backup.statistics.totalDeposits} (₹${backup.statistics.totalDepositsAmount.toLocaleString("en-IN")})`
    );
    console.log(
      `   Withdrawals: ${backup.statistics.totalWithdrawals} (₹${backup.statistics.totalWithdrawalsAmount.toLocaleString("en-IN")})`
    );
    console.log(
      `   Total P/L: ₹${backup.statistics.totalProfitLoss.toLocaleString("en-IN")}`
    );

    return backupPath;
  } catch (error) {
    console.error("❌ Full backup failed:", error.message);
    throw error;
  }
}

async function createSQLBackup() {
  console.log("💾 Creating SQL backup...");

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const sqlBackupPath = join(
      __dirname,
      "../backups",
      `khiladi247-sql-backup-${timestamp}.sql`
    );

    // Ensure backups directory exists
    const backupsDir = dirname(sqlBackupPath);
    if (!existsSync(backupsDir)) {
      mkdirSync(backupsDir, { recursive: true });
    }

    // This would require mysqldump command line tool
    // For now, we'll create a placeholder
    const sqlBackup = `-- Khiladi247 SQL Backup
-- Generated on: ${new Date().toISOString()}
-- Database: ${dbConfig.database}

-- Note: This is a placeholder. For full SQL backups, use:
-- mysqldump -u ${dbConfig.user} -p ${dbConfig.database} > backup.sql

-- Tables to backup:
-- users, admin_users, panels, bankAccounts, players, deposits, withdrawals, gameplayTransactions, transactions, dailyReports
`;

    writeFileSync(sqlBackupPath, sqlBackup);

    console.log(`✅ SQL backup placeholder created: ${sqlBackupPath}`);
    console.log(
      "💡 For full SQL backup, use: mysqldump -u root -p khiladi247 > backup.sql"
    );

    return sqlBackupPath;
  } catch (error) {
    console.error("❌ SQL backup failed:", error.message);
    throw error;
  }
}

async function listBackups() {
  console.log("📋 Listing existing backups...");

  const backupsDir = join(__dirname, "../backups");

  if (!existsSync(backupsDir)) {
    console.log("ℹ️ No backups directory found");
    return [];
  }

  try {
    const fs = await import("fs");
    const files = await fs.promises.readdir(backupsDir);
    const backupFiles = files.filter(
      file => file.startsWith("khiladi247-backup-") && file.endsWith(".json")
    );

    if (backupFiles.length === 0) {
      console.log("ℹ️ No backup files found");
      return [];
    }

    console.log(`📁 Found ${backupFiles.length} backup files:`);

    for (const file of backupFiles.slice(-10)) {
      // Show last 10 backups
      const filePath = join(backupsDir, file);
      const stats = await fs.promises.stat(filePath);
      const fileSize = (stats.size / 1024 / 1024).toFixed(2); // Size in MB

      console.log(
        `   ${file} (${fileSize} MB, ${stats.mtime.toLocaleString()})`
      );
    }

    return backupFiles;
  } catch (error) {
    console.error("❌ Failed to list backups:", error.message);
    throw error;
  }
}

async function cleanupOldBackups(keepCount = 10) {
  console.log(`🧹 Cleaning up old backups (keeping last ${keepCount})...`);

  const backupsDir = join(__dirname, "../backups");

  if (!existsSync(backupsDir)) {
    console.log("ℹ️ No backups directory found");
    return;
  }

  try {
    const fs = await import("fs");
    const files = await fs.promises.readdir(backupsDir);
    const backupFiles = files
      .filter(
        file => file.startsWith("khiladi247-backup-") && file.endsWith(".json")
      )
      .map(file => ({
        name: file,
        path: join(backupsDir, file),
        time: fs.statSync(join(backupsDir, file)).mtime,
      }))
      .sort((a, b) => b.time - a.time); // Sort by time (newest first)

    if (backupFiles.length <= keepCount) {
      console.log("ℹ️ No backups to clean up");
      return;
    }

    const filesToDelete = backupFiles.slice(keepCount);

    for (const file of filesToDelete) {
      await fs.promises.unlink(file.path);
      console.log(`🗑️ Deleted: ${file.name}`);
    }

    console.log(`✅ Cleaned up ${filesToDelete.length} old backups`);
  } catch (error) {
    console.error("❌ Backup cleanup failed:", error.message);
    throw error;
  }
}

async function main() {
  console.log("🚀 Starting database backup...\n");

  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.log("⚠️ DATABASE_URL not found in environment variables");
      process.exit(1);
    }

    const command = process.argv[2] || "full";

    switch (command) {
      case "full":
        await createFullBackup();
        await cleanupOldBackups();
        break;

      case "sql":
        await createSQLBackup();
        break;

      case "list":
        await listBackups();
        break;

      case "cleanup":
        const keepCount = parseInt(process.argv[3]) || 10;
        await cleanupOldBackups(keepCount);
        break;

      default:
        console.log(
          "Usage: npm run db:backup [full|sql|list|cleanup] [keepCount]"
        );
        console.log("  full    - Create full JSON backup (default)");
        console.log("  sql     - Create SQL backup placeholder");
        console.log("  list    - List existing backups");
        console.log("  cleanup - Clean up old backups (keep last N)");
        process.exit(1);
    }

    console.log("\n🎉 Backup operation completed successfully!");
  } catch (error) {
    console.error("\n💥 Backup operation failed:", error.message);
    console.log("");
    console.log("🔧 Troubleshooting:");
    console.log("1. Ensure database is accessible");
    console.log("2. Check database credentials");
    console.log("3. Verify write permissions for backups directory");
    process.exit(1);
  }
}

// Run the backup
main().catch(console.error);
