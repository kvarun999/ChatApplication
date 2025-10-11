// src/services/chat.service.ts
// Service = handles all chat-related API requests

import api from "../lib/axios";
// our custom axios instance (already has baseURL + token interceptors)

import { ChatRoom, Message } from "../types/chat.types";
// TypeScript type to describe what a ChatRoom object looks like

// function to fetch all chat rooms of the logged-in user
export const getMyChatRooms = async (): Promise<ChatRoom[]> => {
  const { data } = await api.get("/api/chats");
  // make GET request -> backend returns chat rooms
  return data;
  // return only the response data (not status, headers, etc.)
};

// NEW: Function to fetch all messages for a specific chat room
export const getChatMessages = async (
  chatroomId: string
): Promise<Message[]> => {
  const { data } = await api.get(`/api/chats/${chatroomId}/messages`);
  return data;
};

// ✅ NEW FUNCTION
export const createChatRoom = async (
  recipientId: string
): Promise<ChatRoom> => {
  const { data } = await api.post<ChatRoom>("/api/chats", { recipientId });
  return data;
};

export const markChatAsRead = async (chatRoomId: string): Promise<void> => {
  await api.put(`/api/chats/${chatRoomId}/read`);
};

export const sendEncryptedFile = async (
  formData: FormData,
  chatroomId: string
) => {
  const res = await api.post(`/api/chats/${chatroomId}/files`, formData);

  if (res.status < 200 || res.status >= 300) {
    console.error("❌ File upload failed:", res.data);
    throw new Error(
      "File upload failed: " + (res.data?.message || "Unknown error")
    );
  }

  console.log("✅ File uploaded:", res.data);
  return res.data;
};
