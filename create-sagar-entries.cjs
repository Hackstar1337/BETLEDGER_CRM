const mysql = require('mysql2/promise');

async function createEntries() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'MySQL@Root2026!',
    database: 'khiladi247_v3'
  });
  
  const playerId = 5; // SAGAR's ID
  const panelId = 35; // Tiger Panel ID
  const depositBankId = 11; // AXIS BANK D
  const withdrawalBankId = 12; // AXIS BANK W
  const date = '2026-02-03';
  
  try {
    // Create Deposit Entry
    console.log('Creating Deposit Entry...');
    const [depositResult] = await conn.execute(`
      INSERT INTO deposits (
        userId, panelName, amount, bonusPoints, status, 
        paymentMethod, bankName, utr, transactionId, 
        depositDate, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'SAGAR',
      'Tiger Panel',
      5000,
      500,
      'Completed',
      'IMPS',
      'AXIS BANK D',
      'DEP-SAGAR-' + Date.now(),
      'TXN' + Date.now(),
      new Date(date + ' 10:30:00'),
      new Date(date + ' 10:30:00'),
      new Date()
    ]);
    console.log('Deposit created with ID:', depositResult.insertId);
    
    // Create Withdrawal Entry
    console.log('\nCreating Withdrawal Entry...');
    const [withdrawalResult] = await conn.execute(`
      INSERT INTO withdrawals (
        userId, panelName, amount, status, 
        paymentMethod, bankName, utr, transactionId, 
        transactionCharge, withdrawalDate, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'SAGAR',
      'Tiger Panel',
      3000,
      'Completed',
      'IMPS',
      'AXIS BANK W',
      'WID-SAGAR-' + Date.now(),
      'TXN' + (Date.now() + 1),
      10,
      new Date(date + ' 14:30:00'),
      new Date(date + ' 14:30:00'),
      new Date()
    ]);
    console.log('Withdrawal created with ID:', withdrawalResult.insertId);
    
    // Update player balance
    console.log('\nUpdating player balance...');
    await conn.execute(`
      UPDATE players 
      SET balance = balance + ?, updatedAt = ?
      WHERE id = ?
    `, [5000 - 3000, new Date(), playerId]);
    
    // Update panel points
    console.log('Updating panel points...');
    await conn.execute(`
      UPDATE panels 
      SET pointsBalance = pointsBalance - ? + ?, updatedAt = ?
      WHERE id = ?
    `, [5000, 3000, new Date(), panelId]);
    
    // Update bank balances
    console.log('Updating bank balances...');
    await conn.execute(`
      UPDATE bankAccounts 
      SET closingBalance = closingBalance + ?, updatedAt = ?
      WHERE id = ?
    `, [5000, new Date(), depositBankId]);
    
    await conn.execute(`
      UPDATE bankAccounts 
      SET closingBalance = closingBalance - ?, totalCharges = totalCharges + ?, updatedAt = ?
      WHERE id = ?
    `, [3000, 10, new Date(), withdrawalBankId]);
    
    console.log('\n✅ All entries created successfully!');
    console.log('- Deposit: ₹5,000 with ₹500 bonus');
    console.log('- Withdrawal: ₹3,000 with ₹10 charge');
    console.log('- Player: SAGAR');
    console.log('- Date: 2026-02-03');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await conn.end();
  }
}

createEntries().catch(console.error);
