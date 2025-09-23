import api from "../lib/axios";
import { User } from "../types/user.types";

export const getMe = async (): Promise<User> => {
  const response = await api.get("/api/users/me");
  return response.data;
};

// ✅ NEW FUNCTION
export const searchUsers = async (query: string, page = 1, limit = 20) => {
  const { data } = await api.get(`/api/users/search`, {
    params: { q: query, page, limit },
  });
  return data; // { items, page, limit, total, hasMore }
};
