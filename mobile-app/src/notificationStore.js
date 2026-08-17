import { create } from "zustand";
import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";
import { SOCKET_SERVER_URL } from "./config";

let socket = null;

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

      // Initial fetch
      get().fetchUnreadCounts();

      // Setup Socket.IO if not already initialized
      if (!socket) {
        socket = io(SOCKET_SERVER_URL, {
          withCredentials: true,
          auth: { token },
          transports: ["websocket", "polling"],
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
        });

        socket.on("notification", (notif) => {
          const senderName = notif.sender?.displayName || notif.sender?.username || "Someone";
          let body = "";
          if (notif.type === "like") body = `${senderName} liked your post ❤️`;
          else if (notif.type === "comment") body = `${senderName} commented on your post 💬`;
          else if (notif.type === "follow") body = `${senderName} started following you 👤`;
          else if (notif.type === "mention") body = `${senderName} mentioned you 📢`;
          else body = `New notification from ${senderName}`;

          set((state) => ({
            unreadNotifCount: state.unreadNotifCount + 1,
            notifications: [notif, ...state.notifications],
            activeToast: {
              type: "notification",
              title: "🔔 New Notification",
              body,
            },
          }));

          // Auto-hide toast after 4 seconds
          setTimeout(() => {
            get().clearToast();
          }, 4000);
        });

        socket.on("new_message", ({ message }) => {
          const senderName = message.sender?.displayName || message.sender?.username || "Someone";
          const body = message.body || (message.mediaType === "audio" ? "🎙️ Voice note" : "📷 Photo");

          set((state) => ({
            unreadMsgCount: state.unreadMsgCount + 1,
            activeToast: {
              type: "message",
              title: `💬 ${senderName}`,
              body,
            },
          }));

          // Auto-hide toast after 4 seconds
          setTimeout(() => {
            get().clearToast();
          }, 4000);

          get().fetchConversations();
        });
      }
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

  // Disconnect socket
  disconnectSocket: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },
}));
