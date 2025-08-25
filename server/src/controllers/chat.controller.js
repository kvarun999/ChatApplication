import ChatRoom from "../models/Chatroom.js";
import User from "../models/User.js";
import mongoose from "mongoose";

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
  const currentUserId = req.userId;

  try {
    // Find all chat rooms where the 'participants' array contains the current user's ID.
    const chatRooms = await ChatRoom.find({ participants: currentUserId })
      // Sort the chat rooms by the most recent activity (last updated).
      .sort({ updatedAt: -1 })
      // Populate the 'participants' field to include user details (like username and publicKey),
      // while excluding sensitive information.
      .populate("participants", "-password -refreshToken")
      // Populate the 'lastMessage' field to show a preview in the chat list.
      .populate("lastMessage")
      .exec();

    res.status(200).json(chatRooms);
  } catch (err) {
    console.error("Error fetching chat rooms:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
