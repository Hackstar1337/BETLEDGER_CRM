# 🚀 Railway Deployment Guide

This document provides a complete guide for deploying the Khiladi Management Panel to Railway.

## 📋 Prerequisites

1. Railway account (https://railway.app)
2. Railway CLI installed: `npm install -g @railway/cli`
3. GitHub repository with the code

## 🗄️ Database Setup

### 1. Create MySQL Database
```bash
# Login to Railway
railway login

# Create project
railway init --name khiladi-management-panel

# Add MySQL database
railway add -d mysql -s khiladi-db
```

### 2. Get Database Connection Details
```bash
# Switch to database service
railway service MySQL

# List variables to get connection details
railway variable list
```

Copy the `MYSQL_PUBLIC_URL` value - this is your database connection string.

## 🚀 Application Deployment

### 1. Create Application Service
```bash
# Create new service for the application
railway add -s khiladi-app

# Switch to application service
railway service khiladi-app
```

### 2. Set Environment Variables
```bash
# Set basic variables
railway variable set NODE_ENV=production PORT=3000

# Set database URL (replace with your actual URL from step 2)
railway variable set DATABASE_URL="mysql://root:PASSWORD@hopper.proxy.rlwy.net:PORT/railway"
```

### 3. Deploy the Application
```bash
# Deploy from current directory
railway up
```

## 🔧 Configuration Details

### Railway Configuration (`railway.json`)
```json
{
  "$schema": "https://schema.railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install --legacy-peer-deps && npm run build",
    "nixpacksPlan": {
      "providers": ["node"],
      "phases": {
        "setup": {
          "nixPkgs": ["nodejs_20", "mysql-client"]
        }
      }
    }
  },
  "deploy": {
    "startCommand": "npm run start:railway",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Package.json Scripts
```json
{
  "scripts": {
    "start:railway": "tsx railway-start.js",
    "build": "vite build && esbuild production-start.js --platform=node --packages=external --bundle --format=esm --outdir=dist"
  }
}
```

## 📊 After Deployment

### 1. Check Application Status
```bash
# View logs
railway logs

# Open application in browser
railway open
```

### 2. Setup Database Tables
Once the application is running, you need to create the database tables:
```bash
# Run database setup
railway run 'npm run setup-prod-db'
```

### 3. Verify Deployment
- Health check: `https://your-app-url.railway.app/health`
- Application: `https://your-app-url.railway.app`

## 🛠️ Troubleshooting

### Common Issues

1. **Build Fails with pnpm errors**
   - Solution: Use npm instead of pnpm (already configured)

2. **Module not found errors**
   - Solution: tsx is included in dependencies for TypeScript execution

3. **Database connection errors**
   - Verify DATABASE_URL is correct
   - Check if database service is running

4. **Application doesn't start**
   - Check logs: `railway logs`
   - Verify all environment variables are set

### Useful Commands
```bash
# List all services
railway status

# Switch between services
railway service [SERVICE_NAME]

# View environment variables
railway variable list

# Access application shell
railway ssh

# Restart service
railway restart

# Redeploy without changes
railway redeploy
```

## 🔄 CI/CD Setup (Optional)

For automatic deployments on push to main:

1. Create Railway token: https://railway.app/account
2. Add to GitHub Secrets: `RAILWAY_TOKEN`
3. Enable GitHub Actions in repository settings
4. Push to main branch - auto-deployment will trigger

## 📝 Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Application port | `3000` |
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@host:port/db` |

## 🎯 Success Checklist

- [ ] MySQL database created
- [ ] Application service created
- [ ] Environment variables set
- [ ] Application deployed successfully
- [ ] Database tables created
- [ ] Health check passing
- [ ] Application accessible via URL

## 📞 Support

If you encounter issues:
1. Check Railway logs: `railway logs`
2. Verify environment variables
3. Ensure database is running
4. Check GitHub Actions workflow (if using CI/CD)

---

**Note**: This deployment uses Nixpacks for building, which is faster and more reliable than Docker for Node.js applications.
