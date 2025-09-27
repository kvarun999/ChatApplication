import React, { useEffect, useState, useCallback } from "react";
import { ChatRoom, Message } from "../../../types";
import { getMyChatRooms } from "../../../services/chat.service";
import { ChatList } from "../components/ChatList";
import { ChatWindow } from "../components/ChatWindow";
import { UserSearchModal } from "../components/UserSearchModal";
import { useSocket } from "../../../context/SocketProvider";
import { decryptMessage } from "../../../services/crypto.service";
import { useAuth } from "../../../context/AuthProvider";

// Helper function to process a room for display
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
  try {
    const {
      sender,
      encryptedTextForSender,
      encryptedTextForRecipient,
      createdAt,
    } = newRoom.lastMessage;
    const isMyMessage = sender._id === userId;
    const encryptedStr = isMyMessage
      ? encryptedTextForSender
      : encryptedTextForRecipient;
    const { ciphertextBase64, nonceBase64 } = JSON.parse(encryptedStr);
    const decryptedText = await decryptMessage(
      ciphertextBase64,
      nonceBase64,
      sender.publicKey,
      privateKey
    );
    const prefix = isMyMessage ? "You: " : "";
    newRoom.lastMessagePreview = `${prefix}${decryptedText}`;
    newRoom.lastMessageTimestamp = createdAt;
  } catch (e) {
    newRoom.lastMessagePreview = "[Encrypted Message]";
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

      setChatRooms((prevRooms) => {
        const roomIndex = prevRooms.findIndex(
          (r) => r._id === message.chatroomId
        );
        if (roomIndex === -1) return prevRooms; // Should not happen

        const roomToUpdate = { ...prevRooms[roomIndex] };

        // Decrypt the preview text for the notification
        const { encryptedTextForRecipient, sender } = message;
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
            roomToUpdate.lastMessagePreview = decryptedText;

            // This update needs to be inside the .then()
            setChatRooms((currentRooms) => {
              const updatedRoom = {
                ...roomToUpdate,
                lastMessage: message,
                lastMessageTimestamp: message.createdAt,
                unreadCount: {
                  ...roomToUpdate.unreadCount,
                  [user._id]: (roomToUpdate.unreadCount?.[user._id] || 0) + 1,
                },
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
      });
    };

    socket.on("new_message_notification", handleNotification);

    return () => {
      socket.off("new_message_notification", handleNotification);
    };
  }, [socket, user]);

  const handleOptimisticUpdate = (chatRoomId: string, message: Message) => {
    setChatRooms((prevRooms) => {
      const roomIndex = prevRooms.findIndex((r) => r._id === chatRoomId);
      if (roomIndex === -1) return prevRooms;
      const roomToUpdate = { ...prevRooms[roomIndex] };
      const updatedRoom = {
        ...roomToUpdate,
        lastMessage: message,
        lastMessagePreview: `You: ${message.text}`,
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
    setChatRooms((prevRooms) => {
      const roomIndex = prevRooms.findIndex((r) => r._id === room._id);
      if (
        roomIndex === -1 ||
        (prevRooms[roomIndex].unreadCount?.[user._id] || 0) === 0
      ) {
        return prevRooms;
      }
      const roomToUpdate = { ...prevRooms[roomIndex] };
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
