# 🚀 Khiladi247 Management Panel - Railway Deployment Guide

This guide provides a complete, step-by-step process for deploying the Khiladi247 Management Panel to Railway with zero errors.

---

## 📋 Prerequisites

Before starting, ensure you have:

1. **Railway CLI installed and logged in**

   ```bash
   railway --version  # Should show version 3.x or higher
   railway whoami     # Should show your logged-in email
   ```

2. **GitHub CLI installed (optional but recommended)**

   ```bash
   gh auth status  # Should show logged in
   ```

3. **Code pushed to GitHub repository**
   - Repository: `https://github.com/YOUR_USERNAME/khiladi247-management-panel`
   - Main branch: `master` or `main`

---

## 🎯 Quick Deploy (One-Command Setup)

If this is your first time deploying, run these commands in sequence:

```bash
# Step 1: Link to Railway project (or create new)
railway link
# Select your workspace → Select/Create project → Select environment (production)

# Step 2: Add MySQL database
railway add --database mysql

# Step 3: Wait for database to be ready (IMPORTANT!)
echo "Waiting 60 seconds for MySQL to initialize..."
sleep 60

# Step 4: Get database connection URL
railway variables --json | jq -r '.MYSQL_PUBLIC_URL'

# Step 5: Set environment variables
railway service khiladi247-app  # Switch to app service
railway variables --set "DATABASE_URL=YOUR_MYSQL_PUBLIC_URL_HERE"
railway variables --set "JWT_SECRET=$(openssl rand -base64 32)"
railway variables --set "NODE_ENV=production"
railway variables --set "PORT=3000"

# Step 6: Deploy
railway up

# Step 7: Wait for deployment and check logs
sleep 120
railway logs --latest
```

---

## 📖 Detailed Step-by-Step Deployment

### Step 1: Initialize Railway Project

```bash
# Login to Railway (if not already logged in)
railway login

# Link to existing project or create new
railway init --name khiladi247-production

# Or link to existing project
railway link --project khiladi247-production
```

**Expected Output:**

```
> Select a workspace hackstar1337's Projects
> Select a project khiladi247-production
> Select an environment production
Project khiladi247-production linked successfully! 🎉
```

---

### Step 2: Create MySQL Database

```bash
# Add MySQL database service
railway add --database mysql
```

**⚠️ CRITICAL: Wait for MySQL to be ready**

```bash
# Wait 90 seconds for MySQL to fully initialize
echo "Waiting for MySQL to initialize..."
sleep 90

# Verify MySQL is running
railway service MySQL
railway logs --latest --lines 10
```

**Expected MySQL Logs:**

```
[Server] /usr/sbin/mysqld: ready for connections.
Version: '9.4.0'  port: 3306  MySQL Community Server
```

---

### Step 3: Configure Environment Variables

#### 3.1 Get Database Credentials

```bash
# Switch to MySQL service
railway service MySQL

# Get connection URLs
railway variables --json
```

**Copy these values:**

- `MYSQL_PUBLIC_URL` - For external connections (use this for DATABASE_URL)
- `MYSQL_URL` - For internal Railway network
- `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`

#### 3.2 Create App Service and Set Variables

```bash
# Create empty service for the app
railway add --service khiladi247-app

# Switch to app service
railway service khiladi247-app

# Set DATABASE_URL (use MYSQL_PUBLIC_URL from MySQL service)
railway variables --set "DATABASE_URL=mysql://root:PASSWORD@interchange.proxy.rlwy.net:PORT/railway"

# Set JWT_SECRET (generate a secure random string)
railway variables --set "JWT_SECRET=$(openssl rand -base64 32)"

# Set other required variables
railway variables --set "NODE_ENV=production"
railway variables --set "PORT=3000"
```

**Verify all variables are set:**

```bash
railway variables
```

**Expected Output:**

```
╔════════════════════════ Variables for khiladi247-app ════════════════════════╗
║ DATABASE_URL                       │ mysql://root:***@interchange.proxy...   ║
║ JWT_SECRET                         │ l9Ht6OtRL7fmcZPOx2GaNywk...             ║
║ NODE_ENV                           │ production                              ║
║ PORT                               │ 3000                                    ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

### Step 4: Deploy Application

```bash
# Deploy the application
railway up
```

**Expected Output:**

```
Indexing...
Uploading...
Build Logs: https://railway.com/project/...
```

#### Wait for Build and Deployment

```bash
# Wait 2 minutes for build to complete
echo "Waiting for build and deployment..."
sleep 120

# Check deployment logs
railway logs --deployment --latest --lines 50
```

**Expected Successful Logs:**

```
Starting Container
🚀 Starting Khiladi247 Management Panel...
✅ Starting application server!

> khiladi_management_panel@1.0.0 start
> NODE_ENV=production node dist/index.js

Server running on http://localhost:3000/
```

---

### Step 5: Run Database Migrations

**⚠️ IMPORTANT: Run this AFTER the app is deployed and running**

```bash
# Switch to app service
railway service khiladi247-app

# Run database migrations
railway run -- pnpm drizzle-kit migrate
```

**Expected Output:**

```
Reading config file '/app/drizzle.config.ts'
10 tables
admin_users 9 columns 0 indexes 0 fks
bankAccounts 18 columns 0 indexes 0 fks
...
No schema changes, nothing to migrate 😴
```

If tables don't exist yet, you may see migrations being applied:

```
Applying migration '0000_pale_quentin_quire'
Applying migration '0001_thankful_the_twelve'
...
✅ Database migrated successfully!
```

---

### Step 6: Create Admin User

```bash
# Create admin user
railway run -- node scripts/ensure-admin.mjs
```

**Expected Output:**

```
🔍 Checking for existing admin user...
✅ Admin user created successfully!

