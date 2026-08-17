import { create } from "zustand";
import api from "./api";
import { useAuthStore } from "./authStore";

const updateMessage = (messages, messageId, updater) =>
  messages.map((m) => (m._id === messageId ? updater(m) : m));

export const useMessageStore = create((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  unreadCount: 0,
  loading: false,
  messagesLoading: false,

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
    set({ activeConversation: conversation, messages: [] });
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

  loadMessages: async (conversationId) => {
    set({ messagesLoading: true });
    try {
      const { data } = await api.get(`/messages/${conversationId}?limit=50`);
      set({
        messages: data.messages || [],
        messagesLoading: false,
      });
      await get().markConversationRead(conversationId);
    } catch (err) {
      console.error("Failed to load messages", err);
      set({ messagesLoading: false });
    }
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

  sendMessage: async (conversationId, body, mediaUrl = "", mediaType = "") => {
    const currentUserId = useAuthStore.getState().user?.id;
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg = {
      _id: tempId,
      conversation: conversationId,
      sender: { _id: currentUserId },
      body: body || "",
      mediaUrl: mediaUrl || "",
      mediaType: mediaType || "",
      createdAt: new Date().toISOString(),
      _optimistic: true,
    };

    set((state) => ({ messages: [...state.messages, optimisticMsg] }));

    const previewText = body?.trim() || (mediaType === "audio" ? "🎙️ Voice note" : "📷 Photo");
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c._id === conversationId
          ? { ...c, lastMessage: previewText, updatedAt: new Date().toISOString() }
          : c
      ),
    }));

    try {
      const { data } = await api.post(`/messages/${conversationId}`, { body, mediaUrl, mediaType });
      set((state) => ({
        messages: state.messages.map((m) => (m._id === tempId ? data.message : m)),
      }));
      return data.message;
    } catch (err) {
      set((state) => ({
        messages: state.messages.filter((m) => m._id !== tempId),
      }));
      throw err;
    }
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

  addIncomingMessage: (message, conversationId) => {
    const { activeConversation, unreadCount } = get();
    if (activeConversation?._id === conversationId) {
      set((state) => {
        const hasReal = state.messages.some((m) => m._id === message._id);
        if (hasReal) return {};
        const filtered = state.messages.filter(
          (m) => !(m._optimistic && m.body === message.body && String(m.sender?._id) === String(message.sender?._id))
        );
        return { messages: [...filtered, message] };
      });
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
}));
