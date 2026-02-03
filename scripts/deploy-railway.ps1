# =============================================================================
# Khiladi247 Management Panel - Railway Deployment Script (PowerShell)
# =============================================================================
# This script automates the complete Railway deployment process on Windows
# Run this after: railway login && railway link

Write-Host "🚀 Khiladi247 Railway Deployment Script" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Check if railway CLI is installed
$railwayVersion = railway --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Railway CLI is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g @railway/cli"
    exit 1
}

# Check if logged in
$whoami = railway whoami 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Not logged in to Railway. Please run: railway login" -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Railway CLI is installed and logged in" -ForegroundColor Green

# Step 1: Check if MySQL exists
Write-Host ""
Write-Host "[INFO] Step 1: Checking for MySQL database..." -ForegroundColor Green

$mysqlService = railway service MySQL 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "[INFO] MySQL service already exists" -ForegroundColor Green
} else {
    Write-Host "[INFO] Creating MySQL database..." -ForegroundColor Green
    railway add --database mysql
    Write-Host "[INFO] MySQL database created" -ForegroundColor Green
}

# Step 2: Wait for MySQL to be ready
Write-Host ""
Write-Host "[INFO] Step 2: Waiting for MySQL to initialize (90 seconds)..." -ForegroundColor Green
Start-Sleep -Seconds 90

# Step 3: Get MySQL connection details
Write-Host ""
Write-Host "[INFO] Step 3: Getting database connection URL..." -ForegroundColor Green

railway service MySQL
$vars = railway variables --json 2>$null | ConvertFrom-Json
$MYSQL_PUBLIC_URL = $vars.MYSQL_PUBLIC_URL

if (-not $MYSQL_PUBLIC_URL) {
    Write-Host "[ERROR] Could not get MYSQL_PUBLIC_URL. Please check MySQL service." -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Database URL retrieved successfully" -ForegroundColor Green

# Step 4: Create/Update app service
Write-Host ""
Write-Host "[INFO] Step 4: Setting up application service..." -ForegroundColor Green

$appService = railway service khiladi247-app 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "[INFO] App service already exists" -ForegroundColor Green
} else {
    Write-Host "[INFO] Creating app service..." -ForegroundColor Green
    railway add --service khiladi247-app
}

# Step 5: Set environment variables
Write-Host ""
Write-Host "[INFO] Step 5: Setting environment variables..." -ForegroundColor Green

# Generate JWT_SECRET
$JWT_SECRET = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 } | ForEach-Object { [byte]$_ }))

railway variables --set "DATABASE_URL=$MYSQL_PUBLIC_URL" > $null
railway variables --set "JWT_SECRET=$JWT_SECRET" > $null
railway variables --set "NODE_ENV=production" > $null
railway variables --set "PORT=3000" > $null

Write-Host "[INFO] Environment variables set:" -ForegroundColor Green
Write-Host "  - DATABASE_URL: [SET]"
Write-Host "  - JWT_SECRET: [SET]"
Write-Host "  - NODE_ENV: production"
Write-Host "  - PORT: 3000"

# Step 6: Deploy application
Write-Host ""
Write-Host "[INFO] Step 6: Deploying application..." -ForegroundColor Green
railway up

# Step 7: Wait for deployment
Write-Host ""
Write-Host "[INFO] Step 7: Waiting for deployment to complete (120 seconds)..." -ForegroundColor Green
Start-Sleep -Seconds 120

# Step 8: Check deployment status
Write-Host ""
Write-Host "[INFO] Step 8: Checking deployment status..." -ForegroundColor Green
$logs = railway logs --deployment --latest --lines 20 2>$null

if ($logs -match "Server running") {
    Write-Host "[INFO] ✅ Application deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "[WARN] ⚠️  Deployment may still be starting. Checking again in 60 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 60
}

# Step 9: Get deployment URL
Write-Host ""
Write-Host "[INFO] Step 9: Getting deployment URL..." -ForegroundColor Green
$domainOutput = railway domain 2>$null
if ($domainOutput -match "https://[^\s]+") {
    $DEPLOYMENT_URL = $matches[0]
    Write-Host "[INFO] 🌐 Application URL: $DEPLOYMENT_URL" -ForegroundColor Green
} else {
    Write-Host "[WARN] Could not get deployment URL. Check Railway dashboard." -ForegroundColor Yellow
}

# Step 10: Run migrations
Write-Host ""
Write-Host "[INFO] Step 10: Running database migrations..." -ForegroundColor Green
railway run -- pnpm drizzle-kit migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARN] Migration command failed. You may need to run it manually." -ForegroundColor Yellow
}

# Step 11: Create admin user
Write-Host ""
Write-Host "[INFO] Step 11: Creating admin user..." -ForegroundColor Green
Write-Host "[WARN] Save the admin credentials that will be displayed below!" -ForegroundColor Yellow
Write-Host ""
Start-Sleep -Seconds 3

railway run -- node scripts/ensure-admin.mjs
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARN] Admin creation may have failed. Check logs." -ForegroundColor Yellow
}

# Final summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "[INFO] DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:"
Write-Host "1. Visit: $DEPLOYMENT_URL"
Write-Host "2. Login with admin credentials shown above"
Write-Host "3. Change password in Settings page"
Write-Host "4. Delete ADMIN_CREDENTIALS.txt file"
Write-Host ""
Write-Host "Useful Commands:"
Write-Host "  railway logs --latest          # View live logs"
Write-Host "  railway status                 # Check service status"
Write-Host "  railway redeploy --yes         # Redeploy app"
Write-Host ""
