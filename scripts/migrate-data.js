#!/usr/bin/env node

/**
 * Data Migration Script
 * This script handles migrating data from local storage or other sources to the database
 */

import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import bcrypt from "bcryptjs";
import * as schema from "../drizzle/schema.js";
import { readFileSync, existsSync } from "fs";
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

async function migrateFromLocalStorage() {
  console.log("📦 Checking for local storage data...");

  const db = await getDatabase();

  try {
    // Look for local storage files or JSON exports
    const dataFiles = [
      "local-data.json",
      "panels-data.json",
      "transactions-data.json",
      "players-data.json",
    ];

    let migratedData = {
      panels: 0,
      players: 0,
      deposits: 0,
      withdrawals: 0,
      transactions: 0,
    };

    for (const filename of dataFiles) {
      const filePath = join(__dirname, "../data", filename);

      if (existsSync(filePath)) {
        console.log(`📄 Found data file: ${filename}`);

        try {
          const data = JSON.parse(readFileSync(filePath, "utf8"));

          if (filename === "panels-data.json" && Array.isArray(data)) {
            for (const panel of data) {
              await db
                .insert(schema.panels)
                .values({
                  name: panel.name || `Panel ${panel.id}`,
                  pointsBalance: panel.pointsBalance || panel.balance || 0,
                  openingBalance: panel.openingBalance || 0,
                  closingBalance: panel.closingBalance || panel.balance || 0,
                  settling: panel.settling || 0,
                  extraDeposit: panel.extraDeposit || 0,
                  bonusPoints: panel.bonusPoints || 0,
                  profitLoss: panel.profitLoss || 0,
                })
                .onConflictDoNothing();
              migratedData.panels++;
            }
          }

          if (filename === "players-data.json" && Array.isArray(data)) {
            for (const player of data) {
              await db
                .insert(schema.players)
                .values({
                  userId: player.userId || player.id,
                  name: player.name,
                  panelName: player.panelName,
                  balance: player.balance || "0.00",
                })
                .onConflictDoNothing();
              migratedData.players++;
            }
          }

          if (filename === "transactions-data.json" && Array.isArray(data)) {
            for (const transaction of data) {
              if (transaction.type === "deposit" || transaction.depositAmount) {
                await db
                  .insert(schema.deposits)
                  .values({
                    userId: transaction.userId || transaction.playerId,
                    amount: transaction.amount || transaction.depositAmount,
                    utr: transaction.utr,
                    bankName: transaction.bankName,
                    panelName: transaction.panelName,
                    bonusPoints: transaction.bonusPoints || 0,
                    isExtraDeposit: transaction.isExtraDeposit || 0,
                    isWrongDeposit: transaction.isWrongDeposit || 0,
                    depositDate: transaction.date
                      ? new Date(transaction.date)
                      : new Date(),
                  })
                  .onConflictDoNothing();
                migratedData.deposits++;
              } else if (
                transaction.type === "withdrawal" ||
                transaction.withdrawalAmount
              ) {
                await db
                  .insert(schema.withdrawals)
                  .values({
                    userId: transaction.userId || transaction.playerId,
                    amount: transaction.amount || transaction.withdrawalAmount,
                    utr: transaction.utr,
                    bankName: transaction.bankName,
                    panelName: transaction.panelName,
                    paymentMethod: transaction.paymentMethod || "IMPS",
                    transactionCharge: transaction.transactionCharge || 0,
                    isExtraWithdrawal: transaction.isExtraWithdrawal || 0,
                    isWrongWithdrawal: transaction.isWrongWithdrawal || 0,
                    status: transaction.status || "pending",
                    withdrawalDate: transaction.date
                      ? new Date(transaction.date)
                      : new Date(),
                  })
                  .onConflictDoNothing();
                migratedData.withdrawals++;
              }
            }
          }

          console.log(`✅ Migrated data from ${filename}`);
        } catch (parseError) {
          console.error(`❌ Failed to parse ${filename}:`, parseError.message);
        }
      }
    }

    console.log("📊 Migration Summary:");
    console.log(`   Panels: ${migratedData.panels}`);
    console.log(`   Players: ${migratedData.players}`);
    console.log(`   Deposits: ${migratedData.deposits}`);
    console.log(`   Withdrawals: ${migratedData.withdrawals}`);

    return migratedData;
  } catch (error) {
    console.error("❌ Local storage migration failed:", error.message);
    throw error;
  }
}

