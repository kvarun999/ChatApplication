import React, { useState, useEffect, useRef } from "react";
import { ChatRoom, Message as MessageType } from "../../../types/chat.types";
import { useSocket } from "../../../context/SocketProvider";
import { useAuth } from "../../../context/AuthProvider";
import { Message } from "./Message";
import { decryptMessage } from "../../../services/crypto.service";
import { User } from "../../../types/user.types";

interface ChatWindowProps {
  chatRoom: ChatRoom;
}

export const ChatWindow = ({ chatRoom }: ChatWindowProps) => {
  // State to hold all decrypted messages for this chat
  const [messages, setMessages] = useState<MessageType[]>([]);

  // Get socket connection from context
  const socket = useSocket();

  // Current logged-in user from AuthProvider
  const { user } = useAuth();

  // Ref for auto-scrolling to the latest message
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    // Function that runs when a message is received from the server
    const handleReceiveMessage = async (incomingMessage: any) => {
      // Only accept messages for this chatRoom
      if (incomingMessage.chatRoomId === chatRoom._id) {
        // Get my private key from localStorage (needed to decrypt)
        const myPrivateKey = localStorage.getItem("privateKey");
        if (!myPrivateKey) return; // If no key, can’t decrypt → just ignore

        try {
          // Decrypt the message text
          const decryptedText = await decryptMessage(
            incomingMessage.encryptedText.ciphertext,
            incomingMessage.encryptedText.nonce,
            incomingMessage.sender.publicKey, // sender’s public key
            myPrivateKey // my private key
          );

          // Build a new message object with decrypted text
          const newMessage: MessageType = {
            ...incomingMessage,
            text: decryptedText,
          };

          // Add the new message to state (triggers re-render)
          setMessages((prevMessages) => [...prevMessages, newMessage]);
        } catch (e) {
          console.error("Failed to decrypt message:", e);
          // You could show an error in the UI if needed
        }
      }
    };

    // Listen for "receive_message" events from server
    socket.on("receive_message", handleReceiveMessage);

    // Cleanup → remove listener when component unmounts or chatRoom changes
    return () => {
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [chatRoom, socket]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Find the "other participant" (not me) to display their name
  const otherParticipant = chatRoom.participants.find(
    (p) => p._id !== user?._id
  );

  return (
    <div className="flex-1 flex flex-col">
      {/* Header with chat participant name */}
      <div className="p-4 border-b border-gray-300 bg-gray-100">
        <h2 className="text-xl font-bold">
          {otherParticipant?.username || "Chat"}
        </h2>
      </div>

      {/* Chat body → show all messages */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-200">
        {messages.map((msg) => (
          <Message key={msg._id} message={msg} />
        ))}

        {/* Invisible div → used as scroll target */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
