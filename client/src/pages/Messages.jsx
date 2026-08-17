import { useEffect, useState, useRef, useCallback } from "react";
import { useMessageStore } from "../store/messageStore";
import { useAuthStore } from "../store/authStore";
import Avatar from "../components/Avatar";
import api from "../api/client";
import ReportButton from "../components/ReportButton";

/* ─────────────── helpers ─────────────── */
function formatListTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatBubbleTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function groupMessages(messages) {
  // Add grouping flags: firstInGroup, lastInGroup, showTimestamp
  const result = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const senderId = String(msg.sender?._id || msg.sender?.id || msg.sender || "");
    const prevSenderId = prev ? String(prev.sender?._id || prev.sender?.id || prev.sender || "") : null;
    const nextSenderId = next ? String(next.sender?._id || next.sender?.id || next.sender || "") : null;

    const timeDiff = prev
      ? new Date(msg.createdAt) - new Date(prev.createdAt)
      : Infinity;

    const showDateDivider = timeDiff > 10 * 60 * 1000; // >10 min
    const firstInGroup = !prev || prevSenderId !== senderId || showDateDivider;
    const lastInGroup = !next || nextSenderId !== senderId ||
      (new Date(next.createdAt) - new Date(msg.createdAt) > 10 * 60 * 1000);

    result.push({ ...msg, firstInGroup, lastInGroup, showDateDivider });
  }
  return result;
}

const EMOJIS = ["❤️", "😂", "😮", "😢", "👏", "🔥"];

/* ─────────────── SVG icons ─────────────── */
const IgSend = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-6 h-6">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const IgImage = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);
const IgMic = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);
const IgEmoji = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 13s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);
const IgBack = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-6 h-6">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const IgInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const IgCamera = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);
const IgEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IgSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