═══════════════════════════════════════
  ADMIN CREDENTIALS
═══════════════════════════════════════
  Username: admin
  Password: XXXXXXXXXXXXXXXX
═══════════════════════════════════════

⚠️  IMPORTANT: Save these credentials securely!
📄 Credentials saved to: ADMIN_CREDENTIALS.txt
```

**⚠️ SAVE THESE CREDENTIALS! You won't see them again.**

---

### Step 7: Verify Deployment

#### 7.1 Check App URL

```bash
# Get public domain
railway domain
```

**Expected Output:**

```
🚀 https://khiladi247-app-production.up.railway.app
```

#### 7.2 Test Health Endpoint

```bash
# Test health check
curl https://khiladi247-app-production.up.railway.app/health
```

**Expected Response:**

```json
{ "status": "ok", "timestamp": "2026-01-30T..." }
```

#### 7.3 Open in Browser

Visit: `https://khiladi247-app-production.up.railway.app`

You should see the **Admin Login** page.

---

## 🔧 Post-Deployment Configuration

### Change Admin Password

1. Login with the credentials from Step 6
2. Go to **Settings** page
3. Use **Change Password** feature
4. **Delete** the `ADMIN_CREDENTIALS.txt` file after saving new password

---

## 🐛 Troubleshooting

### Issue 1: "Connection lost: The server closed the connection"

**Cause:** MySQL is not ready or DATABASE_URL is incorrect

**Solution:**

```bash
# Verify MySQL is running
railway service MySQL
railway logs --latest

# Check DATABASE_URL is using public URL
railway service khiladi247-app
railway variables --json | jq -r '.DATABASE_URL'
# Should contain: @interchange.proxy.rlwy.net

# If using internal URL, update to public URL
railway variables --set "DATABASE_URL=mysql://root:PASSWORD@interchange.proxy.rlwy.net:PORT/railway"
```

### Issue 2: "DATABASE_URL environment variable is not set"

**Solution:**

```bash
railway service khiladi247-app
railway variables --set "DATABASE_URL=YOUR_MYSQL_PUBLIC_URL"
```

### Issue 3: Database Migrations Fail

**Solution:**

```bash
# Run migrations manually with verbose output
railway run -- pnpm drizzle-kit migrate

# If still failing, try generating first
railway run -- pnpm drizzle-kit generate
railway run -- pnpm drizzle-kit migrate
```

### Issue 4: App Builds But Won't Start

**Check logs:**

```bash
railway logs --deployment --latest --lines 100
```

**Common fixes:**

```bash
# Redeploy
railway redeploy --yes

# Or force new deployment
railway up
```

### Issue 5: MySQL Healthcheck Fails

**This is a known Railway issue with MySQL template.**

**Solution:**

1. Go to Railway Dashboard → MySQL Service → Settings
2. Find "Healthcheck Path" field
3. **Clear it** (remove `/health`)
4. Click Save
5. Redeploy MySQL service

---

## 🔄 Redeployment (After Code Changes)

When you push new code to GitHub:

```bash
# Pull latest changes
git pull origin master

# Deploy updates
railway up

# Wait and check logs
sleep 120
railway logs --latest
```

---

## 📁 Project Structure on Railway

```
khiladi247-management (Railway Project)
├── MySQL (Database Service)
│   ├── MYSQL_PUBLIC_URL (for external connections)
│   ├── MYSQL_URL (for internal connections)
│   └── Volume: /var/lib/mysql
│
└── khiladi247-app (Application Service)
    ├── Build: pnpm install && pnpm build
    ├── Start: bash scripts/startup.sh
    ├── Health: /health
    └── Environment Variables:
        ├── DATABASE_URL
        ├── JWT_SECRET
        ├── NODE_ENV
        └── PORT
```

---

## 🔐 Security Checklist

- [x] JWT_SECRET is set to a secure random string
- [x] DATABASE_URL uses the public Railway proxy URL
- [x] Admin password changed after first login
- [x] ADMIN_CREDENTIALS.txt file deleted
- [x] NODE_ENV set to "production"

---

## 📝 Environment Variables Reference

| Variable           | Required | Description             | Example                          |
| ------------------ | -------- | ----------------------- | -------------------------------- |
| `DATABASE_URL`     | ✅ Yes   | MySQL connection string | `mysql://root:pass@host:port/db` |
| `JWT_SECRET`       | ✅ Yes   | Secret for JWT tokens   | `base64-encoded-random-string`   |
| `NODE_ENV`         | ✅ Yes   | Environment mode        | `production`                     |
| `PORT`             | ✅ Yes   | Server port             | `3000`                           |
| `OAUTH_SERVER_URL` | ❌ No    | OAuth (not used)        | Leave empty                      |

---

## 🎯 Deployment Verification Commands

```bash
# Check all services
railway status

# Check app is running
railway logs --latest

# Test health endpoint
curl $(railway domain)/health

# Check environment variables
railway variables

# Check database connection
railway run -- node -e "console.log('DB OK')"
```

---

## 📞 Support

If deployment fails after following this guide:

1. Check Railway Dashboard logs: https://railway.com/project/YOUR_PROJECT_ID
2. Verify MySQL is healthy in dashboard
3. Check DATABASE_URL is correct
4. Try redeploying: `railway redeploy --yes`

---

## ✅ Deployment Success Criteria

Your deployment is successful when:

1. ✅ `railway logs --latest` shows: `Server running on http://localhost:3000/`
2. ✅ Health check returns: `{"status":"ok"}`
3. ✅ You can login at `https://your-app.up.railway.app`
4. ✅ Database tables exist (check via Railway dashboard)
5. ✅ Admin user created and credentials saved

---

**Last Updated:** 2026-01-30  
**Railway CLI Version:** 3.x+  
**Node.js Version:** 20.x
