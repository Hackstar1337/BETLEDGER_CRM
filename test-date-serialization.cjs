// Test to understand date serialization
const testDate = new Date('Mon Feb 02 2026 08:37:36 GMT+0530 (India Standard Time)');
console.log('Original date:', testDate);
console.log('toISOString():', testDate.toISOString());
console.log('toString():', testDate.toString());

// Simulate what happens when parsing ISO string
const parsedFromISO = new Date(testDate.toISOString());
console.log('\nParsed from ISO:');
console.log('Parsed date:', parsedFromISO);
console.log('toString():', parsedFromISO.toString());

// Check timezone offsets
console.log('\nTimezone info:');
console.log('Original offset (minutes):', testDate.getTimezoneOffset());
console.log('Parsed offset (minutes):', parsedFromISO.getTimezoneOffset());

// Calculate correct time
const diff = testDate.getTimezoneOffset() - parsedFromISO.getTimezoneOffset();
const corrected = new Date(parsedFromISO.getTime() + diff * 60000);
console.log('\nCorrected date:', corrected);
console.log('Corrected time:', corrected.toString());
