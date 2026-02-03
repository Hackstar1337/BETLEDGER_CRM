# Khiladi247 Localhost Deployment Guide

## Overview

This guide provides step-by-step instructions to deploy the Khiladi247 Management Panel on localhost with database connectivity.

## Prerequisites

- Node.js (v18+) and npm installed
- MySQL Server installed and running
- Git (for cloning repository)

## Quick Deployment Commands

### 1. Database Setup

```powershell
# Create MySQL user and database
mysql -u root -p
CREATE DATABASE IF NOT EXISTS khiladi247 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'khiladi247'@'localhost' IDENTIFIED BY 'khiladi247123';
GRANT ALL PRIVILEGES ON khiladi247.* TO 'khiladi247'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Create admin user
Get-Content "scripts\admin-setup.sql" | mysql -u khiladi247 -p'khiladi247123' khiladi247
```

### 2. Environment Configuration

Create `.env` file with:

```env
DATABASE_URL=mysql://khiladi247:khiladi247123@localhost:3306/khiladi247
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
PORT=3000
```

### 3. Install Dependencies & Start

```powershell
npm install
npm run dev
```

## Detailed Step-by-Step Guide

### Step 1: Verify MySQL Installation

```powershell
mysql --version
net start | findstr -i mysql
```

### Step 2: Setup Database and User

```powershell
# Connect to MySQL as root (interactive password prompt)
mysql -u root -p

# Run these SQL commands in MySQL:
CREATE DATABASE IF NOT EXISTS khiladi247 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'khiladi247'@'localhost' IDENTIFIED BY 'khiladi247123';
GRANT ALL PRIVILEGES ON khiladi247.* TO 'khiladi247'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 3: Create Admin User

```powershell
# Execute admin setup script
Get-Content "scripts\admin-setup.sql" | mysql -u khiladi247 -p'khiladi247123' khiladi247
```

### Step 4: Configure Environment

Create `.env` file in project root:

```env
DATABASE_URL=mysql://khiladi247:khiladi247123@localhost:3306/khiladi247
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
PORT=3000
```

### Step 5: Install Dependencies

```powershell
npm install
```

### Step 6: Start Application

```powershell
npm run dev
```

## Access Information

### Application URL

- **Local URL:** http://localhost:3000
- **Login:** Use admin credentials below

### Admin Credentials

- **Username:** admin
- **Password:** UXgCTqyrrEQbYDvQ
- **Email:** admin@khiladi247.com

⚠️ **Important:** Change the default password after first login!

## Troubleshooting Guide

### Common Issues & Solutions

#### 1. MySQL Access Denied

**Error:** `Access denied for user 'root'@'localhost'`

**Solution:** Create a dedicated user instead of using root:

```powershell
mysql -u root -p
CREATE USER IF NOT EXISTS 'khiladi247'@'localhost' IDENTIFIED BY 'khiladi247123';
GRANT ALL PRIVILEGES ON khiladi247.* TO 'khiladi247'@'localhost';
FLUSH PRIVILEGES;
```

#### 2. Database Connection Failed

**Error:** Database connection issues

**Solution:** Test connection manually:

```powershell
$env:DATABASE_URL = "mysql://khiladi247:khiladi247123@localhost:3306/khiladi247"
node -e "require('mysql2/promise').createConnection(process.env.DATABASE_URL).then(c => {console.log('✅ Connected'); c.end()}).catch(e => console.error('❌', e.message))"
```

#### 3. Port Already in Use

**Error:** Port 3000 already occupied

**Solution:** Kill existing Node processes:

```powershell
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force
```

#### 4. Migration Failures

**Error:** Some database migrations fail

**Solution:** Tables are likely created with different case. Verify tables:

```powershell
mysql -u khiladi247 -p'khiladi247123' khiladi247 -e "SHOW TABLES;"
```

### Verification Commands

#### Check Database Connection

```powershell
mysql -u khiladi247 -p'khiladi247123' khiladi247 -e "SELECT 'Database Connected' as status;"
```

#### Check Admin User

```powershell
mysql -u khiladi247 -p'khiladi247123' khiladi247 -e "SELECT username, email, is_active FROM admin_users WHERE username = 'admin';"
```

#### Check Server Status

```powershell
netstat -an | findstr :3000
```

## Database Schema

### Core Tables

- `admin_users` - Administrator accounts
- `users` - Regular users
- `panels` - Game panels
- `bankaccounts` - Bank account management
- `players` - Player information
- `deposits` - Deposit transactions
- `withdrawals` - Withdrawal transactions
- `transactions` - General transactions
- `dailyreports` - Daily reports
- `gameplaytransactions` - Gameplay-specific transactions

## Development Workflow

### Daily Start Procedure

1. Start MySQL service (if not running)
2. Navigate to project directory
3. Run `npm run dev`
4. Access http://localhost:3000

### Making Database Changes

1. Create migration in `drizzle/` directory
2. Run migration: `npm run db:push`
3. Verify changes in MySQL

### Environment Variables

- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - JWT token secret (change in production)
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)

## Security Notes

### Production Deployment Considerations

1. Change default admin password immediately
2. Use strong JWT_SECRET
3. Set NODE_ENV=production
4. Use environment-specific database credentials
5. Enable HTTPS in production
6. Regular database backups

### Password Security

- Default password: `UXgCTqyrrEQbYDvQ`
- Hashed using bcrypt (10 rounds)
- Change after first login via Settings > Change Password

## File Structure Reference

```
khiladi247-deployment/
├── .env                    # Environment configuration
├── package.json           # Dependencies and scripts
├── scripts/
│   ├── admin-setup.sql    # Admin user creation
│   └── setup-database-simple.js # Database setup script
├── drizzle/               # Database migrations
├── server/                # Backend application
└── client/                # Frontend application
```

## Quick Reference Commands

```powershell
# Start application
npm run dev

# Database operations
npm run db:push          # Generate and run migrations
npm run db:setup         # Complete database setup
npm run db:migrate       # Migrate data
npm run db:reset         # Reset database (setup + migrate)

# Build for production
npm run build

# Start production server
npm start
```

## Support

For issues not covered in this guide:

1. Check MySQL service status
2. Verify environment variables
3. Review application logs
4. Test database connectivity manually

---

**Last Updated:** 2026-02-01  
**Version:** 1.0  
**Database:** MySQL 9.6.0  
**Node.js:** v18+
