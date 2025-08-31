import React, { useState } from "react";
import { ChatList } from "../components/ChatList";
import { ChatWindow } from "../components/ChatWindow";
import { MessageInput } from "../components/MessageInput";
import { ChatRoom } from "../../../types/chat.types";

export const ChatPage = () => {
  const [selectedChat, setSelectedChat] = useState<ChatRoom | null>(null);
  return (
    <div className="h-screen w-screen flex">
      <ChatList onSelectChat={setSelectedChat} />
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <ChatWindow chatRoom={selectedChat} />
            <MessageInput chatRoom={selectedChat} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-200">
            <p className="text-gray-500">Select a chat to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};
