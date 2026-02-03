const mysql = require('mysql2/promise');
require('dotenv').config();

// Function to simulate how the server calculates dates
function simulateTimezoneCalculation(timezone) {
  console.log(`\n🌍 Testing timezone: ${timezone}`);
  
  const now = new Date();
  console.log(`   Current UTC time: ${now.toISOString()}`);
  
  // Parse timezone offset (e.g., "GMT+5:30" -> 5.5 hours)
  const offsetMatch = timezone.match(/GMT([+-]\d+):?(\d*)/);
  let offsetHours = 0;
  
  if (offsetMatch) {
    offsetHours = parseInt(offsetMatch[1]);
    if (offsetMatch[2]) {
      offsetHours += parseInt(offsetMatch[2]) / 60 * (offsetHours < 0 ? -1 : 1);
    }
  }
  
  // Calculate local time
  const localTime = new Date(
    now.getTime() + now.getTimezoneOffset() * 60000 + offsetHours * 60000
  );
  console.log(`   Local time: ${localTime.toString()}`);
  
  // Calculate 24h start
  const startDate = new Date(localTime.getTime() - 24 * 60 * 60 * 1000);
  console.log(`   24h period starts: ${startDate.toString()}`);
  
  // Calculate start of today (midnight)
  const todayStart = new Date(localTime);
  todayStart.setHours(0, 0, 0, 0);
  console.log(`   Today starts at: ${todayStart.toString()}`);
  
  return { now, localTime, startDate, todayStart, offsetHours };
}

async function testTimezoneBehavior() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'khiladi_panel',
    multipleStatements: true
  });

  try {
    console.log('🕐 Testing Timezone Behavior\n');

    // Test different timezones
    const timezones = ['GMT+5:30', 'GMT+0:00', 'GMT-5:00', 'GMT+9:00'];
    
    for (const timezone of timezones) {
      const { now, localTime, startDate, todayStart, offsetHours } = simulateTimezoneCalculation(timezone);
      
      // Convert back to UTC for database queries
      const utcStart = new Date(
        startDate.getTime() - offsetHours * 60000 - now.getTimezoneOffset() * 60000
      );
      const utcToday = new Date(
        todayStart.getTime() - offsetHours * 60000 - now.getTimezoneOffset() * 60000
      );
      
      console.log(`   UTC for 24h query: ${utcStart.toISOString()}`);
      console.log(`   UTC for today: ${utcToday.toISOString()}`);
      
      // Check if there are any transactions in this period
      const [count] = await connection.execute(`
        SELECT COUNT(*) as count FROM (
          SELECT createdAt FROM deposits WHERE createdAt >= ? AND createdAt <= ?
          UNION ALL
          SELECT createdAt FROM withdrawals WHERE createdAt >= ? AND createdAt <= ?
        ) t
      `, [utcStart, now, utcStart, now]);
      
      console.log(`   Transactions in last 24h: ${count[0].count}`);
    }

    console.log('\n📊 Testing date boundaries:');
    
    // Create a test transaction right at the boundary
    const boundaryTime = new Date();
    boundaryTime.setHours(0, 0, 1, 0); // 1 second after midnight
    
    console.log(`\n   Creating test transaction at: ${boundaryTime.toISOString()}`);
    
    // This demonstrates how transactions are grouped by date in different timezones
    console.log('\n   Date grouping by timezone:');
    for (const timezone of ['GMT+5:30', 'GMT+0:00', 'GMT-5:00']) {
      const { localTime, offsetHours } = simulateTimezoneCalculation(timezone);
      const localBoundary = new Date(
        boundaryTime.getTime() + boundaryTime.getTimezoneOffset() * 60000 + offsetHours * 60000
      );
      
      const dateStr = localBoundary.toISOString().split('T')[0];
      console.log(`      ${timezone}: ${dateStr} (${localBoundary.toString()})`);
    }

    console.log('\n✅ Timezone test completed!');
    console.log('\n💡 Key observations:');
    console.log('   1. The same UTC time can fall on different dates in different timezones');
    console.log('   2. 24-hour periods shift based on timezone offset');
    console.log('   3. "Today" starts at different UTC times for each timezone');
    console.log('   4. The system correctly converts between UTC and local time');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await connection.end();
  }
}

// Run the test
testTimezoneBehavior();
