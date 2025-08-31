import React, { useState, useEffect } from "react";
import { getMyChatRooms } from "../../../services/chat.service";
import { ChatRoom } from "../../../types/chat.types";
import { useAuth } from "../../../context/AuthProvider";

interface ChatListProps {
  onSelectChat: (chatRoom: ChatRoom) => void;
}

export const ChatList = ({ onSelectChat }: ChatListProps) => {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    const fetchChatRooms = async () => {
      try {
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

  const getOtherParticipantName = (room: ChatRoom) => {
    const other = room.participants.find((p) => p._id !== user?._id);
    return other?.username || "Unknown User";
  };

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">
          {user?.username || "My Chats"}
        </h2>
        <button
          onClick={logout}
          className="bg-red-500 hover:bg-red-600 transition text-white text-sm font-medium py-1.5 px-3 rounded-md shadow"
        >
          Logout
        </button>
      </div>

      {/* Chat list area */}
      <div className="flex-1 overflow-y-auto">
        {/* States */}
        {loading && <p className="p-4 text-gray-600">Loading chats...</p>}
        {error && <p className="p-4 text-red-500">{error}</p>}
        {!loading && chatRooms.length === 0 && (
          <p className="p-4 text-gray-500">
            No chats yet. Start a conversation!
          </p>
        )}

        {/* Chat Rooms */}
        {chatRooms.map((room) => (
          <div
            key={room._id}
            onClick={() => onSelectChat(room)} // Select chat when clicked
            className="p-4 border-b border-gray-100 hover:bg-gray-100 transition cursor-pointer"
          >
            {/* Other participant’s name */}
            <p className="font-medium text-gray-900 truncate">
              {getOtherParticipantName(room)}
            </p>

            {/* Last message preview */}
            <p className="text-sm text-gray-600 truncate mt-1">
              {room.lastMessage
                ? room.lastMessage.encryptedText
                : "No messages yet"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
