#!/bin/bash
# =============================================================================
# Khiladi247 Management Panel - Startup Script
# =============================================================================

echo "🚀 Starting Khiladi247 Management Panel..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

# Check if JWT_SECRET is set
if [ -z "$JWT_SECRET" ]; then
    echo "⚠️  WARNING: JWT_SECRET not set, generating random secret..."
    export JWT_SECRET=$(openssl rand -base64 32)
    echo "✅ Generated JWT_SECRET"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install --prod
fi

# Initialize database and create admin user
echo "🗄️  Initializing database..."
node server/init-db.mjs || echo "⚠️  DB init may have failed, continuing..."

echo "✅ Starting application server..."

# Start the application
if [ "$NODE_ENV" = "production" ]; then
    pnpm start
else
    pnpm dev
fi
