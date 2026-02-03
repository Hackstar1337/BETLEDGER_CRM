# Data Migration Directory

This directory is used for migrating data from the local server to the database.

## Supported Data Files

The migration script (`npm run db:migrate`) looks for the following files in this directory:

### 1. `local-data.json`

General local storage data containing any mixed data types.

**Example Format:**

```json
{
  "panels": [...],
  "players": [...],
  "transactions": [...]
}
```

### 2. `panels-data.json`

Panel configuration data.

**Example Format:**

```json
[
  {
    "id": 1,
    "name": "Panel A",
    "pointsBalance": 100000,
    "openingBalance": 100000,
    "closingBalance": 100000,
    "settling": 0,
    "extraDeposit": 0,
    "bonusPoints": 0,
    "profitLoss": 5000
  }
]
```

### 3. `players-data.json`

Player information and balances.

**Example Format:**

```json
[
  {
    "id": "PLAYER001",
    "userId": "PLAYER001",
    "name": "John Doe",
    "panelName": "Panel A",
    "balance": "5000.00"
  }
]
```

### 4. `transactions-data.json`

Transaction history including deposits and withdrawals.

**Example Format:**

```json
[
  {
    "id": 1,
    "type": "deposit",
    "userId": "PLAYER001",
    "amount": 1000,
    "utr": "UTR123456789",
    "bankName": "ICICI Bank",
    "panelName": "Panel A",
    "date": "2026-01-31T10:30:00Z",
    "bonusPoints": 50
  },
  {
    "id": 2,
    "type": "withdrawal",
    "userId": "PLAYER002",
    "amount": 500,
    "utr": "UTR987654321",
    "bankName": "HDFC Bank",
    "panelName": "Panel B",
    "date": "2026-01-31T11:45:00Z",
    "paymentMethod": "IMPS",
    "transactionCharge": 5
  }
]
```

## How to Use

1. **Export Data from Local Server:**
   - Export your local data to JSON files
   - Place them in this directory
   - Follow the format examples above

2. **Run Migration:**

   ```bash
   npm run db:migrate
   ```

3. **Check Results:**
   - Review the migration summary
   - Verify data in the application
   - Check Analytics dashboard

## Data Validation

The migration script will:

- ✅ Validate JSON format
- ✅ Check required fields
- ✅ Handle missing data gracefully
- ✅ Skip duplicate records
- ✅ Create backup before migration

## Troubleshooting

### Common Issues

1. **Invalid JSON Format**
   - Ensure files contain valid JSON
   - Check for trailing commas
   - Verify quote usage

2. **Missing Required Fields**
   - Check field names match exactly
   - Ensure all required fields are present
   - Review data types

3. **Duplicate Records**
   - Script automatically skips duplicates
   - Based on unique constraints
   - Check database for existing records

### Manual Data Entry

If you don't have exported data, you can create manual JSON files using the examples above.

## Data Safety

- ✅ Automatic backup created before migration
- ✅ Original files are not modified
- ✅ Rollback possible from backup
- ✅ Detailed logging of migration process

## Support

For issues with data migration:

1. Check file formats match examples
2. Verify JSON is valid
3. Review console error messages
4. Check database connection
