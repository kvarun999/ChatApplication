import React from "react";
import { Message as MessageType } from "../../../types/chat.types";
import { useAuth } from "../../../context/AuthProvider";
import { MessageStatus } from "./MessageStatus";

interface MessageProps {
  message: MessageType;
}

export const Message = ({ message }: MessageProps) => {
  const { user } = useAuth();
  const isMe = message.sender._id === user?._id;

  return (
    <div className={`flex mb-3 ${isMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative max-w-lg px-4 py-2 break-words
        ${
          isMe
            ? "bg-blue-500 text-white rounded-xl rounded-br-none"
            : "bg-gray-100 text-gray-800 rounded-xl rounded-bl-none"
        }`}
      >
        {!isMe && (
          <p className="text-xs font-semibold text-gray-600 mb-1">
            {message.sender.username}
          </p>
        )}

        <p className="text-sm">{message.text}</p>

        <p
          className={`text-xs mt-1 ${isMe ? "text-blue-100" : "text-gray-400"} text-right`}
        >
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <MessageStatus status={message.status} isMe={isMe} />

        {/* Tail arrow */}
        <span
          className={`absolute w-0 h-0 bottom-0
            ${
              isMe
                ? "-right-2 border-l-8 border-l-blue-500 border-t-8 border-t-transparent border-b-8 border-b-transparent"
                : "-left-2 border-r-8 border-r-gray-100 border-t-8 border-t-transparent border-b-8 border-b-transparent"
            }`}
        />
      </div>
    </div>
  );
};
