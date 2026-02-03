#!/usr/bin/env node

import mysql from 'mysql2/promise';

/**
 * Database Verification Script
 * 
 * This script verifies that all required tables and columns exist
 * and that the database schema matches the application expectations.
 */

async function verifyDatabase() {
    if (!process.env.DATABASE_URL) {
        console.log('❌ DATABASE_URL not found in environment variables');
        process.exit(1);
    }

    console.log('🔍 Starting database verification...');
    
    let connection;
    try {
        connection = await mysql.createConnection(process.env.DATABASE_URL);
        console.log('✅ Database connection established');

        // Define expected database structure
        const expectedStructure = {
            tables: {
                'users': {
                    columns: ['id', 'openId', 'name', 'email', 'loginMethod', 'role', 'createdAt', 'updatedAt', 'lastSignedIn'],
                    description: 'OAuth users table'
                },
                'admin_users': {
                    columns: ['id', 'username', 'passwordHash', 'email', 'fullName', 'isActive', 'createdAt', 'updatedAt', 'lastLoginAt'],
                    description: 'Standalone admin users'
                },
                'panels': {
                    columns: ['id', 'name', 'pointsBalance', 'openingBalance', 'closingBalance', 'topUp', 'extraDeposit', 'bonusPoints', 'profitLoss', 'createdAt', 'updatedAt'],
                    description: 'Betting panels (CRITICAL: must have topUp, extraDeposit, bonusPoints, profitLoss)'
                },
                'bankaccounts': {
                    columns: ['id', 'accountHolderName', 'accountNumber', 'bankName', 'accountType', 'openingBalance', 'closingBalance', 'totalCharges', 'feeIMPS', 'feeRTGS', 'feeNEFT', 'feeUPI', 'feePhonePe', 'feeGooglePay', 'feePaytm', 'isActive', 'createdAt', 'updatedAt'],
                    description: 'Bank accounts with fee structure'
                },
                'players': {
                    columns: ['id', 'userId', 'name', 'panelName', 'balance', 'createdAt', 'updatedAt'],
                    description: 'Player information'
                },
                'deposits': {
                    columns: ['id', 'userId', 'amount', 'utr', 'accountNumber', 'bankName', 'panelName', 'bonusPoints', 'isExtraDeposit', 'isWrongDeposit', 'depositDate', 'createdAt', 'updatedAt'],
                    description: 'Deposit transactions'
                },
                'withdrawals': {
                    columns: ['id', 'userId', 'amount', 'utr', 'accountNumber', 'bankName', 'panelName', 'paymentMethod', 'transactionCharge', 'isExtraWithdrawal', 'isWrongWithdrawal', 'status', 'withdrawalDate', 'createdAt', 'updatedAt'],
                    description: 'Withdrawal transactions'
                },
                'gameplayTransactions': {
                    columns: ['id', 'userId', 'panelName', 'transactionType', 'amount', 'notes', 'transactionDate', 'createdAt', 'updatedAt'],
                    description: 'Gameplay wins and losses'
                },
                'transactions': {
                    columns: ['id', 'type', 'amount', 'utr', 'bankAccountId', 'panelName', 'userId', 'description', 'transactionDate', 'createdAt', 'updatedAt'],
                    description: 'General transaction ledger'
                },
                'sessions': {
                    columns: ['id', 'userId', 'expiresAt', 'createdAt', 'ipAddress', 'userAgent'],
                    description: 'User authentication sessions'
                },
                'logs': {
                    columns: ['id', 'level', 'message', 'userId', 'action', 'resource', 'resourceId', 'ipAddress', 'userAgent', 'metadata', 'createdAt'],
                    description: 'Application audit logs'
                },
                'audit_trail': {
                    columns: ['id', 'tableName', 'recordId', 'action', 'oldValues', 'newValues', 'userId', 'timestamp'],
                    description: 'CRUD operations audit trail'
                },
                'notifications': {
                    columns: ['id', 'userId', 'title', 'message', 'type', 'isRead', 'actionUrl', 'metadata', 'createdAt', 'readAt'],
                    description: 'User notifications'
                },
                'settings': {
                    columns: ['id', 'key', 'value', 'description', 'type', 'category', 'isPublic', 'updatedBy', 'createdAt', 'updatedAt'],
                    description: 'Application configuration settings'
                },
                'roles': {
                    columns: ['id', 'name', 'displayName', 'description', 'permissions', 'isActive', 'createdAt', 'updatedAt'],
                    description: 'User roles and permissions'
                },
                'user_roles': {
                    columns: ['id', 'oauthOpenId', 'adminUsername', 'roleId', 'assignedAt', 'assignedBy'],
                    description: 'Role assignments for users and admins'
                },
                'dailyreports': {
                    columns: ['id', 'reportDate', 'totalDeposits', 'totalWithdrawals', 'totalProfitLoss', 'numberOfDeposits', 'numberOfWithdrawals', 'uniquePlayersDeposited', 'uniquePlayersWithdrew', 'newIdsCreated', 'reportData', 'createdAt', 'updatedAt'],
                    description: 'Daily aggregated reports'
                },
                'paneldailybalances': {
                    columns: ['id', 'panelId', 'date', 'openingBalance', 'closingBalance', 'totalDeposits', 'totalWithdrawals', 'bonusPoints', 'topUp', 'extraDeposit', 'profitLoss', 'timezone', 'createdAt', 'updatedAt'],
                    description: 'Panel daily balance snapshots'
                },
                'topuphistory': {
                    columns: ['id', 'panelId', 'panelName', 'previousTopUp', 'amountAdded', 'newTopUp', 'previousClosingBalance', 'newClosingBalance', 'previousPointsBalance', 'newPointsBalance', 'createdBy', 'createdAt'],
                    description: 'Top-up transaction history'
                },
                'panel_daily_ledger': {
                    columns: ['id', 'panel_id', 'ledger_date', 'opening_balance', 'closing_balance', 'points_balance', 'total_deposits', 'total_withdrawals', 'bonus_points', 'top_up', 'profit_loss', 'roi', 'utilization', 'status', 'created_at', 'updated_at'],
                    description: 'Enhanced panel daily ledger (created by fix script)'
                },
                'bank_daily_ledger': {
                    columns: ['id', 'bank_account_id', 'ledger_date', 'opening_balance', 'closing_balance', 'total_deposits', 'total_withdrawals', 'total_charges', 'profit_loss', 'roi', 'status', 'created_at', 'updated_at'],
                    description: 'Bank daily ledger (created by fix script)'
                },
                'transaction_log': {
                    columns: ['id', 'transaction_date', 'ledger_date', 'entity_type', 'entity_id', 'transaction_type', 'amount', 'reference_type', 'reference_id', 'related_entity_type', 'related_entity_id', 'description', 'created_at'],
                    description: 'Comprehensive transaction log (created by fix script)'
                }
            }
        };

        // Get actual database structure
        const [actualTables] = await connection.execute('SHOW TABLES');
        const actualTableNames = actualTables.map(row => Object.values(row)[0]);

        console.log('\n📊 Database Structure Verification');
        console.log('='.repeat(50));

        let issues = [];
        let warnings = [];

        // Check each expected table
        for (const [tableName, expected] of Object.entries(expectedStructure.tables)) {
            console.log(`\n🔍 Checking table: ${tableName}`);
            console.log(`   Description: ${expected.description}`);

            if (!actualTableNames.includes(tableName)) {
                console.log(`   ❌ TABLE MISSING`);
                issues.push(`Missing table: ${tableName}`);
                continue;
            }

            console.log(`   ✅ Table exists`);

            // Check table columns
            try {
                const [actualColumns] = await connection.execute(`DESCRIBE ${tableName}`);
                const actualColumnNames = actualColumns.map(col => col.Field);

                let missingColumns = [];
                for (const expectedColumn of expected.columns) {
                    if (!actualColumnNames.includes(expectedColumn)) {
                        console.log(`   ❌ Missing column: ${expectedColumn}`);
                        missingColumns.push(expectedColumn);
                        issues.push(`Table ${tableName} missing column: ${expectedColumn}`);
                    } else {
                        console.log(`   ✅ Column exists: ${expectedColumn}`);
                    }
                }

                if (missingColumns.length === 0) {
                    console.log(`   ✅ All required columns present`);
                }

                // Check for extra columns (informational)
                const extraColumns = actualColumnNames.filter(col => !expected.columns.includes(col));
                if (extraColumns.length > 0) {
                    console.log(`   ℹ️ Extra columns: ${extraColumns.join(', ')}`);
                    warnings.push(`Table ${tableName} has extra columns: ${extraColumns.join(', ')}`);
                }

            } catch (error) {
                console.log(`   ❌ Error checking columns: ${error.message}`);
                issues.push(`Error checking table ${tableName}: ${error.message}`);
            }
        }

        // Check for unexpected tables
        const expectedTableNames = Object.keys(expectedStructure.tables);
        const unexpectedTables = actualTableNames.filter(table => !expectedTableNames.includes(table));
        if (unexpectedTables.length > 0) {
            console.log(`\nℹ️ Unexpected tables found:`);
            unexpectedTables.forEach(table => {
                console.log(`   - ${table}`);
            });
            warnings.push(`Unexpected tables: ${unexpectedTables.join(', ')}`);
        }

        // Test critical functionality
        console.log('\n🧪 Critical Functionality Tests');
        console.log('='.repeat(50));

        // Test panels table specifically (most problematic)
        if (actualTableNames.includes('panels')) {
            try {
                const testQuery = 'SELECT id, name, pointsBalance, openingBalance, closingBalance, topUp, extraDeposit, bonusPoints, profitLoss, createdAt, updatedAt FROM panels LIMIT 1';
                await connection.execute(testQuery);
                console.log('✅ Panels table query test passed');
            } catch (error) {
                console.log(`❌ Panels table query failed: ${error.message}`);
                issues.push(`Panels table query failed: ${error.message}`);
            }
        }

        // Test admin_users table
        if (actualTableNames.includes('admin_users')) {
            try {
                const [adminCount] = await connection.execute('SELECT COUNT(*) as count FROM admin_users');
                console.log(`✅ Admin users table accessible (${adminCount[0].count} admins found)`);
            } catch (error) {
                console.log(`❌ Admin users table failed: ${error.message}`);
                issues.push(`Admin users table failed: ${error.message}`);
            }
        }

        // Summary
        console.log('\n📋 Verification Summary');
        console.log('='.repeat(50));
        
        if (issues.length === 0) {
            console.log('🎉 ALL CHECKS PASSED! Database is ready for production.');
        } else {
            console.log(`❌ ${issues.length} critical issues found:`);
            issues.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue}`);
            });
        }

        if (warnings.length > 0) {
            console.log(`\n⚠️ ${warnings.length} warnings:`);
            warnings.forEach((warning, index) => {
                console.log(`   ${index + 1}. ${warning}`);
            });
        }

        // Database statistics
        console.log('\n📊 Database Statistics');
        console.log('='.repeat(50));
        console.log(`Total tables: ${actualTableNames.length}`);
        console.log(`Expected tables: ${expectedTableNames.length}`);
        console.log(`Missing tables: ${issues.filter(i => i.startsWith('Missing table')).length}`);
        console.log(`Missing columns: ${issues.filter(i => i.includes('missing column')).length}`);

        // Exit with appropriate code
        if (issues.length > 0) {
            console.log('\n❌ Database verification failed. Run the fix script: node scripts/fix-railway-database.js');
            process.exit(1);
        } else {
            console.log('\n✅ Database verification completed successfully!');
            process.exit(0);
        }

    } catch (error) {
        console.error('\n❌ Database verification failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Database connection closed');
        }
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    verifyDatabase();
}

export default verifyDatabase;
