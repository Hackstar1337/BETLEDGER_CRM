#!/usr/bin/env node

import { fixRailwayDatabase } from './scripts/fix-railway-database.js';
import { ensureAdmin } from './scripts/ensure-admin.mjs';

/**
 * Fixed Railway Start Script
 * 
 * This script automatically runs database fixes and admin setup
 * every time Railway starts the application.
 */

async function startRailwayApp() {
    console.log('🚀 Starting BETLEDGER_CRM on Railway...');
    console.log('📋 This startup includes automatic database fixes');
    
    try {
        // Step 1: Fix database issues automatically
        console.log('\n� Step 1: Running automatic database fixes...');
        console.log('   This will resolve migration issues and ensure all tables exist');
        
        try {
            await fixRailwayDatabase();
            console.log('✅ Database fixes completed successfully');
        } catch (dbError) {
            console.log('⚠️ Database fix encountered issues:', dbError.message);
            console.log('� Continuing with application startup...');
            
            // Try basic admin creation even if database fix fails
            try {
                await ensureAdmin();
                console.log('✅ Admin user setup completed');
            } catch (adminError) {
                console.log('⚠️ Admin setup failed:', adminError.message);
            }
        }
        
        // Step 2: Start the application server
        console.log('\n📋 Step 2: Starting application server...');
        console.log('   Server will be available at: http://localhost:3000');
        
        // Import and start the actual server
        const { startServer } = await import('./server/index.js');
        await startServer();
        
        console.log('🎉 BETLEDGER_CRM started successfully on Railway!');
        
    } catch (error) {
        console.error('❌ Failed to start Railway application:', error);
        console.error('🔍 Check the error details above');
        
        // Don't exit immediately - let Railway handle the restart
        console.log('🔄 Railway will automatically restart the service...');
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    startRailwayApp();
}

export default startRailwayApp;
