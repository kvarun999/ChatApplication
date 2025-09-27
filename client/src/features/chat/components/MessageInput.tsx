import React, { useRef, useState } from "react";
import { useSocket } from "../../../context/SocketProvider";
import { useAuth } from "../../../context/AuthProvider";
import { ChatRoom, Message } from "../../../types/chat.types";
import { encryptMessage } from "../../../services/crypto.service";

interface MessageInputProps {
  chatRoom: ChatRoom;
  onNewMessage: (msg: Message) => void;
  onOptimisticUpdate: (chatroomId: string, message: Message) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  chatRoom,
  onNewMessage,
  onOptimisticUpdate,
}) => {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const socket = useSocket();
  const { user } = useAuth();

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTyping = () => {
    if (!socket) return;

    if (!typingTimeoutRef.current) {
      socket.emit("start_typing", {
        userId: user?._id,
        chatroomId: chatRoom._id,
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", { chatroomId: chatRoom._id });
      typingTimeoutRef.current = null; // Reset the ref
    }, 2000); // 2 seconds
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user || isSending) return;

    setIsSending(true);

    try {
      const myPrivateKey = localStorage.getItem("privateKey");
      if (!myPrivateKey) throw new Error("Private key not found!");

      const recipient = chatRoom.participants.find((p) => p._id !== user._id);
      if (!recipient) throw new Error("Recipient not found!");

      const createdAt = new Date().toISOString();

      const [encryptedPayloadRecipient, encryptedPayloadSender] =
        await Promise.all([
          encryptMessage(text, recipient.publicKey, myPrivateKey),
          encryptMessage(text, user.publicKey, myPrivateKey),
        ]);

      const messagePayload = {
        chatroomId: chatRoom._id,
        encryptedTextForRecipient: JSON.stringify(encryptedPayloadRecipient),
        encryptedTextForSender: JSON.stringify(encryptedPayloadSender),
      };

      const localMessage: Message = {
        _id: `temp-${Date.now()}`,
        chatroomId: chatRoom._id,
        sender: user,
        text: text,
        createdAt: createdAt,
        encryptedTextForRecipient: messagePayload.encryptedTextForRecipient,
        encryptedTextForSender: messagePayload.encryptedTextForSender,
        status: "sent",
      };

      // 1. Update the chat window immediately
      onNewMessage(localMessage);

      // 2. Tell the parent page to update the chat list preview
      onOptimisticUpdate(chatRoom._id, localMessage);

      // 3. Send the message to the server
      socket?.emit("send_message", messagePayload);

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
          onChange={(e) => {
            setText(e.target.value);
            handleTyping();
          }}
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
