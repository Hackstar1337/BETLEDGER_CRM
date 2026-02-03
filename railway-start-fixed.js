#!/usr/bin/env node

import { setupProductionDatabase } from './scripts/setup-production-db.js';
import { ensureAdmin } from './scripts/ensure-admin.mjs';

/**
 * Fixed Railway Start Script
 * 
 * This script replaces the original railway-start.js and includes:
 * 1. Database setup with migration fixes
 * 2. Admin user creation
 * 3. Application startup
 */

async function startRailwayApp() {
    console.log('🚀 Starting BETLEDGER_CRM on Railway...');
    
    try {
        // Step 1: Setup database with fixes
        console.log('\n📋 Step 1: Setting up database...');
        await setupProductionDatabase();
        console.log('✅ Database setup completed');
        
        // Step 2: Ensure admin user exists
        console.log('\n📋 Step 2: Ensuring admin user exists...');
        await ensureAdmin();
        console.log('✅ Admin user setup completed');
        
        // Step 3: Start the application
        console.log('\n📋 Step 3: Starting application server...');
        
        // Import and start the actual server
        const { startServer } = await import('./server/index.js');
        await startServer();
        
    } catch (error) {
        console.error('❌ Failed to start Railway application:', error);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    startRailwayApp();
}

export default startRailwayApp;
