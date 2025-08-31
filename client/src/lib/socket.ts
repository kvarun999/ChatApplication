import { io } from "socket.io-client";

const URL = "http://localhost:3000";

// Create the socket instance with useful options for a real chat app
export const socket = io(URL, {
  // 🚀 Don't auto-connect on page load. We'll connect manually after login.
  autoConnect: false,

  // ⚡ Force WebSocket transport (fast and reliable, avoids fallback polling)
  transports: ["websocket"],

  // 🔁 Number of reconnection attempts if disconnected
  reconnectionAttempts: 5,

  // ⏳ Time (ms) between reconnection attempts
  reconnectionDelay: 1000,

  // ⏰ Maximum time (ms) to wait for a connection before failing
  timeout: 20000,
});
