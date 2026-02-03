/**
 * Health Check Endpoint
 * Used by deployment platforms (Railway, Render, etc.) to verify app is running
 */

import type { Request, Response } from "express";
import * as db from "./db";

// Global flag to track if post-deployment setup has been triggered
let postDeploymentTriggered = false;

export async function healthCheck(req: Request, res: Response) {
  try {
    // Check database connection
    let databaseStatus = {
      connected: false,
      tables: 0,
      error: null as string | null
    };

    try {
      const database = await db.getDb();
      if (database) {
        databaseStatus.connected = true;
        
        // Check if ledger tables exist
        const [tables] = await database.execute(`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = DATABASE() 
          AND table_name IN ('panel_daily_ledger', 'bank_daily_ledger', 'transaction_log', 'audit_log')
        `) as any[];
        databaseStatus.tables = tables[0]?.count || 0;
      }
    } catch (error: any) {
      databaseStatus.error = error.message;
    }

    const status = databaseStatus.connected && databaseStatus.tables >= 4 ? "ok" : "degraded";
    
    // Trigger post-deployment setup on first successful health check
    if (status === "ok" && !postDeploymentTriggered && process.env.NODE_ENV === "production") {
      postDeploymentTriggered = true;
      console.log('🚀 First successful health check - triggering post-deployment setup');
      
      // Run post-deployment setup asynchronously after a short delay
      setTimeout(async () => {
        try {
          console.log('🔧 Running post-deployment database setup...');
          
          // Import and run the database fix script
          const { fixRailwayDatabase } = await import('../scripts/fix-railway-database.js');
          await fixRailwayDatabase();
          console.log('✅ Database fixes completed');
          
          // Create admin user
          const { ensureAdmin } = await import('../scripts/ensure-admin.mjs');
          await ensureAdmin();
          console.log('✅ Admin user created');
          
          console.log('🎉 Post-deployment setup completed successfully!');
        } catch (error: any) {
          console.error('❌ Post-deployment setup failed:', error.message);
          console.log('🔄 Application continues running, manual setup may be needed');
        }
      }, 10000); // Wait 10 seconds after health check
    }
    
    res.status(200).json({
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      database: databaseStatus,
      version: process.env.npm_package_version || "1.0.0",
      postDeployment: postDeploymentTriggered ? "completed" : "pending"
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
}
