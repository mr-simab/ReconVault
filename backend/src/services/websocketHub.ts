import { Server as HttpServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { logger } from "../config/logger";

class WebsocketHub {
  private wss: WebSocketServer | null = null;

  attach(server: HttpServer): void {
    this.wss = new WebSocketServer({ server, path: "/ws/intelligence" });
    this.wss.on("connection", (socket) => {
      socket.send(JSON.stringify({ type: "connected", payload: { message: "WebSocket connected" }, timestamp: new Date().toISOString() }));
      socket.on("message", (message) => {
        try {
          const parsed = JSON.parse(message.toString());
          if (parsed?.type === "ping") {
            socket.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
          }
        } catch {
          // ignore non-json payloads
        }
      });
    });
    logger.info("WebSocket hub attached at /ws/intelligence");
  }

  broadcast(type: string, payload: unknown): void {
    if (!this.wss) return;
    const msg = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
    this.wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) client.send(msg);
    });
  }
}

export const websocketHub = new WebsocketHub();
