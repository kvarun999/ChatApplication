import React, { useEffect, useState } from "react";
import { ChatRoom } from "../../../types";
import { useAuth } from "../../../context/AuthProvider";
import { decryptMessage } from "../../../services/crypto.service";

interface ChatRoomListItemProps {
  room: ChatRoom;
  isSelected: boolean;
  onSelect: (room: ChatRoom) => void;
}

export const ChatRoomListItem: React.FC<ChatRoomListItemProps> = ({
  room,
  isSelected,
  onSelect,
}) => {
  const { user } = useAuth();
  const [decryptedPreview, setDecryptedPreview] = useState<string | null>(null);

  useEffect(() => {
    const decryptLastMessage = async () => {
      // If there's no last message, do nothing
      if (!room.lastMessage) {
        setDecryptedPreview("No messages yet");
        return;
      }

      try {
        const myPrivateKey = localStorage.getItem("privateKey");
        if (!myPrivateKey) {
          setDecryptedPreview("[Encryption key not found]");
          return;
        }

        // ✅ THE FIX: Get the sender object directly from the lastMessage
        const sender = room.lastMessage.sender;
        if (!sender || !sender.publicKey) {
          setDecryptedPreview("[Cannot decrypt: sender info missing]");
          return;
        }

        // Determine which encrypted text to use
        const encryptedStr =
          sender._id === user?._id
            ? room.lastMessage.encryptedTextForSender
            : room.lastMessage.encryptedTextForRecipient;

        const { ciphertextBase64, nonceBase64 } = JSON.parse(encryptedStr);

        const decryptedText = await decryptMessage(
          ciphertextBase64,
          nonceBase64,
          sender.publicKey, // Use the sender's public key
          myPrivateKey
        );

        // Add "You:" prefix if the current user sent the last message
        let previewText =
          sender._id === user?._id ? `You: ${decryptedText}` : decryptedText;

        if (previewText.length >= 18) {
          previewText = previewText.substring(0, 27) + "...";
        }

        setDecryptedPreview(previewText);
      } catch (e) {
        console.error("Failed to decrypt preview:", e);
        setDecryptedPreview("[Encrypted Message]");
      }
    };
    decryptLastMessage();
  }, [room.lastMessage, user]); // Rerun only when the last message changes

  // Determine the name of the "other" participant in the chat
  const otherParticipant = room.participants.find((p) => p._id !== user?._id);

  return (
    <div
      onClick={() => onSelect(room)}
      className={`p-4 border-b border-gray-100 hover:bg-gray-100 transition cursor-pointer ${
        isSelected ? "bg-blue-100" : ""
      }`}
    >
      <p className="font-medium text-gray-900 truncate">
        {otherParticipant?.username || "Unknown User"}
      </p>
      <p className="text-sm text-gray-600 truncate mt-1">
        {decryptedPreview === null ? "..." : decryptedPreview}
      </p>
    </div>
  );
};
