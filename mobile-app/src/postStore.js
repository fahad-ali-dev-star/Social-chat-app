import { create } from "zustand";
import api from "./api";
import { useAuthStore } from "./authStore";

export const usePostStore = create((set, get) => ({
  posts: [],
  loading: false,
  page: 1,
  hasMore: true,
  bookmarkedIds: new Set(),
  storyViewerOpen: false,
  setStoryViewerOpen: (open) => set({ storyViewerOpen: open }),

  loadFeed: async (reset = false, filter = "all", mediaType = "") => {
    const { page, loading, hasMore } = get();
    if (loading || (!reset && !hasMore)) return;

    const nextPage = reset ? 1 : page;
    set({ loading: true });

    try {
      const { data } = await api.get(
        `/posts?page=${nextPage}&limit=15&filter=${filter}&mediaType=${mediaType}`
      );
      const fetchedPosts = Array.isArray(data.posts) ? data.posts : [];
      set((state) => ({
        posts: reset ? fetchedPosts : [...(Array.isArray(state.posts) ? state.posts : []), ...fetchedPosts],
        page: nextPage + 1,
        hasMore: data.hasMore ?? false,
        loading: false,
      }));
      return fetchedPosts;
    } catch (err) {
      console.error("Failed to load feed", err);
      set({ loading: false });
      return [];
    }
  },

  createPost: async (content, mediaUrl = "", mediaUrls = [], mediaType = "image", visibility = "public", mediaFit = "cover") => {
    const user = useAuthStore.getState().user;
    const tempId = `temp_${Date.now()}`;
    const optimisticPost = {
      _id: tempId,
      author: { _id: user?.id, username: user?.username, displayName: user?.displayName, avatarUrl: user?.avatarUrl || "" },
      content,
      mediaUrl: mediaUrls[0] || mediaUrl || "",
      mediaUrls: mediaUrls.length ? mediaUrls : mediaUrl ? [mediaUrl] : [],
      mediaType,
      visibility,
      mediaFit,
      likes: [],
      likesCount: 0,
      _liked: false,
      commentCount: 0,
      hashtags: [],
      mentions: [],
      isPinned: false,
      isEdited: false,
      createdAt: new Date().toISOString(),
      _optimistic: true,
    };

    set((state) => ({
      posts: [optimisticPost, ...(Array.isArray(state.posts) ? state.posts : [])],
    }));

    try {
      const { data } = await api.post("/posts", { content, mediaUrl, mediaUrls, mediaType, visibility, mediaFit });
      set((state) => ({
        posts: state.posts.map((p) => (p._id === tempId ? data.post : p)),
      }));
      return data.post;
    } catch (err) {
      set((state) => ({
        posts: state.posts.filter((p) => p._id !== tempId),
      }));
      throw err;
    }
  },

  toggleLike: async (postId) => {
    set((state) => ({
      posts: state.posts.map((p) => {
        if (p._id !== postId) return p;
        const liked = Boolean(p._liked);
        const currentCount = Number.isFinite(p.likesCount)
          ? p.likesCount
          : Array.isArray(p.likes)
            ? p.likes.length
            : 0;
        return {
          ...p,
          _liked: !liked,
          likesCount: Math.max(0, currentCount + (liked ? -1 : 1)),
        };
      }),
    }));

    try {
      const { data } = await api.post(`/posts/${postId}/like`);
      set((state) => ({
        posts: state.posts.map((p) => {
          if (p._id !== postId) return p;
          return {
            ...p,
            _liked: Boolean(data.liked),
            likesCount: Number(data.likesCount) || 0,
          };
        }),
      }));
    } catch (err) {
      console.error("Failed to toggle like", err);
      set((state) => ({
        posts: state.posts.map((p) => {
          if (p._id !== postId) return p;
          const currentCount = Number.isFinite(p.likesCount)
            ? p.likesCount
            : Array.isArray(p.likes)
              ? p.likes.length
              : 0;
          return {
            ...p,
            _liked: !p._liked,
            likesCount: Math.max(0, currentCount + (p._liked ? 1 : -1)),
          };
        }),
      }));
    }
  },

  updatePost: async (postId, content) => {
    const { data } = await api.put(`/posts/${postId}`, { content });
    set((state) => ({
      posts: state.posts.map((p) => (p._id === postId ? { ...p, ...data.post } : p)),
    }));
    return data.post;
  },

  deletePost: async (postId) => {
    await api.delete(`/posts/${postId}`);
    set((state) => ({ posts: state.posts.filter((p) => p._id !== postId) }));
  },

  updateCommentCount: (postId, delta) => {
    set((state) => ({
      posts: state.posts.map((p) =>
        p._id === postId ? { ...p, commentCount: Math.max(0, (p.commentCount || 0) + delta) } : p
      ),
    }));
  },

  loadBookmarkedIds: async () => {
    try {
      const { data } = await api.get("/users/bookmarks");
      const ids = new Set((data.posts || []).map((p) => p._id));
      set({ bookmarkedIds: ids });
    } catch (err) {
      console.error("Failed to load bookmarks", err);
    }
  },

  toggleBookmark: async (postId) => {
    set((state) => {
      const next = new Set(state.bookmarkedIds);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return { bookmarkedIds: next };
    });

    try {
      await api.post(`/users/bookmarks/${postId}`);
    } catch (err) {
      console.error("Failed to toggle bookmark", err);
      set((state) => {
        const next = new Set(state.bookmarkedIds);
        if (next.has(postId)) {
          next.delete(postId);
        } else {
          next.add(postId);
        }
        return { bookmarkedIds: next };
      });
    }
  },
}));
