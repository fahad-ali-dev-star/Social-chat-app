import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { io } from "socket.io-client";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import InstallBanner from "./components/InstallBanner";
import OfflineBanner from "./components/OfflineBanner";
import { useAuthStore } from "./store/authStore";
import { useNotificationStore, showPushNotification, requestNotificationPermission } from "./store/notificationStore";
import { useMessageStore } from "./store/messageStore";
import { usePostStore } from "./store/postStore";

// Lazy-load all pages — reduces initial JS bundle dramatically
const Login         = lazy(() => import("./pages/Login"));
const Register      = lazy(() => import("./pages/Register"));
const Feed          = lazy(() => import("./pages/Feed"));
const Profile       = lazy(() => import("./pages/Profile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Messages      = lazy(() => import("./pages/Messages"));
const Search        = lazy(() => import("./pages/Search"));
const Bookmarks     = lazy(() => import("./pages/Bookmarks"));
const Admin         = lazy(() => import("./pages/Admin"));

// Skeleton fallback while a page chunk is loading
function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 max-w-xl mx-auto mt-8">
      <div className="skeleton h-12 w-full rounded-2xl" />
      <div className="skeleton h-48 w-full rounded-2xl" />
      <div className="skeleton h-48 w-full rounded-2xl" />
      <div className="skeleton h-32 w-full rounded-2xl" />
    </div>
  );
}

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

    // Poll every 30s as fallback (Socket.IO handles real-time, this is just a safety net)
    const pollInterval = setInterval(() => {
      fetchUnreadCount();
      useMessageStore.getState().loadConversations();
    }, 30000);

    socket.on("online_users", (onlineUserIds) => {
      window.dispatchEvent(new CustomEvent("online_users_update", { detail: onlineUserIds }));
    });

    socket.on("user_typing", (data) => {
      window.dispatchEvent(new CustomEvent("user_typing_event", { detail: data }));
    });

    socket.on("notification", (notif) => {
      addNotification(notif);
      fetchUnreadCount();

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

      window.dispatchEvent(new CustomEvent("new_notification_toast", { detail: notif }));
    });

    socket.on("new_message", ({ message, conversationId }) => {
      addIncomingMessage(message, conversationId);

      const senderName = message.sender?.displayName || message.sender?.username || "Someone";
      const msgBody = message.body || (message.mediaType === "audio" ? "🎙️ Voice note" : "📷 Photo");
      showPushNotification({
        title: `💬 ${senderName}`,
        body: msgBody,
        tag: `msg-${conversationId}`,
      });

      window.dispatchEvent(new CustomEvent("new_message_toast", {
        detail: { message, conversationId },
      }));
    });

    socket.on("message_delivered", (payload) => markDelivered(payload));
    socket.on("messages_read", (payload) => markRead(payload));
    socket.on("message_updated", ({ message }) => updateIncomingMessage(message));
    socket.on("message_deleted", (payload) => deleteIncomingMessage(payload));
    socket.on("message_reaction", (payload) => updateReaction(payload));

    // When the user returns to the app (e.g. from home screen on mobile,
    // or switches back to this browser tab), immediately sync unread counts.
    // This ensures the red dot badge reflects reality even if a socket event
    // was missed while the PWA was backgrounded.
    const handleResume = () => {
      fetchUnreadCount();
      useMessageStore.getState().loadConversations();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") handleResume();
    };
    window.addEventListener("focus", handleResume);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("focus", handleResume);
      document.removeEventListener("visibilitychange", handleVisibility);
      socket?.disconnect();
      socket = null;
    };
  }, [user?.id]);

  return (
    <BrowserRouter>
      {/* Global PWA banners */}
      <OfflineBanner />
      <InstallBanner />

      <Suspense fallback={<PageSkeleton />}>
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
      </Suspense>
    </BrowserRouter>
  );
}
