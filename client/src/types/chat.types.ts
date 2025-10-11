import { User } from "./user.types";

export interface FileMetadata {
  filename: string;
  fileUrl: string; // URL to the encrypted file chunk (chunk 0)
  mimetype: string;
  size: number;
  header: string; // libsodium stream header
  keyNonce: string; // Nonce used to wrap the symmetric key
  encryptedFileKeyForRecipient: string; // Asymmetrically encrypted symmetric key
  encryptedFileKeyForSender: string;
  keyId: string;
  totalChunks: number;
}

// This interface defines the shape of a single Message object
export interface Message {
  _id: string;
  chatroomId: string;
  sender: User;
  encryptedTextForRecipient?: string; // Made optional for file messages
  encryptedTextForSender?: string; // Made optional for file messages
  text?: string; // Holds the decrypted message, or file name for files
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  type: "text" | "image" | "file"; // Updated enum
  fileMetadata?: FileMetadata; // ✅ NEW: Optional field for file messages
  createdAt: string;
  updatedAt?: string;
}
// This interface defines the shape of a ChatRoom object
export interface ChatRoom {
  _id: string;
  participants: User[]; // Assumes participant details will be populated
  type: "one_to_one" | "group";
  lastMessage?: Message; // The last message can be optional
  unreadCount?: { [userId: string]: number }; // Represents a Map in TS
  lastMessagePreview?: string;
  lastMessageTimestamp?: string;
  groupname?: string;
  groupicon?: string;
  status?: "active" | "blocked";
  blockedBy?: string;
  mutedBy?: string[];
  archivedBy?: string[];
  createdAt: string;
  updatedAt?: string;
}

// notification type
export interface MessageNotification {
  chatroomId: string;
  encryptedSnippet: string;
  senderUsername: string;
  senderPublicKey: string;
  timestamp?: string;
}
