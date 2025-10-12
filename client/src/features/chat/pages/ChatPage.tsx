import React, { useEffect, useState, useCallback } from "react";
import { ChatRoom, Message } from "../../../types";
import { getMyChatRooms, markChatAsRead } from "../../../services/chat.service";
import { ChatList } from "../components/ChatList";
import { ChatWindow } from "../components/ChatWindow";
import { UserSearchModal } from "../components/UserSearchModal";
import { useSocket } from "../../../context/SocketProvider";
import { decryptMessage } from "../../../services/crypto.service";
import { useAuth } from "../../../context/AuthProvider";

// client/src/features/chat/pages/ChatPage.tsx

// Helper function to process a room for display (Remains the same)
const processRoomForPreview = async (
  room: ChatRoom,
  userId: string,
  privateKey: string
): Promise<ChatRoom> => {
  const newRoom = { ...room };
  if (!newRoom.lastMessage) {
    newRoom.lastMessagePreview = "No messages yet";
    newRoom.lastMessageTimestamp = newRoom.createdAt;
    return newRoom;
  }

  const {
    sender,
    encryptedTextForSender,
    encryptedTextForRecipient,
    createdAt,
    type,
    fileMetadata,
  } = newRoom.lastMessage;

  const isMyMessage = sender._id === userId;
  const prefix = isMyMessage ? "You: " : "";

  try {
    if (type !== "text" && fileMetadata) {
      newRoom.lastMessagePreview = `${prefix}[${type === "image" ? "Image" : "File"}: ${fileMetadata.filename}]`;
      newRoom.lastMessageTimestamp = createdAt;
      return newRoom;
    }

    const encryptedStr = isMyMessage
      ? encryptedTextForSender
      : encryptedTextForRecipient;

    if (!encryptedStr) throw new Error("Missing encrypted text for preview");

    const { ciphertextBase64, nonceBase64 } = JSON.parse(encryptedStr);

    const decryptedText = await decryptMessage(
      ciphertextBase64.trim(),
      nonceBase64.trim(),
      sender.publicKey.trim(),
      privateKey.trim()
    );

    newRoom.lastMessagePreview = `${prefix}${decryptedText}`;
    newRoom.lastMessageTimestamp = createdAt;
  } catch (e) {
    newRoom.lastMessagePreview = `[${isMyMessage ? "Your" : "Encrypted"} ${type || "Message"}]`;
    newRoom.lastMessageTimestamp = newRoom.lastMessage.createdAt;
  }
  return newRoom;
};

