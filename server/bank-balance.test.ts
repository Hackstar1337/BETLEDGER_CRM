import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import * as db from "./db";
import {
  bankAccounts,
  deposits,
  withdrawals,
  players,
  panels,
} from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Bank Account Balance Calculations", () => {
  let testBankName: string;
  let testPlayerUserId: string;
  let testPanelName: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    testBankName = `TEST_BANK_BAL_${timestamp}`;
    testPlayerUserId = `TEST_PLAYER_BAL_${timestamp}`;
    testPanelName = `TEST_PANEL_BAL_${timestamp}`;

    // Create test panel
    await db.createPanel({
      name: testPanelName,
      pointsBalance: 100000,
      openingBalance: 0,
      closingBalance: 0,
      settling: 0,
      extraDeposit: 0,
      bonusPoints: 0,
      profitLoss: 0,
    });

    // Create test bank account with opening balance
    const database = await getDb();
    if (database) {
      await database.insert(bankAccounts).values({
        bankName: testBankName,
        accountHolderName: "Test Account",
        accountNumber: "1234567890",
        ifscCode: "TEST0001",
        accountType: "Deposit",
        openingBalance: 5000, // Start with 5000
        closingBalance: 5000, // Should match opening balance initially
        feeIMPS: 5,
        feeRTGS: 10,
        feeNEFT: 5,
        feeUPI: 0,
        feePhonePe: 0,
        feeGooglePay: 0,
        feePaytm: 0,
        totalCharges: 0,
      });
    }

    // Create test player
    await db.createPlayer({
      userId: testPlayerUserId,
      name: `Test Player ${timestamp}`,
      panelName: testPanelName,
      balance: 0,
    });
  });

  it("should initialize closing balance equal to opening balance", async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    const bank = await database
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.bankName, testBankName))
      .limit(1);

    expect(bank[0].openingBalance).toBe(5000);
    expect(bank[0].closingBalance).toBe(5000);
  });

  it("should add deposit amount to closing balance (not overwrite)", async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    // Get initial closing balance
    const bankBefore = await database
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.bankName, testBankName))
      .limit(1);
    const initialClosing = bankBefore[0].closingBalance;

    // Create deposit
    await db.createDeposit({
      userId: testPlayerUserId,
      amount: 500,
      bonusPoints: 0,
      bankName: testBankName,
      panelName: testPanelName,
      isExtraDeposit: 0,
      isWrongDeposit: 0,
      depositDate: new Date(),
    });

    // Check closing balance increased by deposit amount
    const bankAfter = await database
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.bankName, testBankName))
      .limit(1);
    const finalClosing = bankAfter[0].closingBalance;

    expect(finalClosing).toBe(initialClosing + 500); // Should be 5500
  });

  it("should correctly calculate closing balance after multiple deposits", async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    // Get current closing balance
    const bankBefore = await database
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.bankName, testBankName))
      .limit(1);
    const initialClosing = bankBefore[0].closingBalance;

    // Create two more deposits
    await db.createDeposit({
      userId: testPlayerUserId,
      amount: 1000,
      bonusPoints: 0,
      bankName: testBankName,
      panelName: testPanelName,
      isExtraDeposit: 0,
      isWrongDeposit: 0,
      depositDate: new Date(),
    });

    await db.createDeposit({
      userId: testPlayerUserId,
      amount: 1500,
      bonusPoints: 0,
      bankName: testBankName,
      panelName: testPanelName,
      isExtraDeposit: 0,
      isWrongDeposit: 0,
      depositDate: new Date(),
    });

    // Check closing balance increased by total deposits
    const bankAfter = await database
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.bankName, testBankName))
      .limit(1);
    const finalClosing = bankAfter[0].closingBalance;

    expect(finalClosing).toBe(initialClosing + 2500); // Added 1000 + 1500
  });

  it("should correctly show total deposits for bank account", async () => {
    const totalDeposits = await db.getTotalDepositsByBank(testBankName);

    // We made 3 deposits: 500 + 1000 + 1500 = 3000
    expect(Number(totalDeposits)).toBe(3000);
  });

  it("should subtract withdrawal from closing balance", async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    // Update bank account type to Withdrawal
    await database
      .update(bankAccounts)
      .set({ accountType: "Withdrawal" })
      .where(eq(bankAccounts.bankName, testBankName));

    // Get current closing balance
    const bankBefore = await database
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.bankName, testBankName))
      .limit(1);
    const initialClosing = bankBefore[0].closingBalance;

    // Create withdrawal
    await db.createWithdrawal({
      userId: testPlayerUserId,
      amount: 500,
      bankName: testBankName,
      panelName: testPanelName,
      paymentMethod: "UPI",
      transactionCharge: 0,
      withdrawalDate: new Date(),
    });

    // Check closing balance decreased by withdrawal amount
    const bankAfter = await database
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.bankName, testBankName))
      .limit(1);
    const finalClosing = bankAfter[0].closingBalance;

    expect(finalClosing).toBe(initialClosing - 500);
  });

  it("should verify formula: Opening + Deposits - Withdrawals = Closing", async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    const bank = await database
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.bankName, testBankName))
      .limit(1);

    const opening = bank[0].openingBalance;
    const closing = bank[0].closingBalance;
    const totalDeposits = await db.getTotalDepositsByBank(testBankName);

    // Opening: 5000
    // Deposits: 3000 (500 + 1000 + 1500)
    // Withdrawals: 500
    // Expected Closing: 5000 + 3000 - 500 = 7500

    expect(opening).toBe(5000);
    expect(Number(totalDeposits)).toBe(3000);
    expect(closing).toBe(7500);
  });
});
