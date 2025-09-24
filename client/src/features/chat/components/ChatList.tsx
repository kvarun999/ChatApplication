import React, { useEffect, useState } from "react";
import { ChatRoom } from "../../../types";
import { useAuth } from "../../../context/AuthProvider";
import { decryptMessage } from "../../../services/crypto.service";
import { ChatRoomListItem } from "./ChatRoomListItem";

// This component is now "presentational". It receives all the data it needs as props.
interface ChatListProps {
  chatRooms: ChatRoom[];
  onSelectChat: (chatRoom: ChatRoom) => void;
  selectedChatId?: string;
  loading: boolean;
  error: string | null;
  onNewChat: () => void;
}

export const ChatList = ({
  chatRooms,
  onSelectChat,
  selectedChatId,
  loading,
  error,
  onNewChat,
}: ChatListProps) => {
  const { user, logout } = useAuth();

  const getOtherParticipantName = (room: ChatRoom) => {
    const other = room.participants.find((p) => p._id !== user?._id);
    return other?.username || "Unknown User";
  };

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Header with Username and Logout Button */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 truncate">
          {user?.username || "My Chats"}
        </h2>
        <div className="flex items-center space-x-2">
          {/* ✅ NEW: "New Chat" button */}
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
        {/* Loading and Error States */}
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
            return (
              <ChatRoomListItem
                key={room._id}
                room={room}
                isSelected={room._id === selectedChatId}
                onSelect={onSelectChat}
              />
            );
          })}
      </div>
    </div>
  );
};
