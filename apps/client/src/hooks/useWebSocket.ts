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
    const socket = new WebSocket("ws://localhost:3300");
    ws.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      // Authenticate if token exists and socket is open
      if (token && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ method: "AUTH", token }));
      }
      // Subscribe to topics if socket is open
      if (topics.length > 0 && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ method: "SUBSCRIBE", params: topics }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages((prev) => [...prev.slice(-50), data]); // Keep last 50 messages
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        if (topics.length > 0) {
          socket.send(JSON.stringify({ method: "UNSUBSCRIBE", params: topics }));
        }
        socket.close();
      } else if (socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    };
  }, [token, JSON.stringify(topics)]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isConnected, clearMessages };
};
