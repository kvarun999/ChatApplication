import React, { useState } from "react";
import { useSocket } from "../../../context/SocketProvider";
import { useAuth } from "../../../context/AuthProvider";
import { ChatRoom } from "../../../types/chat.types";
import { encryptMessage } from "../../../services/crypto.service";

interface MessageInputProps {
  chatRoom: ChatRoom;
}

export const MessageInput = ({ chatRoom }: MessageInputProps) => {
  // Local state to store the message being typed
  const [text, setText] = useState("");

  // Access socket connection from context
  const socket = useSocket();

  // Access currently logged-in user from auth context
  const { user } = useAuth();

  // Handle sending message
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // prevent page refresh on form submit

    // Guard clause: don't send if text is empty or user not logged in
    if (!text.trim() || !user) return;

    // Retrieve my private key (stored in localStorage when keys were generated)
    const myPrivateKey = localStorage.getItem("privateKey");
    if (!myPrivateKey) {
      console.error("Private key not found!");
      return;
    }

    // Find the recipient (other participant in this chat room)
    const recipient = chatRoom.participants.find((p) => p._id !== user._id);
    if (!recipient) return;

    try {
      // --- ENCRYPTION STEP ---
      // Encrypt the plaintext message using:
      // - recipient's public key (so only they can decrypt it)
      // - my private key (so they can verify it’s me)
      const encryptedPayload = await encryptMessage(
        text,
        recipient.publicKey,
        myPrivateKey
      );

      // --- SENDING STEP ---
      // Emit the encrypted message to the server through socket.io
      socket.emit("send_message", {
        chatRoomId: chatRoom._id, // which chat room this belongs to
        encryptedText: encryptedPayload, // ciphertext + nonce etc.
      });

      // Clear input after sending
      setText("");
    } catch (e) {
      console.error("Failed to encrypt and send message:", e);
    }
  };

  return (
    <div className="p-4 bg-gray-100 border-t border-gray-300">
      {/* Form for typing + sending message */}
      <form onSubmit={handleSubmit} className="flex">
        {/* Text input field */}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)} // keep state in sync with input
          className="flex-1 p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type a message..."
        />
        {/* Send button */}
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600"
        >
          Send
        </button>
      </form>
    </div>
  );
};
