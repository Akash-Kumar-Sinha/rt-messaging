import http from "http";
import next from "next";
import { initWebSocketServer } from "../server/ws";

const port = parseInt(process.env.PORT || "3000", 10);
const dev = false;
const app = next({ dev, dir: process.cwd() });
const handle = app.getRequestHandler();

console.log(`🚀 Starting Unified Real-Time Production Server on Port ${port}...\n`);

await app.prepare();

const server = http.createServer((req, res) => {
  handle(req, res);
});

initWebSocketServer(server);

server.listen(port, () => {
  console.log(`> Ready on http://localhost:${port} and ws://localhost:${port}/ws`);
});

const cleanup = () => {
  console.log("\n🛑 Shutting down production server...");
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

