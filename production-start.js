import "dotenv/config";
import "./scripts/check-env.js";
import setupProductionDatabase from "./scripts/setup-production-db.js";
import { startServer } from "./server/_core/index.js";

async function startProductionServer() {
    console.log('🚀 Starting production server...');
    
    // Setup database first
    try {
        await setupProductionDatabase();
        console.log('✅ Database setup complete');
    } catch (error) {
        console.error('❌ Database setup failed:', error);
        process.exit(1);
    }
    
    // Start the server
    try {
        await startServer();
    } catch (error) {
        console.error('❌ Server startup failed:', error);
        process.exit(1);
    }
}

startProductionServer();
