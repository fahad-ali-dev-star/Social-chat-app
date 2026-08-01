import { useEffect, useState, useRef } from "react";
import { useMessageStore } from "../store/messageStore";
import { useAuthStore } from "../store/authStore";
import Avatar from "../components/Avatar";
import api from "../api/client";
import ReportButton from "../components/ReportButton";

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Messages() {
  const currentUser = useAuthStore((s) => s.user);
  const {
    conversations,
    activeConversation,
    messages,
    loading,
    messagesLoading,
    hasMoreMessages,
    loadConversations,
    selectConversation,
    loadMessages,
    loadOlderMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
    updateConversationSettings,
  } = useMessageStore();

  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const typingTimeoutRef = useRef(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Subscribe to online users list
  useEffect(() => {
    const handleOnline = (e) => setOnlineUserIds(e.detail || []);
    window.addEventListener("online_users_update", handleOnline);
    return () => window.removeEventListener("online_users_update", handleOnline);
  }, []);

  useEffect(() => {
    loadConversations();
    useMessageStore.setState({ unreadCount: 0 });
  }, []);

  // Join conversation socket room & listen for typing events
  useEffect(() => {
    if (!activeConversation) return;

    loadMessages(activeConversation._id);
    setIsOtherTyping(false);

    // Get socket instance from App
    const socket = window.__socketInstance || null;
    socket?.emit("join_conversation", activeConversation._id);

    // Dispatch typing socket events
    const handleUserTyping = (data) => {
      if (data.conversationId === activeConversation._id && data.userId !== currentUser?.id) {
        setIsOtherTyping(data.isTyping);
      }
    };

    const typingHandler = (e) => handleUserTyping(e.detail);
    window.addEventListener("user_typing_event", typingHandler);

    return () => {
      socket?.emit("leave_conversation", activeConversation._id);
      window.removeEventListener("user_typing_event", typingHandler);
      setIsOtherTyping(false);
    };
  }, [activeConversation?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMediaUrl(data.url);
      setMediaType("image");
    } catch (err) {
      console.error("Failed to upload image", err);
      alert("Image upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], "voicenote.webm", { type: "audio/webm" });

        setUploading(true);
        try {
          const formData = new FormData();
          formData.append("file", audioFile);
          const { data } = await api.post("/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          setMediaUrl(data.url);
          setMediaType("audio");
        } catch (err) {
          console.error("Voice recording upload failed", err);
          alert("Failed to save voice note");
        } finally {
          setUploading(false);
        }
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      console.error("Microphone access denied", err);
      alert("Microphone access required to record voice notes");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setRecording(false);
    }
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setMessageText(val);

    if (activeConversation) {
      const socket = window.__socketInstance;
      if (socket) {
        socket.emit("typing", {
          conversationId: activeConversation._id,
          isTyping: true,
        });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit("typing", {
            conversationId: activeConversation._id,
            isTyping: false,
          });
        }, 2000);
      }
    }
  };

  const handleEdit = async (messageId) => {
    if (!editingText.trim()) return;
    try {
      await editMessage(messageId, editingText);
      setEditingMessageId(null);
      setEditingText("");
    } catch (err) {
      console.error("Failed to edit message", err);
    }
  };

  const handleDelete = async (messageId) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      await deleteMessage(messageId);
    } catch (err) {
      console.error("Failed to delete message", err);
    }
  };

  const toggleReaction = async (messageId, emoji) => {
    try {
      await reactToMessage(messageId, emoji);
    } catch (err) {
      console.error("Failed to react to message", err);
    }
  };

  const handleConversationSetting = async (key, value) => {
    if (!activeConversation) return;
    try {
      await updateConversationSettings(activeConversation._id, { [key]: value });
    } catch (err) {
      console.error("Failed to update conversation", err);
    }
  };

  const handleSend = async () => {
    if ((!messageText.trim() && !mediaUrl) || !activeConversation) return;
    const text = messageText.trim();
    const url = mediaUrl;
    const type = mediaType;

    // Clear input instantly for snappy feel
    setMessageText("");
    setMediaUrl("");
    setMediaType("");

    try {
      await sendMessage(activeConversation._id, text, url, type, replyingTo?._id || null);
      setReplyingTo(null);
    } catch {
      // Optimistic message is already removed by the store on failure
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getOtherParticipant = (conversation) => {
    return conversation.participants?.find((p) => p._id !== currentUser?.id) || conversation.participants?.[0];
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <h1 className="text-xl font-bold text-white mb-3 sm:mb-4">Messages</h1>
      <div className="glass rounded-2xl overflow-hidden flex flex-col lg:flex-row" style={{ minHeight: "calc(100vh - 140px)" }}>
        {/* Conversations Sidebar */}
        <div className={`w-full lg:w-80 lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-white/8 flex-col ${
          activeConversation ? "hidden lg:flex" : "flex"
        }`}>
          <div className="p-4 border-b border-white/8">
            <p className="text-sm font-semibold text-gray-400">Conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10">
                <svg className="w-5 h-5 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-3xl mb-2">💬</div>
                <p className="text-gray-500 text-sm">No conversations yet.</p>
                <p className="text-gray-600 text-xs mt-1">Visit a user's profile to start a DM.</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const other = getOtherParticipant(conv);
                const isActive = activeConversation?._id === conv._id;
                return (
                  <button
                    key={conv._id}
                    onClick={() => selectConversation(conv)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all text-left ${
                      isActive ? "bg-brand-600/10 border-l-2 border-brand-500" : ""
                    }`}
                  >
                    <Avatar
                      src={other?.avatarUrl}
                      name={other?.displayName}
                      username={other?.username}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {other?.displayName || other?.username}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {conv.lastMessage || "No messages yet"}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-600 flex-shrink-0">
                      {formatTime(conv.updatedAt)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex-col ${activeConversation ? "flex" : "hidden lg:flex"} min-h-[50vh]`}>
          {!activeConversation ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
              <div className="text-5xl mb-4">💬</div>
              <p className="text-gray-400 font-medium">Select a conversation</p>
              <p className="text-gray-600 text-sm mt-1">
                Or go to a user's profile and click "Message".
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-4 border-b border-white/8">
                <button
                  onClick={() => selectConversation(null)}
                  className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/8 mr-1"
                  title="Back to conversations"
                >
                  ←
                </button>
                {(() => {
                  const other = getOtherParticipant(activeConversation);
                  return (
                    <>
                      <Avatar src={other?.avatarUrl} name={other?.displayName} username={other?.username} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{other?.displayName || other?.username}</p>
                        <p className="text-xs text-gray-500 truncate">@{other?.username}</p>
                      </div>
                    </>
                  );
                })()}
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => handleConversationSetting("muted", !activeConversation.muted)}
                    className={`p-2 rounded-lg text-xs ${activeConversation.muted ? "bg-brand-500/20 text-brand-300" : "text-gray-500 hover:text-white"}`}
                    title={activeConversation.muted ? "Unmute" : "Mute"}
                  >🔕</button>
                  <button
                    onClick={() => handleConversationSetting("archived", !activeConversation.archived)}
                    className="p-2 rounded-lg text-xs text-gray-500 hover:text-white"
                    title={activeConversation.archived ? "Unarchive" : "Archive"}
                  >🗃️</button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-3 sm:py-4 space-y-3">
                {messagesLoading ? (
                  <div className="flex justify-center py-8">
                    <svg className="w-5 h-5 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-gray-600 text-sm py-8">No messages yet. Say hi! 👋</p>
                ) : (
                  <>
                  {hasMoreMessages && (
                    <div className="flex justify-center pb-2">
                      <button
                        onClick={loadOlderMessages}
                        disabled={messagesLoading}
                        className="text-xs text-brand-400 hover:text-brand-300 disabled:opacity-50"
                      >
                        Load older messages
                      </button>
                    </div>
                  )}
                  {messages.map((msg) => {
                    const isMe = msg.sender?._id === currentUser?.id || msg.sender === currentUser?.id;
                    return (
                      <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        {!isMe && (
                          <Avatar
                            src={msg.sender?.avatarUrl}
                            name={msg.sender?.displayName}
                            username={msg.sender?.username}
                            size="sm"
                            className="mr-2 flex-shrink-0 self-end"
                          />
                        )}
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isMe
                              ? "bg-brand-600 text-white rounded-br-sm"
                              : "bg-white/8 text-gray-200 rounded-bl-sm"
                          }`}
                        >
                          {/* Image Attachment */}
                          {msg.mediaUrl && msg.mediaType === "image" && (
                            <img
                              src={msg.mediaUrl}
                              alt="Attachment"
                              className="rounded-xl max-h-60 object-cover w-full mb-2 border border-white/10"
                            />
                          )}

                          {/* Audio Voice Note */}
                          {msg.mediaUrl && msg.mediaType === "audio" && (
                            <audio
                              controls
                              src={msg.mediaUrl}
                              className="my-1 max-w-full rounded-lg"
                            />
                          )}

                          {msg.replyTo && (
                            <div className="mb-2 px-2 py-1 rounded-lg bg-black/10 text-[11px] opacity-70 border-l-2 border-white/30">
                              Replying to {msg.replyTo.sender?.displayName || msg.replyTo.sender?.username}:{" "}
                              {msg.replyTo.body || "attachment"}
                            </div>
                          )}

                          {editingMessageId === msg._id ? (
                            <div className="flex gap-2">
                              <input
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleEdit(msg._id)}
                                className="flex-1 bg-black/20 rounded-lg px-2 py-1 text-sm outline-none"
                                autoFocus
                              />
                              <button onClick={() => handleEdit(msg._id)} className="text-xs">Save</button>
                              <button onClick={() => setEditingMessageId(null)} className="text-xs opacity-60">Cancel</button>
                            </div>
                          ) : msg.deletedAt ? (
                            <p className="italic opacity-50">Message deleted</p>
                          ) : (
                            <>
                              {msg.body && <p className="whitespace-pre-wrap break-words">{msg.body}</p>}
                              <div className="flex items-center gap-2 mt-1">
                                <button
                                  onClick={() => setReplyingTo(msg)}
                                  className="text-[10px] opacity-50 hover:opacity-100"
                                  title="Reply"
                                >↩ Reply</button>
                                <button
                                  onClick={() => toggleReaction(msg._id, "❤️")}
                                  className="text-[10px] opacity-50 hover:opacity-100"
                                  title="React"
                                >❤️</button>
                                {!isMe && <ReportButton targetType="message" targetId={msg._id} />}
                                {isMe && (
                                  <>
                                    <button
                                      onClick={() => { setEditingMessageId(msg._id); setEditingText(msg.body || ""); }}
                                      className="text-[10px] opacity-50 hover:opacity-100"
                                    >Edit</button>
                                    <button
                                      onClick={() => handleDelete(msg._id)}
                                      className="text-[10px] opacity-50 hover:opacity-100"
                                    >Delete</button>
                                  </>
                                )}
                              </div>
                            </>
                          )}

                          {msg.reactions?.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {msg.reactions.map((r, i) => <span key={`${r.user}-${i}`} className="text-xs bg-black/10 rounded-full px-1.5 py-0.5">{r.emoji}</span>)}
                            </div>
                          )}

                          <p className={`text-[10px] mt-1 ${isMe ? "text-white/50" : "text-gray-600"}`}>
                            {formatTime(msg.createdAt)}
                            {isMe && !msg.deletedAt && (
                              <span className="ml-1">
                                {msg.readAt ? "✓✓ Read" : msg.deliveredAt ? "✓✓ Delivered" : "✓ Sent"}
                              </span>
                            )}
                            {msg.editedAt && <span className="ml-1">edited</span>}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {replyingTo && (
                <div className="px-5 pt-2 flex items-center justify-between">
                  <div className="text-xs text-gray-400 border-l-2 border-brand-500 pl-2">
                    Replying to {replyingTo.sender?.displayName || replyingTo.sender?.username}: {replyingTo.body || "attachment"}
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-white">✕</button>
                </div>
              )}

              {/* Media Preview before send */}
              {(mediaUrl || uploading) && (
                <div className="px-5 pt-2 flex items-center gap-3">
                  {uploading ? (
                    <span className="text-xs text-brand-400 animate-pulse">Uploading attachment…</span>
                  ) : mediaType === "image" ? (
                    <div className="relative">
                      <img src={mediaUrl} alt="Preview" className="w-16 h-16 rounded-lg object-cover border border-white/20" />
                      <button onClick={() => setMediaUrl("")} className="absolute -top-1 -right-1 bg-black/80 rounded-full text-white text-xs w-4 h-4 flex items-center justify-center">✕</button>
                    </div>
                  ) : mediaType === "audio" ? (
                    <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl text-xs text-white">
                      <span>🎙️ Voice Note Ready</span>
                      <button onClick={() => setMediaUrl("")} className="text-red-400 font-bold ml-2">✕</button>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Input */}
              <div className="px-3 sm:px-5 py-3 sm:py-4 border-t border-white/8">
                <div className="flex items-center gap-2">
                  {/* Image Attachment Button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || recording}
                    className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/8 transition-all disabled:opacity-40"
                    title="Attach Image"
                  >
                    📷
                  </button>

                  {/* Voice Note Button */}
                  <button
                    onClick={recording ? stopVoiceRecording : startVoiceRecording}
                    disabled={uploading}
                    className={`p-2.5 rounded-xl transition-all ${
                      recording
                        ? "bg-red-500 text-white animate-pulse"
                        : "text-gray-400 hover:text-white hover:bg-white/8"
                    }`}
                    title={recording ? "Stop Recording" : "Record Voice Note"}
                  >
                    🎙️
                  </button>

                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={messageText}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    placeholder={recording ? "Recording audio..." : "Type a message…"}
                    disabled={recording}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500/50 resize-none transition-all"
                    style={{ minHeight: "42px", maxHeight: "120px" }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={(!messageText.trim() && !mediaUrl) || uploading}
                    className="btn-brand px-3 sm:px-4 py-2 sm:py-2.5 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                    title="Send message"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
