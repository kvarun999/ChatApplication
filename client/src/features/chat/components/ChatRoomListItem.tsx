import React from "react";
import { ChatRoom } from "../../../types";

// Helper to format the timestamp
function formatRelativeTime(date: string | Date | null): string {
  if (!date) return "";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// ✅ DEFINE THE PROPS THE COMPONENT WILL RECEIVE
interface ChatRoomListItemProps {
  room: ChatRoom;
  isSelected: boolean;
  onSelect: (room: ChatRoom) => void;
  unreadCount: number; // This line is crucial
  lastMessagePreview: string;
  lastMessageTimestamp: string | Date | null;
  otherParticipantName: string;
}

export const ChatRoomListItem: React.FC<ChatRoomListItemProps> = ({
  room,
  isSelected,
  onSelect,
  unreadCount, // Now we receive it as a prop
  lastMessagePreview,
  lastMessageTimestamp,
  otherParticipantName,
}) => {
  return (
    <div
      onClick={() => onSelect(room)}
      className={`flex items-center p-3 cursor-pointer transition-colors duration-150 ${
        isSelected ? "bg-blue-100" : "hover:bg-gray-100"
      }`}
    >
      <div className="flex-grow min-w-0">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-gray-800 truncate">
            {otherParticipantName}
          </h3>
          {lastMessageTimestamp && (
            <div className="ml-2 text-xs text-gray-400 flex-shrink-0">
              {formatRelativeTime(lastMessageTimestamp)}
            </div>
          )}
        </div>
        <div className="flex justify-between items-start mt-1">
          <p className="text-sm text-gray-600 truncate">{lastMessagePreview}</p>
          {/* ✅ Now this comparison is safe because unreadCount is always a number */}
          {unreadCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
