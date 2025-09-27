import React, { useState, useEffect, useRef } from "react";
import { ChatRoom, Message as MessageType } from "../../../types";
import { useSocket } from "../../../context/SocketProvider";
import { useAuth } from "../../../context/AuthProvider";
import { usePresence } from "../../../context/PresenceProvider";
import { Message } from "./Message";
import { decryptMessage } from "../../../services/crypto.service";
import { MessageInput } from "./MessageInput";
import { getChatMessages } from "../../../services/chat.service"; // Import the new function

interface ChatWindowProps {
  chatRoom: ChatRoom;
  onOptimisticUpdate: (chatroomId: string, message: MessageType) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chatRoom,
  onOptimisticUpdate,
}) => {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const socket = useSocket();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { onlineUsers } = usePresence();

  const [typingUsers, setTypingUsers] = useState<string[]>([]);

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
              status: msg.status || "sent",
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
              status: msg.status || "sent",
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
          status: savedMessage.status || "sent",
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

  useEffect(() => {
    if (!socket) return;

    const handleUserTyping = (data: { userId: string; chatroomId: string }) => {
      if (data.chatroomId === chatRoom._id) {
        setTypingUsers((prev) => [...new Set([...prev, data.userId])]);
      }
    };

    const handleUserStoppedTyping = (data: {
      userId: string;
      chatroomId: string;
    }) => {
      if (data.chatroomId === chatRoom._id) {
        setTypingUsers((prev) => prev.filter((id) => id !== data.userId));
      }
    };

    socket.on("user_typing", handleUserTyping);
    socket.on("user_stopped_typing", handleUserStoppedTyping);

    return () => {
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stopped_typing", handleUserStoppedTyping);
    };
  }, [socket, chatRoom._id]);

  const otherParticipant = chatRoom.participants.find(
    (p) => p._id !== user?._id
  );
  const isOnline = otherParticipant
    ? onlineUsers.has(otherParticipant._id)
    : false;

  const typingIndicatorText = () => {
    const typingParticipant = chatRoom.participants.find(
      (p) => p._id === typingUsers[0]
    );
    if (typingParticipant) {
      return `${typingParticipant.username} is typing...`;
    }
    return null;
  };

  const handleNewMessage = (msg: MessageType) => {
    console.log("Adding new message locally:", msg);
    setMessages((prev) => [...prev, msg]);
  };

  useEffect(() => {
    if (!socket || !user) return;

    const handleStatusUpdate = ({
      messageId,
      status,
    }: {
      messageId: string;
      status: "delivered" | "read";
    }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? { ...msg, status } : msg))
      );
    };

    const handleMessagesRead = ({ chatroomId }: { chatroomId: string }) => {
      if (chatroomId === chatRoom._id) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.sender._id === user._id ? { ...msg, status: "read" } : msg
          )
        );
      }
    };

    socket.on("message_status_updated", handleStatusUpdate);
    socket.on("messages_read_by_recipient", handleMessagesRead);

    return () => {
      socket.off("message_status_updated", handleStatusUpdate);
      socket.off("messages_read_by_recipient", handleMessagesRead);
    };
  }, [socket, user, chatRoom._id]);

  // ✅ This useEffect handles SENDING confirmations when YOU receive/read messages
  useEffect(() => {
    if (!socket || !user) return;

    // Confirm delivery of received messages
    messages.forEach((msg) => {
      if (
        msg.sender._id !== user._id &&
        msg.status !== "delivered" &&
        msg.status !== "read"
      ) {
        socket.emit("message_delivered", {
          messageId: msg._id,
          senderId: msg.sender._id,
        });
        // Optimistically update the local state as well
        setMessages((prev) =>
          prev.map((m) =>
            m._id === msg._id ? { ...m, status: "delivered" } : m
          )
        );
      }
    });

    // Confirm reading of messages
    const otherParticipant = chatRoom.participants.find(
      (p) => p._id !== user._id
    );
    if (otherParticipant) {
      const unreadMessagesExist = messages.some(
        (m) => m.sender._id !== user._id && m.status !== "read"
      );
      if (unreadMessagesExist) {
        socket.emit("messages_read", {
          chatroomId: chatRoom._id,
          readerId: user._id,
        });
      }
    }
  }, [messages, socket, user, chatRoom.participants, chatRoom._id]);

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
        {isOnline && <p className="text-xs text-green-600">Online</p>}
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
          {/* ✅ 4. Render the typing indicator */}
          {typingUsers.length > 0 && (
            <div className="flex justify-start mb-3">
              <div className="bg-gray-100 text-gray-500 px-4 py-2 rounded-xl rounded-bl-none animate-pulse">
                {typingIndicatorText()}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      {/* Message Input - Fixed at bottom */}
      <div className="flex-shrink-0">
        {" "}
        {/* Add flex-shrink-0 */}
        <MessageInput
          chatRoom={chatRoom}
          onNewMessage={handleNewMessage}
          onOptimisticUpdate={onOptimisticUpdate}
        />
      </div>
    </div>
  );
};
