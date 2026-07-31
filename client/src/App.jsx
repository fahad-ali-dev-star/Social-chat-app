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
import { useNotificationStore } from "./store/notificationStore";
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
  const addIncomingMessage = useMessageStore((s) => s.addIncomingMessage);
  const markDelivered = useMessageStore((s) => s.markDelivered);
  const markRead = useMessageStore((s) => s.markRead);
  const updateIncomingMessage = useMessageStore((s) => s.updateIncomingMessage);
  const deleteIncomingMessage = useMessageStore((s) => s.deleteIncomingMessage);
  const updateReaction = useMessageStore((s) => s.updateReaction);
  const loadBookmarkedIds = usePostStore((s) => s.loadBookmarkedIds);

  useEffect(() => {
    fetchMe();
  }, []);

  // Connect socket and listen for real-time notifications + messages
  useEffect(() => {
    if (!user) return;

    // Fetch initial unread count + bookmarks + conversations
    fetchUnreadCount();
    loadBookmarkedIds();
    useMessageStore.getState().loadConversations();

    const backendUrl = import.meta.env.VITE_BACKEND_URL || "/";
    const token = localStorage.getItem("buzz_token");
    socket = io(backendUrl, {
      withCredentials: true,
      auth: { token },
    });
    window.__socketInstance = socket;

    socket.on("online_users", (onlineUserIds) => {
      window.dispatchEvent(new CustomEvent("online_users_update", { detail: onlineUserIds }));
    });

    socket.on("user_typing", (data) => {
      window.dispatchEvent(new CustomEvent("user_typing_event", { detail: data }));
    });

    socket.on("notification", (notif) => {
      addNotification(notif);
    });

    socket.on("new_message", ({ message, conversationId }) => {
      addIncomingMessage(message, conversationId);

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
