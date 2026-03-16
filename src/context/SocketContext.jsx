// src/context/SocketContext.js
import { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);

  useEffect(() => {
    const URL =
      import.meta.env.VITE_SOCKET_URL || "http://localhost:1001";

    socketRef.current = io(URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    console.log("🔌 Socket connecting:", URL);

    socketRef.current.on("connect_error", (err) => {
      console.error("❌ Socket error:", err.message);
    });

    return () => socketRef.current.close();
  }, []);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
