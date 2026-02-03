const mysql = require('mysql2/promise');
require('dotenv').config();

async function recalculateBankBalances() {
    console.log('🔄 Recalculating all bank balances...\n');
    
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
        // Get all bank accounts
        const [bankAccounts] = await connection.execute(`
            SELECT id, accountNumber, openingBalance, closingBalance
            FROM bankaccounts
        `);
        
        console.log(`Processing ${bankAccounts.length} bank accounts...\n`);
        
        for (const account of bankAccounts) {
            console.log(`Processing account: ${account.accountNumber}`);
            
            // Get all deposits for this account
            const [deposits] = await connection.execute(`
                SELECT COALESCE(SUM(amount), 0) as totalDeposits
                FROM deposits
                WHERE accountNumber = ?
            `, [account.accountNumber]);
            
            // Get all withdrawals for this account
            const [withdrawals] = await connection.execute(`
                SELECT COALESCE(SUM(amount), 0) as totalWithdrawals
                FROM withdrawals
                WHERE accountNumber = ?
            `, [account.accountNumber]);
            
            const totalDeposits = deposits[0].totalDeposits;
            const totalWithdrawals = withdrawals[0].totalWithdrawals;
            const expectedBalance = account.openingBalance + totalDeposits - totalWithdrawals;
            
            console.log(`  Opening Balance: ₹${account.openingBalance}`);
            console.log(`  Total Deposits: ₹${totalDeposits}`);
            console.log(`  Total Withdrawals: ₹${totalWithdrawals}`);
            console.log(`  Expected Balance: ₹${expectedBalance}`);
            console.log(`  Current Balance: ₹${account.closingBalance}`);
            
            if (expectedBalance !== account.closingBalance) {
                console.log(`  ⚠️  Updating balance...`);
                await connection.execute(`
                    UPDATE bankaccounts
                    SET closingBalance = ?
                    WHERE id = ?
                `, [expectedBalance, account.id]);
                console.log(`  ✅ Balance updated to ₹${expectedBalance}`);
            } else {
                console.log(`  ✅ Balance is correct`);
            }
            
            console.log('  ---');
        }
        
        console.log('\n🎉 Bank balance recalculation completed!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

recalculateBankBalances().catch(console.error);
