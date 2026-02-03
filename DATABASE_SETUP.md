# Khiladi247 Database Setup Guide

This guide will help you set up the database and migrate all data after the local server shutdown.

## 🚨 Prerequisites

1. **MySQL Server** installed and running
2. **Node.js** (version 18 or higher)
3. **Database credentials** with sufficient privileges

## 📋 Step 1: Configure Environment

1. Create or update your `.env` file:

```env
# Database Configuration
DATABASE_URL=mysql://root:your_password@localhost:3306/khiladi247

# JWT Secret (generate a random secure string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration
NODE_ENV=development
PORT=3000
```

2. Update the database credentials:
   - Replace `your_password` with your actual MySQL password
   - Change `khiladi247` if you want a different database name
   - Adjust host/port if your MySQL is not on localhost:3306

## 🗄️ Step 2: Database Setup

Run the database setup script to create the database and all tables:

```bash
npm run db:setup
```

This script will:

- ✅ Create the database if it doesn't exist
- ✅ Run all necessary migrations
- ✅ Verify all tables are created
- ✅ Create a default admin user
- ✅ Create default panels (Panel A, B, C)
- ✅ Display database status

**Default Admin Credentials:**

- Username: `admin`
- Password: `admin123`
- ⚠️ **Change this password after first login!**

## 📦 Step 3: Data Migration

If you have existing data from the local server, run the data migration:

```bash
npm run db:migrate
```

This script will:

- ✅ Create a backup of existing data
- ✅ Migrate data from local storage files
- ✅ Create sample data for testing
- ✅ Handle all data types (panels, players, transactions, etc.)

### Data Sources Supported

The migration script looks for data files in the `data/` directory:

- `local-data.json` - General local storage data
- `panels-data.json` - Panel configurations
- `players-data.json` - Player information
- `transactions-data.json` - Transaction history

## 🔄 Step 4: Complete Reset (Optional)

If you want to completely reset the database:

```bash
npm run db:reset
```

This will:

- Run the full setup process
- Migrate all data
- Create fresh sample data

## 📊 Database Schema

The system includes the following tables:

| Table                  | Purpose                          |
| ---------------------- | -------------------------------- |
| `users`                | OAuth user authentication        |
| `admin_users`          | Admin user accounts              |
| `panels`               | Gaming panel configurations      |
| `bankAccounts`         | Bank account information         |
| `players`              | Player data and balances         |
| `deposits`             | Deposit transactions             |
| `withdrawals`          | Withdrawal transactions          |
| `gameplayTransactions` | Gameplay wins/losses             |
| `transactions`         | Comprehensive transaction ledger |
| `dailyReports`         | Aggregated daily reports         |

## 🛠️ Troubleshooting

### Common Issues

1. **Database Connection Error**

   ```
   Error: Access denied for user 'root'@'localhost'
   ```

   **Solution:** Check your MySQL credentials in `.env` file

2. **Database Doesn't Exist**

   ```
   Error: Unknown database 'khiladi247'
   ```

   **Solution:** Run `npm run db:setup` to create the database

3. **Permission Denied**

   ```
   Error: Access denied for user
   ```

   **Solution:** Ensure your MySQL user has CREATE, INSERT, UPDATE, DELETE privileges

4. **Port Already in Use**
   ```
   Error: listen EADDRINUSE :::3000
   ```
   **Solution:** Change PORT in `.env` or stop the other service

### Manual Database Setup

If the automated setup fails, you can set up manually:

```sql
-- Create database
CREATE DATABASE IF NOT EXISTS khiladi247 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create admin user (optional)
USE khiladi247;
INSERT INTO admin_users (username, password_hash, email, full_name, is_active)
VALUES ('admin', '$2a$10$your_hashed_password', 'admin@khiladi247.com', 'System Administrator', 1);
```

## 📝 Next Steps

1. **Start the Application:**

   ```bash
   npm run dev
   ```

2. **Login to Admin Panel:**
   - Go to `http://localhost:3000`
   - Login with admin credentials
   - Change the default password

3. **Configure Your System:**
   - Update panel configurations
   - Add bank accounts
   - Import existing data if needed

4. **Verify Data:**
   - Check Analytics dashboard
   - Review Reports section
   - Test all functionalities

## 🔧 Advanced Options

### Custom Database Configuration

You can customize the database connection using these environment variables:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=khiladi247
```

### Backup and Restore

**Create backup:**

```bash
npm run db:backup
```

**Manual backup:**

```bash
mysqldump -u root -p khiladi247 > backup.sql
```

**Restore backup:**

```bash
mysql -u root -p khiladi247 < backup.sql
```

## 📞 Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Ensure MySQL is running and accessible
3. Verify all environment variables are set
4. Check database user permissions
5. Review the console logs for detailed error messages

## 🎉 Success!

Once you complete these steps, your Khiladi247 system will be fully migrated to the database with all data preserved and ready for use!

**Key Benefits:**

- ✅ Persistent data storage
- ✅ Multi-user support
- ✅ Real-time analytics
- ✅ Comprehensive reporting
- ✅ Data backup capabilities
- ✅ Scalable architecture
