import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import jwt from "jsonwebtoken";

interface WsMessage {
  method: "SUBSCRIBE" | "UNSUBSCRIBE" | "AUTH";
  params?: string[];
  token?: string;
}

// Maps userId to their connected WebSocket
const userSockets = new Map<string, WebSocket>();

// Maps topic name string (e.g. "orderbook:GOOGLE", "trades:GOOGLE") to a Set of connected WebSockets
const topicSockets = new Map<string, Set<WebSocket>>();

export const initWsServer = (server: Server) => {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket) => {
    // Keep track of which topics this specific ws is subscribed to, to clean up on disconnect
    const myTopics = new Set<string>();
    let myUserId: string | null = null;

    ws.on("message", (data: string) => {
      try {
        const message = JSON.parse(data.toString()) as WsMessage;

        if (message.method === "SUBSCRIBE" && message.params) {
          message.params.forEach((topic) => {
            if (!topicSockets.has(topic)) {
              topicSockets.set(topic, new Set());
            }
            topicSockets.get(topic)!.add(ws);
            myTopics.add(topic);
          });
        } 
        else if (message.method === "UNSUBSCRIBE" && message.params) {
          message.params.forEach((topic) => {
            if (topicSockets.has(topic)) {
              topicSockets.get(topic)!.delete(ws);
            }
            myTopics.delete(topic);
          });
        } 
        else if (message.method === "AUTH" && message.token) {
          // Verify token and associate the socket with the userId
          try {
            const decoded = jwt.verify(message.token, process.env.JWT_SECRET as string) as { userId: string };
            if (decoded && decoded.userId) {
              myUserId = decoded.userId;
              userSockets.set(myUserId, ws);
              ws.send(JSON.stringify({ type: "AUTH_SUCCESS" }));
            }
          } catch (err) {
            ws.send(JSON.stringify({ type: "AUTH_ERROR", error: "Invalid token" }));
          }
        }
      } catch (err) {
        console.error("Invalid WS message format", err);
      }
    });

    ws.on("close", () => {
      // Cleanup subscriptions on disconnect
      myTopics.forEach((topic) => {
        if (topicSockets.has(topic)) {
          topicSockets.get(topic)!.delete(ws);
        }
      });
      if (myUserId) {
        userSockets.delete(myUserId);
      }
    });
  });
};

export const broadcast = (topic: string, message: any) => {
  const sockets = topicSockets.get(topic);
  if (sockets) {
    const payload = JSON.stringify(message);
    sockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }
};

export const sendToUser = (userId: string, message: any) => {
  const ws = userSockets.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
};
