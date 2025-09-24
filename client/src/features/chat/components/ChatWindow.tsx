import React, { useState, useEffect, useRef } from "react";
import { ChatRoom, Message as MessageType } from "../../../types";
import { useSocket } from "../../../context/SocketProvider";
import { useAuth } from "../../../context/AuthProvider";
import { Message } from "./Message";
import { decryptMessage } from "../../../services/crypto.service";
import { MessageInput } from "./MessageInput";
import { getChatMessages } from "../../../services/chat.service"; // Import the new function

interface ChatWindowProps {
  chatRoom: ChatRoom;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chatRoom }) => {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const socket = useSocket();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Reset messages when chat room changes
  useEffect(() => {
    setMessages([]);
  }, [chatRoom._id]);

  // NEW: Fetch historical messages when entering a chat room
  useEffect(() => {
    const fetchHistoricalMessages = async () => {
      if (!chatRoom._id || !user) return;

      setIsLoadingMessages(true);
      try {
        console.log("Fetching historical messages for room:", chatRoom._id);
        const historicalMessages = await getChatMessages(chatRoom._id);

        const decryptedMessages: MessageType[] = [];

        for (const msg of historicalMessages) {
          try {
            let decryptedText = "";

            // If it's our own message, we might be able to decrypt it
            // or we might want to store the plaintext differently
            if (msg.sender._id === user._id) {
              // For own messages, you might want to store/retrieve differently
              // For now, we'll try to decrypt using own keys (this might not work with current setup)
              const myPrivateKey = localStorage.getItem("privateKey");
              if (myPrivateKey) {
                const { ciphertextBase64, nonceBase64 } = JSON.parse(
                  msg.encryptedTextForSender
                );
                decryptedText = await decryptMessage(
                  ciphertextBase64,
                  nonceBase64,
                  msg.sender.publicKey,
                  myPrivateKey
                );
              }
            } else {
              // Decrypt messages from others
              const myPrivateKey = localStorage.getItem("privateKey");
              if (myPrivateKey) {
                const { ciphertextBase64, nonceBase64 } = JSON.parse(
                  msg.encryptedTextForRecipient
                );
                decryptedText = await decryptMessage(
                  ciphertextBase64,
                  nonceBase64,
                  msg.sender.publicKey,
                  myPrivateKey
                );
              }
            }

            decryptedMessages.push({
              _id: msg._id,
              chatroomId: msg.chatroomId,
              sender: msg.sender,
              encryptedTextForRecipient: msg.encryptedTextForRecipient,
              encryptedTextForSender: msg.encryptedTextForSender,
              text: decryptedText,
              createdAt: msg.createdAt,
            });
          } catch (decryptError) {
            console.error(
              "Failed to decrypt historical message:",
              decryptError
            );
            // Add message with error indicator
            decryptedMessages.push({
              _id: msg._id,
              chatroomId: msg.chatroomId,
              sender: msg.sender,
              encryptedTextForRecipient: msg.encryptedTextForRecipient,
              encryptedTextForSender: msg.encryptedTextForSender,
              text: "[Failed to decrypt]",
              createdAt: msg.createdAt,
            });
          }
        }

        setMessages(decryptedMessages);
        console.log("Historical messages loaded:", decryptedMessages.length);
      } catch (error) {
        console.error("Error fetching historical messages:", error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchHistoricalMessages();
  }, [chatRoom._id, user]);

  // Join & Leave Room
  useEffect(() => {
    if (chatRoom._id && socket) {
      console.log("Joining room:", chatRoom._id);
      socket.emit("join_room", chatRoom._id);
    }

    return () => {
      if (chatRoom._id && socket) {
        console.log("Leaving room:", chatRoom._id);
        socket.emit("leave_room", chatRoom._id);
      }
    };
  }, [chatRoom._id, socket]);

  // Listen for incoming messages (real-time)
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = async (savedMessage: any) => {
      console.log("Received real-time message:", savedMessage);

      // Skip messages sent by self (already added locally via onNewMessage)
      if (savedMessage.sender._id === user?._id) {
        console.log("Skipping own message");
        return;
      }

      try {
        const myPrivateKey = localStorage.getItem("privateKey");
        if (!myPrivateKey) {
          console.warn("No private key found — cannot decrypt.");
          return;
        }

        const { ciphertextBase64, nonceBase64 } = JSON.parse(
          savedMessage.encryptedTextForRecipient
        );

        const plaintext = await decryptMessage(
          ciphertextBase64,
          nonceBase64,
          savedMessage.sender.publicKey,
          myPrivateKey
        );

        const newMessage: MessageType = {
          _id: savedMessage._id,
          chatroomId: savedMessage.chatroomId,
          sender: savedMessage.sender,
          encryptedTextForRecipient: savedMessage.encryptedTextForRecipient,
          encryptedTextForSender: savedMessage.encryptedTextForSender,
          text: plaintext,
          createdAt: savedMessage.createdAt,
        };

        // Add message with deduplication check
        setMessages((prev) => {
          if (prev.some((msg) => msg._id === newMessage._id)) {
            console.log("Message already exists, skipping");
            return prev;
          }
          return [...prev, newMessage];
        });
      } catch (e) {
        console.error("Failed to decrypt incoming message:", e, savedMessage);
      }
    };

    socket.on("receive_message", handleReceiveMessage);
    return () => {
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [socket, user?._id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const otherParticipant = chatRoom.participants.find(
    (p) => p._id !== user?._id
  );

  const handleNewMessage = (msg: MessageType) => {
    console.log("Adding new message locally:", msg);
    setMessages((prev) => [...prev, msg]);
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {" "}
      {/* Add h-full */}
      {/* Header */}
      <div className="p-4 border-b border-gray-300 bg-gray-100 flex-shrink-0">
        {" "}
        {/* Add flex-shrink-0 */}
        <h2 className="text-xl font-bold">
          {otherParticipant?.username || "Chat"}
        </h2>
      </div>
      {/* Messages Container - This should be the scrollable area */}
      <div className="flex-1 overflow-y-auto bg-gray-200 min-h-0">
        {" "}
        {/* Add min-h-0 and remove p-4 */}
        <div className="p-4">
          {" "}
          {/* Move padding to inner div */}
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg) => <Message key={msg._id} message={msg} />)
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      {/* Message Input - Fixed at bottom */}
      <div className="flex-shrink-0">
        {" "}
        {/* Add flex-shrink-0 */}
        <MessageInput chatRoom={chatRoom} onNewMessage={handleNewMessage} />
      </div>
    </div>
  );
};
