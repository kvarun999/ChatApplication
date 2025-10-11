import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import {
  saveMessage,
  updateMessageStatus,
} from "../controllers/message.controller.js";
import ChatRoom from "../models/Chatroom.js";
import Message from "../models/Message.js";

const onlineUsers = new Map();
let ioInstance;

export const initializeSocketServer = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });
  ioInstance = io;

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

  io.on("connection", (socket) => {
    console.log(
      `✅ User connected: ${socket.id} with user ID: ${socket.userId}`
    );

    onlineUsers.set(socket.userId.toString(), socket.id);
    socket.broadcast.emit("user_online", socket.userId);

    socket.emit("online_users", Array.from(onlineUsers.keys()));
    // Each user joins a personal room to receive notifications
    socket.join(socket.userId.toString());

    socket.on("join_room", (chatroomId) => {
      socket.join(chatroomId);
      console.log(`➡️ User ${socket.userId} joined room: ${chatroomId}`);
    });

    socket.on("leave_room", (chatroomId) => {
      socket.leave(chatroomId);
      console.log(`⬅️ User ${socket.userId} left room: ${chatroomId}`);
    });

    socket.on("start_typing", ({ chatroomId }) => {
      socket.to(chatroomId).emit("user_typing", {
        userId: socket.userId,
        chatroomId: chatroomId,
      });
    });

    socket.on("stop_typing", ({ chatroomId }) => {
      socket.to(chatroomId).emit("user_stopped_typing", {
        userId: socket.userId,
        chatroomId: chatroomId,
      });
    });

    // Listens for when a client confirms a message was delivered to them
    socket.on("message_delivered", async ({ messageId, senderId }) => {
      await updateMessageStatus(messageId, "delivered");
      const senderSocketId = onlineUsers.get(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("message_status_updated", {
          messageId,
          status: "delivered",
        });
      }
    });

    // Listens for when a user opens a chat and reads the messages
    socket.on("messages_read", async ({ chatroomId, readerId }) => {
      // Find all messages in the chat that were not sent by the reader and are not yet read
      const messagesToUpdate = await Message.find({
        chatroomId,
        sender: { $ne: readerId },
        status: { $ne: "read" },
      });

      if (messagesToUpdate.length > 0) {
        const senderId = messagesToUpdate[0].sender.toString();
        await Message.updateMany(
          { _id: { $in: messagesToUpdate.map((m) => m._id) } },
          { $set: { status: "read" } }
        );

        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("messages_read_by_recipient", {
            chatroomId,
          });
        }
      }
    });

    socket.on("send_message", async (message) => {
      try {
        const messageData = {
          chatroomId: message.chatroomId,
          sender: socket.userId,
          encryptedTextForRecipient: message.encryptedTextForRecipient,
          encryptedTextForSender: message.encryptedTextForSender,
        };

        const savedMessage = await saveMessage(messageData);
        if (!savedMessage) return;

        // 1. Notify the sender's other devices/tabs that the message was sent successfully
        // This also provides the final message object with the DB-generated _id and createdAt
        io.to(socket.userId.toString()).emit(
          "message_sent_confirmation",
          savedMessage
        );

        // 2. Broadcast the full message to anyone *actively in the chat room*
        socket.to(message.chatroomId).emit("receive_message", savedMessage);

        // 3. Send a lightweight notification to recipients who are NOT in the room
        const room = await ChatRoom.findById(message.chatroomId);
        if (room) {
          const recipients = room.participants.filter(
            (p) => p.toString() !== socket.userId.toString()
          );

          recipients.forEach((recipientId) => {
            io.to(recipientId.toString()).emit("new_message_notification", {
              chatroomId: savedMessage.chatroomId,
              message: savedMessage, // Send the whole message object
            });
          });
        }
      } catch (err) {
        console.error("🔥 Error handling message:", err);
      }
    });

    socket.on("send_file_message", async (fileMetaData) => {});

    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.id}`);
      onlineUsers.delete(socket.userId.toString());
      io.emit("user_offline", socket.userId);
    });
  });

  return io;
};

export const getIo = () => ioInstance;

export const getOnlineUserSocketId = (userId) => {
  return onlineUsers.get(userId.toString());
};
