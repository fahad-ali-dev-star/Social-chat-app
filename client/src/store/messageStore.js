import { create } from "zustand";
import api from "../api/client";

const updateMessage = (messages, messageId, updater) =>
  messages.map((m) => (m._id === messageId ? updater(m) : m));

export const useMessageStore = create((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  unreadCount: 0,
  loading: false,
  messagesLoading: false,
  hasMoreMessages: false,
  nextCursor: null,

  loadConversations: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get("/messages");
      const conversations = data.conversations || [];
      const unreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
      set({ conversations, unreadCount, loading: false });
    } catch (err) {
      console.error("Failed to load conversations", err);
      set({ loading: false });
    }
  },

  selectConversation: (conversation) => {
    set({ activeConversation: conversation, messages: [], hasMoreMessages: false, nextCursor: null });
  },

  getOrCreateConversation: async (recipientId) => {
    const { data } = await api.post("/messages/conversation", { recipientId });
    const { conversations } = get();
    const exists = conversations.find((c) => c._id === data.conversation._id);
    if (!exists) {
      set((state) => ({ conversations: [data.conversation, ...state.conversations] }));
    }
    set({ activeConversation: data.conversation });
    return data.conversation;
  },

  loadMessages: async (conversationId, before = null) => {
    set({ messagesLoading: true });
    try {
      const query = new URLSearchParams({ limit: "40" });
      if (before) query.set("before", before);
      const { data } = await api.get(`/messages/${conversationId}?${query}`);
      set((state) => ({
        messages: before ? [...data.messages, ...state.messages] : data.messages,
        hasMoreMessages: Boolean(data.hasMore),
        nextCursor: data.nextCursor || null,
        messagesLoading: false,
      }));
      if (!before) await get().markConversationRead(conversationId);
    } catch (err) {
      console.error("Failed to load messages", err);
      set({ messagesLoading: false });
    }
  },

  loadOlderMessages: async () => {
    const { activeConversation, nextCursor, hasMoreMessages, messagesLoading } = get();
    if (!activeConversation || !nextCursor || !hasMoreMessages || messagesLoading) return;
    await get().loadMessages(activeConversation._id, nextCursor);
  },

  markConversationRead: async (conversationId) => {
    try {
      await api.post(`/messages/${conversationId}/read`);
      set((state) => {
        const conversations = state.conversations.map((c) =>
          c._id === conversationId ? { ...c, unreadCount: 0 } : c
        );
        return {
          conversations,
          unreadCount: conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
        };
      });
    } catch (err) {
      console.error("Failed to mark conversation read", err);
    }
  },

  sendMessage: async (conversationId, body, mediaUrl = "", mediaType = "", replyTo = null) => {
    const { data } = await api.post(`/messages/${conversationId}`, { body, mediaUrl, mediaType, replyTo });
    set((state) => ({ messages: [...state.messages, data.message] }));
    const previewText = body?.trim() || (mediaType === "audio" ? "🎙️ Voice note" : "📷 Photo");
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c._id === conversationId
          ? { ...c, lastMessage: previewText, updatedAt: new Date().toISOString() }
          : c
      ),
    }));
    return data.message;
  },

  editMessage: async (messageId, body) => {
    const { data } = await api.patch(`/messages/message/${messageId}`, { body });
    set((state) => ({ messages: updateMessage(state.messages, messageId, () => data.message) }));
    return data.message;
  },

  deleteMessage: async (messageId) => {
    const { data } = await api.delete(`/messages/message/${messageId}`);
    set((state) => ({
      messages: updateMessage(state.messages, messageId, (m) => ({
        ...m,
        body: "",
        mediaUrl: "",
        mediaType: "",
        deletedAt: data.deletedAt,
      })),
    }));
  },

  reactToMessage: async (messageId, emoji) => {
    const { data } = await api.post(`/messages/message/${messageId}/reactions`, { emoji });
    set((state) => ({ messages: updateMessage(state.messages, messageId, (m) => ({ ...m, reactions: data.reactions })) }));
  },

  removeMessageReaction: async (messageId) => {
    const { data } = await api.delete(`/messages/message/${messageId}/reactions`);
    set((state) => ({ messages: updateMessage(state.messages, messageId, (m) => ({ ...m, reactions: data.reactions })) }));
  },

  updateConversationSettings: async (conversationId, settings) => {
    const { data } = await api.patch(`/messages/${conversationId}/settings`, settings);
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c._id === conversationId
          ? {
              ...c,
              muted: data.conversation.muted,
              archived: data.conversation.archived,
              blocked: data.conversation.blocked,
            }
          : c
      ),
      activeConversation:
        state.activeConversation?._id === conversationId
          ? { ...state.activeConversation, ...data.conversation }
          : state.activeConversation,
    }));
    return data.conversation;
  },

  addIncomingMessage: (message, conversationId) => {
    const { activeConversation, unreadCount } = get();
    if (activeConversation?._id === conversationId) {
      set((state) => ({
        messages: state.messages.some((m) => m._id === message._id)
          ? state.messages
          : [...state.messages, message],
      }));
      get().markConversationRead(conversationId);
    } else {
      set({ unreadCount: unreadCount + 1 });
    }

    set((state) => {
      const updated = state.conversations.map((c) =>
        c._id === conversationId
          ? {
              ...c,
              lastMessage: message.body || (message.mediaType === "audio" ? "🎙️ Voice note" : "📷 Photo"),
              updatedAt: new Date().toISOString(),
              unreadCount: activeConversation?._id === conversationId ? 0 : (c.unreadCount || 0) + 1,
            }
          : c
      );
      return { conversations: updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)) };
    });
  },

  markDelivered: ({ messageId, deliveredAt }) => {
    set((state) => ({
      messages: updateMessage(state.messages, messageId, (m) => ({ ...m, deliveredAt })),
    }));
  },

  markRead: ({ conversationId, readerId }) => {
    if (get().activeConversation?._id !== conversationId) return;
    set((state) => ({
      messages: state.messages.map((m) =>
        String(m.sender?._id || m.sender) !== String(readerId)
          ? { ...m, readAt: m.readAt || new Date().toISOString() }
          : m
      ),
    }));
  },

  updateIncomingMessage: (message) => {
    set((state) => ({ messages: updateMessage(state.messages, message._id, () => message) }));
  },

  deleteIncomingMessage: ({ messageId, deletedAt }) => {
    set((state) => ({
      messages: updateMessage(state.messages, messageId, (m) => ({
        ...m,
        body: "",
        mediaUrl: "",
        mediaType: "",
        deletedAt,
      })),
    }));
  },

  updateReaction: ({ messageId, reactions }) => {
    set((state) => ({ messages: updateMessage(state.messages, messageId, (m) => ({ ...m, reactions })) }));
  },
}));
