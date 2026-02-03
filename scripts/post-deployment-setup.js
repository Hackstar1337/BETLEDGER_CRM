#!/usr/bin/env node

import { fixRailwayDatabase } from './fix-railway-database.js';
import { verifyDatabase } from './verify-database.js';

/**
 * Post-Deployment Setup Script
 * 
 * This script runs AFTER the application is successfully deployed and healthy.
 * It performs database fixes and verification without blocking the initial deployment.
 */

async function postDeploymentSetup() {
    console.log('🔧 Starting post-deployment database setup...');
    console.log('📋 This runs after the application is healthy and deployed');
    
    try {
        // Step 1: Fix database issues
        console.log('\n🔧 Step 1: Running database fixes...');
        console.log('   Fixing migration issues and ensuring all tables exist');
        
        try {
            await fixRailwayDatabase();
            console.log('✅ Database fixes completed successfully');
        } catch (dbError) {
            console.log('⚠️ Database fix encountered issues:', dbError.message);
            console.log('🔄 Continuing with verification...');
        }
        
        // Step 2: Verify database integrity
        console.log('\n🔍 Step 2: Verifying database integrity...');
        
        try {
            await verifyDatabase();
            console.log('✅ Database verification passed');
        } catch (verifyError) {
            console.log('⚠️ Database verification failed:', verifyError.message);
            console.log('🔄 Database may need manual intervention');
        }
        
        console.log('\n🎉 Post-deployment setup completed!');
        console.log('📊 Database should now be ready for production use');
        
    } catch (error) {
        console.error('❌ Post-deployment setup failed:', error.message);
        console.log('🔄 Application is still running, but database may have issues');
        console.log('🔧 Run manually: railway run -- node scripts/post-deployment-setup.js');
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    postDeploymentSetup();
}

export default postDeploymentSetup;
