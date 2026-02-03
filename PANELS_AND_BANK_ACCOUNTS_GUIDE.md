# Panels and Bank Accounts - Complete Working Guide

This guide explains how the Panels and Bank Accounts sections work in the Casino Management Panel, including all formulas and calculations used.

## Table of Contents

1. [Panels Section Overview](#panels-section-overview)
2. [Panel Data Structure](#panel-data-structure)
3. [Panel Calculations Explained](#panel-calculations-explained)
4. [Panel Operations](#panel-operations)
5. [Bank Accounts Section Overview](#bank-accounts-section-overview)
6. [Bank Account Data Structure](#bank-account-data-structure)
7. [Bank Account Calculations Explained](#bank-account-calculations-explained)
8. [Bank Account Operations](#bank-account-operations)
9. [Integration Between Panels and Bank Accounts](#integration-between-panels-and-bank-accounts)

---

## Panels Section Overview

Panels are the core entities representing betting exchange platforms (e.g., TIGEREXCH, DIAMONDEXCH). Each panel maintains its own balance, tracks deposits/withdrawals, and calculates profit/loss.

### Key Features:
- **Points System**: 1 Point = ₹1
- **Balance Tracking**: Opening, closing, and current balances
- **Transaction Management**: Deposits and withdrawals
- **Performance Metrics**: Profit/loss, ROI, utilization rate
- **Top-Up Functionality**: Add points to panel balance

---

## Panel Data Structure

```typescript
interface Panel {
  id: number;                    // Unique identifier
  name: string;                  // Panel name (e.g., "TIGEREXCH")
  pointsBalance: number;         // Current available points
  openingBalance: number;        // Starting balance for the day
  closingBalance: number;        // End of day balance
  topUp: number;                 // Total top-ups added
  extraDeposit: number;          // Extra deposits made
  bonusPoints: number;           // Bonus points awarded
  profitLoss: number;            // Current profit/loss amount
  totalDeposits: number;         // Sum of all deposits
  totalWithdrawals: number;      // Sum of all withdrawals
}
```

---

## Panel Calculations Explained

### 1. Expected Closing Balance

**Formula:**
```
Expected Closing = Opening Balance - Total Deposits + Total Withdrawals
```

**Purpose:**
- Validates if the current closing balance is correct
- Helps detect discrepancies or manual adjustments

**Example:**
```
Opening Balance: ₹10,000
Total Deposits: ₹5,000
Total Withdrawals: ₹3,000
Expected Closing = 10,000 - 5,000 + 3,000 = ₹8,000
```

### 2. Profit/Loss Calculation

**Formula:**
```
Profit/Loss = Total Deposits - Total Withdrawals
```

**Interpretation:**
- **Positive Result**: Profit (withdrawals less than deposits)
- **Negative Result**: Loss (withdrawals exceed deposits)

**Example:**
```
Total Deposits: ₹50,000
Total Withdrawals: ₹45,000
Profit/Loss = 50,000 - 45,000 = ₹5,000 (Profit)
```

### 3. Utilization Rate

**Formula:**
```
Utilization % = (Points Balance / (Opening Balance + Points Balance)) × 100
```

**Purpose:**
- Measures how much of the panel's capacity is being used
- Helps identify underutilized or overextended panels

**Example:**
```
Points Balance: ₹7,000
Opening Balance: ₹10,000
Utilization % = (7,000 / (10,000 + 7,000)) × 100 = 41.18%
```

### 4. ROI (Return on Investment)

**Formula:**
```
ROI % = ((Net Balance - Opening Balance) / Opening Balance) × 100
```

Where Net Balance = Points Balance

**Purpose:**
- Measures the return generated on the opening balance
- Helps evaluate panel performance

**Example:**
```
Opening Balance: ₹10,000
Current Balance: ₹12,000
ROI % = ((12,000 - 10,000) / 10,000) × 100 = 20%
```

### 5. Top-Up Impact

When adding points to a panel:
- **Points Balance** increases by top-up amount
- **Closing Balance** increases by top-up amount
- **Top-Up tracker** accumulates the amount

---

## Panel Operations

### 1. Creating a New Panel

**Initial Values:**
- Opening Balance = Initial Points
- Closing Balance = Initial Points
- Points Balance = Initial Points
- All other values = 0

### 2. Adding Top-Up

**Process:**
1. Select panel
2. Enter points to add
3. System updates:
   - `pointsBalance += topUpAmount`
   - `closingBalance += topUpAmount`
   - `topUp += topUpAmount`

### 3. Deleting a Panel

**Effects:**
- Panel record is deleted
- Transaction history remains intact
- Account balances may need reconciliation

---

## Bank Accounts Section Overview

Bank Accounts track the actual bank transactions associated with the betting operations. Each account maintains deposits, withdrawals, and calculates performance metrics.

### Key Features:
- **Account Tracking**: Multiple bank accounts per panel
- **Transaction Types**: Deposits (D) and Withdrawals (W)
- **Charge Tracking**: Transaction charges deducted
- **Performance Metrics**: ROI, profit/loss, net balance
- **View Modes**: Table and Cards view

---

## Bank Account Data Structure

```typescript
interface BankAccount {
  id: number;
  accountNumber: string;        // Bank account number
  bankName: string;             // Bank name
  accountType: "D" | "W" | "Both"; // Deposit, Withdrawal, or Both
  openingBalance: number;       // Starting balance
  closingBalance: number;       // Current balance
  totalCharges: number;         // Total transaction charges
  totalDeposits: number;        // Sum of deposits
  totalWithdrawals: number;     // Sum of withdrawals
  panelName: string;            // Associated panel
}
```

---

## Bank Account Calculations Explained

### 1. Net Balance Calculation

**Formula:**
```
Net Balance = Closing Balance - Total Charges
```

**Purpose:**
- Shows actual available balance after charges
- Used for ROI calculations

**Example:**
```
Closing Balance: ₹25,000
Total Charges: ₹500
Net Balance = 25,000 - 500 = ₹24,500
```

### 2. ROI Calculation

**Formula:**
```
ROI % = ((Net Balance - Opening Balance) / Opening Balance) × 100
```

**Purpose:**
- Measures return on investment for the bank account
- Helps evaluate account performance

**Example:**
```
Opening Balance: ₹20,000
Net Balance: ₹24,500
ROI % = ((24,500 - 20,000) / 20,000) × 100 = 22.5%
```

### 3. Profit/Loss Status

**Logic:**
```typescript
isProfit = netBalance > openingBalance
isLoss = netBalance < openingBalance
performance = isProfit ? "profitable" : "loss"
```

### 4. Account Type Display

**Visual Representation:**
- **Deposit Only (D)**: Green badge with "D"
- **Withdrawal Only (W)**: Blue badge with "W"
- **Both Types**: Both badges displayed

---

## Bank Account Operations

### 1. Adding a Bank Account

**Required Fields:**
- Account Number
- Bank Name
- Account Type (D/W/Both)
- Opening Balance
- Associated Panel

### 2. Recording Transactions

**Deposits:**
- Increase `totalDeposits`
- Update `closingBalance`

**Withdrawals:**
- Increase `totalWithdrawals`
- Update `closingBalance`

### 3. Charge Deduction

**Process:**
- Charges are deducted from transactions
- Accumulated in `totalCharges`
- Affects net balance calculation

---

## Integration Between Panels and Bank Accounts

### 1. Flow of Funds

```
Bank Account → Panel → Player Bets → Panel → Bank Account
```

1. **Deposit Flow:**
   - Money deposited to bank account
   - Points added to panel
   - Players use points for betting

2. **Withdrawal Flow:**
   - Player wins → Points added to panel
   - Panel balance withdrawn to bank account

### 2. Reconciliation

**Daily Process:**
1. Calculate panel expected closing
2. Verify against actual closing
3. Check bank account balances
4. Identify discrepancies

### 3. Performance Correlation

**Metrics to Compare:**
- Panel profit/loss vs Bank account profit/loss
- Total deposits across both systems
- Withdrawal patterns and timing

---

## Best Practices

### For Panels:
1. **Daily Validation**: Always verify closing balance
2. **Top-Up Management**: Keep track of all top-ups
3. **Utilization Monitoring**: Maintain optimal utilization (60-80%)

### For Bank Accounts:
1. **Charge Tracking**: Monitor all transaction charges
2. **Account Separation**: Keep D and W accounts separate
3. **Regular Reconciliation**: Match with panel balances

### General:
1. **Audit Trail**: Maintain logs of all changes
2. **Backup Data**: Regular backups of balances
3. **Performance Review**: Weekly/monthly performance analysis

---

## Troubleshooting

### Common Issues:

1. **Balance Mismatch**
   - Check: Expected closing vs actual closing
   - Solution: Identify missing or extra transactions

2. **Negative Utilization**
   - Check: Opening balance entry
   - Solution: Correct opening balance

3. **ROI Calculation Errors**
   - Check: Division by zero scenarios
   - Solution: Handle zero opening balance

---

## Example Workflow

### Daily Operations:

1. **Morning Setup**
   - Note opening balances for all panels
   - Verify bank account balances

2. **During Day**
   - Process deposits → Update panels
   - Process withdrawals → Update panels
   - Track all top-ups

3. **Evening Closure**
   - Calculate expected closing balances
   - Verify against actual balances
   - Update bank accounts if needed

4. **Reporting**
   - Generate daily profit/loss reports
   - Compare panel vs bank performance
   - Identify trends and issues

---

## Formulas Quick Reference

| Calculation | Formula | Purpose |
|-------------|---------|---------|
| Panel Expected Closing | Opening - Deposits + Withdrawals | Balance validation |
| Panel P/L | Deposits - Withdrawals | Profit/Loss |
| Panel Utilization | (Points / (Opening + Points)) × 100 | Capacity usage |
| Panel ROI | ((Balance - Opening) / Opening) × 100 | Return measure |
| Bank Net Balance | Closing - Charges | Available funds |
| Bank ROI | ((Net - Opening) / Opening) × 100 | Account performance |

---

## Last Updated

- **Date**: 2026-02-03
- **Version**: 1.0.0
- **Author**: Casino Management System
