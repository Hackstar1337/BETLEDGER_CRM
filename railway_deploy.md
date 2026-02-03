# 🚀 Railway Deployment Guide (Error-Free)

This guide outlines the precise steps to deploy the project to Railway successfully. It is designed for developers and AI agents to follow for an automatic, error-free deployment.

## ✅ Prerequisites

1.  **Railway CLI**: Ensure `railway` CLI is installed (`npm i -g @railway/cli`).
2.  **Authentication**: Run `railway login` to authenticate.
3.  **Source Code**: Ensure you are in the project root.
4.  **Lockfile**: **CRITICAL** - Ensure `pnpm-lock.yaml` exists. If not, run `pnpm install` locally to generate it. Railway's Nixpacks build *requires* this file for pnpm projects.

---

## 🛠️ Step-by-Step Deployment

### 1. Initialize Project
Create a new project on Railway.

```bash
railway init --name "Your-Project-Name"
# Select standard project structure if prompted
```

### 2. Add Database
Add a MySQL database service. This is required before deploying the app.

```bash
railway add --database mysql
```

*Wait for a few moments for the database to provision.*

### 3. Retrieve Database Credentials
Get the public URL for the database (or use internal service discovery if preferred, but public URL is easier for initial setup script connectivity).

```bash
railway variables --json
# Look for MYSQL_PUBLIC_URL
```

### 4. Create App Service
Add the application service.

```bash
railway add --service app
# Or select "Empty Service" and name it "app"
```

### 5. Configure Environment Variables
Set the following REQUIRED variables on the **app** service.

```bash
# Replace values with your actual configuration
railway variables --set "DATABASE_URL=mysql://root:password@host:port/database"
railway variables --set "JWT_SECRET=$(openssl rand -base64 32)"
railway variables --set "NODE_ENV=production"
railway variables --set "PORT=3000"
```

*Note: `DATABASE_URL` should match the `MYSQL_PUBLIC_URL` from Step 3 for easiest setup.*

### 6. Deploy Application
Push the code to Railway to start the build and deployment process.

```bash
railway up
```

**Verification:**
- Watch the build logs. It should use `nixpacks`.
- Ensure `pnpm install` runs successfully.
- Ensure `vite build` and `esbuild` steps complete.

### 7. Post-Deployment Setup (Database & Admin)
Once the app is running (check `railway status` or logs), you need to initialize the database schema and create the admin user.

**1. Initialize Database Schema:**
We use `drizzle-kit push` to ensure the database matches the code schema perfectly, avoiding migration file inconsistencies.

```bash
railway run -- pnpm drizzle-kit push
```
*If prompted for confirmation, this is normal for the first run.*

**2. Create Admin User:**
Run the admin creation script on the deployed instance:

```bash
railway run -- node scripts/ensure-admin.mjs
```

This will:
- Check if the database works.
- Create an `admin` user if one doesn't exist.
- Output the **Admin Credentials** (Username & Password).

---

## 🐛 Troubleshooting Common Issues

### "build failed: pnpm-lock.yaml not found"
**Fix:** Run `pnpm install` locally and commit the `pnpm-lock.yaml` file. Railway requires it to install dependencies strictly.

### "Database connection error"
**Fix:** Verify `DATABASE_URL` is set correctly in the app service variables. Ensure it uses the *Public* URL if connecting from outside, or the *Private* URL if properly configured with internal networking (Public URL is recommended for first-time setup simplicity).

### "Migration failed: Table already exists"
**Fix:** If you are deploying to a non-empty database or retrying a failed deployment, it's best to verify the schema matches the code.
Run `railway run -- pnpm drizzle-kit push` to force-sync the schema.

### "Constraint Error / DROP PRIMARY KEY failed"
**Fix:** This indicates a conflict in migration files. To resolve this on a new deployment:
1. **Reset Database:** (WARNING: OPENS ALL DATA)
   ```bash
   railway run -- node scripts/drop-all-tables.cjs
   ```
2. **Re-sync Schema:**
   ```bash
   railway run -- pnpm drizzle-kit push
   ```
3. **Re-create Admin:**
   ```bash
   railway run -- node scripts/ensure-admin.mjs
   ```

---

## 🎯 Verification
Visit your deployment URL.
- **Health Check:** `https://your-app.up.railway.app/health` should return `{"status":"ok"}`.
- **Login:** Use the credentials from Step 7 to log in.
