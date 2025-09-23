import React, { useEffect, useState, useCallback } from "react";
import { ChatRoom } from "../../../types";
import { getMyChatRooms } from "../../../services/chat.service";
import { ChatList } from "../components/ChatList";
import { ChatWindow } from "../components/ChatWindow";
import { UserSearchModal } from "../components/UserSearchModal";

export const ChatPage: React.FC = () => {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true);
      const rooms = await getMyChatRooms();
      setChatRooms(rooms);
      // If a room is selected but no longer exists, clear selection
      if (selectedChat && !rooms.find((r) => r._id === selectedChat._id)) {
        setSelectedChat(null);
      }
    } catch (err) {
      setError("Failed to fetch chat rooms.");
    } finally {
      setLoading(false);
    }
  }, [selectedChat]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // When a new chat is created via modal, refresh list and optionally select it
  const handleChatCreated = async () => {
    await loadRooms();
    // Optionally auto-select the newest room
    // setSelectedChat((prev) => prev ?? rooms[0]);
    setIsSearchOpen(false);
  };

  return (
    <div className="h-screen w-full flex overflow-hidden">
      <ChatList
        chatRooms={chatRooms}
        onSelectChat={setSelectedChat}
        selectedChatId={selectedChat?._id}
        loading={loading}
        error={error}
        onNewChat={() => setIsSearchOpen(true)} // <- wire the + button
      />

      <div className="flex-1 flex flex-col h-full">
        {selectedChat ? (
          <ChatWindow key={selectedChat._id} chatRoom={selectedChat} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-100">
            <p className="text-gray-500">Select a chat to start messaging</p>
          </div>
        )}
      </div>

      {isSearchOpen && (
        <UserSearchModal
          onClose={() => setIsSearchOpen(false)}
          onChatCreated={handleChatCreated}
        />
      )}
    </div>
  );
};
