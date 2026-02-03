// Test the API to see if dates are now correct
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3010,
  path: '/api/trpc/panelDailyBalances.getByPanel',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const testData = {
  panelId: 8 // TIGER PANEL
};

console.log('🔄 Testing API with fixed date format...\n');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('\n📊 Daily Balances Response:');
      
      if (result.result && result.result.data) {
        result.result.data.forEach((day, index) => {
          console.log(`Day ${index + 1}: ${day.date}`);
          console.log(`  Opening: ₹${day.openingBalance.toLocaleString()}`);
          console.log(`  Closing: ₹${day.closingBalance.toLocaleString()}`);
          console.log(`  Deposits: ₹${day.totalDeposits.toLocaleString()}`);
          console.log(`  Withdrawals: ₹${day.totalWithdrawals.toLocaleString()}`);
          
          if (index < result.result.data.length - 1) {
            const nextDay = result.result.data[index + 1];
            const matches = day.closingBalance === nextDay.openingBalance;
            console.log(`  → Next day opening matches: ${matches ? '✅' : '❌'}`);
          }
          console.log('');
        });
      }
    } catch (e) {
      console.error('Error parsing response:', e.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
  console.log('\n💡 Make sure the server is running: npm run dev');
});

req.write(JSON.stringify(testData));
req.end();