export const ChatPage: React.FC = () => {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const socket = useSocket();
  const { user } = useAuth();

  const loadRooms = useCallback(async () => {
    if (!user) return;
    const privateKey = localStorage.getItem("privateKey");
    if (!privateKey) return setError("Private key not found.");

    setLoading(true);
    try {
      const rooms = await getMyChatRooms();
      const processedRooms = await Promise.all(
        rooms.map((room) => processRoomForPreview(room, user._id, privateKey))
      );
      processedRooms.sort(
        (a, b) =>
          new Date(b.lastMessageTimestamp || 0).getTime() -
          new Date(a.lastMessageTimestamp || 0).getTime()
      );
      setChatRooms(processedRooms);
    } catch (err) {
      setError("Failed to fetch chat rooms.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // ✅ This is the corrected real-time update logic
  useEffect(() => {
    if (!socket || !user) return;

    const handleNotification = async (data: {
      chatroomId: string;
      message: Message;
    }) => {
      const { message } = data;
      const privateKey = localStorage.getItem("privateKey");
      if (!privateKey) return;

      // Determine if the user is currently viewing the room
      const isActiveRoom =
        selectedChat && selectedChat._id === message.chatroomId;

      setChatRooms((prevRooms) => {
        // ... (findIndex and roomToUpdate remain the same)
        const roomIndex = prevRooms.findIndex(
          (r) => r._id === message.chatroomId
        );
        if (roomIndex === -1) return prevRooms;
        const roomToUpdate = { ...prevRooms[roomIndex] };

        // 🛑 SIMPLIFICATION: Count is ZEROED if active, otherwise incremented.
        const currentCount = roomToUpdate.unreadCount?.[user._id] || 0;
        const unreadCountUpdate = {
          ...roomToUpdate.unreadCount,
          [user._id]: isActiveRoom ? 0 : currentCount + 1, // Set to 0 if active, otherwise increment
        };

        // 💡 Case 1: Handle File/Image messages (Synchronous preview update)
        if (message.type !== "text") {
          // ... (existing file preview logic)
          const fileType = message.type === "image" ? "Image" : "File";
          const filename = message.fileMetadata?.filename || "Encrypted File";

          const updatedRoom = {
            ...roomToUpdate,
            lastMessage: message,
            lastMessagePreview: `${message.sender.username}: [${fileType}: ${filename}]`,
            lastMessageTimestamp: message.createdAt,
            unreadCount: unreadCountUpdate, // Use the zeroed or incremented count
          };
          const otherRooms = prevRooms.filter(
            (r) => r._id !== message.chatroomId
          );
          const newSortedRooms = [updatedRoom, ...otherRooms];
          newSortedRooms.sort(
            (a, b) =>
              new Date(b.lastMessageTimestamp || 0).getTime() -
              new Date(a.lastMessageTimestamp || 0).getTime()
          );
          return newSortedRooms;
        } else {
          // 💡 Case 2: Handle Text messages (Asynchronous preview update)
          const { encryptedTextForRecipient, sender } = message;
          if (!encryptedTextForRecipient) {
            console.error(
              "Missing encryptedTextForRecipient in message notification"
            );
            return prevRooms;
          }
          const { ciphertextBase64, nonceBase64 } = JSON.parse(
            encryptedTextForRecipient
          );

          decryptMessage(
            ciphertextBase64,
            nonceBase64,
            sender.publicKey,
            privateKey
          )
            .then((decryptedText) => {
              setChatRooms((currentRooms) => {
                const updatedRoom = {
                  ...roomToUpdate,
                  lastMessage: message,
                  lastMessagePreview: `${message.sender.username}: ${decryptedText}`,
                  lastMessageTimestamp: message.createdAt,
                  unreadCount: unreadCountUpdate, // Use the zeroed or incremented count
                };
                const otherRooms = currentRooms.filter(
                  (r) => r._id !== message.chatroomId
                );
                const newSortedRooms = [updatedRoom, ...otherRooms];
                newSortedRooms.sort(
                  (a, b) =>
                    new Date(b.lastMessageTimestamp || 0).getTime() -
                    new Date(a.lastMessageTimestamp || 0).getTime()
                );
                return newSortedRooms;
              });
            })
            .catch((e) =>
              console.error("Failed to decrypt notification snippet", e)
            );

          return prevRooms; // Return previous state immediately, update will happen in .then()
        }
      });
    };

    socket.on("new_message_notification", handleNotification);
    return () => {
      socket.off("new_message_notification", handleNotification);
    };
  }, [socket, user, selectedChat]); // Keep selectedChat in the dependency array

  const handleOptimisticUpdate = (chatRoomId: string, message: Message) => {
    setChatRooms((prevRooms) => {
      const roomIndex = prevRooms.findIndex((r) => r._id === chatRoomId);
      if (roomIndex === -1) return prevRooms;
      const roomToUpdate = { ...prevRooms[roomIndex] };

      let previewText = "";
      if (message.type === "text") {
        previewText = `You: ${message.text}`;
      } else {
        const fileType = message.type === "image" ? "Image" : "File";
        const filename = message.fileMetadata?.filename || "Encrypted File";
        previewText = `You: [${fileType}: ${filename}]`;
      }

      const updatedRoom = {
        ...roomToUpdate,
        lastMessage: message,
        lastMessagePreview: previewText,
        lastMessageTimestamp: message.createdAt,
      };
      const otherRooms = prevRooms.filter((r) => r._id !== chatRoomId);
      const newSortedRooms = [updatedRoom, ...otherRooms];
      newSortedRooms.sort(
        (a, b) =>
          new Date(b.lastMessageTimestamp || 0).getTime() -
          new Date(a.lastMessageTimestamp || 0).getTime()
      );
      return newSortedRooms;
    });
  };

  const handleSelectChat = (room: ChatRoom) => {
    setSelectedChat(room);
    if (!user) return;

    const currentUnreadCount =
      chatRooms.find((r) => r._id === room._id)?.unreadCount?.[user._id] || 0;

    // 🛑 CRITICAL FIX: Mark chat as read on server ONLY if there's a count > 0
    if (currentUnreadCount > 0) {
      const originalRooms = chatRooms;

      // Optimistically clear the count in the local state
      setChatRooms((prev) =>
        prev.map((r) =>
          r._id === room._id
            ? { ...r, unreadCount: { ...r.unreadCount, [user._id]: 0 } }
            : r
        )
      );

      // Tell the server to permanently clear the count
      markChatAsRead(room._id).catch((err) => {
        console.error("Failed to mark chat as read on server:", err);
        // Rollback on server failure
        setChatRooms(originalRooms);
      });
    }

    // Final state update (sorting/setting selection)
    setChatRooms((prevRooms) => {
      // Find the room index
      const roomIndex = prevRooms.findIndex((r) => r._id === room._id);
      if (roomIndex === -1) {
        // If room is not found, or there are no unread changes, simply return the current state
        return prevRooms;
      }

      const roomToUpdate = { ...prevRooms[roomIndex] };

      // Ensure the count is 0 in the object being sorted to the top
      const updatedRoom = {
        ...roomToUpdate,
        unreadCount: { ...roomToUpdate.unreadCount, [user._id]: 0 },
      };

      const otherRooms = prevRooms.filter((r) => r._id !== room._id);
      return [updatedRoom, ...otherRooms].sort(
        (a, b) =>
          new Date(b.lastMessageTimestamp || 0).getTime() -
          new Date(a.lastMessageTimestamp || 0).getTime()
      );
    });
  };

  return (
    <div className="h-screen w-full flex overflow-hidden">
      <ChatList
        chatRooms={chatRooms}
        onSelectChat={handleSelectChat}
        selectedChatId={selectedChat?._id}
        loading={loading}
        error={error}
        onNewChat={() => setIsSearchOpen(true)}
      />
      <div className="flex-1 flex flex-col h-full">
        {selectedChat ? (
          <ChatWindow
            key={selectedChat._id}
            chatRoom={selectedChat}
            onOptimisticUpdate={handleOptimisticUpdate}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-100">
            <p className="text-gray-500">Select a chat to start messaging</p>
          </div>
        )}
      </div>
      {isSearchOpen && (
        <UserSearchModal
          onClose={() => setIsSearchOpen(false)}
          onChatCreated={loadRooms}
        />
      )}
    </div>
  );
};
