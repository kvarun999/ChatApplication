import React from "react";
import { Message as MessageType } from "../../../types/chat.types";
import { useAuth } from "../../../context/AuthProvider";

interface MessageProps {
  message: MessageType;
}

export const Message = ({ message }: MessageProps) => {
  const { user } = useAuth();
  const isMe = message.sender._id === user?._id;

  return (
    <div className={`flex mb-4 ${isMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`rounded-lg px-4 py-2 max-w-lg ${isMe ? "bg-blue-500 text-white" : "bg-white text-gray-800"}`}
      >
        {!isMe && (
          <p className="text-xs font-bold text-gray-600">
            {message.sender.username}
          </p>
        )}
        <p>{message.text}</p>
        <p
          className={`text-xs mt-1 ${isMe ? "text-blue-100" : "text-gray-400"} text-right`}
        >
          {new Date(message.createdAt).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};
