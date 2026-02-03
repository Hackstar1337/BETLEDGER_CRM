/**
 * Environment Variables Checker
 * Ensures all required environment variables are set
 */

if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
}

const requiredEnvVars = [
    'DATABASE_URL'
];

const optionalEnvVars = [
    'JWT_SECRET',
    'SESSION_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
        console.error(`   - ${varName}`);
    });
    console.error('\nPlease set these environment variables in Railway dashboard or .env file');
    console.error('⚠️  Continuing startup (some features may not work until variables are set)');
} else {
    console.log('✅ All required environment variables are set');
}

// Check optional variables
const missingOptional = optionalEnvVars.filter(varName => !process.env[varName]);
if (missingOptional.length > 0) {
    console.log('\n⚠️  Optional environment variables not set (using defaults):');
    missingOptional.forEach(varName => {
        console.log(`   - ${varName}`);
    });
}

// Validate DATABASE_URL format
if (process.env.DATABASE_URL) {
    const dbUrlRegex = /^mysql:\/\/[^:]+:[^@]+@[^:]+:\d+\/.+$/;
    if (!dbUrlRegex.test(process.env.DATABASE_URL)) {
        console.error('❌ DATABASE_URL format is invalid. Expected: mysql://user:password@host:port/database');
        process.exit(1);
    }
}

console.log('✅ Environment validation complete');
