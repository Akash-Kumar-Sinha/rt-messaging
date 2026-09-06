import http from "http";
import net from "net";
import { spawn } from "child_process";

const publicPort = parseInt(process.env.PORT || "3000", 10);
const wsPort = 3001;
const nextPort = 3002;

console.log(`🚀 Starting Real-Time Messaging System on Port ${publicPort}...\n`);

const wsProcess = spawn("bun", ["server/ws.ts"], {
  stdio: "inherit",
  env: { ...process.env, WS_PORT: String(wsPort), NODE_ENV: "production" },
});

const nextProcess = spawn("bun", ["x", "next", "start", "--port", String(nextPort)], {
  stdio: "inherit",
  env: { ...process.env, PORT: String(nextPort), NODE_ENV: "production" },
});

const gatewayServer = http.createServer((req, res) => {
  const proxyReq = http.request(
    {
      hostname: "127.0.0.1",
      port: nextPort,
      path: req.url,
      method: req.method,
      headers: req.headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("error", () => {
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("Starting up Next.js application...");
  });

  req.pipe(proxyReq);
});

gatewayServer.on("upgrade", (req, clientSocket, head) => {
  const isWsPath = req.url?.startsWith("/ws");
  const targetPort = isWsPath ? wsPort : nextPort;

  const targetSocket = net.connect(targetPort, "127.0.0.1", () => {
    let rawHeaders = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
    if (req.rawHeaders) {
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        rawHeaders += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
      }
    }
    rawHeaders += "\r\n";

    targetSocket.write(rawHeaders);
    if (head && head.length > 0) {
      targetSocket.write(head);
    }
    clientSocket.pipe(targetSocket);
    targetSocket.pipe(clientSocket);
  });

  targetSocket.on("error", () => {
    clientSocket.destroy();
  });

  clientSocket.on("error", () => {
    targetSocket.destroy();
  });
});

gatewayServer.listen(publicPort, () => {
  console.log(`> Unified Gateway listening on http://localhost:${publicPort} and ws://localhost:${publicPort}/ws`);
});

const cleanup = () => {
  console.log("\n🛑 Shutting down production servers...");
  gatewayServer.close();
  wsProcess.kill("SIGTERM");
  nextProcess.kill("SIGTERM");
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

