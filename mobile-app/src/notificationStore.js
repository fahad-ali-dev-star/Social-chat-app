import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";
import { registerForPushNotificationsAsync, triggerLocalNotification } from "./utils/notifications";

export const useNotificationStore = create((set, get) => ({
  unreadNotifCount: 0,
  unreadMsgCount: 0,
  notifications: [],
  conversations: [],
  loadingNotifs: false,
  loadingConvs: false,
  activeToast: null, // { type: 'notification' | 'message', title: string, body: string }

  // Clear active toast alert
  clearToast: () => set({ activeToast: null }),

  // Initialize socket and periodic polling
  initSocketAndPolling: async () => {
    try {
      const token = await AsyncStorage.getItem("buzz_token");
      if (!token) return;

      // Register for Push Notifications
      registerForPushNotificationsAsync().then((pushToken) => {
        if (pushToken) {
          api.put("/users/me", { pushToken }).catch(() => {});
        }
      });

      // Initial fetch
      get().fetchUnreadCounts();

    } catch (err) {
      console.error("Mobile socket setup error:", err);
    }
  },

  // Fetch unread notification and message counts
  fetchUnreadCounts: async () => {
    try {
      const [notifRes, convRes] = await Promise.all([
        api.get("/notifications/unread-count").catch(() => ({ data: { count: 0 } })),
        api.get("/messages").catch(() => ({ data: { conversations: [] } })),
      ]);

      const unreadNotifCount = notifRes.data?.count || 0;
      const conversations = convRes.data?.conversations || [];
      const unreadMsgCount = conversations.reduce(
        (sum, c) => sum + (c.unreadCount || 0),
        0
      );

      set({ unreadNotifCount, unreadMsgCount, conversations });
    } catch (err) {
      console.error("Fetch unread counts error:", err);
    }
  },

  addNotification: (notif) => {
    const senderName = notif.sender?.displayName || notif.sender?.username || "Someone";
    let body = `New notification from ${senderName}`;
    if (notif.type === "like") body = `${senderName} liked your post`;
    else if (notif.type === "comment") body = `${senderName} commented on your post`;
    else if (notif.type === "follow") body = `${senderName} started following you`;
    else if (notif.type === "mention") body = `${senderName} mentioned you`;

    set((state) => ({
      unreadNotifCount: state.unreadNotifCount + 1,
      notifications: [notif, ...state.notifications].slice(0, 50),
      activeToast: { type: "notification", title: "New notification", body },
    }));
    triggerLocalNotification({
      title: "Buzz Chat Alert",
      body,
      data: { notifId: notif._id },
    });
    setTimeout(() => get().clearToast(), 4000);
  },

  // Load full notification list
  loadNotifications: async () => {
    set({ loadingNotifs: true });
    try {
      const { data } = await api.get("/notifications");
      const unread = (data.notifications || []).filter((n) => !n.read).length;
      set({
        notifications: data.notifications || [],
        unreadNotifCount: unread,
        loadingNotifs: false,
      });
    } catch (err) {
      console.error("Failed to load notifications:", err);
      set({ loadingNotifs: false });
    }
  },

  // Mark all notifications read
  markNotificationsRead: async () => {
    try {
      await api.put("/notifications/read");
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadNotifCount: 0,
      }));
    } catch (err) {
      console.error("Failed to mark notifications read:", err);
    }
  },

  // Load full conversation list
  fetchConversations: async () => {
    set({ loadingConvs: true });
    try {
      const { data } = await api.get("/messages");
      const conversations = data.conversations || [];
      const unreadMsgCount = conversations.reduce(
        (sum, c) => sum + (c.unreadCount || 0),
        0
      );
      set({ conversations, unreadMsgCount, loadingConvs: false });
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
      set({ loadingConvs: false });
    }
  },

}));
