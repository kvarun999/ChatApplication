import React, { useEffect, useState } from "react";
import { ChatRoom } from "../../../types";
import { getMyChatRooms } from "../../../services/chat.service";
import { ChatList } from "../components/ChatList";
import { ChatWindow } from "../components/ChatWindow";

export const ChatPage = () => {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChatRooms = async () => {
      try {
        setLoading(true);
        const rooms = await getMyChatRooms();
        setChatRooms(rooms);
      } catch (err) {
        setError("Failed to fetch chat rooms.");
      } finally {
        setLoading(false);
      }
    };
    fetchChatRooms();
  }, []);

  return (
    <div className="h-screen w-full flex overflow-hidden">
      {" "}
      {/* Add overflow-hidden */}
      <ChatList
        chatRooms={chatRooms}
        onSelectChat={setSelectedChat}
        selectedChatId={selectedChat?._id}
        loading={loading}
        error={error}
      />
      <div className="flex-1 flex flex-col h-full">
        {" "}
        {/* Add h-full */}
        {selectedChat ? (
          <ChatWindow key={selectedChat._id} chatRoom={selectedChat} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-100">
            <p className="text-gray-500">Select a chat to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};
