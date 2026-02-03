# 🔧 GitHub Actions Setup Guide for Automatic Railway Deployment

This guide helps you set up GitHub Actions to automatically deploy your BETLEDGER_CRM to Railway with database fixes.

## ✅ Prerequisites

1. **GitHub Repository**: Your code should be pushed to GitHub
2. **Railway Account**: Active Railway account with project set up
3. **Railway CLI Token**: API token for Railway access

---

## 🔑 Step 1: Get Railway API Token

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click on your profile → **Account Settings**
3. Go to **API Tokens** section
4. Click **New Token**
5. Give it a name like "GitHub Actions"
6. Copy the token (you won't see it again)

---

## 🔐 Step 2: Add GitHub Secrets

In your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add these secrets:

### Required Secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `RAILWAY_TOKEN` | Your Railway API token | For Railway CLI authentication |
| `RAILWAY_SERVICE_NAME` | `app` (or your service name) | Railway service name |

### Optional Secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `DATABASE_URL` | Your database URL | If you want to set it via GitHub |
| `JWT_SECRET` | Random string | JWT secret for authentication |
| `SESSION_SECRET` | Random string | Session secret |

---

## 🚀 Step 3: Configure Railway Environment

Make sure your Railway project has these environment variables set:

```bash
# In Railway Dashboard → Your Project → Variables
DATABASE_URL=mysql://username:password@host:port/database
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
NODE_ENV=production
PORT=3000
```

---

## 📋 Step 4: Verify Workflow File

The workflow file `.github/workflows/deploy-railway.yml` should be committed to your repository.

**Key Features:**
- ✅ **Automatic deployment** on push to main/master
- ✅ **Database fix script** runs automatically
- ✅ **Admin user creation** 
- ✅ **Database verification**
- ✅ **Health checks**
- ✅ **Force database reset** option (via workflow dispatch)

---

## 🎯 Step 5: Test the Workflow

### Option A: Push to Main Branch
```bash
git add .
git commit -m "Add GitHub Actions workflow for automatic Railway deployment"
git push origin main
```

### Option B: Manual Trigger
1. Go to **Actions** tab in your GitHub repo
2. Select "Deploy to Railway with Database Fix" workflow
3. Click "Run workflow"
4. Choose if you want to force database reset (⚠️ WARNING: Deletes all data)

---

## 📊 What the Workflow Does

### 1. **Build & Deploy**
- Checks out code
- Installs dependencies with pnpm
- Builds the application
- Deploys to Railway

### 2. **Wait for Deployment**
- Waits for Railway to be ready
- Tests health endpoint
- Ensures application is running

### 3. **Database Setup**
- **Runs database fix script** automatically
- **Creates admin user** with credentials
- **Verifies database integrity**

### 4. **Verification**
- Runs database verification script
- Tests application endpoints
- Provides deployment summary

### 5. **Health Check**
- Final health check
- Database health verification
- Success/failure reporting

---

## 🔍 Monitoring Deployment

### GitHub Actions Tab
- Watch real-time logs
- See each step execution
- Download artifacts if needed

### Railway Dashboard
- Monitor deployment progress
- Check application logs
- Verify environment variables

### Key Logs to Watch:
- `🔧 Running database fix script...`
- `✅ Database fix completed!`
- `👤 Creating admin user...`
- `🔍 Verifying database integrity...`
- `🎉 Deployment Summary`

---

## 🛠️ Troubleshooting

### ❌ "RAILWAY_TOKEN not found"
**Solution**: Add Railway API token to GitHub secrets

### ❌ "Service not found"
**Solution**: Set `RAILWAY_SERVICE_NAME` secret correctly

### ❌ "Database connection failed"
**Solution**: Verify `DATABASE_URL` in Railway environment variables

### ❌ "Health check failed"
**Solution**: Check Railway logs for application errors

### ❌ "Database fix failed"
**Solution**: 
- Check database permissions
- Verify Railway MySQL is running
- Try manual database reset via workflow dispatch

---

## 🔄 Workflow Dispatch Options

You can manually trigger the workflow with options:

1. Go to **Actions** → **Deploy to Railway with Database Fix**
2. Click **Run workflow**
3. **Force Database Reset**: Choose `true` to completely reset database

**⚠️ WARNING**: Force reset deletes ALL data - use only for fresh deployments!

---

## 📱 Notifications (Optional)

You can extend the workflow to send notifications:

### Discord Notification
```yaml
- name: 📱 Send Discord Notification
  uses: Ilshidur/action-discord@0.3.0
  with:
    webhook_url: ${{ secrets.DISCORD_WEBHOOK }}
    content: "🚀 BETLEDGER_CRM deployed successfully! https://your-app.up.railway.app"
```

### Slack Notification
```yaml
- name: 📱 Send Slack Notification
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## ✅ Success Indicators

When everything works correctly, you'll see:

```
✅ Application is healthy!
🔧 Running database fix script...
✅ Database fix completed!
👤 Creating admin user...
✅ Admin user created successfully
🔍 Verifying database integrity...
✅ All database checks passed!
🎉 Deployment Summary
🌐 Application URL: https://your-app.up.railway.app
🏥 Health Check: https://your-app.up.railway.app/health
```

---

## 🎯 Next Steps

1. **Test the workflow** by pushing to main
2. **Monitor the logs** to ensure everything works
3. **Save admin credentials** from the workflow output
4. **Test the deployed application**
5. **Set up notifications** (optional)

Your BETLEDGER_CRM will now automatically deploy to Railway with proper database setup every time you push to main! 🎉
