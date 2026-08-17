import { create } from "zustand";
import api from "../api/client";

// Helper: show a native browser/PWA push notification
export async function showPushNotification({ title, body, icon = "/logo192.png", tag, url = "/" }) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const options = {
    body,
    icon,
    badge: "/logo192.png",
    tag: tag || "buzz-chat",
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: url || "/" },
  };

  try {
    // Mobile PWA (Android Chrome / iOS PWA) prohibits `new Notification()` constructor.
    // Service Worker registration showNotification must be used on mobile devices.
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options);
        return;
      }
    }
  } catch (err) {
    console.warn("ServiceWorker showNotification failed, trying fallback:", err);
  }

  try {
    // Desktop browser fallback
    const n = new Notification(title, options);
    setTimeout(() => n.close(), 5000);
  } catch (e) {
    console.warn("Desktop Notification failed", e);
  }
}

// Helper: request notification permission
export async function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch {
      // Fallback for older mobile browsers
    }
  }
}

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
