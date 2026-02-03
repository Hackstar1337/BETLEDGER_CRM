const { execSync } = require("child_process");
const fs = require("fs");

// Read the .env file to get database credentials
const envContent = fs.readFileSync(".env", "utf8");
const dbUrlMatch = envContent.match(
  /DATABASE_URL=mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/
);

if (!dbUrlMatch) {
  console.error("Could not parse DATABASE_URL from .env file");
  process.exit(1);
}

const [, username, password, host, port, database] = dbUrlMatch;

console.log("Setting up MySQL database...");
console.log(`Username: ${username}`);
console.log(`Database: ${database}`);

try {
  // Create database
  console.log("Creating database...");
  const createDbCmd = `"C:\\tools\\mysql\\current\\bin\\mysql.exe" -u ${username} -p"${password}" -e "CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"`;
  execSync(createDbCmd, { stdio: "inherit" });

  console.log("✅ Database created successfully!");
} catch (error) {
  console.error("❌ Failed to create database:", error.message);
  console.log(
    "\n💡 Make sure MySQL is running and your credentials in .env are correct."
  );
  process.exit(1);
}
