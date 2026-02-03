// Test the API endpoint directly
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
  panelId: 5 // TEST_PANEL_LEDGER
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('\n📊 API Response:');
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      console.log('\nRaw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
});

req.write(JSON.stringify(testData));
req.end();
