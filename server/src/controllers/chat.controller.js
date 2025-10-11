import ChatRoom from "../models/Chatroom.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import Message from "../models/Message.js";
import { saveFileMessage } from "./message.controller.js";
import { getIo } from "../socket/socketHandler.js";

export const createChatRoom = async (req, res) => {
  const { recipientId } = req.body;
  const userId = req.userId;

  if (!recipientId) {
    return res.status(400).json({ message: "Recipient ID is required" });
  }

  // Prevent creating chat room with self
  if (userId === recipientId) {
    return res
      .status(400)
      .json({ message: "Cannot create chat room with yourself" });
  }

  try {
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    // Sort participants by string representation to ensure consistent ordering
    const participants = [userId, recipientId]
      .sort((a, b) => a.toString().localeCompare(b.toString()))
      .map((id) => new mongoose.Types.ObjectId(id));

    // Create the participant pair string for querying
    const participantPair = participants.map((p) => p.toString()).join("-");

    // First try to find existing chat room using the participantPair
    let chatRoom = await ChatRoom.findOne({
      participantPair: participantPair,
    }).populate("participants", "-password -refreshToken");

    if (!chatRoom) {
      try {
        chatRoom = new ChatRoom({
          participants: participants,
          type: "one_to_one",
          // participantPair will be set automatically by pre-save middleware
        });
        await chatRoom.save();
        chatRoom = await chatRoom.populate(
          "participants",
          "-password -refreshToken"
        );
      } catch (saveError) {
        // Handle duplicate key error (race condition)
        if (saveError.code === 11000) {
          // If duplicate, try to find the existing one again
          chatRoom = await ChatRoom.findOne({
            participantPair: participantPair,
          }).populate("participants", "-password -refreshToken");

          if (chatRoom) {
            return res.status(200).json(chatRoom);
          }
        }
        console.error("Error saving chat room:", saveError);
        throw saveError;
      }
    }

    res.status(200).json(chatRoom);
  } catch (err) {
    console.error("Error creating chat room:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Fetches all chat rooms for the currently authenticated user.
 */
export const getChatRooms = async (req, res) => {
  try {
    const currentUserId = req.userId;

    const chatRooms = await ChatRoom.find({ participants: currentUserId })
      .populate("participants", "username publicKey avatarUrl")
      // This is the crucial change: a nested populate
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "username publicKey", // Ensure we get the public key
        },
      })
      .sort({ updatedAt: -1 }) // Sort by most recent activity
      .exec();

    res.status(200).json(chatRooms);
  } catch (err) {
    console.error("Error fetching chat rooms:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Fetches all messages for a specific chat room
 */
export const getChatMessages = async (req, res) => {
  const { chatroomId } = req.params;
  const currentUserId = req.userId;

  try {
    // First, verify that the user is a participant in this chat room
    const chatRoom = await ChatRoom.findById(chatroomId);

    if (!chatRoom) {
      return res.status(404).json({ message: "Chat room not found" });
    }

    // Check if current user is a participant
    const isParticipant = chatRoom.participants.some(
      (participantId) => participantId.toString() === currentUserId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        message: "Access denied. You are not a participant in this chat room.",
      });
    }

    // Fetch all messages for this chat room, sorted by creation time
    const messages = await Message.find({ chatroomId })
      .sort({ createdAt: 1 }) // Oldest first
      .populate("sender", "username publicKey") // Populate sender info
      .exec();

    res.status(200).json(messages);
  } catch (err) {
    console.error("Error fetching chat messages:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

//marking chat as read
export const markChatAsRead = async (req, res) => {
  const { chatroomId } = req.params;
  const { userId } = req;

  try {
    const chatRoom = await ChatRoom.findById(chatroomId);
    if (!chatRoom) {
      return res.status(404).json({ message: "Chat room not found" });
    }

    if (chatRoom.unreadCount.has(userId)) {
      chatRoom.unreadCount.set(userId, 0);
      await chatRoom.save();
    }

    // ✅ Send a success response back to the client
    res.status(200).json({ message: "Chat marked as read." });
  } catch (err) {
    console.error("Error marking chat as read:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const handleFileUpload = async (req, res) => {
  if (
    !req.files ||
    req.files.length === 0 ||
    !req.body ||
    !req.params.chatroomId
  ) {
    return res
      .status(400)
      .json({ message: "No file was uploaded or missing message data." });
  }

  // NOTE: req.files is an array of the chunks saved by multer.
  // We only use the data of the first chunk (index 0) to get general file info.
  const firstChunk = req.files[0];

  // Destructure the encryption metadata from the request body
  const {
    header,
    keyNonce,
    encryptedKeyForRecipient,
    encryptedKeyForSelf,
    keyId,
    originalFilename,
  } = req.body;

  // Validation for required encryption metadata
  if (
    !header ||
    !keyNonce ||
    !encryptedKeyForRecipient ||
    !encryptedKeyForSelf ||
    !keyId
  ) {
    return res.status(400).json({
      message: "Missing required encryption metadata in request body.",
    });
  }

  const chatroomId = req.params.chatroomId;
  const safeKeyId = keyId.replace(/\+/g, "-").replace(/\//g, "_");
  const clientFileName = `${safeKeyId}.chunk0.enc`;

  try {
    console.log(req.files);
    // 1. Construct the file URL (NOTE: This URL points to the FIRST CHUNK only)
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const fileUrl = `${baseUrl}/uploads/messages/${clientFileName}`;

    // 2. Prepare the data payload for the message controller
    const messageData = {
      chatroomId,
      sender: req.userId,
      type: firstChunk.mimetype.startsWith("image/") ? "image" : "file",
      fileMetadata: {
        filename: originalFilename,
        fileUrl, // Points to chunk 0
        mimetype: firstChunk.mimetype,
        size: firstChunk.size,
        header,
        keyNonce,
        encryptedFileKeyForRecipient: encryptedKeyForRecipient,
        encryptedFileKeyForSender: encryptedKeyForSelf,
        keyId,
      },
    };

    // 3. Save the message and get the populated message object back
    const savedMessage = await saveFileMessage(messageData);

    if (!savedMessage) {
      throw new Error("Failed to save message to database.");
    }

    // 2. REAL-TIME DELIVERY (CRITICAL STEP)
    // NOTE: Replace `getIo()` and `onlineUsers` access with your actual implementation
    // For this example, we rely on the implementation detailed in Step 1.
    const io = getIo();

    // a) Notify sender's other devices/tabs (confirmation)
    io.to(req.userId.toString()).emit(
      "message_sent_confirmation",
      savedMessage
    );

    // b) Broadcast to recipients actively in the chat room
    io.to(chatroomId).emit("receive_message", savedMessage);

    // c) Send lightweight notification to recipients NOT in the room (for ChatList update)
    const room = await ChatRoom.findById(chatroomId);
    if (room) {
      const recipients = room.participants.filter(
        (p) => p.toString() !== req.userId.toString()
      );

      recipients.forEach((recipientId) => {
        // Using `new_message_notification` event, same as for text messages
        io.to(recipientId.toString()).emit("new_message_notification", {
          chatroomId: savedMessage.chatroomId,
          message: savedMessage,
        });
      });
    }

    // 3. Respond to Client (File upload success)
    res.status(200).json({
      message: "File uploaded successfully.",
      _id: savedMessage._id,
      createdAt: savedMessage.createdAt,
      type: savedMessage.type,
      fileMetadata: savedMessage.fileMetadata,
    });
  } catch (err) {
    console.error("Error saving file message:", err);
    return res
      .status(500)
      .json({ message: "Internal server error during message saving." });
  }
};
