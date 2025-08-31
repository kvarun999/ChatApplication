import api from "../lib/axios";
import { User } from "../types/user.types";

export const getMe = async (): Promise<User> => {
  const response = await api.get("/api/users/me");
  return response.data;
};
