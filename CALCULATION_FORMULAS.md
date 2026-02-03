# Calculation Formulas Documentation

This document contains all the calculation formulas used in the Casino Management Panel application.

## Table of Contents

1. [Currency Formatting](#currency-formatting)
2. [Panel Calculations](#panel-calculations)
3. [Bank Account Calculations](#bank-account-calculations)
4. [Transaction Calculations](#transaction-calculations)
5. [Time and Date Calculations](#time-and-date-calculations)
6. [Gameplay Calculations](#gameplay-calculations)
7. [Analytics Calculations](#analytics-calculations)
8. [Validation Calculations](#validation-calculations)
9. [Miscellaneous Calculations](#miscellaneous-calculations)

---

## Currency Formatting

### `formatCurrency(amount)`
Formats a number as Indian Rupees (₹)
- **Input**: Number (e.g., 12345.67)
- **Output**: String (e.g., "₹12,346")
- **Usage**: Display monetary values throughout the application

### `formatNumber(num)`
Formats a number using Indian locale
- **Input**: Number (e.g., 1234567)
- **Output**: String (e.g., "12,34,567")
- **Usage**: Display large numbers with proper formatting

---

## Panel Calculations

### Expected Closing Balance
```
Expected Closing = Opening Balance - Total Deposits + Total Withdrawals
```
- **Purpose**: Verify if the current closing balance is correct
- **Function**: `calculateExpectedClosing(panel)`

### Profit/Loss
```
Profit/Loss = Total Deposits - Total Withdrawals
```
- **Purpose**: Calculate overall profit or loss for a panel
- **Function**: `calculateProfitLoss(panel)`
- **Positive**: Profit
- **Negative**: Loss

### Utilization Rate
```
Utilization % = (Points Balance / (Opening Balance + Points Balance)) × 100
```
- **Purpose**: Measure how much of the panel's capacity is used
- **Function**: `calculateUtilizationRate(panel)`
- **Range**: 0% to 100%

### ROI (Return on Investment)
```
ROI % = ((Net Balance - Opening Balance) / Opening Balance) × 100
```
- **Purpose**: Calculate return percentage on investment
- **Function**: `calculateROI(openingBalance, netBalance)`
- **Note**: Returns "0.00" if opening balance is 0

### Net Balance
```
Net Balance = Closing Balance - Total Charges
```
- **Purpose**: Calculate actual balance after deducting charges
- **Function**: `calculateNetBalance(closingBalance, totalCharges)`

---

## Bank Account Calculations

### Bank Account Performance
Calculates multiple metrics for bank accounts:
- **Net Balance**: Closing balance minus charges
- **Profit/Loss Status**: Whether the account is profitable
- **ROI Percentage**: Return on investment
- **Function**: `calculateBankAccountPerformance(account)`

---

## Transaction Calculations

### Transaction Velocity
```
Transactions per Hour = Total Transactions / Hours Elapsed
```
- **Purpose**: Measure transaction frequency
- **Function**: `calculateTransactionVelocity(count, startTime, endTime)`

### Net Cash Flow
```
Net Cash Flow = Total Deposits - Total Withdrawals
```
- **Purpose**: Calculate net money movement
- **Function**: `calculateNetCashFlow(deposits, withdrawals)`

### Trend Percentage
```
Trend % = ((Current - Previous) / |Previous|) × 100
```
- **Purpose**: Compare current period with previous period
- **Function**: `calculateTrendPercentage(current, previous)`
- **Positive**: Growth
- **Negative**: Decline

---

## Time and Date Calculations

### Timezone Offset
Converts timezone string to minutes offset from UTC
- **Input**: "GMT+5:30" → **Output**: 330 minutes
- **Function**: `getTimezoneOffset(timezone)`

### Date Range
Calculates start and end dates based on time range
- **Ranges**: "1h", "6h", "24h", "7d"
- **Function**: `getDateRange(timeRange, timezone)`
- **Returns**: UTC dates for database queries

---

## Gameplay Calculations

### Expected Winning
```
Expected Winning = Bet Amount × Odds
```
- **Purpose**: Calculate potential winning amount
- **Function**: `calculateExpectedWinning(betAmount, odds)`

### Bet Profit
```
Profit = (Bet Amount × Odds) - Bet Amount
```
- **Purpose**: Calculate profit from winning bet
- **Function**: `calculateBetProfit(betAmount, odds)`

### Commission
```
Commission = Amount × (Commission Rate / 100)
```
- **Purpose**: Calculate commission on transactions
- **Function**: `calculateCommission(amount, commissionRate)`

---

## Analytics Calculations

### Active Players
Counts unique users across all transaction types
- **Sources**: Deposits, Withdrawals, Gameplay
- **Function**: `calculateActivePlayers(deposits, withdrawals, gameplay)`

### Average Transaction
```
Average = Total Amount / Transaction Count
```
- **Purpose**: Calculate average transaction value
- **Function**: `calculateAverageTransaction(totalAmount, count)`

### Percentage Change
```
Change % = ((Current - Previous) / Previous) × 100
```
- **Purpose**: Calculate percentage change between two values
- **Function**: `calculatePercentageChange(current, previous)`

---

## Validation Calculations

### Closing Balance Validation
Verifies if the closing balance matches the expected calculation
- **Function**: `validateClosingBalance(panel)`
- **Returns**: Boolean (true if valid)
- **Tolerance**: ±0.01 for rounding errors

### Balance Correction Check
Determines if a balance needs correction
- **Function**: `needsBalanceCorrection(panel)`
- **Returns**: Boolean (true if correction needed)

---

## Miscellaneous Calculations

### Settlement Amount
```
Settlement = Balance × Settlement Rate
```
- **Default Rate**: 10% (0.1)
- **Function**: `calculateSettlement(balance, rate)`

### Bonus Points
```
Bonus Points = Floor(Deposit Amount × Bonus Rate)
```
- **Purpose**: Calculate bonus points from deposits
- **Function**: `calculateBonusPoints(amount, rate)`

### Points Rounding
Rounds amount to nearest integer for points system
- **Function**: `roundToPoints(amount)`

### Daily Rate
```
Daily Rate = Annual Rate / 365
```
- **Purpose**: Convert annual rate to daily rate
- **Function**: `calculateDailyRate(annualRate)`

---

## Usage Examples

```typescript
import { Calculations } from '@/shared/_core';

// Panel calculations
const expected = Calculations.calculateExpectedClosing(panel);
const profit = Calculations.calculateProfitLoss(panel);
const roi = Calculations.calculateROI(panel.openingBalance, netBalance);

// Bank account performance
const performance = Calculations.calculateBankAccountPerformance(account);

// Analytics
const activePlayers = Calculations.calculateActivePlayers(deposits, withdrawals, gameplay);
const trend = Calculations.calculateTrendPercentage(current, previous);

// Currency formatting
const formatted = Calculations.formatCurrency(12345.67); // "₹12,346"
```

---

## Important Notes

1. **Currency**: All monetary values are in Indian Rupees (₹)
2. **Rounding**: Most calculations use standard rounding, except points which use floor
3. **Time Zones**: All database queries use UTC, displayed in local timezone
4. **Validation**: Always validate calculated values before persisting
5. **Performance**: These functions are optimized for frequent use

---

## Last Updated

- **Date**: 2026-02-03
- **Version**: 1.0.0
- **Author**: Casino Management System
