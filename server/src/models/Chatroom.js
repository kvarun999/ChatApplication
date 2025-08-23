import mongoose from "mongoose";
import User from "./User.js";

const chatRoomSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    type: {
      type: String,
      enum: ["one_to_one", "group"],
      default: "one_to_one",
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
    groupname: {
      type: String,
      trim: true,
    },
    groupicon: {
      type: String,
    },
    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
    },
    // If status is 'blocked', this specifies who did the blocking
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Array of users who have muted this chat's notifications
    mutedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Array of users who have archived this chat (hidden from main list)
    archivedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

chatRoomSchema.index({ participants: 1 }, { unique: true });

export default mongoose.model("ChatRoom", chatRoomSchema);
