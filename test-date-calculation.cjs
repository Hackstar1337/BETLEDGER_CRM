// Test the date calculation logic from the client
const selectedPeriod = "24h";
const offset = 330; // GMT+5:30

const now = new Date();
console.log('Current system time:', now);
console.log('Current timezone offset (minutes):', now.getTimezoneOffset());

const localTime = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + offset * 60000);
console.log('Local time (GMT+5:30):', localTime);

const startDate = new Date(localTime.getTime() - 24 * 60 * 60 * 1000);
console.log('Start date (24h ago):', startDate);
console.log('Start date ISO:', startDate.toISOString());
console.log('Start date string:', startDate.toISOString().split('T')[0]);

const endDate = new Date();
console.log('End date:', endDate);
console.log('End date ISO:', endDate.toISOString());
console.log('End date string:', endDate.toISOString().split('T')[0]);
