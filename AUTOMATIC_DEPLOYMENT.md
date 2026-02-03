# 🚀 Automatic Railway Deployment Setup

This GitHub Actions workflow automatically deploys your application to Railway with a MySQL database whenever you push to the `main` branch.

## 📋 One-Time Setup

### 1. Generate Railway Token
1. Go to [Railway Account Settings](https://railway.app/account)
2. Click "Generate New Token"
3. Give it a name (e.g., "GitHub Actions")
4. Copy the token

### 2. Add Token to GitHub Secrets
1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `RAILWAY_TOKEN`
5. Value: Paste the Railway token you copied
6. Click **Add secret**

### 3. Enable GitHub Actions (if disabled)
1. Go to **Settings** → **Actions** → **General**
2. Under "Workflow permissions", select **"Read and write permissions"**
3. Check **"Allow GitHub Actions to create and approve pull requests"**
4. Click **Save**

## 🔄 How It Works

When you push to `main` branch, the workflow will:

1. ✅ **Create/select Railway project**
2. ✅ **Create MySQL database** (if it doesn't exist)
3. ✅ **Set all environment variables** automatically
4. ✅ **Deploy the application**
5. ✅ **Wait for deployment to be healthy**
6. ✅ **Provide deployment URL**

## 📊 After Deployment

Once deployed, you can:

1. **Visit your app** at the URL shown in the workflow logs
2. **Check health** at `https://your-app.railway.app/health`
3. **Setup database** (if needed) by running:
   ```bash
   railway run 'pnpm run setup-prod-db'
   ```

## 🛠️ Manual Commands

If you need to manually interact with your deployment:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# View logs
railway logs

# Access your application
railway open

# Run commands in your deployed app
railway run 'pnpm run setup-prod-db'
railway run 'pnpm run db:backup'
```

## 📝 Environment Variables

The workflow automatically sets:
- `DATABASE_URL` - MySQL connection string
- `NODE_ENV` - production
- `PORT` - 3000

## 🚨 Troubleshooting

### If deployment fails:
1. Check the workflow logs in GitHub Actions tab
2. Ensure Railway token has correct permissions
3. Make sure your code builds successfully locally

### If database setup is needed:
1. SSH into your deployment: `railway shell`
2. Run: `pnpm run setup-prod-db`
3. Check logs: `railway logs`

## 🎯 Benefits

- **Zero manual intervention** - Just push code!
- **Automatic database creation** - No manual setup needed
- **Environment variables** - Automatically configured
- **Health checks** - Waits for app to be healthy
- **Rollbacks** - Railway handles failed deployments automatically

Now you can focus on coding while GitHub Actions handles deployment! 🎉
