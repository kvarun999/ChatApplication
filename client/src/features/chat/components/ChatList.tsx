import React from "react";
import { ChatRoom } from "../../../types";
import { useAuth } from "../../../context/AuthProvider";
import { ChatRoomListItem } from "./ChatRoomListItem";
import { Link } from "react-router-dom";

// A simple SVG icon for the profile button
const UserIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

interface ChatListProps {
  chatRooms: ChatRoom[];
  onSelectChat: (chatRoom: ChatRoom) => void;
  selectedChatId?: string;
  loading: boolean;
  error: string | null;
  onNewChat: () => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  chatRooms,
  onSelectChat,
  selectedChatId,
  loading,
  error,
  onNewChat,
}) => {
  const { user, logout } = useAuth();

  const getOtherParticipantName = (room: ChatRoom) => {
    if (!user) return "Unknown User";
    const other = room.participants.find((p) => p._id !== user._id);
    return other?.username || "Unknown User";
  };

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Header with Username and Logout Button */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm">
        <div className="flex items-center space-x-3">
          <Link
            to="/profile"
            title="My Profile"
            className="p-1 rounded-full hover:bg-gray-200 transition"
          >
            <UserIcon />
          </Link>
          <h2 className="text-lg font-semibold text-gray-800 truncate">
            {user?.username || "My Chats"}
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onNewChat}
            title="Start a new chat"
            className="bg-blue-500 hover:bg-blue-600 transition text-white font-bold w-8 h-8 rounded-full flex items-center justify-center shadow"
          >
            +
          </button>
          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 transition text-white text-sm font-medium py-1.5 px-3 rounded-md shadow"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Chat list area */}
      <div className="flex-1 overflow-y-auto">
        {loading && <p className="p-4 text-gray-600">Loading chats...</p>}
        {error && <p className="p-4 text-red-500">{error}</p>}
        {!loading && !error && chatRooms.length === 0 && (
          <p className="p-4 text-gray-500">
            No chats yet. Start a conversation!
          </p>
        )}

        {/* Chat Rooms List */}
        {!loading &&
          !error &&
          chatRooms.map((room) => {
            if (!user) return null;

            // This part correctly calculates the number
            const unreadCountForUser = room.unreadCount?.[user._id] || 0;

            const lastMessagePreview =
              room.lastMessagePreview || "No messages yet";
            const lastMessageTimestamp =
              room.lastMessageTimestamp || room.lastMessage?.createdAt;

            // This part correctly passes the number as a prop
            return (
              <ChatRoomListItem
                key={room._id}
                room={room}
                isSelected={room._id === selectedChatId}
                onSelect={onSelectChat}
                unreadCount={unreadCountForUser} // Passing the number here
                lastMessagePreview={lastMessagePreview}
                lastMessageTimestamp={lastMessageTimestamp ?? null}
                otherParticipantName={getOtherParticipantName(room)}
              />
            );
          })}
      </div>
    </div>
  );
};
