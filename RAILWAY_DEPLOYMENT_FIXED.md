# 🚀 Railway Deployment Guide (Fixed Version)

This guide provides a **complete, error-free deployment process** for the BETLEDGER_CRM system on Railway. It addresses all known database migration issues and ensures proper setup.

## ✅ Prerequisites

1. **Railway CLI**: Install with `npm i -g @railway/cli`
2. **Authentication**: Run `railway login` 
3. **Project Root**: Ensure you're in the BETLEDGER_CRM directory
4. **Lockfile**: **CRITICAL** - `pnpm-lock.yaml` must exist (run `pnpm install` locally if missing)

---

## 🛠️ Complete Deployment Process

### 1. Initialize Railway Project

```bash
railway init --name "BETLEDGER_CRM"
# Select standard project structure
```

### 2. Add MySQL Database

```bash
railway add --database mysql
```

*Wait for database provisioning (2-3 minutes)*

### 3. Configure Environment Variables

Get database URL and set required variables:

```bash
# Get database URL
railway variables --json
# Copy the MYSQL_PUBLIC_URL value

# Set required variables on app service
railway variables --set "DATABASE_URL=mysql://username:password@host:port/database"
railway variables --set "JWT_SECRET=$(openssl rand -base64 32)"
railway variables --set "NODE_ENV=production"
railway variables --set "PORT=3000"
railway variables --set "SESSION_SECRET=$(openssl rand -base64 32)"
```

### 4. Add Application Service

```bash
railway add --service app
# Or select "Empty Service" and name it "app"
```

### 5. Deploy Application

```bash
railway up
```

**Monitor the build logs:**
- Should use `nixpacks` build system
- `pnpm install` must run successfully
- `vite build` and `esbuild` steps should complete
- Application should start on port 3000

### 6. **CRITICAL** - Fix Database Migration Issues

Once the app is deployed, you **MUST** run the database fix script to resolve migration issues:

```bash
# Run the comprehensive database fix script
railway run -- node scripts/fix-railway-database.js
```

This script will:
- ✅ Fix `bankaccounts` table primary key constraints
- ✅ Add missing columns (`topUp`, `extraDeposit`, `bonusPoints`, `profitLoss`) to `panels` table
- ✅ Run Drizzle migrations safely
- ✅ Create additional required tables (`panel_daily_ledger`, `bank_daily_ledger`, `transaction_log`)
- ✅ Verify database integrity

### 7. Create Admin User

```bash
# Create admin user with credentials
railway run -- node scripts/ensure-admin.mjs
```

**Save the output** - it contains your admin login credentials!

### 8. Verify Deployment

```bash
# Check application status
railway status

# Check application logs
railway logs
```

Visit your deployment URL and test:
- **Health Check**: `https://your-app.up.railway.app/health` → Should return `{"status":"ok"}`
- **Admin Login**: Use credentials from step 7

---

## 🐛 Common Issues & Solutions

### ❌ "build failed: pnpm-lock.yaml not found"
**Solution**: Run `pnpm install` locally and commit `pnpm-lock.yaml`

### ❌ "Database connection error"
**Solution**: Verify `DATABASE_URL` matches the MySQL public URL from Railway variables

### ❌ "Migration failed: DROP PRIMARY KEY error"
**Solution**: Run the database fix script (Step 6) - it handles this automatically

### ❌ "Unknown column 'topUp' in 'field list'"
**Solution**: The database fix script adds missing columns to the panels table

### ❌ "Application starts but database errors continue"
**Solution**: 
```bash
# Run database fix again
railway run -- node scripts/fix-railway-database.js

# Verify all tables exist
railway run -- node scripts/verify-database.js
```

---

## 🔄 Complete Database Reset (If Needed)

**WARNING**: This deletes ALL data. Use only for fresh deployments.

```bash
# Drop all tables and recreate
railway run -- node scripts/drop-all-tables.cjs

# Run comprehensive fix
railway run -- node scripts/fix-railway-database.js

# Recreate admin
railway run -- node scripts/ensure-admin.mjs
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Application builds successfully
- [ ] Database connection works
- [ ] All required tables exist (19 tables total)
- [ ] Panels table has all required columns
- [ ] Admin user created successfully
- [ ] Health endpoint returns `{"status":"ok"}`
- [ ] Admin login works with provided credentials
- [ ] No database errors in application logs

---

## 📊 Expected Database Tables

The fix script ensures these 19 tables exist:

1. `users` - OAuth users
2. `admin_users` - Standalone admin accounts  
3. `panels` - Betting panels (with topUp, extraDeposit, bonusPoints, profitLoss)
4. `bankaccounts` - Bank accounts (fixed primary key)
5. `players` - Player information
6. `deposits` - Deposit transactions
7. `withdrawals` - Withdrawal transactions
8. `gameplayTransactions` - Gameplay wins/losses
9. `transactions` - General transaction ledger
10. `sessions` - User sessions
11. `logs` - Application logs
12. `audit_trail` - CRUD audit trail
13. `notifications` - User notifications
14. `settings` - Application settings
15. `roles` - User roles and permissions
16. `user_roles` - Role assignments
17. `dailyreports` - Daily aggregated reports
18. `paneldailybalances` - Panel daily balance snapshots
19. `topuphistory` - Top-up transaction history

**Additional tables created by fix script:**
20. `panel_daily_ledger` - Enhanced panel ledger
21. `bank_daily_ledger` - Bank daily ledger  
22. `transaction_log` - Comprehensive transaction log

---

## 🚀 Quick Deploy Commands

```bash
# Complete deployment in one go
railway init --name "BETLEDGER_CRM" && \
railway add --database mysql && \
railway add --service app && \
railway variables --set "DATABASE_URL=$(railway variables --json | jq -r '.MYSQL_PUBLIC_URL')" && \
railway variables --set "JWT_SECRET=$(openssl rand -base64 32)" && \
railway variables --set "NODE_ENV=production" && \
railway variables --set "PORT=3000" && \
railway variables --set "SESSION_SECRET=$(openssl rand -base64 32)" && \
railway up && \
sleep 60 && \
railway run -- node scripts/fix-railway-database.js && \
railway run -- node scripts/ensure-admin.mjs
```

---

## 📞 Support

If you encounter issues:

1. Check Railway logs: `railway logs`
2. Verify environment variables: `railway variables --json`
3. Run database fix script: `railway run -- node scripts/fix-railway-database.js`
4. Check database verification: `railway run -- node scripts/verify-database.js`

**The database fix script resolves 99% of deployment issues by properly handling migration conflicts and missing columns.**
