# Date/Time Handling Guidelines

## Current Issues Identified:
1. Database timezone is set to SYSTEM (local time) instead of UTC
2. Some records show inconsistent timestamps between createdAt and transaction dates
3. No standardized approach to timezone handling across the application

## Recommended Solutions:

### 1. Database Configuration
```sql
-- Set database timezone to UTC globally
SET GLOBAL time_zone = '+00:00';

-- Or set it per session in the database connection
SET time_zone = '+00:00';
```

### 2. Backend Changes (server/db.ts)

When creating records, always use:
```javascript
// For transaction dates (depositDate, withdrawalDate)
// Store in UTC but preserve the actual date selected by user
const transactionDate = new Date(data.depositDate);
if (isNaN(transactionDate.getTime())) {
  transactionDate = new Date(); // Fallback to current time
}

// For timestamps (createdAt, updatedAt)
// Always use current UTC time
createdAt: new Date(),
updatedAt: new Date()
```

### 3. Database Connection Setup
```javascript
// In your database connection setup
const connection = await mysql.createConnection({
  host,
  user,
  password,
  database,
  port: parseInt(port),
  ssl: false,
  timezone: '+00:00' // Set timezone to UTC
});
```

### 4. Frontend Date Handling
```javascript
// When sending dates from frontend
// Always send in ISO format
const depositDate = new Date().toISOString();

// When displaying dates
// Convert to user's local timezone
const localDate = new Date(dateFromServer).toLocaleString();
```

### 5. API Response Format
```javascript
// Always send dates in ISO 8601 format
{
  "depositDate": "2026-02-02T14:24:29.000Z",
  "createdAt": "2026-02-02T19:54:29.000Z"
}
```

### 6. Migration Script Needed
Create a script to:
1. Normalize all existing timestamps to UTC
2. Update database timezone settings
3. Add timezone offset tracking for existing records

### 7. Best Practices
- Store all dates in UTC
- Convert to local time only for display
- Use ISO 8601 format for API communication
- Include timezone information in all date responses
- Use JavaScript Date objects consistently
- Test with different timezones

### 8. Priority Fixes
1. **High**: Set database timezone to UTC
2. **High**: Ensure all new records use UTC timestamps
3. **Medium**: Create migration script for existing data
4. **Low**: Add timezone selection for users

## Implementation Steps:
1. Update database connection to use UTC
2. Modify all date creation to use UTC
3. Update frontend to handle timezone conversion
4. Create migration script for existing data
5. Add tests for timezone handling

## Files to Update:
- server/db.ts (all date handling)
- drizzle/schema.ts (add timezone fields if needed)
- client/src/components/* (date display components)
- Database configuration scripts
