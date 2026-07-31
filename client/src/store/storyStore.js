import { create } from "zustand";
import api from "../api/client";

export const useStoryStore = create((set, get) => ({
  storyGroups: [],
  loading: false,
  activeGroupIndex: null,
  activeStoryIndex: 0,

  loadFeedStories: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get("/stories/feed");
      set({ storyGroups: data.storyGroups || [], loading: false });
    } catch (err) {
      console.error("Failed to load stories", err);
      set({ loading: false });
    }
  },

  createStory: async (mediaUrl, caption = "") => {
    const { data } = await api.post("/stories", { mediaUrl, caption });
    await get().loadFeedStories();
    return data.story;
  },

  viewStory: async (storyId) => {
    try {
      await api.post(`/stories/${storyId}/view`);
      // Update local state to mark story as viewed
      set((state) => ({
        storyGroups: state.storyGroups.map((group) => ({
          ...group,
          stories: group.stories.map((s) =>
            s._id === storyId ? { ...s, viewedByMe: true } : s
          ),
          hasUnviewed: group.stories.some(
            (s) => s._id !== storyId && !s.viewedByMe
          ),
        })),
      }));
    } catch (err) {
      console.error("Failed to mark story as viewed", err);
    }
  },

  openViewer: (groupIndex, storyIndex = 0) => {
    set({ activeGroupIndex: groupIndex, activeStoryIndex: storyIndex });
  },

  closeViewer: () => {
    set({ activeGroupIndex: null, activeStoryIndex: 0 });
  },

  nextStory: () => {
    const { storyGroups, activeGroupIndex, activeStoryIndex } = get();
    if (activeGroupIndex === null) return;

    const currentGroup = storyGroups[activeGroupIndex];
    if (activeStoryIndex < currentGroup.stories.length - 1) {
      set({ activeStoryIndex: activeStoryIndex + 1 });
    } else if (activeGroupIndex < storyGroups.length - 1) {
      set({ activeGroupIndex: activeGroupIndex + 1, activeStoryIndex: 0 });
    } else {
      get().closeViewer();
    }
  },

  prevStory: () => {
    const { storyGroups, activeGroupIndex, activeStoryIndex } = get();
    if (activeGroupIndex === null) return;

    if (activeStoryIndex > 0) {
      set({ activeStoryIndex: activeStoryIndex - 1 });
    } else if (activeGroupIndex > 0) {
      const prevGroup = storyGroups[activeGroupIndex - 1];
      set({
        activeGroupIndex: activeGroupIndex - 1,
        activeStoryIndex: prevGroup.stories.length - 1,
      });
    }
  },

  deleteStory: async (storyId) => {
    try {
      await api.delete(`/stories/${storyId}`);
      await get().loadFeedStories();
      get().closeViewer();
    } catch (err) {
      console.error("Failed to delete story", err);
    }
  },
}));
