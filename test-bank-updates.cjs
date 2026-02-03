const mysql = require('mysql2/promise');
require('dotenv').config();

async function testBankBalanceUpdates() {
    console.log('🔍 Testing bank balance updates...\n');
    
    const dbUrl = process.env.DATABASE_URL;
    const url = new URL(dbUrl);
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    const host = url.hostname;
    const port = url.port || 3306;
    const database = url.pathname.substring(1);
    
    const connection = await mysql.createConnection({
        host,
        user,
        password,
        database,
        port: parseInt(port),
        ssl: false
    });
    
    try {
        // Get a test bank account
        const [accounts] = await connection.execute(`
            SELECT id, accountHolderName, accountNumber, bankName, openingBalance, closingBalance
            FROM bankaccounts
            WHERE accountType = 'Both'
            LIMIT 1
        `);
        
        if (accounts.length === 0) {
            console.log('❌ No bank accounts with type "Both" found');
            return;
        }
        
        const testAccount = accounts[0];
        console.log('📋 Test Account:');
        console.log(`  Holder: ${testAccount.accountHolderName}`);
        console.log(`  Bank: ${testAccount.bankName}`);
        console.log(`  Account: ${testAccount.accountNumber}`);
        console.log(`  Opening Balance: ${testAccount.openingBalance}`);
        console.log(`  Current Closing Balance: ${testAccount.closingBalance}`);
        
        // Check recent deposits for this account
        const [deposits] = await connection.execute(`
            SELECT amount, depositDate, accountNumber
            FROM deposits
            WHERE accountNumber = ?
            ORDER BY depositDate DESC
            LIMIT 5
        `, [testAccount.accountNumber]);
        
        console.log('\n💰 Recent Deposits:');
        if (deposits.length === 0) {
            console.log('  No deposits found');
        } else {
            deposits.forEach(d => {
                console.log(`  - ${d.depositDate}: ₹${d.amount} (Account: ${d.accountNumber})`);
            });
        }
        
        // Check recent withdrawals for this account
        const [withdrawals] = await connection.execute(`
            SELECT amount, withdrawalDate, accountNumber
            FROM withdrawals
            WHERE accountNumber = ?
            ORDER BY withdrawalDate DESC
            LIMIT 5
        `, [testAccount.accountNumber]);
        
        console.log('\n💸 Recent Withdrawals:');
        if (withdrawals.length === 0) {
            console.log('  No withdrawals found');
        } else {
            withdrawals.forEach(w => {
                console.log(`  - ${w.withdrawalDate}: ₹${w.amount} (Account: ${w.accountNumber})`);
            });
        }
        
        // Calculate expected balance
        const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);
        const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);
        const expectedBalance = testAccount.openingBalance + totalDeposits - totalWithdrawals;
        
        console.log('\n🧮 Balance Calculation:');
        console.log(`  Opening Balance: ₹${testAccount.openingBalance}`);
        console.log(`  + Total Deposits: ₹${totalDeposits}`);
        console.log(`  - Total Withdrawals: ₹${totalWithdrawals}`);
        console.log(`  = Expected Balance: ₹${expectedBalance}`);
        console.log(`  Actual Closing Balance: ₹${testAccount.closingBalance}`);
        
        if (expectedBalance === testAccount.closingBalance) {
            console.log('\n✅ Balance is correct!');
        } else {
            console.log('\n❌ Balance mismatch! There might be an issue with updates.');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

testBankBalanceUpdates().catch(console.error);
