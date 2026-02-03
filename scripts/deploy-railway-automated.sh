#!/bin/bash

# Railway deployment automation script
# This script creates MySQL database and sets up environment variables

echo "🚀 Starting Railway deployment automation..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login to Railway (if not already logged in)
echo "📝 Checking Railway authentication..."
railway login || echo "✅ Already logged in"

# Create or select project
echo "📁 Creating/selecting project..."
railway project init khiladi-management-panel || railway project select khiladi-management-panel

# Create MySQL database service
echo "🗄️ Creating MySQL database..."
railway add mysql --name khiladi-db

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 30

# Get database connection URL
echo "🔗 Getting database connection URL..."
DB_URL=$(railway variables get DATABASE_URL --service khiladi-db)

# Set environment variables for main application
echo "⚙️ Setting environment variables..."
railway variables set DATABASE_URL="$DB_URL"
railway variables set NODE_ENV=production
railway variables set PORT=3000

# Link the database to the application
echo "🔗 Linking database to application..."
railway variables import khiladi-db

# Deploy the application
echo "🚀 Deploying application..."
railway up

echo "✅ Deployment complete!"
echo "📊 Your application is now running with MySQL database!"
echo "🔍 Check logs: railway logs"
echo "🌐 Get URL: railway domain"