async function createSampleData() {
  console.log("🎲 Creating sample data for testing...");

  const db = await getDatabase();

  try {
    // Create sample bank accounts
    const sampleBankAccounts = [
      {
        accountHolderName: "John Doe",
        accountNumber: "1234567890",
        bankName: "ICICI Bank",
        accountType: "Deposit",
        openingBalance: 100000,
        closingBalance: 100000,
        totalCharges: 0,
        feeIMPS: 5,
        feeRTGS: 25,
        feeNEFT: 0,
        feeUPI: 0,
        feePhonePe: 0,
        feeGooglePay: 0,
        feePaytm: 0,
        isActive: 1,
      },
      {
        accountHolderName: "Jane Smith",
        accountNumber: "0987654321",
        bankName: "HDFC Bank",
        accountType: "Withdrawal",
        openingBalance: 50000,
        closingBalance: 50000,
        totalCharges: 0,
        feeIMPS: 5,
        feeRTGS: 25,
        feeNEFT: 0,
        feeUPI: 0,
        feePhonePe: 0,
        feeGooglePay: 0,
        feePaytm: 0,
        isActive: 1,
      },
    ];

    for (const account of sampleBankAccounts) {
      await db
        .insert(schema.bankAccounts)
        .values(account)
        .onConflictDoNothing();
    }

    // Create sample players
    const samplePlayers = [
      {
        userId: "PLAYER001",
        name: "Alice Johnson",
        panelName: "Panel A",
        balance: "5000.00",
      },
      {
        userId: "PLAYER002",
        name: "Bob Wilson",
        panelName: "Panel A",
        balance: "3000.00",
      },
      {
        userId: "PLAYER003",
        name: "Charlie Brown",
        panelName: "Panel B",
        balance: "7500.00",
      },
      {
        userId: "PLAYER004",
        name: "Diana Prince",
        panelName: "Panel B",
        balance: "2000.00",
      },
      {
        userId: "PLAYER005",
        name: "Edward Norton",
        panelName: "Panel C",
        balance: "10000.00",
      },
    ];

    for (const player of samplePlayers) {
      await db.insert(schema.players).values(player).onConflictDoNothing();
    }

    // Create sample deposits
    const sampleDeposits = [
      {
        userId: "PLAYER001",
        amount: 1000,
        utr: "UTR123456789",
        bankName: "ICICI Bank",
        panelName: "Panel A",
        bonusPoints: 50,
        depositDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        userId: "PLAYER002",
        amount: 500,
        utr: "UTR987654321",
        bankName: "HDFC Bank",
        panelName: "Panel A",
        bonusPoints: 25,
        depositDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        userId: "PLAYER003",
        amount: 2000,
        utr: "UTR456789123",
        bankName: "ICICI Bank",
        panelName: "Panel B",
        bonusPoints: 100,
        depositDate: new Date(), // Today
      },
    ];

    for (const deposit of sampleDeposits) {
      await db.insert(schema.deposits).values(deposit).onConflictDoNothing();
    }

    // Create sample withdrawals
    const sampleWithdrawals = [
      {
        userId: "PLAYER004",
        amount: 300,
        utr: "UTR789123456",
        bankName: "HDFC Bank",
        panelName: "Panel B",
        paymentMethod: "IMPS",
        transactionCharge: 5,
        status: "approved",
        withdrawalDate: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      },
      {
        userId: "PLAYER005",
        amount: 1500,
        utr: "UTR321654987",
        bankName: "ICICI Bank",
        panelName: "Panel C",
        paymentMethod: "UPI",
        transactionCharge: 0,
        status: "pending",
        withdrawalDate: new Date(), // Today
      },
    ];

    for (const withdrawal of sampleWithdrawals) {
      await db
        .insert(schema.withdrawals)
        .values(withdrawal)
        .onConflictDoNothing();
    }

    // Create sample gameplay transactions
    const sampleGameplay = [
      {
        userId: "PLAYER001",
        panelName: "Panel A",
        transactionType: "Win",
        amount: 500,
        notes: "Cricket match winnings",
        transactionDate: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      },
      {
        userId: "PLAYER002",
        panelName: "Panel A",
        transactionType: "Loss",
        amount: 200,
        notes: "Football match loss",
        transactionDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        userId: "PLAYER003",
        panelName: "Panel B",
        transactionType: "Win",
        amount: 1000,
        notes: "Tennis tournament winnings",
        transactionDate: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      },
    ];

    for (const gameplay of sampleGameplay) {
      await db
        .insert(schema.gameplayTransactions)
        .values(gameplay)
        .onConflictDoNothing();
    }

    console.log("✅ Sample data created successfully");
    console.log("📊 Sample Data Summary:");
    console.log("   Bank Accounts: 2");
    console.log("   Players: 5");
    console.log("   Deposits: 3");
    console.log("   Withdrawals: 2");
    console.log("   Gameplay Transactions: 3");
  } catch (error) {
    console.error("❌ Sample data creation failed:", error.message);
    throw error;
  }
}

