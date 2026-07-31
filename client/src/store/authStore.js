import { create } from "zustand";
import api from "../api/client";

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,

  fetchMe: async () => {
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data.user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    if (data.token) localStorage.setItem("buzz_token", data.token);
    set({ user: data.user });
  },

  register: async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    if (data.token) localStorage.setItem("buzz_token", data.token);
    set({ user: data.user });
  },

  logout: async () => {
    await api.post("/auth/logout");
    localStorage.removeItem("buzz_token");
    set({ user: null });
  },
}));
