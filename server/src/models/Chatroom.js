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
    participantPair: {
      type: String,
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
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    mutedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    archivedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

// Only keep the participantPair unique index (remove the participants index)
chatRoomSchema.index(
  { participantPair: 1 },
  {
    unique: true,
    sparse: true,
  }
);

// Pre-save middleware to ensure participants are sorted and create participantPair
chatRoomSchema.pre("save", function (next) {
  if (
    this.type === "one_to_one" &&
    this.participants &&
    this.participants.length === 2
  ) {
    // Sort participants by string representation
    const sortedParticipants = this.participants
      .map((p) => p.toString())
      .sort((a, b) => a.localeCompare(b))
      .map((id) => new mongoose.Types.ObjectId(id));

    // Update the participants array with sorted ObjectIds
    this.participants = sortedParticipants;

    // Create participantPair from sorted string IDs
    this.participantPair = sortedParticipants
      .map((p) => p.toString())
      .join("-");
  } else {
    // For group chats, don't set participantPair
    this.participantPair = undefined;
  }
  next();
});

export default mongoose.model("ChatRoom", chatRoomSchema);
