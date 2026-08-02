import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  loading: true,

  fetchMe: async () => {
    try {
      const token = await AsyncStorage.getItem("buzz_token");
      if (!token) {
        set({ user: null, token: null, loading: false });
        return;
      }
      const { data } = await api.get("/auth/me");
      set({ user: data.user, token, loading: false });
    } catch (err) {
      await AsyncStorage.removeItem("buzz_token");
      set({ user: null, token: null, loading: false });
    }
  },

  login: async (emailOrUsername, password) => {
    const { data } = await api.post("/auth/login", { emailOrUsername, password });
    await AsyncStorage.setItem("buzz_token", data.token);
    set({ user: data.user, token: data.token });
    return data;
  },

  register: async (username, email, password, displayName) => {
    const { data } = await api.post("/auth/register", { username, email, password, displayName });
    await AsyncStorage.setItem("buzz_token", data.token);
    set({ user: data.user, token: data.token });
    return data;
  },

  logout: async () => {
    await AsyncStorage.removeItem("buzz_token");
    set({ user: null, token: null });
  },
}));
