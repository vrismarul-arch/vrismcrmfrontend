// src/context/PresenceContext.jsx
import React, { createContext, useState, useEffect } from "react";
import { io } from "socket.io-client";

export const PresenceContext = createContext();

export const PresenceProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [presenceMap, setPresenceMap] = useState({});
  const currentUser = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (!currentUser?._id) return;

    const newSocket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:1001", {
      transports: ["websocket"],
      reconnection: true,
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("🟢 Socket Connected:", newSocket.id);

      newSocket.emit("join_room", currentUser._id);

      // Set user online
      newSocket.emit("presence_change", {
        userId: currentUser._id,
        presence: "online",
      });
    });

    newSocket.on("presence_updated", (data) => {
      const { userId, presence, previousPresence, lastActiveAt } = data;
      setPresenceMap((prev) => ({
        ...prev,
        [userId]: {
          presence,
          previousPresence,
          lastActiveAt: lastActiveAt ? new Date(lastActiveAt) : null,
        },
      }));
    });

    return () => {
      console.log("🔌 Cleaning up socket properly…");

      if (newSocket.connected) {
        newSocket.emit("presence_change", {
          userId: currentUser._id,
          presence: "offline",
        });
      }

      newSocket.removeAllListeners(); // 🛑 Prevents destroy() crash
      newSocket.disconnect(); // Proper cleanup
    };
  }, []);

  return (
    <PresenceContext.Provider value={{ socket, presenceMap }}>
      {children}
    </PresenceContext.Provider>
  );
};
