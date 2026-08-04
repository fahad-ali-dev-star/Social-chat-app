import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { io } from "socket.io-client";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import Search from "./pages/Search";
import Bookmarks from "./pages/Bookmarks";
import Admin from "./pages/Admin";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import { useAuthStore } from "./store/authStore";
import { useNotificationStore, showPushNotification, requestNotificationPermission } from "./store/notificationStore";
import { useMessageStore } from "./store/messageStore";
import { usePostStore } from "./store/postStore";

// Layout wrapping authenticated pages
function AppLayout() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />
      <Outlet />
    </div>
  );
}

let socket = null;
export const getSocket = () => socket;

export default function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const user = useAuthStore((s) => s.user);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const unreadNotifCount = useNotificationStore((s) => s.unreadCount);
  const addIncomingMessage = useMessageStore((s) => s.addIncomingMessage);
  const markDelivered = useMessageStore((s) => s.markDelivered);
  const markRead = useMessageStore((s) => s.markRead);
  const updateIncomingMessage = useMessageStore((s) => s.updateIncomingMessage);
  const deleteIncomingMessage = useMessageStore((s) => s.deleteIncomingMessage);
  const updateReaction = useMessageStore((s) => s.updateReaction);
  const messageUnreadCount = useMessageStore((s) => s.unreadCount);
  const loadBookmarkedIds = usePostStore((s) => s.loadBookmarkedIds);

  useEffect(() => {
    fetchMe();
  }, []);

  // Update document title with unread badge on ALL pages
  useEffect(() => {
    const total = unreadNotifCount + messageUnreadCount;
    document.title = total > 0 ? `(${total > 99 ? "99+" : total}) Buzz Chat` : "Buzz Chat";
  }, [unreadNotifCount, messageUnreadCount]);

  // Connect socket and listen for real-time notifications + messages
  useEffect(() => {
    if (!user) return;

    // Request notification permission as soon as user logs in
    requestNotificationPermission();

    // Fetch initial unread count + bookmarks + conversations
    fetchUnreadCount();
    loadBookmarkedIds();
    useMessageStore.getState().loadConversations();

    const backendUrl = import.meta.env.VITE_BACKEND_URL || "/";
    const token = localStorage.getItem("buzz_token");
    socket = io(backendUrl, {
      withCredentials: true,
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000,
      timeout: 5000,
    });
    window.__socketInstance = socket;

    // Interval timer to poll unread counts as fallback
    const pollInterval = setInterval(() => {
      fetchUnreadCount();
      useMessageStore.getState().loadConversations();
    }, 10000);

    socket.on("online_users", (onlineUserIds) => {
      window.dispatchEvent(new CustomEvent("online_users_update", { detail: onlineUserIds }));
    });

    socket.on("user_typing", (data) => {
      window.dispatchEvent(new CustomEvent("user_typing_event", { detail: data }));
    });

    socket.on("notification", (notif) => {
      addNotification(notif);
      fetchUnreadCount();

      // Show native push notification on every page
      const senderName = notif.sender?.displayName || notif.sender?.username || "Someone";
      let body = "";
      if (notif.type === "like") body = `${senderName} liked your post ❤️`;
      else if (notif.type === "comment") body = `${senderName} commented on your post 💬`;
      else if (notif.type === "comment_reply") body = `${senderName} replied to your comment 💬`;
      else if (notif.type === "follow") body = `${senderName} started following you 👤`;
      else if (notif.type === "mention") body = `${senderName} mentioned you 📢`;
      else body = `New notification from ${senderName}`;

      showPushNotification({
        title: "Buzz Chat 🔔",
        body,
        tag: `notif-${notif._id || Date.now()}`,
      });

      // Dispatch event for real-time in-app toast notification banner on any page
      window.dispatchEvent(new CustomEvent("new_notification_toast", { detail: notif }));
    });

    socket.on("new_message", ({ message, conversationId }) => {
      addIncomingMessage(message, conversationId);

      // Show native push notification for new message
      const senderName = message.sender?.displayName || message.sender?.username || "Someone";
      const msgBody = message.body || (message.mediaType === "audio" ? "🎙️ Voice note" : "📷 Photo");
      showPushNotification({
        title: `💬 ${senderName}`,
        body: msgBody,
        tag: `msg-${conversationId}`,
      });

      const event = new CustomEvent("new_message_toast", {
        detail: { message, conversationId },
      });
      window.dispatchEvent(event);
    });

    socket.on("message_delivered", (payload) => markDelivered(payload));
    socket.on("messages_read", (payload) => markRead(payload));
    socket.on("message_updated", ({ message }) => updateIncomingMessage(message));
    socket.on("message_deleted", (payload) => deleteIncomingMessage(payload));
    socket.on("message_reaction", (payload) => updateReaction(payload));

    return () => {
      clearInterval(pollInterval);
      socket?.disconnect();
      socket = null;
    };
  }, [user?.id]);


  return (
    <BrowserRouter>
      <Routes>
        {/* Auth pages (no nav) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected pages with nav */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Feed />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/search" element={<Search />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
