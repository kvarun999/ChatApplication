import mongoose from "mongoose";
import { Schema } from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    chatroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    encryptedText: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    type: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
