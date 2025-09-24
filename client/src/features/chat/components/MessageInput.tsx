import React, { useState } from "react";
import { useSocket } from "../../../context/SocketProvider";
import { useAuth } from "../../../context/AuthProvider";
import { ChatRoom, Message } from "../../../types/chat.types";
import { encryptMessage } from "../../../services/crypto.service";

interface MessageInputProps {
  chatRoom: ChatRoom;
  onNewMessage?: (msg: Message) => void;
}

export const MessageInput = ({ chatRoom, onNewMessage }: MessageInputProps) => {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const socket = useSocket();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user || isSending) return;

    setIsSending(true);

    try {
      const myPrivateKey = localStorage.getItem("privateKey");
      if (!myPrivateKey) {
        console.error("Private key not found!");
        alert("Private key not found. Please log out and log in again.");
        return;
      }

      const recipient = chatRoom.participants.find((p) => p._id !== user._id);
      if (!recipient) {
        console.error("Recipient not found!");
        return;
      }

      console.log("Encrypting message for recipient:", recipient.username);

      const encryptedPayloadRecipient = await encryptMessage(
        text,
        recipient.publicKey,
        myPrivateKey
      );

      const encryptedPayloadSender = await encryptMessage(
        text,
        user.publicKey,
        myPrivateKey
      );

      const messagePayload = {
        chatroomId: chatRoom._id,
        encryptedTextForRecipient: JSON.stringify(encryptedPayloadRecipient),
        encryptedTextForSender: JSON.stringify(encryptedPayloadSender),
      };

      // Display sender message immediately (optimistic UI)
      const localMessage: Message = {
        _id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        chatroomId: chatRoom._id,
        sender: user,
        encryptedTextForRecipient: JSON.stringify(encryptedPayloadRecipient),
        encryptedTextForSender: JSON.stringify(encryptedPayloadSender),
        text: text,
        createdAt: new Date().toISOString(),
      };

      console.log("Adding message locally and sending to server");

      // Add to local state immediately
      onNewMessage?.(localMessage);

      // Send to server
      if (socket) {
        socket.emit("send_message", messagePayload);
        console.log("Message sent to server:", messagePayload);
      } else {
        console.error("Socket not connected!");
        alert("Not connected to server. Please refresh and try again.");
        return;
      }

      setText("");
    } catch (e) {
      console.error("Failed to encrypt and send message:", e);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-4 bg-gray-100 border-t border-gray-300">
      <form onSubmit={handleSubmit} className="flex">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isSending}
          className="flex-1 p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200"
          placeholder={isSending ? "Sending..." : "Type a message..."}
        />
        <button
          type="submit"
          disabled={isSending || !text.trim()}
          className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSending ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
};
