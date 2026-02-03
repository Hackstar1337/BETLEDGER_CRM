const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixMissingAccountNumbers() {
    console.log('🔧 Fixing deposits/withdrawals without account numbers...\n');
    
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
        // Find deposits without accountNumber
        const [depositsWithoutAccount] = await connection.execute(`
            SELECT id, bankName, userId, amount
            FROM deposits
            WHERE accountNumber IS NULL OR accountNumber = ''
            ORDER BY id DESC
        `);
        
        if (depositsWithoutAccount.length > 0) {
            console.log(`Found ${depositsWithoutAccount.length} deposits without accountNumber`);
            
            for (const deposit of depositsWithoutAccount) {
                console.log(`\nFixing deposit ID ${deposit.id}:`);
                console.log(`  Bank: ${deposit.bankName}`);
                console.log(`  Amount: ₹${deposit.amount}`);
                
                // Find a matching bank account
                const [matchingAccounts] = await connection.execute(`
                    SELECT accountNumber FROM bankaccounts
                    WHERE bankName = ? AND (accountType = 'Deposit' OR accountType = 'Both')
                    LIMIT 1
                `, [deposit.bankName]);
                
                if (matchingAccounts.length > 0) {
                    const accountNumber = matchingAccounts[0].accountNumber;
                    console.log(`  Found account: ${accountNumber}`);
                    
                    // Update the deposit
                    await connection.execute(`
                        UPDATE deposits 
                        SET accountNumber = ?
                        WHERE id = ?
                    `, [accountNumber, deposit.id]);
                    
                    console.log(`  ✅ Updated deposit ID ${deposit.id} with accountNumber ${accountNumber}`);
                } else {
                    console.log(`  ❌ No matching account found for bank ${deposit.bankName}`);
                }
            }
        }
        
        // Check for withdrawals without accountNumber
        const [withdrawalsWithoutAccount] = await connection.execute(`
            SELECT id, bankName, userId, amount
            FROM withdrawals
            WHERE accountNumber IS NULL OR accountNumber = ''
            ORDER BY id DESC
        `);
        
        if (withdrawalsWithoutAccount.length > 0) {
            console.log(`\nFound ${withdrawalsWithoutAccount.length} withdrawals without accountNumber`);
            
            for (const withdrawal of withdrawalsWithoutAccount) {
                console.log(`\nFixing withdrawal ID ${withdrawal.id}:`);
                console.log(`  Bank: ${withdrawal.bankName}`);
                console.log(`  Amount: ₹${withdrawal.amount}`);
                
                // Find a matching bank account
                const [matchingAccounts] = await connection.execute(`
                    SELECT accountNumber FROM bankaccounts
                    WHERE bankName = ? AND (accountType = 'Withdrawal' OR accountType = 'Both')
                    LIMIT 1
                `, [withdrawal.bankName]);
                
                if (matchingAccounts.length > 0) {
                    const accountNumber = matchingAccounts[0].accountNumber;
                    console.log(`  Found account: ${accountNumber}`);
                    
                    // Update the withdrawal
                    await connection.execute(`
                        UPDATE withdrawals 
                        SET accountNumber = ?
                        WHERE id = ?
                    `, [accountNumber, withdrawal.id]);
                    
                    console.log(`  ✅ Updated withdrawal ID ${withdrawal.id} with accountNumber ${accountNumber}`);
                } else {
                    console.log(`  ❌ No matching account found for bank ${withdrawal.bankName}`);
                }
            }
        }
        
        console.log('\n✅ Fix completed!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

fixMissingAccountNumbers().catch(console.error);
