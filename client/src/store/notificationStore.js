import { create } from "zustand";
import api from "../api/client";

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  loadNotifications: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get("/notifications");
      const unread = data.notifications.filter((n) => !n.read).length;
      set({ notifications: data.notifications, unreadCount: unread, loading: false });
    } catch (err) {
      console.error("Failed to load notifications", err);
      set({ loading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const { data } = await api.get("/notifications/unread-count");
      set({ unreadCount: data.count });
    } catch {
      // silently fail
    }
  },

  markAllRead: async () => {
    await api.put("/notifications/read");
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  addNotification: (notif) => {
    set((state) => ({
      notifications: [notif, ...state.notifications].slice(0, 50),
      unreadCount: state.unreadCount + 1,
    }));
  },
}));
