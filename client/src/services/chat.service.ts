// src/services/chat.service.ts
// Service = handles all chat-related API requests

import api from "../lib/axios";
// our custom axios instance (already has baseURL + token interceptors)

import { ChatRoom } from "../types/chat.types";
// TypeScript type to describe what a ChatRoom object looks like

// function to fetch all chat rooms of the logged-in user
export const getMyChatRooms = async (): Promise<ChatRoom[]> => {
  const { data } = await api.get("/api/chats");
  // make GET request -> backend returns chat rooms
  return data;
  // return only the response data (not status, headers, etc.)
};
