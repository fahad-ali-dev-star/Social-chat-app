import { useState, useRef, useEffect, useCallback } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useNotificationStore } from "../store/notificationStore";
import { useMessageStore } from "../store/messageStore";
import { useThemeStore, ACCENT_THEMES } from "../store/themeStore";
import Avatar from "./Avatar";
import api from "../api/client";

const HomeIcon = ({ active }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.75} className="w-5 h-5">
    {active ? (
      <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-1.72-1.72V5.25a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75v1.82L12 3.84zM3.75 13.5a.75.75 0 000 1.5h.75v5.25c0 .414.336.75.75.75H9a.75.75 0 00.75-.75v-3h4.5v3c0 .414.336.75.75.75h3.75c.414 0 .75-.336.75-.75V15h.75a.75.75 0 000-1.5H3.75z" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    )}
  </svg>
);

const BellIcon = ({ active }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.75} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);

const UserIcon = ({ active }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.75} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

const MessageIcon = ({ active }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.75} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
  </svg>
);

const BookmarkIcon = ({ active }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.75} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
  </svg>
);

const LogoIcon = () => (
  <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs select-none transition-transform group-hover:scale-105 flex-shrink-0 overflow-hidden">
    <img
      src="/logo.svg"
      alt="BuzzChat Logo"
      className="w-full h-full object-cover"
      onError={(e) => {
        e.target.src = "/logo192.png";
      }}
    />
  </div>
);

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const notifications = useNotificationStore((s) => s.notifications);
  const loadNotifications = useNotificationStore((s) => s.loadNotifications);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const messageUnreadCount = useMessageStore((s) => s.unreadCount);
  const isDark = useThemeStore((s) => s.isDark);
  const accent = useThemeStore((s) => s.accent);
  const toggleMode = useThemeStore((s) => s.toggleMode);
  const setAccent = useThemeStore((s) => s.setAccent);

  const [toastMessage, setToastMessage] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);

  const menuRef = useRef(null);
  const notifRef = useRef(null);
  const themeRef = useRef(null);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      const t = setTimeout(() => setShowNotifPrompt(true), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    const handleMessageToast = (e) => {
      const { message, conversationId } = e.detail;
      setToastMessage({ message, conversationId, type: "message" });
      setTimeout(() => setToastMessage(null), 5000);
    };
    const handleNotifToast = (e) => {
      const notif = e.detail;
      const senderName = notif.sender?.displayName || notif.sender?.username || "Someone";
      let body = "";
      if (notif.type === "like") body = `${senderName} liked your post ❤️`;
      else if (notif.type === "comment") body = `${senderName} commented on your post 💬`;
      else if (notif.type === "comment_reply") body = `${senderName} replied to your comment 💬`;
      else if (notif.type === "follow") body = `${senderName} started following you 👤`;
      else if (notif.type === "mention") body = `${senderName} mentioned you 📢`;
      else body = `New notification from ${senderName}`;

      setToastMessage({
        message: {
          sender: notif.sender,
          body,
        },
        type: "notification",
      });
      setTimeout(() => setToastMessage(null), 5000);
    };

    window.addEventListener("new_message_toast", handleMessageToast);
    window.addEventListener("new_notification_toast", handleNotifToast);
    return () => {
      window.removeEventListener("new_message_toast", handleMessageToast);
      window.removeEventListener("new_notification_toast", handleNotifToast);
    };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (themeRef.current && !themeRef.current.contains(e.target)) setThemeOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleSearchInput = useCallback((e) => {
    const q = e.target.value;
    setSearchQuery(q);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!q.trim()) {
      setSearchResults(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const [usersRes, postsRes] = await Promise.all([
          api.get(`/users/search?q=${encodeURIComponent(q)}`),
          api.get(`/posts/search?q=${encodeURIComponent(q)}`),
        ]);
        setSearchResults({
          users: (usersRes.data.users || []).slice(0, 3),
          posts: (postsRes.data.posts || []).slice(0, 3),
        });
        setSearchOpen(true);
      } catch (err) {
        console.error("Search failed", err);
      }
    }, 250);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchOpen(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navLinks = [
    { to: "/", label: "Home", icon: (active) => <HomeIcon active={active} /> },
    { to: "/notifications", label: "Notifications", icon: (active) => <BellIcon active={active} />, badge: unreadCount },
    { to: "/messages", label: "Messages", icon: (active) => <MessageIcon active={active} />, badge: messageUnreadCount },
    { to: "/bookmarks", label: "Bookmarks", icon: (active) => <BookmarkIcon active={active} /> },
    { to: `/profile/${user?.username}`, label: "Profile", icon: (active) => <UserIcon active={active} /> },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-15 flex items-center justify-between gap-3">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <LogoIcon />
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white">
              Buzz<span className="gradient-text font-black">Chat</span>
            </span>
          </NavLink>

          {/* Search Bar - visible on sm+ screens inline, hidden on mobile (shown below header) */}
          <div className="relative hidden sm:block flex-1 max-w-sm" ref={searchRef}>
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <SearchIcon />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchInput}
                  onFocus={() => searchResults && setSearchOpen(true)}
                  placeholder="Search Buzz..."
                  className="w-full pl-10 pr-3.5 py-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
              </div>
            </form>

            {/* Quick Search Dropdown */}
            {searchOpen && searchResults && (
              <div className="absolute top-full mt-2 w-full glass-lg rounded-2xl overflow-hidden shadow-popover z-50 animate-slide-up">
                {searchResults.users.length === 0 && searchResults.posts.length === 0 ? (
                  <p className="px-4 py-3.5 text-sm text-slate-500">No results found for "{searchQuery}"</p>
                ) : (
                  <>
                    {searchResults.users.length > 0 && (
                      <div>
                        <p className="px-4 pt-3 pb-1 text-[11px] text-slate-400 font-bold uppercase tracking-wider">People</p>
                        {searchResults.users.map((u) => (
                          <button
                            key={u._id}
                            onClick={() => { navigate(`/profile/${u.username}`); setSearchOpen(false); setSearchQuery(""); }}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all text-left"
                          >
                            <Avatar src={u.avatarUrl} name={u.displayName} username={u.username} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{u.displayName || u.username}</p>
                              <p className="text-xs text-slate-500 truncate">@{u.username}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.posts.length > 0 && (
                      <div>
                        <p className="px-4 pt-3 pb-1 text-[11px] text-slate-400 font-bold uppercase tracking-wider border-t border-slate-100 dark:border-slate-800/80">Posts</p>
                        {searchResults.posts.map((p) => (
                          <div
                            key={p._id}
                            className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all cursor-pointer"
                            onClick={() => { navigate(`/search?q=${encodeURIComponent(searchQuery)}`); setSearchOpen(false); }}
                          >
                            <p className="text-xs text-slate-700 dark:text-slate-300 truncate">{p.content}</p>
                            <p className="text-[11px] text-slate-400">by @{p.author?.username}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={handleSearchSubmit}
                      className="w-full px-4 py-2.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all text-left border-t border-slate-100 dark:border-slate-800/80"
                    >
                      See all results for "{searchQuery}" →
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden sm:flex items-center gap-1.5 ml-auto">
            {navLinks.map(({ to, label, icon, badge }) => {
              const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));

              if (to === "/notifications") {
                return (
                  <div key={to} className="relative" ref={notifRef}>
                    <button
                      onClick={() => {
                        if (!notifOpen) loadNotifications();
                        setNotifOpen((o) => !o);
                      }}
                      className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        notifOpen || isActive
                          ? "bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                      }`}
                      title={label}
                    >
                      {icon(isActive)}
                      <span className="hidden lg:block">{label}</span>
                      {badge > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-rose-500 text-white text-[10px] font-extrabold rounded-full px-1 shadow-sm">
                          {badge > 9 ? "9+" : badge}
                        </span>
                      )}
                    </button>

                    {/* Notification Toast */}
                    {toastMessage && toastMessage.type === "notification" && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/notifications");
                          setToastMessage(null);
                        }}
                        className="absolute top-full right-0 mt-2 z-50 glass-lg border border-brand-500/40 p-3 rounded-2xl shadow-popover flex items-center gap-3 cursor-pointer hover:border-brand-400 transition-all animate-slide-up w-72 text-left"
                      >
                        <Avatar src={toastMessage.message.sender?.avatarUrl} name={toastMessage.message.sender?.displayName} username={toastMessage.message.sender?.username} size="xs" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">New Notification</p>
                          <p className="text-xs text-slate-800 dark:text-slate-100 truncate mt-0.5">{toastMessage.message.body}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setToastMessage(null);
                          }}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs p-1"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* Notification Drawer */}
                    {notifOpen && (
                      <div className="absolute right-0 mt-2 w-80 glass-lg rounded-2xl shadow-popover z-50 overflow-hidden animate-slide-up">
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Notifications</p>
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllRead}
                              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                            >
                              Mark all read
                            </button>
                          )}
                        </div>
                        <div className="max-h-80 overflow-y-auto p-1.5 space-y-1">
                          {notifications.length === 0 ? (
                            <p className="text-center text-xs text-slate-400 py-6">No notifications yet</p>
                          ) : (
                            notifications.slice(0, 8).map((n) => (
                              <div
                                key={n._id}
                                onClick={() => {
                                  setNotifOpen(false);
                                  navigate("/notifications");
                                }}
                                className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-3 ${
                                  !n.read
                                    ? "bg-brand-500/10 border-l-3 border-brand-500"
                                    : "hover:bg-slate-100 dark:hover:bg-slate-800/60"
                                }`}
                              >
                                <Avatar src={n.sender?.avatarUrl} name={n.sender?.displayName} username={n.sender?.username} size="sm" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-slate-700 dark:text-slate-300 truncate">
                                    <span className="font-semibold text-slate-900 dark:text-white">{n.sender?.displayName || n.sender?.username}</span>{" "}
                                    {n.type === "like" ? "liked your post ❤️" : n.type === "comment" ? "commented 💬" : "followed you 👤"}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setNotifOpen(false);
                            navigate("/notifications");
                          }}
                          className="w-full py-2.5 text-xs text-center text-brand-600 dark:text-brand-400 font-semibold border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
                        >
                          View All Notifications →
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <NavLink
                  key={to}
                  to={to}
                  title={label}
                  end={to === "/"}
                  className={({ isActive: navActive }) =>
                    `relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      navActive
                        ? "bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`
                  }
                >
                  {icon(isActive)}
                  <span className="hidden lg:block">{label}</span>
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-brand-500 text-white text-[10px] font-bold rounded-full px-1 shadow-xs">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}

                  {to === "/messages" && toastMessage && toastMessage.type === "message" && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/messages");
                        setToastMessage(null);
                      }}
                      className="absolute top-full right-0 mt-2 z-50 glass-lg border border-brand-500/40 p-3 rounded-2xl shadow-popover flex items-center gap-3 cursor-pointer hover:border-brand-400 transition-all animate-slide-up w-72 text-left"
                    >
                      <Avatar src={toastMessage.message.sender?.avatarUrl} name={toastMessage.message.sender?.displayName} username={toastMessage.message.sender?.username} size="xs" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">New Message</p>
                        <p className="text-xs text-slate-800 dark:text-slate-100 truncate mt-0.5">
                          <span className="font-semibold">{toastMessage.message.sender?.displayName || toastMessage.message.sender?.username}</span>: {toastMessage.message.body}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setToastMessage(null);
                        }}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs p-1"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Right Controls: Theme Toggle & Avatar Menu */}
          <div className="flex items-center gap-2">
            {/* Theme Customizer */}
            <div className="relative" ref={themeRef}>
              <button
                onClick={() => setThemeOpen((o) => !o)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all border ${
                  themeOpen
                    ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                }`}
                title="Theme Settings"
              >
                {isDark ? "🌙" : "☀️"}
              </button>

              {themeOpen && (
                <div className="absolute right-0 mt-2 w-64 glass-lg rounded-2xl shadow-popover z-50 p-4 space-y-4 animate-slide-up">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Appearance</p>
                    <span className="text-[11px] text-slate-400">{isDark ? "Dark" : "Light"}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Color Mode</span>
                    <button
                      onClick={toggleMode}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                        isDark ? "bg-brand-600" : "bg-amber-400"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-transform duration-200 flex items-center justify-center text-[10px] ${
                          isDark ? "translate-x-6" : "translate-x-0"
                        }`}
                      >
                        {isDark ? "🌙" : "☀️"}
                      </span>
                    </button>
                  </div>

                  <div>
                    <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-2">Accent Theme</p>
                    <div className="grid grid-cols-3 gap-2">
                      {ACCENT_THEMES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setAccent(t.id)}
                          className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                            accent === t.id
                              ? "border-brand-500 bg-brand-500/10"
                              : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <span
                            className="w-5 h-5 rounded-full shadow-xs"
                            style={{ background: t.gradient }}
                          />
                          <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all"
              >
                <Avatar
                  src={user?.avatarUrl}
                  name={user?.displayName}
                  username={user?.username}
                  size="sm"
                />
                <span className="hidden md:block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  @{user?.username}
                </span>
                <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 glass-lg rounded-2xl shadow-popover z-50 overflow-hidden animate-slide-up">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.displayName || user?.username}</p>
                    <p className="text-xs text-slate-500 truncate">@{user?.username}</p>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    <button
                      onClick={() => { navigate(`/profile/${user?.username}`); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all text-left"
                    >
                      <UserIcon active={false} /> View Profile
                    </button>
                    {(user?.role === "admin" || user?.role === "moderator") && (
                      <button
                        onClick={() => { navigate("/admin"); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all text-left"
                      >
                        🛡️ Admin Dashboard
                      </button>
                    )}
                    <button
                      onClick={() => { navigate("/bookmarks"); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all text-left"
                    >
                      <BookmarkIcon active={false} /> Bookmarks
                    </button>
                    <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all text-left"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Search Bar - visible only on small screens, below the header */}
      <div className="sm:hidden sticky top-[60px] z-30 w-full bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800/80 backdrop-blur-md px-3 py-2" ref={searchRef}>
        <form onSubmit={handleSearchSubmit}>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <SearchIcon />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchInput}
              onFocus={() => searchResults && setSearchOpen(true)}
              placeholder="Search Buzz..."
              className="w-full pl-10 pr-3.5 py-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
            />
          </div>
        </form>

        {/* Mobile Quick Search Dropdown */}
        {searchOpen && searchResults && (
          <div className="absolute left-3 right-3 top-full mt-1 glass-lg rounded-2xl overflow-hidden shadow-popover z-50 animate-slide-up">
            {searchResults.users.length === 0 && searchResults.posts.length === 0 ? (
              <p className="px-4 py-3.5 text-sm text-slate-500">No results found for "{searchQuery}"</p>
            ) : (
              <>
                {searchResults.users.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[11px] text-slate-400 font-bold uppercase tracking-wider">People</p>
                    {searchResults.users.map((u) => (
                      <button
                        key={u._id}
                        onClick={() => { navigate(`/profile/${u.username}`); setSearchOpen(false); setSearchQuery(""); }}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all text-left"
                      >
                        <Avatar src={u.avatarUrl} name={u.displayName} username={u.username} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{u.displayName || u.username}</p>
                          <p className="text-xs text-slate-500 truncate">@{u.username}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.posts.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[11px] text-slate-400 font-bold uppercase tracking-wider border-t border-slate-100 dark:border-slate-800/80">Posts</p>
                    {searchResults.posts.map((p) => (
                      <div
                        key={p._id}
                        className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all cursor-pointer"
                        onClick={() => { navigate(`/search?q=${encodeURIComponent(searchQuery)}`); setSearchOpen(false); }}
                      >
                        <p className="text-xs text-slate-700 dark:text-slate-300 truncate">{p.content}</p>
                        <p className="text-[11px] text-slate-400">by @{p.author?.username}</p>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={handleSearchSubmit}
                  className="w-full px-4 py-2.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all text-left border-t border-slate-100 dark:border-slate-800/80"
                >
                  See all results for "{searchQuery}" →
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Mobile Fixed Bottom Navigation Bar (Ultra-clean PWA App Bar) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800/80 backdrop-blur-md px-2 py-1.5 flex items-center justify-around shadow-lg">
        {navLinks.map(({ to, label, icon, badge }) => {
          const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
          return (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
                isActive
                  ? "text-brand-600 dark:text-brand-400 font-bold"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {icon(isActive)}
              <span className="text-[10px] mt-0.5 font-medium">{label}</span>
              {badge > 0 && (
                <span className="absolute top-1 right-2 min-w-[16px] h-[16px] flex items-center justify-center bg-rose-500 text-white text-[9px] font-extrabold rounded-full px-1">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Notification Permission Request Toast */}
      {showNotifPrompt && (
        <div className="fixed bottom-16 sm:bottom-6 left-4 right-4 sm:right-auto sm:w-96 z-50 glass-lg border border-slate-200 dark:border-slate-700 p-4 rounded-2xl shadow-popover flex items-start gap-3 animate-slide-up">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center text-lg flex-shrink-0">
            🔔
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 dark:text-white">Enable Notifications</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
              Stay in the loop when people like your posts or send you messages.
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <button
                onClick={async () => {
                  if ("Notification" in window) {
                    await Notification.requestPermission();
                  }
                  setShowNotifPrompt(false);
                }}
                className="btn-brand text-xs py-1.5 px-3"
              >
                Allow
              </button>
              <button
                onClick={() => setShowNotifPrompt(false)}
                className="btn-ghost text-xs py-1.5 px-3"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
