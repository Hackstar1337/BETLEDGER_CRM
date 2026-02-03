const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixBankBalances() {
    console.log('🔧 Fixing bank balances (correcting calculation issue)...\n');
    
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
        
        for (const account of bankAccounts) {
            console.log(`Processing account: ${account.accountNumber}`);
            
            // Get all deposits for this account
            const [deposits] = await connection.execute(`
                SELECT COALESCE(SUM(CAST(amount AS DECIMAL(10,2))), 0) as totalDeposits
                FROM deposits
                WHERE accountNumber = ?
            `, [account.accountNumber]);
            
            // Get all withdrawals for this account
            const [withdrawals] = await connection.execute(`
                SELECT COALESCE(SUM(CAST(amount AS DECIMAL(10,2))), 0) as totalWithdrawals
                FROM withdrawals
                WHERE accountNumber = ?
            `, [account.accountNumber]);
            
            const totalDeposits = Number(deposits[0].totalDeposits);
            const totalWithdrawals = Number(withdrawals[0].totalWithdrawals);
            const openingBalance = Number(account.openingBalance);
            const expectedBalance = openingBalance + totalDeposits - totalWithdrawals;
            
            console.log(`  Opening Balance: ₹${openingBalance}`);
            console.log(`  Total Deposits: ₹${totalDeposits}`);
            console.log(`  Total Withdrawals: ₹${totalWithdrawals}`);
            console.log(`  Expected Balance: ₹${expectedBalance}`);
            console.log(`  Current Balance: ₹${account.closingBalance}`);
            
            if (expectedBalance !== Number(account.closingBalance)) {
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
        
        console.log('\n🎉 Bank balance fix completed!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

fixBankBalances().catch(console.error);
