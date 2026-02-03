import "dotenv/config";
import "./scripts/check-env.js";
import setupProductionDatabase from "./scripts/setup-production-db.js";
import { startServer } from "./server/_core/index.ts";

async function main() {
  console.log("🚀 Starting Khiladi Management Panel...");
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("PORT:", process.env.PORT);

  await startServer();

  setupProductionDatabase().catch(error => {
    console.error("❌ Database setup failed (continuing without blocking startup):", error);
  });
}

main().catch(error => {
  console.error("❌ Failed to start:", error);
  process.exit(1);
});
