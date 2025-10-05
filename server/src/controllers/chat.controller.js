import ChatRoom from "../models/Chatroom.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import Message from "../models/Message.js";

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
  const { chatRoomId } = req.params;
  const { userId } = req;

  try {
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) {
      res.status(409).json({ message: "chatroom not found" });
    }
    if (chatRoom.unreadCount.get(userId)) {
      chatRoom.unreadCount.set(userId, 0);
      await chatRoom.save();
    }
  } catch (err) {
    console.log("error while marking chat as read" + err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
