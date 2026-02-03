const { execSync } = require("child_process");

console.log("🔍 Testing MySQL connection methods...\n");

// Common password attempts
const passwords = ["", "root", "123456", "password", "mysql", "admin"];

async function testConnection(password, description) {
  try {
    const cmd = password
      ? `"C:\\tools\\mysql\\current\\bin\\mysql.exe" -u root -p"${password}" -e "SELECT 1;" 2>nul`
      : `"C:\\tools\\mysql\\current\\bin\\mysql.exe" -u root -e "SELECT 1;" 2>nul`;
    
    execSync(cmd, { stdio: 'pipe' });
    console.log(`✅ Success with ${description} (password: "${password}")`);
    return password;
  } catch (error) {
    console.log(`❌ Failed with ${description}`);
    return null;
  }
}

async function main() {
  let workingPassword = null;
  
  // Test each password
  for (const pwd of passwords) {
    const desc = pwd === "" ? "no password" : `password: "${pwd}"`;
    workingPassword = await testConnection(pwd, desc);
    if (workingPassword !== null) break;
  }
  
  if (workingPassword !== null) {
    console.log("\n🎉 Found working MySQL credentials!");
    console.log(`   Username: root`);
    console.log(`   Password: "${workingPassword}"`);
    console.log("\n💡 Update your .env file DATABASE_URL to:");
    console.log(`   DATABASE_URL=mysql://root:${workingPassword}@localhost:3306/khiladi247`);
  } else {
    console.log("\n❌ Could not connect with any common passwords");
    console.log("\n💡 Please check:");
    console.log("   1. MySQL is running (services.msc)");
    console.log("   2. Your MySQL installation password");
    console.log("   3. Try resetting MySQL root password");
  }
}

main();
