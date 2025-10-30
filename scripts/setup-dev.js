#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🚀 Setting up OfficeShare Platform for development...\n");

// Check if .env exists
if (!fs.existsSync(".env")) {
  console.log("📝 Creating .env file from template...");
  fs.copyFileSync(".env.example", ".env");
  console.log("✅ .env file created\n");
} else {
  console.log("✅ .env file already exists\n");
}

// Install root dependencies
console.log("📦 Installing root dependencies...");
try {
  execSync("npm install", { stdio: "inherit" });
  console.log("✅ Root dependencies installed\n");
} catch (error) {
  console.error("❌ Failed to install root dependencies");
  process.exit(1);
}

// Install service dependencies
console.log("📦 Installing service dependencies...");
const services = [
  "api-gateway",
  "user-service",
  "carpooling-service",
  "matching-service",
  "tracking-service",
  "notification-service",
  "chat-service",
];

for (const service of services) {
  const servicePath = path.join("services", service);
  if (fs.existsSync(servicePath)) {
    console.log(`  Installing ${service}...`);
    try {
      execSync("npm install", {
        cwd: servicePath,
        stdio: "pipe",
      });
      console.log(`  ✅ ${service} dependencies installed`);
    } catch (error) {
      console.error(`  ❌ Failed to install ${service} dependencies`);
    }
  }
}

// Install mobile app dependencies
console.log("\n📱 Installing mobile app dependencies...");
if (fs.existsSync("mobile-app")) {
  try {
    execSync("npm install", {
      cwd: "mobile-app",
      stdio: "pipe",
    });
    console.log("✅ Mobile app dependencies installed");
  } catch (error) {
    console.error("❌ Failed to install mobile app dependencies");
  }
}

// Install admin dashboard dependencies
console.log("\n🖥️  Installing admin dashboard dependencies...");
if (fs.existsSync("admin-dashboard")) {
  try {
    execSync("npm install", {
      cwd: "admin-dashboard",
      stdio: "pipe",
    });
    console.log("✅ Admin dashboard dependencies installed");
  } catch (error) {
    console.error("❌ Failed to install admin dashboard dependencies");
  }
}

console.log("\n🎉 Setup complete! You can now start development:");
console.log("");
console.log("  npm run dev          # Start all backend services");
console.log("  npm run dev:mobile   # Start mobile app");
console.log("  npm run dev:admin    # Start admin dashboard");
console.log("");
console.log("📚 Check README.md for more commands and documentation.");
