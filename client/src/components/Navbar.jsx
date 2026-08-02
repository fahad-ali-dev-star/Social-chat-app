import { useState, useRef, useEffect, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useNotificationStore } from "../store/notificationStore";
import { useMessageStore } from "../store/messageStore";
import { useThemeStore, ACCENT_THEMES } from "../store/themeStore";
import Avatar from "./Avatar";
import api from "../api/client";

const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-1.72-1.72V5.25a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75v1.82L12 3.84z" />
    <path fillRule="evenodd" d="M3 12.75a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12.75z" clipRule="evenodd" />
    <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-1.72-1.72V5.25a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75v1.82L12 3.84zM3.75 13.5a.75.75 0 000 1.5h.75v5.25c0 .414.336.75.75.75H9a.75.75 0 00.75-.75v-3h4.5v3c0 .414.336.75.75.75h3.75c.414 0 .75-.336.75-.75V15h.75a.75.75 0 000-1.5H3.75z" />
  </svg>
);

const BellIcon = ({ filled }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : 1.5} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

const MessageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
  </svg>
);

const BookmarkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
  </svg>
);

const LogoIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
    <circle cx="20" cy="20" r="20" fill="url(#logo-grad)" />
    <path d="M26 12H14C11.8 12 10 13.8 10 16V23C10 25.2 11.8 27 14 27H17L20 31L23 27H26C28.2 27 30 25.2 30 23V16C30 13.8 28.2 12 26 12Z" fill="white" />
    <path d="M21.5 15L16 21.5H20.5L19 25.5L24.5 18.5H20L21.5 15Z" fill="url(#logo-grad)" />
    <defs>
      <linearGradient id="logo-grad" x1="0" y1="0" x2="40" y2="40">
        <stop stopColor="#f59e0b" />
        <stop offset="1" stopColor="#ea580c" />
      </linearGradient>
    </defs>
  </svg>
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
  const debounceRef = useRef(null);

  // Show one-time prompt if notifications not yet allowed
  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      // Show prompt after 2 seconds
      const t = setTimeout(() => setShowNotifPrompt(true), 2000);
      return () => clearTimeout(t);
    }
  }, []);

  // Handle incoming message toast popups
  useEffect(() => {
    const handleToast = (e) => {
      const { message, conversationId } = e.detail;
      setToastMessage({ message, conversationId });
      setTimeout(() => setToastMessage(null), 5000);
    };
    window.addEventListener("new_message_toast", handleToast);
    return () => window.removeEventListener("new_message_toast", handleToast);
  }, []);

  // Close menu & notifications on outside click
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
          users: usersRes.data.users.slice(0, 3),
          posts: postsRes.data.posts.slice(0, 3),
        });
        setSearchOpen(true);
      } catch (err) {
        console.error("Search failed", err);
      }
    }, 300);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchOpen(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navLinks = [
    { to: "/", label: "Home", icon: <HomeIcon /> },
    { to: "/notifications", label: "Notifications", icon: <BellIcon />, badge: unreadCount },
    { to: "/messages", label: "Messages", icon: <MessageIcon />, badge: messageUnreadCount },
    { to: "/bookmarks", label: "Bookmarks", icon: <BookmarkIcon /> },
    { to: `/profile/${user?.username}`, label: "Profile", icon: <UserIcon /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass border-b border-white/5">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-0 sm:h-14 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <LogoIcon />
          <span className="font-bold text-base sm:text-lg gradient-text">Buzz Chat</span>
        </NavLink>

        {/* Search bar */}
        <div className="relative order-3 w-full sm:order-none sm:flex-1 sm:max-w-xs" ref={searchRef}>
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                <SearchIcon />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchInput}
                onFocus={() => searchResults && setSearchOpen(true)}
                placeholder="Search users or posts..."
                className="w-full pl-9 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand-500/50 focus:bg-white/8 transition-all"
              />
            </div>
          </form>

          {/* Dropdown quick results */}
          {searchOpen && searchResults && (
            <div className="absolute top-full mt-2 w-full glass-lg rounded-2xl overflow-hidden animate-fade-in shadow-xl z-50">
              {searchResults.users.length === 0 && searchResults.posts.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-500">No results found</p>
              ) : (
                <>
                  {searchResults.users.length > 0 && (
                    <div>
                      <p className="px-4 pt-3 pb-1 text-[11px] text-gray-500 uppercase tracking-wider font-semibold">People</p>
                      {searchResults.users.map((u) => (
                        <button
                          key={u._id}
                          onClick={() => { navigate(`/profile/${u.username}`); setSearchOpen(false); setSearchQuery(""); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/8 transition-all text-left"
                        >
                          <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 overflow-hidden">
                            {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" /> : (u.displayName || u.username)?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{u.displayName || u.username}</p>
                            <p className="text-xs text-gray-500">@{u.username}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.posts.length > 0 && (
                    <div>
                      <p className="px-4 pt-3 pb-1 text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Posts</p>
                      {searchResults.posts.map((p) => (
                        <div key={p._id} className="px-4 py-2.5 hover:bg-white/8 transition-all cursor-pointer"
                          onClick={() => { navigate(`/search?q=${encodeURIComponent(searchQuery)}`); setSearchOpen(false); }}>
                          <p className="text-xs text-gray-400 truncate">{p.content}</p>
                          <p className="text-[11px] text-gray-600">by @{p.author?.username}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={handleSearchSubmit}
                    className="w-full px-4 py-3 text-sm text-brand-400 hover:bg-white/5 transition-all text-left border-t border-white/8"
                  >
                    See all results for "{searchQuery}" →
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-1 ml-auto">
          {navLinks.map(({ to, label, icon, badge }) => {
            if (to === "/notifications") {
              return (
                <div key={to} className="relative" ref={notifRef}>
                  <button
                    onClick={() => {
                      if (!notifOpen) loadNotifications();
                      setNotifOpen((o) => !o);
                    }}
                    className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      notifOpen ? "bg-brand-600/20 text-brand-400" : "text-gray-400 hover:text-white hover:bg-white/8"
                    }`}
                    title={label}
                  >
                    {icon}
                    <span className="hidden lg:block">{label}</span>
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-extrabold rounded-full px-1 shadow-lg border border-surface-900 animate-bounce-in">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
                  </button>

                  {/* Notification Dropdown Drawer */}
                  {notifOpen && (
                    <div className="fixed inset-x-2 top-16 z-[60] max-h-[70vh] overflow-hidden rounded-2xl border border-white/10 bg-surface-900/95 shadow-2xl backdrop-blur-xl sm:absolute sm:right-0 sm:inset-auto sm:mt-2 sm:w-80 sm:max-h-80">
                      <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
                        <p className="text-sm font-bold text-white">Notifications</p>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-xs text-brand-400 hover:text-brand-300 font-medium"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-[55vh] sm:max-h-80 overflow-y-auto p-2 space-y-1">
                        {notifications.length === 0 ? (
                          <p className="text-center text-xs text-gray-500 py-6">No notifications yet</p>
                        ) : (
                          notifications.slice(0, 10).map((n) => (
                            <div
                              key={n._id}
                              onClick={() => {
                                setNotifOpen(false);
                                navigate("/notifications");
                              }}
                              className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-3 ${
                                !n.read ? "bg-brand-500/10 border-l-2 border-brand-500" : "hover:bg-white/5"
                              }`}
                            >
                              <Avatar src={n.sender?.avatarUrl} name={n.sender?.displayName} username={n.sender?.username} size="sm" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-200 truncate">
                                  <span className="font-semibold text-white">{n.sender?.displayName || n.sender?.username}</span>{" "}
                                  {n.type === "like" ? "liked your post ❤️" : n.type === "comment" ? "commented on your post 💬" : "followed you 👤"}
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
                        className="w-full py-2.5 text-xs text-center text-brand-400 font-semibold border-t border-white/8 hover:bg-white/5 transition-all"
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
                className={({ isActive }) =>
                  `relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200
                   ${isActive
                     ? "bg-brand-600/20 text-brand-400"
                     : "text-gray-400 hover:text-white hover:bg-white/8"
                   }`
                }
              >
                {icon}
                <span className="hidden lg:block">{label}</span>
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-brand-500 text-white text-[10px] font-bold rounded-full px-1 animate-bounce-in">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Theme Customizer Button */}
        <div className="relative" ref={themeRef}>
          <button
            onClick={() => setThemeOpen((o) => !o)}
            className={`icon-btn text-lg transition-all ${themeOpen ? "bg-white/10 text-white" : ""}`}
            title="Theme Settings"
          >
            {isDark ? "🌙" : "☀️"}
          </button>

          {themeOpen && (
            <div className="absolute right-0 mt-2 w-60 glass-lg rounded-2xl border border-white/10 shadow-2xl z-50 p-4 space-y-4 animate-fade-in">
              <p className="text-xs font-bold text-white">Theme Settings</p>

              {/* Dark / Light Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Mode</span>
                <button
                  onClick={toggleMode}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                    isDark ? "bg-brand-600" : "bg-amber-400"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 flex items-center justify-center text-[10px] ${
                      isDark ? "translate-x-0" : "translate-x-6"
                    }`}
                  >
                    {isDark ? "🌙" : "☀️"}
                  </span>
                </button>
              </div>

              {/* Accent Colors */}
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-2">Accent Color</p>
                <div className="grid grid-cols-3 gap-2">
                  {ACCENT_THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setAccent(t.id)}
                      title={t.label}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                        accent === t.id
                          ? "border-white/30 bg-white/10"
                          : "border-transparent hover:border-white/15 hover:bg-white/5"
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-full ring-2 ring-offset-1 ring-offset-transparent transition-all"
                        style={{
                          background: t.gradient,
                          ringColor: accent === t.id ? t.color : "transparent",
                        }}
                      />
                      <span className="text-[9px] text-gray-400">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User avatar + menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-white/8 transition-all duration-200"
          >
            <Avatar
              src={user?.avatarUrl}
              name={user?.displayName}
              username={user?.username}
              size="sm"
              ring
            />
            <span className="hidden sm:block text-sm font-medium text-gray-300">
              @{user?.username}
            </span>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {menuOpen && (
            <div className="fixed inset-x-2 top-16 z-[60] rounded-2xl overflow-hidden animate-fade-in border border-white/10 bg-surface-900/95 shadow-2xl backdrop-blur-xl sm:absolute sm:right-0 sm:mt-2 sm:w-52">
              <div className="px-4 py-3 border-b border-white/8">
                <p className="text-sm font-semibold text-white">{user?.displayName || user?.username}</p>
                <p className="text-xs text-gray-500">@{user?.username}</p>
              </div>
              <div className="p-1">
                <button
                  onClick={() => { navigate(`/profile/${user?.username}`); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-white/8 hover:text-white transition-all"
                >
                  <UserIcon /> View Profile
                </button>
                {(user?.role === "admin" || user?.role === "moderator") && (
                  <button
                    onClick={() => { navigate("/admin"); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-white/8 hover:text-white transition-all"
                  >
                    🛡️ Admin Dashboard
                  </button>
                )}
                <button
                  onClick={() => { navigate("/bookmarks"); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-white/8 hover:text-white transition-all"
                >
                  <BookmarkIcon /> Bookmarks
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Message Toast Popup */}
      {toastMessage && (
        <div
          onClick={() => {
            navigate("/messages");
            setToastMessage(null);
          }}
          className="fixed bottom-5 right-5 z-50 glass-lg border border-brand-500/40 p-4 rounded-2xl shadow-2xl flex items-center gap-3 cursor-pointer hover:border-brand-400 transition-all animate-slide-up max-w-xs"
        >
          <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold flex-shrink-0">
            💬
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-brand-400">New Message</p>
            <p className="text-sm font-medium text-white truncate">
              {toastMessage.message.sender?.displayName || toastMessage.message.sender?.username || "Someone"}
            </p>
            <p className="text-xs text-gray-400 truncate">{toastMessage.message.body}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setToastMessage(null);
            }}
            className="text-gray-500 hover:text-white text-xs p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Notification Permission Request Banner */}
      {showNotifPrompt && (
        <div className="fixed bottom-5 left-5 z-50 glass-lg border border-red-500/40 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-up max-w-sm">
          <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-xl flex-shrink-0">
            🔔
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-red-400">Enable Push Notifications</p>
            <p className="text-xs text-gray-300">Get instant alerts on mobile & desktop when someone messages or likes your post!</p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={async () => {
                  if ("Notification" in window) {
                    await Notification.requestPermission();
                  }
                  setShowNotifPrompt(false);
                }}
                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white font-medium text-xs rounded-lg transition-all"
              >
                Allow
              </button>
              <button
                onClick={() => setShowNotifPrompt(false)}
                className="px-3 py-1 bg-white/10 hover:bg-white/15 text-gray-300 text-xs rounded-lg transition-all"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
