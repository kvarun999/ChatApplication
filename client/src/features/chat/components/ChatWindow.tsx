// client/src/features/chat/components/ChatWindow.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChatRoom, Message as MessageType } from "../../../types";
import { useSocket } from "../../../context/SocketProvider";
import { useAuth } from "../../../context/AuthProvider";
import { usePresence } from "../../../context/PresenceProvider";
import { Message } from "./Message";
import { decryptMessage } from "../../../services/crypto.service";
import { MessageInput } from "./MessageInput";
import { getChatMessages } from "../../../services/chat.service";
import { decryptSymmetricKey } from "../../../services/crypto.service";

interface ChatWindowProps {
  chatRoom: ChatRoom;
  onOptimisticUpdate: (chatroomId: string, message: MessageType) => void;
}

// Define the fallback avatar URL
const DEFAULT_FALLBACK_AVATAR =
  "https://api.dicebear.com/8.x/adventurer/svg?seed=User";

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chatRoom,
  onOptimisticUpdate,
}) => {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [decryptedFileKeys, setDecryptedFileKeys] = useState<
    Map<string, Uint8Array>
  >(new Map());
  const socket = useSocket();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { onlineUsers } = usePresence();

  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Reset messages when chat room changes
  useEffect(() => {
    setMessages([]);
    setDecryptedFileKeys(new Map());
  }, [chatRoom._id]);

  // Wrapped in useCallback to stabilize the dependency list
  const handleKeyDecryption = useCallback(
    async (
      msg: any,
      isHistorical: boolean
    ): Promise<Uint8Array | undefined> => {
      if (msg.type === "text") return;

      const rawPrivateKey = localStorage.getItem("privateKey");
      if (!rawPrivateKey) {
        console.warn("No private key found — cannot decrypt key.");
        return;
      }

      // Determine which encrypted key payload to use
      const encryptedKeyBase64 =
        msg.sender._id === user?._id
          ? msg.fileMetadata.encryptedFileKeyForSender
          : msg.fileMetadata.encryptedFileKeyForRecipient;

      const keyNonceBase64 = msg.fileMetadata.keyNonce;

      try {
        const trimmedEncryptedKeyBase64 = String(encryptedKeyBase64).trim();
        const trimmedKeyNonceBase64 = String(keyNonceBase64).trim();
        const trimmedSenderPublicKey = String(msg.sender.publicKey).trim();
        const trimmedMyPrivateKey = String(rawPrivateKey).trim();

        const symmetricKey = await decryptSymmetricKey(
          trimmedEncryptedKeyBase64,
          trimmedKeyNonceBase64,
          trimmedSenderPublicKey,
          trimmedMyPrivateKey
        );

        // Store the key and return it
        setDecryptedFileKeys((prev) => {
          const newMap = new Map(prev);
          // Use the definitive server ID if available, otherwise the optimistic ID
          const msgId = msg._id || `temp-${Date.now()}`;
          newMap.set(msgId, symmetricKey);
          return newMap;
        });

        return symmetricKey;
      } catch (e) {
        console.error(
          `❌ Decryption failed for message ${msg._id}. Key Mismatch suspected.`,
          e
        );
        return undefined;
      }
    },
    [user]
  );

  // Fetch historical messages when entering a chat room
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
            let status = msg.status || "sent";

            // If it's a TEXT message
            if (msg.type === "text") {
              const myPrivateKey = localStorage.getItem("privateKey");
              if (myPrivateKey) {
                const encryptedText =
                  msg.sender._id === user._id
                    ? msg.encryptedTextForSender
                    : msg.encryptedTextForRecipient;

                if (encryptedText && typeof encryptedText === "string") {
                  const { ciphertextBase64, nonceBase64 } =
                    JSON.parse(encryptedText);

                  decryptedText = await decryptMessage(
                    ciphertextBase64.trim(),
                    nonceBase64.trim(),
                    msg.sender.publicKey.trim(),
                    myPrivateKey.trim()
                  );
                } else {
                  console.warn(`Missing encrypted text for message ${msg._id}`);
                  decryptedText = "[Missing encrypted payload]";
                  status = "sent";
                }
              }
            }
            // FILE/IMAGE message logic
            else if (msg.type === "file" || msg.type === "image") {
              const key = await handleKeyDecryption(msg, true);
              if (!key) {
                decryptedText =
                  msg.fileMetadata?.filename ?? "[Encrypted File Key Invalid]";
                status = "sent";
              } else {
                decryptedText =
                  msg.fileMetadata?.filename ?? "[Missing filename]";
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
              status: status,
              type: msg.type,
              fileMetadata: msg.fileMetadata,
            });
          } catch (decryptError) {
            console.error(
              "Failed to decrypt historical message:",
              decryptError
            );
            decryptedMessages.push({
              _id: msg._id,
              chatroomId: msg.chatroomId,
              sender: msg.sender,
              encryptedTextForRecipient: msg.encryptedTextForRecipient,
              encryptedTextForSender: msg.encryptedTextForSender,
              text: "[Failed to decrypt]",
              createdAt: msg.createdAt,
              status: msg.status || "sent",
              type: msg.type || "text",
              fileMetadata: msg.fileMetadata,
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
  }, [chatRoom._id, user, handleKeyDecryption]);

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

  // Listeners for real-time events: receive_message and message_sent_confirmation
  useEffect(() => {
    if (!socket || !user) return;

    // 🟢 Handler for messages from others or other devices
    const handleReceiveMessage = async (savedMessage: any) => {
      console.log("Received real-time message:", savedMessage);

      // 🛑 FINAL FIX RULE 1: If the message is from this user, IGNORE IT.
      // The confirmation handler MUST be responsible for processing messages from the sender.
      if (savedMessage.sender._id === user?._id) {
        console.log("Skipping own message - confirmation will handle it.");
        return;
      }

      let plaintext = "";
      let status = savedMessage.status || "sent";

      if (savedMessage.type === "text") {
        try {
          const myPrivateKey = localStorage.getItem("privateKey");
          if (!myPrivateKey) return;

          const { ciphertextBase64, nonceBase64 } = JSON.parse(
            savedMessage.encryptedTextForRecipient
          );

          plaintext = await decryptMessage(
            ciphertextBase64,
            nonceBase64,
            savedMessage.sender.publicKey,
            myPrivateKey
          );
        } catch (e) {
          console.error("Failed to decrypt incoming text message:", e);
          plaintext = "[Decryption Failed]";
        }
      }
      // Handle incoming FILE/IMAGE messages
      else if (savedMessage.type === "file" || savedMessage.type === "image") {
        const key = await handleKeyDecryption(savedMessage, false);
        plaintext = savedMessage.fileMetadata.filename;
        if (!key) {
          // If key decryption fails, the Message component will show "File key pending"
          status = "sent";
        }
      }

      const newMessage: MessageType = {
        _id: savedMessage._id,
        chatroomId: savedMessage.chatroomId,
        sender: savedMessage.sender,
        encryptedTextForRecipient: savedMessage.encryptedTextForRecipient,
        encryptedTextForSender: savedMessage.encryptedTextForSender,
        text: plaintext,
        createdAt: savedMessage.createdAt,
        status: status,
        type: savedMessage.type,
        fileMetadata: savedMessage.fileMetadata,
      };

      // Add message with deduplication check
      setMessages((prev) => {
        // Only check for duplicates of the final ID (This is now redundant since we block self-sent messages,
        // but it's a safe final check against race conditions from other devices).
        if (prev.some((msg) => msg._id === newMessage._id)) {
          console.log("Message already exists, skipping");
          return prev;
        }
        return [...prev, newMessage];
      });
    };

    // 🟣 Handler for server confirmation for messages YOU SENT from this device
    const handleSentConfirmation = async (serverMessage: MessageType) => {
      console.log("Received confirmation for sent message:", serverMessage);

      // 1. Decrypt the key FIRST. This will ensure the symmetric key is in the map.
      // This is crucial because it happens *before* state update.
      if (serverMessage.type !== "text" && serverMessage.fileMetadata) {
        await handleKeyDecryption(serverMessage, false);
      }

      // 2. Replace the optimistic temp message with the real one
      setMessages((prev) => {
        const finalServerId = serverMessage._id;

        // Find the temporary message index first.
        const tempMsgIndex = prev.findIndex(
          (msg) => msg._id.startsWith("temp-") && msg.sender._id === user._id
        );

        // Check if the final message ID is already in the list (broadcast won).
        const finalMsgExists = prev.some((msg) => msg._id === finalServerId);

        if (finalMsgExists) {
          // Case A: RACE CONDITION WINNER
          // Final message is present. We only need to remove the temporary message.
          if (tempMsgIndex !== -1) {
            console.log(
              "Final message present. Removing ONLY temporary message."
            );
            // Filter out the specific temporary message instance
            return prev.filter((_, index) => index !== tempMsgIndex);
          }
          // If both final and temp are gone/not found, just return state.
          return prev;
        }

        // Case B: CONFIRMATION WINNER (Final message does NOT exist yet)
        if (tempMsgIndex !== -1) {
          console.log("Replacing temp message with confirmation.");
          const newMessages = [...prev];
          const originalText = newMessages[tempMsgIndex].text;

          // Replace the temporary message with the definitive one
          newMessages[tempMsgIndex] = {
            ...serverMessage,
            text: serverMessage.text || originalText,
            status: "sent",
          };
          return newMessages;
        }

        // 4. Fallback: Neither temp nor final ID found (should be rare).
        console.log(
          "Neither temp nor final ID found. Adding server message as fallback."
        );
        return [...prev, { ...serverMessage, status: "sent" }];
      });
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("message_sent_confirmation", handleSentConfirmation);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("message_sent_confirmation", handleSentConfirmation);
    };
  }, [socket, user?._id, chatRoom._id, handleKeyDecryption]);

  // Auto-scroll (existing logic)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ... (Typing status handlers and functions remain the same) ...
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

    // ** 🛑 FINAL FIX: If it's a self-sent file message, decrypt the key immediately **
    if (
      msg.sender._id === user?._id &&
      msg.type !== "text" &&
      msg.fileMetadata
    ) {
      // The optimistic message now has the full metadata, so we can decrypt it locally.
      handleKeyDecryption(msg, false);
    }

    setMessages((prev) => [...prev, msg]);
  };

  // ... (Message status update logic remains the same) ...
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
      {/* Header */}
      <div className="p-4 border-b border-gray-300 bg-gray-100 flex items-center gap-4 flex-shrink-0">
        <img
          src={otherParticipant?.avatarUrl}
          alt="user avatar"
          className="w-12 h-12 rounded-full object-cover"
          onError={(e) => {
            e.currentTarget.src = DEFAULT_FALLBACK_AVATAR;
          }}
        />
        <div>
          <h2 className="text-xl font-bold">
            {otherParticipant?.username || "Chat"}
          </h2>
          {isOnline && <p className="text-xs text-green-600">Online</p>}
        </div>
      </div>
      {/* Messages Container - This should be the scrollable area */}
      <div className="flex-1 overflow-y-auto bg-gray-200 min-h-0">
        <div className="p-4">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              No messages yet. Start the conversation!
            </div>
          ) : (
            // Pass the decryptedFileKeys map down to the Message component
            messages.map((msg) => (
              <Message
                key={msg._id}
                message={msg}
                decryptedFileKey={decryptedFileKeys.get(msg._id)}
              />
            ))
          )}
          {/* Render the typing indicator */}
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
        <MessageInput
          chatRoom={chatRoom}
          onNewMessage={handleNewMessage}
          onOptimisticUpdate={onOptimisticUpdate}
        />
      </div>
    </div>
  );
};