/* ─────────────── main component ─────────────── */
export default function Messages() {
  const currentUser = useAuthStore((s) => s.user);
  const {
    conversations, activeConversation, messages,
    loading, messagesLoading, hasMoreMessages,
    loadConversations, selectConversation, loadMessages,
    loadOlderMessages, sendMessage, editMessage,
    deleteMessage, reactToMessage, updateConversationSettings,
  } = useMessageStore();

  const [messageText, setMessageText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [contextMenu, setContextMenu] = useState(null);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInfo, setShowInfo] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  /* online users */
  useEffect(() => {
    const h = (e) => setOnlineUserIds(e.detail || []);
    window.addEventListener("online_users_update", h);
    return () => window.removeEventListener("online_users_update", h);
  }, []);

  /* boot */
  useEffect(() => {
    loadConversations();
    useMessageStore.setState({ unreadCount: 0 });
    return () => { useMessageStore.setState({ activeConversation: null }); };
  }, []);

  /* select conversation */
  useEffect(() => {
    if (!activeConversation) return;
    loadMessages(activeConversation._id);
    setIsOtherTyping(false);
    const socket = window.__socketInstance;
    socket?.emit("join_conversation", activeConversation._id);
    const handle = (e) => {
      const d = e.detail;
      if (d.conversationId === activeConversation._id && d.userId !== currentUser?.id)
        setIsOtherTyping(d.isTyping);
    };
    window.addEventListener("user_typing_event", handle);
    return () => {
      socket?.emit("leave_conversation", activeConversation._id);
      window.removeEventListener("user_typing_event", handle);
    };
  }, [activeConversation?._id]);

  /* auto-scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOtherTyping]);

  /* close context menu on outside click */
  useEffect(() => {
    if (!contextMenu) return;
    const h = () => setContextMenu(null);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [contextMenu]);

  /* textarea auto-grow */
  const handleTextChange = useCallback((e) => {
    const val = e.target.value;
    setMessageText(val);
    const ta = textareaRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 120) + "px"; }
    if (activeConversation) {
      const socket = window.__socketInstance;
      if (socket) {
        socket.emit("typing", { conversationId: activeConversation._id, isTyping: true });
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() =>
          socket.emit("typing", { conversationId: activeConversation._id, isTyping: false }), 2000);
      }
    }
  }, [activeConversation]);

  /* image upload */
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setMediaUrl(data.url); setMediaType("image");
    } catch { alert("Image upload failed"); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  /* voice */
  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setUploading(true);
        try {
          const fd = new FormData(); fd.append("file", new File([blob], "voice.webm", { type: "audio/webm" }));
          const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
          setMediaUrl(data.url); setMediaType("audio");
        } catch { alert("Voice upload failed"); } finally { setUploading(false); }
      };
      mediaRecorderRef.current.start();
      setRecording(true);
    } catch { alert("Microphone access required"); }
  };

  const stopVoice = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
    }
  };

  /* send */
  const handleSend = async () => {
    if ((!messageText.trim() && !mediaUrl) || !activeConversation) return;
    const text = messageText.trim();
    const url = mediaUrl; const type = mediaType;
    setMessageText(""); setMediaUrl(""); setMediaType("");
    if (textareaRef.current) { textareaRef.current.style.height = "auto"; }
    try {
      await sendMessage(activeConversation._id, text, url, type, replyingTo?._id || null);
      setReplyingTo(null);
    } catch { /* noop */ }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleEdit = async (msgId) => {
    if (!editingText.trim()) return;
    try { await editMessage(msgId, editingText); setEditingMessageId(null); setEditingText(""); } catch { /* noop */ }
  };

  const handleDelete = async (msgId) => {
    if (!window.confirm("Delete this message?")) return;
    try { await deleteMessage(msgId); } catch { /* noop */ }
  };

  const handleConvSetting = async (key, value) => {
    if (!activeConversation) return;
    try { await updateConversationSettings(activeConversation._id, { [key]: value }); } catch { /* noop */ }
  };

  const getOther = (conv) => {
    const myId = String(currentUser?.id || currentUser?._id || "");
    return conv?.participants?.find((p) => String(p._id || p.id) !== myId) || conv?.participants?.[0];
  };

  const isOnline = (uid) => onlineUserIds.includes(String(uid));

  const filteredConvs = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const o = getOther(c);
    return (o?.displayName || o?.username || "").toLowerCase().includes(searchQuery.toLowerCase());
  });

  const otherUser = activeConversation ? getOther(activeConversation) : null;
  const grouped = groupMessages(messages);

  /* right-click / long-press context menu */
  const openContextMenu = (e, msg, isMe) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ msgId: msg._id, msg, isMe });
  };

  /* ───── render ───── */
  return (
    <>
      <style>{`
        /* ════ CSS variables for theming ════ */
        :root {
          --ig-bg:         #000;
          --ig-bg-card:    #1a1a1a;
          --ig-bg-hover:   #111;
          --ig-bg-alt:     #0d0d0d;
          --ig-border:     #1a1a1a;
          --ig-border-md:  #333;
          --ig-text:       #fff;
          --ig-text-sub:   #555;
          --ig-text-meta:  #888;
          --ig-bubble-in:  #262626;
          --ig-bubble-in-text: #fff;
          --ig-input-bg:   #1a1a1a;
          --ig-input-border: #333;
          --ig-input-focus: #555;
          --ig-input-ph:   #555;
          --ig-shadow:     rgba(0,0,0,0.6);
          --ig-shadow-lg:  rgba(0,0,0,0.7);
          --ig-online-border: #000;
        }
        html.light-mode {
          --ig-bg:         #fafafa;
          --ig-bg-card:    #fff;
          --ig-bg-hover:   #f2f2f2;
          --ig-bg-alt:     #f7f7f7;
          --ig-border:     #dbdbdb;
          --ig-border-md:  #dbdbdb;
          --ig-text:       #262626;
          --ig-text-sub:   #8e8e8e;
          --ig-text-meta:  #aaa;
          --ig-bubble-in:  #efefef;
          --ig-bubble-in-text: #262626;
          --ig-input-bg:   #fff;
          --ig-input-border: #dbdbdb;
          --ig-input-focus: #aaa;
          --ig-input-ph:   #aaa;
          --ig-shadow:     rgba(0,0,0,0.12);
          --ig-shadow-lg:  rgba(0,0,0,0.15);
          --ig-online-border: #fafafa;
        }

        .ig-sidebar { background: var(--ig-bg); }
        .ig-chat    { background: var(--ig-bg-card); }

        .ig-bubble-out {
          background: linear-gradient(135deg, #c13584 0%, #e1306c 35%, #f77737 70%, #fcaf45 100%);
          color: #fff;
          border-radius: 22px 22px 4px 22px;
        }
        .ig-bubble-out.tail-less { border-radius: 22px 22px 4px 22px; }
        .ig-bubble-out.first    { border-radius: 22px 22px 4px 22px; }
        .ig-bubble-out.middle   { border-radius: 22px 4px 4px 22px; }
        .ig-bubble-out.last     { border-radius: 22px 22px 4px 22px; }
        .ig-bubble-out.solo     { border-radius: 22px 22px 4px 22px; }

        .ig-bubble-in {
          background: var(--ig-bubble-in);
          color: var(--ig-bubble-in-text);
          border-radius: 22px 22px 22px 4px;
        }
        .ig-bubble-in.first  { border-radius: 22px 22px 22px 4px; }
        .ig-bubble-in.middle { border-radius: 4px 22px 22px 4px; }
        .ig-bubble-in.last   { border-radius: 4px 22px 22px 22px; }
        .ig-bubble-in.solo   { border-radius: 22px 22px 22px 4px; }

        .ig-input {
          background: var(--ig-input-bg);
          border: 1.5px solid var(--ig-input-border);
          border-radius: 24px;
          color: var(--ig-text);
          padding: 10px 16px;
          font-size: 14px;
          outline: none;
          resize: none;
          width: 100%;
          line-height: 1.4;
          min-height: 44px;
          max-height: 120px;
          transition: border-color 0.2s;
        }
        .ig-input:focus { border-color: var(--ig-input-focus); }
        .ig-input::placeholder { color: var(--ig-input-ph); }

        .ig-icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          color: var(--ig-text);
          cursor: pointer;
          background: transparent;
          border: none;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .ig-icon-btn:hover { background: var(--ig-bg-hover); }

        .ig-send-btn {
          background: transparent;
          border: none;
          color: #0095f6;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          padding: 0 4px;
          flex-shrink: 0;
          transition: opacity 0.15s;
        }
        .ig-send-btn:disabled { opacity: 0.35; cursor: default; }

        .ig-conv-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          cursor: pointer;
          transition: background 0.15s;
          position: relative;
        }
        .ig-conv-item:hover  { background: var(--ig-bg-hover); }
        .ig-conv-item.active { background: var(--ig-bg-hover); }

        .ig-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--ig-border);
          background: var(--ig-bg);
        }

        .ig-reaction-bar {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--ig-bg-card);
          border: 1px solid var(--ig-border-md);
          border-radius: 24px;
          padding: 6px 10px;
          position: absolute;
          bottom: calc(100% + 6px);
          z-index: 50;
          box-shadow: 0 4px 20px var(--ig-shadow);
        }
        .ig-reaction-bar.align-right { right: 0; }
        .ig-reaction-bar.align-left  { left: 0; }

        .ig-reaction-btn {
          font-size: 22px;
          background: none;
          border: none;
          cursor: pointer;
          border-radius: 50%;
          padding: 2px;
          transition: transform 0.15s;
          line-height: 1;
        }
        .ig-reaction-btn:hover { transform: scale(1.3); }

        .ctx-menu {
          position: fixed;
          background: var(--ig-bg-card);
          border: 1px solid var(--ig-border-md);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 32px var(--ig-shadow-lg);
          z-index: 100;
          min-width: 180px;
          animation: fadeIn 0.15s ease;
        }
        .ctx-item {
          display: block;
          width: 100%;
          text-align: left;
          padding: 13px 18px;
          background: none;
          border: none;
          color: var(--ig-text);
          font-size: 14px;
          cursor: pointer;
          transition: background 0.12s;
        }
        .ctx-item:hover { background: var(--ig-bg-hover); }
        .ctx-item.danger { color: #ff4444; }

        /* Hover action bar */
        .msg-action-bar {
          display: flex;
          align-items: center;
          gap: 2px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s;
          flex-shrink: 0;
        }
        .msg-row:hover .msg-action-bar {
          opacity: 1;
          pointer-events: auto;
        }
        .msg-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--ig-text-meta);
          font-size: 15px;
          transition: background 0.12s, color 0.12s;
        }
        .msg-action-btn:hover {
          background: var(--ig-bg-hover);
          color: var(--ig-text);
        }
        .msg-action-btn.danger:hover {
          background: rgba(255,68,68,0.15);
          color: #ff4444;
        }
        .emoji-quick-bar {
          position: absolute;
          bottom: calc(100% + 6px);
          background: var(--ig-bg-card);
          border: 1px solid var(--ig-border-md);
          border-radius: 24px;
          padding: 6px 10px;
          display: flex;
          gap: 4px;
          box-shadow: 0 4px 20px var(--ig-shadow);
          z-index: 60;
          animation: fadeIn 0.12s ease;
          white-space: nowrap;
        }

        .typing-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--ig-text-sub);
          animation: typing-bounce 1.2s infinite ease-in-out;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-5px); opacity: 1; }
        }

        .ig-scrollbar::-webkit-scrollbar { width: 0; }
        .ig-scrollbar { scrollbar-width: none; }

        .online-dot {
          position: absolute;
          bottom: 1px; right: 1px;
          width: 11px; height: 11px;
          background: #39e75f;
          border-radius: 50%;
          border: 2px solid var(--ig-online-border);
        }

        .unread-badge {
          min-width: 20px; height: 20px;
          background: #0095f6;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: #fff;
          padding: 0 5px;
        }

        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      `}</style>

      <div style={{ display: "flex", height: "calc(100svh - 56px)", overflow: "hidden", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" }}>

        {/* ══════════ SIDEBAR ══════════ */}
        <aside
          className="ig-sidebar ig-scrollbar"
          style={{
            width: "100%",
            maxWidth: activeConversation ? 0 : "100%",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid var(--ig-border)",
            overflow: "hidden",
            transition: "max-width 0.25s ease",
          }}
          // On sm+ screens always show sidebar
          id="ig-sidebar"
        >
          <style>{`
            @media (min-width: 640px) {
              #ig-sidebar {
                max-width: 360px !important;
                min-width: 280px;
                display: flex !important;
              }
              #ig-chat-pane {
                display: flex !important;
              }
            }
          `}</style>

          {/* Sidebar top */}
          <div style={{ padding: "12px 16px 8px", borderBottom: "1px solid var(--ig-border)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: "var(--ig-text)" }}>Messages</span>
              <button className="ig-icon-btn" onClick={() => {}} title="New message" style={{ width: 32, height: 32 }}>
                <IgEdit />
              </button>
            </div>
            {/* Search */}
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ig-text-sub)" }}>
                <IgSearch />
              </span>
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%", background: "var(--ig-bg-hover)", border: "none",
                  borderRadius: 10, padding: "9px 12px 9px 40px",
                  color: "var(--ig-text)", fontSize: 14, outline: "none",
                }}
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="ig-scrollbar" style={{ flex: 1, overflowY: "auto", paddingTop: 4 }}>
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="ig-conv-item">
                  <div className="skeleton" style={{ width: 56, height: 56, borderRadius: "50%", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: 13, width: "55%", marginBottom: 8, borderRadius: 6 }} />
                    <div className="skeleton" style={{ height: 11, width: "75%", borderRadius: 6 }} />
                  </div>
                </div>
              ))
            ) : filteredConvs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--ig-text-sub)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                <p style={{ fontWeight: 600, color: "var(--ig-text)", marginBottom: 4 }}>
                  {searchQuery ? "No results" : "No conversations"}
                </p>
                <p style={{ fontSize: 13 }}>
                  {searchQuery ? "Try a different name" : "Visit a profile to send a message."}
                </p>
              </div>
            ) : (
              filteredConvs.map((conv) => {
                const other = getOther(conv);
                const isActive = activeConversation?._id === conv._id;
                const online = isOnline(other?._id);
                const unread = conv.unreadCount > 0;
                return (
                  <div
                    key={conv._id}
                    className={`ig-conv-item${isActive ? " active" : ""}`}
                    onClick={() => selectConversation(conv)}
                  >
                    {/* Avatar */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{
                        width: 56, height: 56, borderRadius: "50%", overflow: "hidden",
                        background: "linear-gradient(135deg,#c13584,#e1306c,#f77737)",
                        padding: 2, flexShrink: 0,
                      }}>
                        <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "var(--ig-bg)" }}>
                          <Avatar src={other?.avatarUrl} name={other?.displayName} username={other?.username} size="md" />
                        </div>
                      </div>
                      {online && <span className="online-dot" />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                        <span style={{ fontWeight: unread ? 700 : 500, fontSize: 14, color: "var(--ig-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {other?.displayName || other?.username}
                        </span>
                        <span style={{ fontSize: 11, color: unread ? "#0095f6" : "var(--ig-text-sub)", flexShrink: 0, fontWeight: unread ? 600 : 400 }}>
                          {formatListTime(conv.updatedAt)}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2, gap: 6 }}>
                        <span style={{ fontSize: 13, color: unread ? "var(--ig-text)" : "var(--ig-text-sub)", fontWeight: unread ? 500 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {conv.lastMessage || "Start a conversation"}
                        </span>
                        {unread && (
                          <span className="unread-badge">{conv.unreadCount > 9 ? "9+" : conv.unreadCount}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ══════════ CHAT PANE ══════════ */}
        <main
          id="ig-chat-pane"
          className="ig-chat"
          style={{
            flex: 1, minWidth: 0, display: activeConversation ? "flex" : "none",
            flexDirection: "column", overflow: "hidden",
          }}
        >
          {!activeConversation ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32 }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", border: "2px solid var(--ig-border-md)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>💬</div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontWeight: 600, color: "var(--ig-text)", fontSize: 16, marginBottom: 6 }}>Your messages</p>
                <p style={{ color: "var(--ig-text-sub)", fontSize: 14 }}>Send private messages to a friend.</p>
              </div>
            </div>
          ) : (
            <>
              {/* ── Chat header ── */}
              <div className="ig-header">
                {/* Mobile back */}
                <button
                  className="ig-icon-btn"
                  onClick={() => selectConversation(null)}
                  style={{ display: "none" }}
                  id="ig-back-btn"
                >
                  <IgBack />
                </button>
                <style>{`
                  @media (max-width: 639px) { #ig-back-btn { display: flex !important; } }
                `}</style>

                {/* Avatar */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: "50%", overflow: "hidden",
                    background: "linear-gradient(135deg,#c13584,#e1306c,#f77737)",
                    padding: 2,
                  }}>
                    <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "var(--ig-bg)" }}>
                      <Avatar src={otherUser?.avatarUrl} name={otherUser?.displayName} username={otherUser?.username} size="sm" />
                    </div>
                  </div>
                  {isOnline(otherUser?._id) && <span className="online-dot" />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "var(--ig-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {otherUser?.displayName || otherUser?.username}
                  </p>
                  <p style={{ fontSize: 12, color: isOtherTyping ? "#0095f6" : isOnline(otherUser?._id) ? "#39e75f" : "var(--ig-text-sub)", marginTop: 1 }}>
                    {isOtherTyping ? "typing…" : isOnline(otherUser?._id) ? "Active now" : `@${otherUser?.username}`}
                  </p>
                </div>

                {/* Header actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button
                    className="ig-icon-btn"
                    title={activeConversation.muted ? "Unmute" : "Mute"}
                    onClick={() => handleConvSetting("muted", !activeConversation.muted)}
                    style={{ color: activeConversation.muted ? "#0095f6" : "var(--ig-text)" }}
                  >
                    {activeConversation.muted ? "🔕" : "🔔"}
                  </button>
                  <button className="ig-icon-btn" onClick={() => setShowInfo((v) => !v)} title="Info">
                    <IgInfo />
                  </button>
                </div>
              </div>

              {/* ── Message thread ── */}
              <div className="ig-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "12px 12px 4px", display: "flex", flexDirection: "column", gap: 2 }}>

                {messagesLoading ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 28, height: 28, border: "2.5px solid #0095f6", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 32, textAlign: "center" }}>
                    <div style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", background: "linear-gradient(135deg,#c13584,#e1306c,#f77737)", padding: 3 }}>
                      <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "var(--ig-bg)" }}>
                        <Avatar src={otherUser?.avatarUrl} name={otherUser?.displayName} username={otherUser?.username} size="xl" />
                      </div>
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, color: "var(--ig-text)", fontSize: 15 }}>{otherUser?.displayName || otherUser?.username}</p>
                      <p style={{ color: "var(--ig-text-sub)", fontSize: 13, marginTop: 4 }}>@{otherUser?.username}</p>
                    </div>
                    <p style={{ color: "var(--ig-text-sub)", fontSize: 14, marginTop: 8 }}>Send a message to start a conversation 👋</p>
                  </div>
                ) : (
                  <>
                    {hasMoreMessages && (
                      <div style={{ textAlign: "center", padding: "8px 0 12px" }}>
                        <button
                          onClick={loadOlderMessages}
                          disabled={messagesLoading}
                          style={{ background: "none", border: "none", color: "#0095f6", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
                        >
                          Load earlier messages
                        </button>
                      </div>
                    )}

                    {grouped.map((msg) => {
                      const myId = String(currentUser?.id || currentUser?._id || "");
                      const senderId = String(msg.sender?._id || msg.sender?.id || msg.sender || "");
                      const isMe = Boolean(myId && senderId === myId);
                      const isDeleted = !!msg.deletedAt;

                      // bubble shape class
                      let shapeClass = "";
                      if (msg.firstInGroup && msg.lastInGroup) shapeClass = "solo";
                      else if (msg.firstInGroup) shapeClass = "first";
                      else if (msg.lastInGroup) shapeClass = "last";
                      else shapeClass = "middle";

                      return (
                        <div key={msg._id}>
                          {/* Date divider */}
                          {msg.showDateDivider && (
                            <div style={{ textAlign: "center", padding: "16px 0 8px", color: "var(--ig-text-sub)", fontSize: 12 }}>
                              {formatBubbleTime(msg.createdAt)}
                            </div>
                          )}

                          {/* Sender name for incoming (first in group) */}
                          {!isMe && msg.firstInGroup && (
                            <div style={{ fontSize: 12, color: "var(--ig-text-sub)", marginLeft: 48, marginBottom: 2 }}>
                              {msg.sender?.displayName || msg.sender?.username}
                            </div>
                          )}

                          <div
                            className="msg-row"
                            style={{
                              display: "flex",
                              alignItems: "flex-end",
                              gap: 6,
                              flexDirection: isMe ? "row-reverse" : "row",
                              marginBottom: msg.lastInGroup ? 4 : 1,
                              position: "relative",
                            }}
                            onMouseEnter={() => !isDeleted && setHoveredMsgId(msg._id)}
                            onMouseLeave={() => { setHoveredMsgId(null); setEmojiPickerMsgId(null); }}
                          >
                            {/* Incoming avatar (last in group only) */}
                            <div style={{ width: 32, flexShrink: 0, alignSelf: "flex-end" }}>
                              {!isMe && msg.lastInGroup && (
                                <div style={{ width: 30, height: 30, borderRadius: "50%", overflow: "hidden", background: "var(--ig-bg-card)" }}>
                                  <Avatar src={msg.sender?.avatarUrl} name={msg.sender?.displayName} username={msg.sender?.username} size="xs" />
                                </div>
                              )}
                            </div>

                            {/* Bubble column */}
                            <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", gap: 1 }}>

                              {/* Reply preview */}
                              {msg.replyTo && !isDeleted && (
                                <div style={{
                                  fontSize: 12, color: "var(--ig-text-meta)", borderLeft: "3px solid #0095f6",
                                  paddingLeft: 8, marginBottom: 4, maxWidth: "100%", background: "var(--ig-bg-hover)",
                                  borderRadius: 8, padding: "4px 10px",
                                }}>
                                  <span style={{ color: "#0095f6", fontWeight: 600 }}>
                                    {msg.replyTo.sender?.displayName || msg.replyTo.sender?.username}
                                  </span>
                                  <span style={{ marginLeft: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                                    {msg.replyTo.body || "📎 attachment"}
                                  </span>
                                </div>
                              )}

                              {/* Edit mode */}
                              {editingMessageId === msg._id ? (
                                <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
                                  <input
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleEdit(msg._id)}
                                    style={{
                                      flex: 1, background: "var(--ig-input-bg)", border: "1px solid #0095f6",
                                      borderRadius: 20, padding: "8px 14px", color: "var(--ig-text)", fontSize: 14, outline: "none",
                                    }}
                                    autoFocus
                                  />
                                  <button onClick={() => handleEdit(msg._id)} style={{ color: "#0095f6", fontWeight: 700, fontSize: 14, background: "none", border: "none", cursor: "pointer" }}>Save</button>
                                  <button onClick={() => setEditingMessageId(null)} style={{ color: "var(--ig-text-sub)", fontSize: 14, background: "none", border: "none", cursor: "pointer" }}>✕</button>
                                </div>
                              ) : (
                                <div
                                  style={{ position: "relative" }}
                                  onContextMenu={(e) => !isDeleted && openContextMenu(e, msg, isMe)}
                                >
                                  {/* Main bubble */}
                                  <div
                                    className={`${isMe ? "ig-bubble-out" : "ig-bubble-in"} ${shapeClass}`}
                                    style={{
                                      padding: isDeleted ? "10px 14px" : "10px 14px",
                                      fontSize: 14, lineHeight: 1.45, wordBreak: "break-word",
                                      maxWidth: "100%", cursor: "pointer",
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {/* Image */}
                                    {msg.mediaUrl && msg.mediaType === "image" && !isDeleted && (
                                      <img
                                        src={msg.mediaUrl}
                                        alt="attachment"
                                        style={{ borderRadius: 12, maxHeight: 240, width: "100%", objectFit: "cover", marginBottom: msg.body ? 8 : 0, cursor: "pointer" }}
                                        onClick={() => window.open(msg.mediaUrl, "_blank")}
                                      />
                                    )}
                                    {/* Audio */}
                                    {msg.mediaUrl && msg.mediaType === "audio" && !isDeleted && (
                                      <audio controls src={msg.mediaUrl} style={{ maxWidth: 200, height: 36, borderRadius: 8, marginBottom: msg.body ? 6 : 0 }} />
                                    )}
                                    {/* Text */}
                                    {isDeleted ? (
                                      <span style={{ fontStyle: "italic", opacity: 0.5 }}>Message deleted</span>
                                    ) : (
                                      msg.body && <span>{msg.body}</span>
                                    )}
                                  </div>

                                  {/* Reactions row */}
                                  {msg.reactions?.length > 0 && !isDeleted && (
                                    <div style={{ display: "flex", gap: 3, marginTop: 3, justifyContent: isMe ? "flex-end" : "flex-start", flexWrap: "wrap" }}>
                                      {msg.reactions.map((r, i) => (
                                        <span key={`${r.user}-${i}`} style={{
                                          background: "var(--ig-bg-card)", border: "1px solid var(--ig-border-md)",
                                          borderRadius: 20, padding: "2px 7px", fontSize: 13,
                                        }}>{r.emoji}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Timestamp (last in group only) */}
                              {msg.lastInGroup && !isDeleted && (
                                <div style={{
                                  display: "flex", alignItems: "center", gap: 4,
                                  fontSize: 11, color: "var(--ig-text-sub)", paddingTop: 2,
                                  justifyContent: isMe ? "flex-end" : "flex-start",
                                  paddingLeft: isMe ? 0 : 4,
                                }}>
                                  <span>{formatBubbleTime(msg.createdAt)}</span>
                                  {isMe && (
                                    <span style={{ color: msg.readAt ? "#0095f6" : "var(--ig-text-sub)", fontWeight: 600 }}>
                                      {msg.readAt ? "✓✓" : msg.deliveredAt ? "✓✓" : "✓"}
                                    </span>
                                  )}
                                  {msg.editedAt && <span>• edited</span>}
                                </div>
                              )}
                            </div>

                            {/* ── Hover action bar ── */}
                            {!isDeleted && (
                              <div className="msg-action-bar" style={{ flexDirection: "column", gap: 2, alignSelf: "center", position: "relative" }}>
                                {/* Emoji react */}
                                <div style={{ position: "relative" }}>
                                  <button
                                    className="msg-action-btn"
                                    title="React"
                                    onClick={(e) => { e.stopPropagation(); setEmojiPickerMsgId(emojiPickerMsgId === msg._id ? null : msg._id); }}
                                  >
                                    😊
                                  </button>
                                  {emojiPickerMsgId === msg._id && (
                                    <div
                                      className="emoji-quick-bar"
                                      style={{ [isMe ? "right" : "left"]: 0 }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {EMOJIS.map((em) => (
                                        <button
                                          key={em}
                                          onClick={() => { reactToMessage(msg._id, em); setEmojiPickerMsgId(null); }}
                                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, padding: "0 2px", transition: "transform 0.12s", lineHeight: 1 }}
                                          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.3)"}
                                          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                                        >{em}</button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {/* Reply */}
                                <button
                                  className="msg-action-btn"
                                  title="Reply"
                                  onClick={() => setReplyingTo(msg)}
                                >
                                  ↩
                                </button>
                                {/* Edit (own only) */}
                                {isMe && (
                                  <button
                                    className="msg-action-btn"
                                    title="Edit message"
                                    onClick={() => { setEditingMessageId(msg._id); setEditingText(msg.body || ""); }}
                                  >
                                    ✏️
                                  </button>
                                )}
                                {/* Delete (own only) */}
                                {isMe && (
                                  <button
                                    className="msg-action-btn danger"
                                    title="Delete message"
                                    onClick={() => handleDelete(msg._id)}
                                  >
                                    🗑
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Spacer on other side */}
                            {isMe && <div style={{ width: 32, flexShrink: 0 }} />}
                          </div>
                        </div>
                      );
                    })}

                    {/* Typing indicator */}
                    {isOtherTyping && (
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginTop: 4 }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", overflow: "hidden", background: "var(--ig-bg-card)", flexShrink: 0 }}>
                          <Avatar src={otherUser?.avatarUrl} name={otherUser?.displayName} username={otherUser?.username} size="xs" />
                        </div>
                        <div className="ig-bubble-in solo" style={{ padding: "10px 16px", display: "flex", gap: 4, alignItems: "center" }}>
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* ── Reply strip ── */}
              {replyingTo && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 16px",
                  borderTop: "1px solid var(--ig-border)", background: "var(--ig-bg-alt)",
                }}>
                  <div style={{ width: 3, height: 36, background: "#0095f6", borderRadius: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, color: "#0095f6", fontWeight: 600, marginBottom: 2 }}>
                      Replying to {replyingTo.sender?.displayName || replyingTo.sender?.username}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--ig-text-sub)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {replyingTo.body || "📎 attachment"}
                    </p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} style={{ background: "none", border: "none", color: "var(--ig-text-sub)", cursor: "pointer", fontSize: 18, padding: 4 }}>✕</button>
                </div>
              )}

              {/* ── Media preview ── */}
              {(mediaUrl || uploading) && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", borderTop: "1px solid var(--ig-border)", background: "var(--ig-bg-alt)" }}>
                  {uploading ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#0095f6", fontSize: 13 }}>
                      <div style={{ width: 16, height: 16, border: "2px solid #0095f6", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      Uploading…
                    </div>
                  ) : mediaType === "image" ? (
                    <div style={{ position: "relative" }}>
                      <img src={mediaUrl} alt="preview" style={{ width: 60, height: 60, borderRadius: 12, objectFit: "cover", border: "2px solid var(--ig-border-md)" }} />
                      <button
                        onClick={() => { setMediaUrl(""); setMediaType(""); }}
                        style={{
                          position: "absolute", top: -6, right: -6, width: 20, height: 20,
                          background: "var(--ig-bg)", border: "1px solid var(--ig-border-md)", borderRadius: "50%",
                          color: "var(--ig-text)", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >✕</button>
                    </div>
                  ) : mediaType === "audio" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--ig-bg-card)", borderRadius: 20, padding: "6px 14px", fontSize: 13, color: "#0095f6" }}>
                      🎙️ <span>Voice note ready</span>
                      <button onClick={() => { setMediaUrl(""); setMediaType(""); }} style={{ background: "none", border: "none", color: "var(--ig-text-sub)", cursor: "pointer", marginLeft: 4 }}>✕</button>
                    </div>
                  ) : null}
                </div>
              )}

              {/* ── Input bar ── */}
              <div style={{
                display: "flex", alignItems: "flex-end", gap: 10,
                padding: "10px 12px 12px", borderTop: "1px solid var(--ig-border)", background: "var(--ig-bg)",
              }}>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileSelect} />

                {/* Emoji btn (decorative - opens camera or emoji) */}
                <button className="ig-icon-btn" onClick={() => fileInputRef.current?.click()} title="Attach image" disabled={uploading || recording}>
                  <IgImage />
                </button>

                <button
                  className="ig-icon-btn"
                  onClick={recording ? stopVoice : startVoice}
                  disabled={uploading}
                  style={{ color: recording ? "#e1306c" : "var(--ig-text)" }}
                  title={recording ? "Stop recording" : "Voice note"}
                >
                  <IgMic />
                </button>

                {/* Text input */}
                <textarea
                  ref={textareaRef}
                  rows={1}
                  className="ig-input"
                  value={messageText}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  placeholder={recording ? "🔴 Recording…" : "Message…"}
                  disabled={recording}
                />

                {/* Send or camera */}
                {messageText.trim() || mediaUrl ? (
                  <button className="ig-send-btn" onClick={handleSend} disabled={uploading}>
                    Send
                  </button>
                ) : (
                  <button className="ig-icon-btn" title="Camera" onClick={() => fileInputRef.current?.click()}>
                    <IgCamera />
                  </button>
                )}
              </div>
            </>
          )}
        </main>

        {/* ══════ CONTEXT MENU ══════ */}
        {contextMenu && (
          <div
            className="ctx-menu"
            style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick reactions */}
            <div style={{ display: "flex", gap: 6, padding: "12px 14px", borderBottom: "1px solid var(--ig-border-md)" }}>
              {EMOJIS.map((em) => (
                <button
                  key={em}
                  className="ig-reaction-btn"
                  onClick={() => { reactToMessage(contextMenu.msgId, em); setContextMenu(null); }}
                >
                  {em}
                </button>
              ))}
            </div>
            <button className="ctx-item" onClick={() => { setReplyingTo(contextMenu.msg); setContextMenu(null); }}>↩ Reply</button>
            {contextMenu.isMe && (
              <>
                <button className="ctx-item" onClick={() => { setEditingMessageId(contextMenu.msgId); setEditingText(contextMenu.msg.body || ""); setContextMenu(null); }}>✏️ Edit</button>
                <button className="ctx-item danger" onClick={() => { handleDelete(contextMenu.msgId); setContextMenu(null); }}>🗑 Delete</button>
              </>
            )}
            {!contextMenu.isMe && (
              <div className="ctx-item" style={{ padding: 0 }}>
                <ReportButton targetType="message" targetId={contextMenu.msgId} />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
