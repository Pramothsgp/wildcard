// Next.js plus the game WebSocket on one port (Cloud Run gives a service one port).
// Run with Node directly: Node strips the TypeScript types.
import { createServer } from "node:http";
import { fromNodeHeaders } from "better-auth/node";
import next from "next";
import { WebSocketServer } from "ws";
import * as rooms from "./game/rooms.ts";
import { auth } from "./lib/auth.ts";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3001);
const hostname = process.env.HOSTNAME ?? "localhost";
const allowedOrigin = process.env.BETTER_AUTH_URL ? new URL(process.env.BETTER_AUTH_URL).origin : null;

const app = next({ dev, dir: import.meta.dirname, hostname, port });
await app.prepare();
await rooms.init();
const handle = app.getRequestHandler();
const nextUpgrade = app.getUpgradeHandler();
const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });

const server = createServer((req, res) => void handle(req, res));

server.on("upgrade", async (req, socket, head) => {
  // Under /api so no page route (like /[game]) can match it and take the upgrade.
  if (!req.url?.startsWith("/api/ws")) return nextUpgrade(req, socket, head);
  const reject = (code: string) => {
    socket.write(`HTTP/1.1 ${code}\r\nConnection: close\r\n\r\n`);
    socket.destroy();
  };
  // The session cookie rides along on the upgrade, so check the origin (cross-site WebSocket hijacking).
  if (allowedOrigin && req.headers.origin !== allowedOrigin) return reject("403 Forbidden");
  try {
    const session = await auth().api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session || session.user.banned) return reject("401 Unauthorized");
    wss.handleUpgrade(req, socket, head, (ws) => {
      const alive = { ok: true };
      ws.on("pong", () => (alive.ok = true));
      const ping = setInterval(() => {
        if (!alive.ok) return ws.terminate();
        alive.ok = false;
        ws.ping();
      }, 25_000);
      ws.on("close", () => clearInterval(ping));
      rooms.connect(ws, { id: session.user.id, name: session.user.name });
    });
  } catch (err) {
    console.error("ws: auth failed", err);
    reject("500 Internal Server Error");
  }
});

server.listen(port, hostname, () => console.log(`game: http://${hostname}:${port}`));
