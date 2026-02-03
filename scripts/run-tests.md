# Testing the Ledger System

## Quick Test Commands

### 1. Test the Complete Ledger System
```bash
node scripts/test-ledger-system.js
```
This will:
- Create a test panel
- Add transactions over 3 days
- Generate daily balance snapshots
- Show how different time periods display data
- Demonstrate auto-update functionality

### 2. Test Timezone Behavior
```bash
node scripts/test-timezone-behavior.js
```
This will:
- Show how dates are calculated in different timezones
- Demonstrate the 24-hour period boundaries
- Explain how "today" changes based on timezone

### 3. Backfill Historical Data
```bash
node scripts/backfill-daily-balances.js
```
This will:
- Find your earliest transaction
- Create daily snapshots for all historical dates
- Ensure accurate reporting for all time periods

## Manual Testing in UI

1. **Start the application**:
   ```bash
   npm run dev
   ```

2. **Navigate to Panels page**

3. **Test the time period selector**:
   - Switch between "Last 24 Hours", "Last 7 Days", "Last 30 Days", and "All Time"
   - Observe how the opening balance changes for each period
   - Check the colored indicator messages

4. **Verify auto-update**:
   - On "Last 24 Hours" view, look for the green message
   - Check for "Auto" badges on panels with updated opening balances
   - The opening balance should equal previous day's closing balance

5. **Test timezone switching**:
   - Change your system timezone
   - Refresh the page
   - Verify that dates are calculated correctly for the new timezone

## Expected Results

### 24-Hour View
- Opening balance = yesterday's closing balance
- Shows only today's transactions
- Green indicator: "Today's opening balances auto-updated..."
- "Auto" badges on updated panels

### 7-Day View
- Opening balance = balance from 7 days ago
- Shows last 7 days of transactions
- Blue indicator: "Showing 7-day ledger..."

### 30-Day View
- Opening balance = balance from 30 days ago
- Shows last 30 days of transactions
- Purple indicator: "Showing 30-day ledger..."

### All-Time View
- Opening balance = 0
- Shows all transactions
- Gray indicator: "Showing all-time ledger..."

## Clean Up Test Data

After running the ledger test, clean up with:
```sql
DELETE FROM panelDailyBalances WHERE panelId = [TEST_PANEL_ID];
DELETE FROM withdrawals WHERE panelName = 'TEST_PANEL_LEDGER';
DELETE FROM deposits WHERE panelName = 'TEST_PANEL_LEDGER';
DELETE FROM panels WHERE name = 'TEST_PANEL_LEDGER';
```

## Verification Checklist

- [ ] Opening balances change correctly for each time period
- [ ] Closing balances are calculated accurately
- [ ] Profit/Loss matches deposits - withdrawals
- [ ] Timezone changes are reflected correctly
- [ ] Auto-update works for 24h view
- [ ] Daily snapshots are created
- [ ] Historical data shows accurate balances
