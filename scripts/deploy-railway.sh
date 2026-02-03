#!/bin/bash
# =============================================================================
# Khiladi247 Management Panel - Railway Deployment Script
# =============================================================================
# This script automates the complete Railway deployment process
# Run this after: railway login && railway link

set -e

echo "🚀 Khiladi247 Railway Deployment Script"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI is not installed. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    print_error "Not logged in to Railway. Please run: railway login"
    exit 1
fi

print_status "Railway CLI is installed and logged in"

# Step 1: Check if MySQL exists
echo ""
print_status "Step 1: Checking for MySQL database..."
if railway service MySQL &> /dev/null; then
    print_status "MySQL service already exists"
else
    print_status "Creating MySQL database..."
    railway add --database mysql
    print_status "MySQL database created"
fi

# Step 2: Wait for MySQL to be ready
echo ""
print_status "Step 2: Waiting for MySQL to initialize (90 seconds)..."
sleep 90

# Step 3: Get MySQL connection details
echo ""
print_status "Step 3: Getting database connection URL..."
railway service MySQL
MYSQL_PUBLIC_URL=$(railway variables --json 2>/dev/null | grep -o '"MYSQL_PUBLIC_URL": "[^"]*"' | cut -d'"' -f4)

if [ -z "$MYSQL_PUBLIC_URL" ]; then
    print_error "Could not get MYSQL_PUBLIC_URL. Please check MySQL service."
    exit 1
fi

print_status "Database URL retrieved successfully"

# Step 4: Create/Update app service
echo ""
print_status "Step 4: Setting up application service..."
if railway service khiladi247-app &> /dev/null; then
    print_status "App service already exists"
else
    print_status "Creating app service..."
    railway add --service khiladi247-app
fi

# Step 5: Set environment variables
echo ""
print_status "Step 5: Setting environment variables..."

# Generate JWT_SECRET if not set
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "fallback-secret-$(date +%s)")

railway variables --set "DATABASE_URL=$MYSQL_PUBLIC_URL" > /dev/null
railway variables --set "JWT_SECRET=$JWT_SECRET" > /dev/null
railway variables --set "NODE_ENV=production" > /dev/null
railway variables --set "PORT=3000" > /dev/null

print_status "Environment variables set:"
echo "  - DATABASE_URL: [SET]"
echo "  - JWT_SECRET: [SET]"
echo "  - NODE_ENV: production"
echo "  - PORT: 3000"

# Step 6: Deploy application
echo ""
print_status "Step 6: Deploying application..."
railway up

# Step 7: Wait for deployment
echo ""
print_status "Step 7: Waiting for deployment to complete (120 seconds)..."
sleep 120

# Step 8: Check deployment status
echo ""
print_status "Step 8: Checking deployment status..."
DEPLOYMENT_LOGS=$(railway logs --deployment --latest --lines 20 2>/dev/null || echo "")

if echo "$DEPLOYMENT_LOGS" | grep -q "Server running"; then
    print_status "✅ Application deployed successfully!"
else
    print_warning "⚠️  Deployment may still be starting. Checking again in 60 seconds..."
    sleep 60
fi

# Step 9: Get deployment URL
echo ""
print_status "Step 9: Getting deployment URL..."
DEPLOYMENT_URL=$(railway domain 2>/dev/null | grep -o 'https://[^ ]*' || echo "")

if [ -n "$DEPLOYMENT_URL" ]; then
    print_status "🌐 Application URL: $DEPLOYMENT_URL"
else
    print_warning "Could not get deployment URL. Check Railway dashboard."
fi

# Step 10: Run migrations
echo ""
print_status "Step 10: Running database migrations..."
railway run -- pnpm drizzle-kit migrate || print_warning "Migration command failed. You may need to run it manually."

# Step 11: Create admin user
echo ""
print_status "Step 11: Creating admin user..."
print_warning "Save the admin credentials that will be displayed below!"
echo ""
sleep 3

railway run -- node scripts/ensure-admin.mjs || print_warning "Admin creation may have failed. Check logs."

# Final summary
echo ""
echo "========================================"
print_status "DEPLOYMENT COMPLETE!"
echo "========================================"
echo ""
echo "Next Steps:"
echo "1. Visit: $DEPLOYMENT_URL"
echo "2. Login with admin credentials shown above"
echo "3. Change password in Settings page"
echo "4. Delete ADMIN_CREDENTIALS.txt file"
echo ""
echo "Useful Commands:"
echo "  railway logs --latest          # View live logs"
echo "  railway status                 # Check service status"
echo "  railway redeploy --yes         # Redeploy app"
echo ""
