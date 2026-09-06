import { spawn } from "child_process";

console.log("🚀 Starting Real-Time Messaging System with Bun...\n");

const wsProcess = spawn("bun", ["server/ws.ts"], {
  stdio: "inherit",
  env: { ...process.env, WS_PORT: process.env.WS_PORT || "3001" },
});

const nextProcess = spawn("bun", ["x", "next", "dev", "--port", "3000"], {
  stdio: "inherit",
  env: process.env,
});

const cleanup = () => {
  console.log("\n🛑 Shutting down servers...");
  wsProcess.kill("SIGTERM");
  nextProcess.kill("SIGTERM");
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