async function backupExistingData() {
  console.log("💾 Creating backup of existing data...");

  const db = await getDatabase();

  try {
    const backup = {
      timestamp: new Date().toISOString(),
      data: {
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
        adminUsers: await db.select().from(schema.adminUsers),
      },
    };

    // Save backup to file
    const backupPath = join(
      __dirname,
      "../backups",
      `backup-${Date.now()}.json`
    );

    // Ensure backups directory exists
    const backupsDir = dirname(backupPath);
    if (!existsSync(backupsDir)) {
      await import("fs").then(fs =>
        fs.promises.mkdir(backupsDir, { recursive: true })
      );
    }

    await import("fs").then(fs =>
      fs.promises.writeFile(backupPath, JSON.stringify(backup, null, 2))
    );

    console.log(`✅ Backup created: ${backupPath}`);
    console.log(`📊 Backup size: ${JSON.stringify(backup).length} characters`);

    return backupPath;
  } catch (error) {
    console.error("❌ Backup creation failed:", error.message);
    throw error;
  }
}

async function main() {
  console.log("🚀 Starting data migration...\n");

  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.log("⚠️ DATABASE_URL not found in environment variables");
      process.exit(1);
    }

    console.log("📦 Step 1: Creating backup of existing data...");
    await backupExistingData();

    console.log("\n📦 Step 2: Migrating from local storage...");
    const migrationResults = await migrateFromLocalStorage();

    console.log("\n📦 Step 3: Creating sample data...");
    await createSampleData();

    console.log("\n🎉 Data migration completed successfully!");
    console.log("✅ Your data has been migrated to the database.");
    console.log("");
    console.log("📝 Migration Summary:");
    console.log(`   Panels migrated: ${migrationResults.panels}`);
    console.log(`   Players migrated: ${migrationResults.players}`);
    console.log(`   Deposits migrated: ${migrationResults.deposits}`);
    console.log(`   Withdrawals migrated: ${migrationResults.withdrawals}`);
    console.log("   Sample data created for testing");
  } catch (error) {
    console.error("\n💥 Data migration failed:", error.message);
    console.log("");
    console.log("🔧 Troubleshooting:");
    console.log("1. Ensure database is properly set up");
    console.log("2. Check database connection");
    console.log("3. Verify database user has sufficient privileges");
    process.exit(1);
  }
}

// Run the migration
main().catch(console.error);
