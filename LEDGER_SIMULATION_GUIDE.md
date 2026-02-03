# Ledger System Simulation - User Guide

## 🎯 Purpose
This simulation helps you visually understand how the automated ledger system works for tracking panel balances.

## 🚀 How to Access

1. Start your application:
   ```bash
   npm run dev
   ```

2. Login to the admin panel

3. Click on **"Ledger Sim"** in the left sidebar menu

## 📖 Understanding the Simulation

### 1. **Explanation Panel** (Top)
- Toggle with "Show/Hide Explanation" button
- Shows the core formulas and concepts
- Explains how automation works

### 2. **Control Panel** (Top Right)
- **Timezone Selector**: See how calculations change in different timezones
- **Time Period Buttons**: Switch between 24h, 7d, 30d, and All Time views
- **Period Summary**: Shows calculated totals for selected period
- **Auto-Update Status**: Shows when balances are automatically updated

### 3. **Three Main Views**

#### 📊 Day-by-Day View
- Shows each day's opening/closing balances
- Displays how balances carry forward
- "Auto" badge appears on today's opening balance
- Formula shown for each day's calculation

#### 💳 All Transactions View
- Lists all transactions in the selected period
- Shows deposit/withdrawal amounts and times
- Bonus points displayed for deposits

#### ▶️ Live Simulation
- **Play/Pause**: Watch the simulation run automatically
- **Next/Previous**: Step through days manually
- **Progress Bar**: Visual indicator of current day
- **Detailed Breakdown**: Shows calculations for the current day
- **Next Day Preview**: Shows how today's closing becomes tomorrow's opening

## 🧮 Key Concepts Demonstrated

### Balance Formula
```
Closing Balance = Opening Balance - (Deposits + Bonus) + Withdrawals
```

### Opening Balance Rules
- **24h View**: Uses yesterday's closing balance
- **7d View**: Uses balance from 7 days ago
- **30d View**: Uses balance from 30 days ago
- **All Time**: Starts from 0

### Automation
- When viewing "Last 24 Hours", the system:
  1. Checks if today's opening balance exists
  2. If not, copies yesterday's closing balance
  3. Shows "Auto" badge
  4. Saves daily snapshot

## 🎮 Interactive Features

1. **Switch Time Periods**: Watch how opening balances change
2. **Change Timezone**: See how date boundaries shift
3. **Run Simulation**: Understand day-by-day evolution
4. **Toggle Explanation**: Hide/show help text

## 📝 What to Observe

1. **Balance Flow**: Notice how each day's closing becomes the next day's opening
2. **Profit/Loss**: Always equals Deposits - Withdrawals
3. **Auto-Update**: Only appears on 24h view for today
4. **Timezone Impact**: Same transaction can fall on different dates

## 🔍 Real-World Connection

This simulation mirrors exactly how your actual Panels page works:
- Same calculations
- Same auto-update behavior
- Same timezone handling
- Same visual indicators

After understanding the simulation, check your actual Panels page to see the system in action with real data!

## ❓ Questions

- **Why are balances negative?** 
  - In this simulation, negative means profit (withdrawals > deposits)
  - Your actual system may use different conventions

- **What are bonus points?**
  - Extra points given with deposits
  - Subtracted from balance like deposits

- **How does this help me?**
  - Understand exactly how your money flows
  - Verify the system is calculating correctly
  - Know what the "Auto" badge means
