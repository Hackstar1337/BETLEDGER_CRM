# Initial Opening Balance - How It Works

## 🎯 The Concept

When you create a new panel, you set an **Initial Opening Balance** (also called "Initial Points Balance"). This is the starting inventory of points for that panel.

## 📊 How It's Used

### 1. **When Creating a Panel**
```
Panel Name: TIGEREXCH
Initial Points Balance: 100,000
```
This sets:
- `pointsBalance = 100,000` (current inventory)
- `openingBalance = 100,000` (ledger opening)

### 2. **In Daily Calculations**

#### First Day (Panel Creation Date)
- Opening Balance = 100,000 (your initial amount)
- After transactions = Closing Balance
- Next day's opening = Today's closing

#### Subsequent Days
- Opening Balance = Previous day's closing balance
- Continues the chain from your initial amount

### 3. **In Different Time Periods**

| Time Period | Opening Balance Shows |
|-------------|---------------------|
| 24 Hours | Yesterday's closing balance |
| 7 Days | Balance from 7 days ago |
| 30 Days | Balance from 30 days ago |
| All Time | **Your initial opening balance** |

## 🔄 The Flow

```
Day 1 (Creation):
  Opening: 100,000 (initial)
  Deposits: 10,000
  Withdrawals: 5,000
  Closing: 95,000

Day 2:
  Opening: 95,000 (previous day's closing)
  Deposits: 15,000
  Withdrawals: 8,000
  Closing: 88,000

Day 3:
  Opening: 88,000 (previous day's closing)
  ...and so on
```

## 💡 Key Points

1. **Initial opening balance is set once** when creating the panel
2. **It becomes the first day's opening balance**
3. **Each day's closing becomes the next day's opening**
4. **"All Time" view always shows your initial balance as opening**
5. **The system tracks this automatically** - no manual intervention needed

## 🎮 In the Simulation

- Day 1 shows: "Initial Balance: ₹100,000"
- This demonstrates the opening balance you set when creating a panel
- Subsequent days show carried-forward balances

## 📝 Why This Matters

- **Accurate tracking**: Know your exact starting point
- **Historical accuracy**: "All Time" calculations are correct
- **Audit trail**: Clear record of initial investment
- **Consistency**: Same logic applies across all time periods

## ⚠️ Common Questions

**Q: Can I change the initial opening balance later?**
A: Yes, you can edit the panel's opening balance, but it's best to set it correctly initially.

**Q: What if I don't set an initial balance?**
A: It defaults to 0, but you should always set the actual starting inventory.

**Q: Does this affect my current points balance?**
A: No, `pointsBalance` is your current inventory, while `openingBalance` is for ledger calculations.
