const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkBankAccountsEverywhere() {
    console.log('🔍 Checking bank accounts in all tables...\n');
    
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
        // Check bank accounts table
        console.log('📋 Bank Accounts Table:');
        const [bankAccounts] = await connection.execute(`
            SELECT id, accountHolderName, bankName, accountNumber, accountType, closingBalance
            FROM bankaccounts
            ORDER BY id DESC
            LIMIT 10
        `);
        
        bankAccounts.forEach(acc => {
            console.log(`  ${acc.id}: ${acc.accountHolderName} - ${acc.bankName} (${acc.accountNumber}) [${acc.accountType}] - Balance: ${acc.closingBalance}`);
        });
        
        // Check deposits table
        console.log('\n💰 Recent Deposits (with account numbers):');
        const [deposits] = await connection.execute(`
            SELECT id, userId, amount, bankName, accountNumber, depositDate
            FROM deposits
            ORDER BY depositDate DESC
            LIMIT 5
        `);
        
        if (deposits.length === 0) {
            console.log('  No deposits found');
        } else {
            deposits.forEach(d => {
                console.log(`  ${d.id}: User ${d.userId} - ₹${d.amount} - Bank: ${d.bankName} - Account: ${d.accountNumber || 'NULL'} - Date: ${d.depositDate}`);
            });
        }
        
        // Check withdrawals table
        console.log('\n💸 Recent Withdrawals (with account numbers):');
        const [withdrawals] = await connection.execute(`
            SELECT id, userId, amount, bankName, accountNumber, withdrawalDate
            FROM withdrawals
            ORDER BY withdrawalDate DESC
            LIMIT 5
        `);
        
        if (withdrawals.length === 0) {
            console.log('  No withdrawals found');
        } else {
            withdrawals.forEach(w => {
                console.log(`  ${w.id}: User ${w.userId} - ₹${w.amount} - Bank: ${w.bankName} - Account: ${w.accountNumber || 'NULL'} - Date: ${w.withdrawalDate}`);
            });
        }
        
        // Check if there are any deposits/withdrawals without accountNumber
        console.log('\n⚠️  Checking for entries without accountNumber:');
        const [depositsWithoutAccount] = await connection.execute(`
            SELECT COUNT(*) as count FROM deposits WHERE accountNumber IS NULL OR accountNumber = ''
        `);
        const [withdrawalsWithoutAccount] = await connection.execute(`
            SELECT COUNT(*) as count FROM withdrawals WHERE accountNumber IS NULL OR accountNumber = ''
        `);
        
        console.log(`  Deposits without accountNumber: ${depositsWithoutAccount[0].count}`);
        console.log(`  Withdrawals without accountNumber: ${withdrawalsWithoutAccount[0].count}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

checkBankAccountsEverywhere().catch(console.error);
