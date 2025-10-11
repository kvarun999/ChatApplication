import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    chatroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Keep these fields for TEXT messages
    encryptedTextForRecipient: {
      type: String,
      required: function () {
        return this.type === "text";
      },
    },
    encryptedTextForSender: {
      type: String,
      required: function () {
        return this.type === "text";
      },
    },
    // ✅ NEW: Metadata for FILE messages
    fileMetadata: {
      type: {
        filename: String,
        fileUrl: String, // The URL to the first chunk (chunk 0)
        mimetype: String,
        size: Number,
        header: String, // libsodium streaming header
        keyNonce: String, // Nonce used to wrap the symmetric key
        encryptedFileKeyForRecipient: String, // Asymmetrically encrypted symmetric key
        encryptedFileKeyForSender: String, // Asymmetrically encrypted symmetric key for self
        keyId: String,
      },
      required: function () {
        return this.type !== "text"; // Required for 'image' or 'file' types
      },
      default: undefined, // Don't save empty object if not a file message
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    type: {
      type: String,
      enum: ["text", "image", "file"], // Updated to include 'image' and 'file'
      default: "text",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
