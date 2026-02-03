// Test the validation logic directly
// This simulates the createBankAccount function validation

function simulateCreateBankAccount(data, existingAccounts) {
  // Check for duplicate account holder name (simulating database check)
  const existingAccount = existingAccounts.find(
    acc => acc.accountHolderName === data.accountHolderName
  );
  
  if (existingAccount) {
    throw new Error(`Account holder name "${data.accountHolderName}" already exists. Please use a different name.`);
  }
  
  return { success: true, id: Math.floor(Math.random() * 1000) };
}

// Test cases
const existingAccounts = [
  { id: 1, accountHolderName: "John Doe", accountNumber: "ACC001", bankName: "Bank A" },
  { id: 2, accountHolderName: "Jane Smith", accountNumber: "ACC002", bankName: "Bank B" }
];

console.log("Testing duplicate account holder name validation...\n");

// Test 1: Create new account with unique name
console.log("Test 1: Creating account with unique holder name");
try {
  const result = simulateCreateBankAccount({
    accountHolderName: "Alice Johnson",
    accountNumber: "ACC003",
    bankName: "Bank C"
  }, existingAccounts);
  console.log("✅ SUCCESS:", result);
} catch (error) {
  console.log("❌ FAILED:", error.message);
}

// Test 2: Try to create account with duplicate name
console.log("\nTest 2: Creating account with duplicate holder name");
try {
  const result = simulateCreateBankAccount({
    accountHolderName: "John Doe", // This already exists
    accountNumber: "ACC004",
    bankName: "Bank D"
  }, existingAccounts);
  console.log("❌ FAILED: Should have thrown an error but got:", result);
} catch (error) {
  console.log("✅ SUCCESS: Correctly prevented duplicate -", error.message);
}

// Test 3: Create account with same bank but different holder name (should work)
console.log("\nTest 3: Creating account with same bank but different holder name");
try {
  const result = simulateCreateBankAccount({
    accountHolderName: "Bob Wilson",
    accountNumber: "ACC005",
    bankName: "Bank A" // Same bank as John Doe, but different name
  }, existingAccounts);
  console.log("✅ SUCCESS:", result);
} catch (error) {
  console.log("❌ FAILED:", error.message);
}

console.log("\n✅ All validation logic tests completed!");
console.log("\nNote: This tests the validation logic only.");
console.log("The actual database constraint provides additional protection.");
