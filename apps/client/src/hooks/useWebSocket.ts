import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";

type WsMessage = {
  type: string;
  [key: string]: any;
};

export const useWebSocket = (topics: string[]) => {
  const { token } = useAuth();
  const ws = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<WsMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize WebSocket
    ws.current = new WebSocket("ws://localhost:3000");

    ws.current.onopen = () => {
      setIsConnected(true);
      // Authenticate if token exists
      if (token) {
        ws.current?.send(JSON.stringify({ method: "AUTH", token }));
      }
      // Subscribe to topics
      if (topics.length > 0) {
        ws.current?.send(JSON.stringify({ method: "SUBSCRIBE", params: topics }));
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages((prev) => [...prev.slice(-50), data]); // Keep last 50 messages
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    ws.current.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        if (topics.length > 0) {
          ws.current.send(JSON.stringify({ method: "UNSUBSCRIBE", params: topics }));
        }
        ws.current.close();
      }
    };
  }, [token, JSON.stringify(topics)]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isConnected, clearMessages };
};
