import type { Request, Response } from "express";

// Global flag to track if post-deployment setup has been triggered
let postDeploymentTriggered = false;

/**
 * Dedicated endpoint to trigger post-deployment setup
 * This can be called after health checks pass
 */
export async function triggerPostDeployment(req: Request, res: Response) {
  try {
    if (postDeploymentTriggered) {
      return res.json({
        status: "already_completed",
        message: "Post-deployment setup has already been triggered"
      });
    }

    postDeploymentTriggered = true;
    console.log('🚀 Post-deployment setup triggered via endpoint');
    console.log('📊 Environment:', process.env.NODE_ENV, process.env.RAILWAY_ENVIRONMENT);
    
    // Run post-deployment setup asynchronously
    setTimeout(async () => {
      try {
        console.log('🔧 Running post-deployment database setup...');
        
        // Import and run the database fix script
        const { fixRailwayDatabase } = await import('../../scripts/fix-railway-database.js');
        await fixRailwayDatabase();
        console.log('✅ Database fixes completed');
        
        // Create admin user
        const { ensureAdmin } = await import('../../scripts/ensure-admin.mjs');
        await ensureAdmin();
        console.log('✅ Admin user created');
        
        console.log('🎉 Post-deployment setup completed successfully!');
      } catch (error: any) {
        console.error('❌ Post-deployment setup failed:', error.message);
        console.log('🔄 Application continues running, manual setup may be needed');
      }
    }, 2000); // Wait 2 seconds before starting
    
    res.json({
      status: "triggered",
      message: "Post-deployment setup has been triggered and will run in the background"
    });
    
  } catch (error: any) {
    console.error('❌ Failed to trigger post-deployment setup:', error);
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
}

/**
 * Check post-deployment status
 */
export async function getPostDeploymentStatus(req: Request, res: Response) {
  res.json({
    triggered: postDeploymentTriggered,
    status: postDeploymentTriggered ? "completed" : "pending"
  });
}
