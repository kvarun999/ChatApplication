import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { saveMessage } from "../controllers/message.controller.js";

export const initializeSocketServer = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173", // Your frontend URL
      methods: ["GET", "POST"],
    },
  });

  // --- Socket.IO Authentication Middleware ---
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: Token not provided"));
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return next(new Error("Authentication error: Invalid token"));
      }
      socket.userId = decoded.userId;
      next();
    });
  });

  // --- Socket.IO Connection Handling ---
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id} with user ID: ${socket.userId}`);

    socket.on("join_room", (chatRoomId) => {
      socket.join(chatRoomId);
      console.log(`User ${socket.userId} joined room: ${chatRoomId}`);
    });

    socket.on("send_message", async (data) => {
      const { chatRoomId, encryptedText } = data;
      const senderId = socket.userId;

      const savedMessage = await saveMessage({
        chatRoomId,
        senderId,
        encryptedText,
      });

      if (savedMessage) {
        // Broadcast to all other clients in the room
        socket.to(chatRoomId).emit("receive_message", savedMessage);
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  return io;
};
