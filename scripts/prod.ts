import { spawn } from "child_process";

console.log("🚀 Starting Real-Time Messaging System in Production with Bun...\n");

const wsProcess = spawn("bun", ["server/ws.ts"], {
  stdio: "inherit",
  env: { ...process.env, WS_PORT: process.env.WS_PORT || "3001", NODE_ENV: "production" },
});

const nextProcess = spawn("bun", ["x", "next", "start", "--port", process.env.PORT || "3000"], {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production" },
});

const cleanup = () => {
  console.log("\n🛑 Shutting down production servers...");
  wsProcess.kill("SIGTERM");
  nextProcess.kill("SIGTERM");
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
