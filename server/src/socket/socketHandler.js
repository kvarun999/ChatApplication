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

  // --- Authentication Middleware ---
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: Token not provided"));
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return next(new Error("Authentication error: Invalid token"));
      }
      socket.userId = decoded.userId; // Attach userId for later use
      next();
    });
  });

  // --- Connection Handling ---
  io.on("connection", (socket) => {
    console.log(
      `✅ User connected: ${socket.id} with user ID: ${socket.userId}`
    );

    socket.on("join_room", (chatroomId) => {
      socket.join(chatroomId);
      console.log(`➡️ User ${socket.userId} joined room: ${chatroomId}`);
    });

    socket.on("leave_room", (chatroomId) => {
      socket.leave(chatroomId);
      console.log(`⬅️ User ${socket.userId} left room: ${chatroomId}`);
    });

    socket.on("send_message", async (message) => {
      try {
        // Expecting: { chatroomId, encryptedTextForSender,  encryptedTextForRecipient}
        if (!message?.chatroomId) {
          console.error("❌ Missing chatroomId in payload:", message);
          return;
        }
        if (typeof message.encryptedTextForSender !== "string") {
          console.error(
            "❌ encryptedText must be a stringified JSON:",
            message.encryptedTextForSender
          );
          return;
        }
        if (typeof message.encryptedTextForRecipient !== "string") {
          console.error(
            "❌ encryptedText must be a stringified JSON:",
            message.encryptedTextForRecipient
          );
          return;
        }

        const messageData = {
          chatroomId: message.chatroomId,
          sender: socket.userId,
          encryptedTextForRecipient: message.encryptedTextForRecipient,
          encryptedTextForSender: message.encryptedTextForSender,
        };

        const savedMessage = await saveMessage(messageData);
        if (!savedMessage) return;

        const msgObj = savedMessage.toObject();

        socket.emit("receive_message", {
          ...msgObj,
          encryptedText: savedMessage.encryptedTextForSender,
        });

        // ✅ Send to everyone EXCEPT the sender
        socket.to(message.chatroomId).emit("receive_message", {
          ...msgObj,
          encryptedText: savedMessage.encryptedTextForRecipient,
        });
      } catch (err) {
        console.error("🔥 Error handling message:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.id}`);
    });
  });

  return io;
};
