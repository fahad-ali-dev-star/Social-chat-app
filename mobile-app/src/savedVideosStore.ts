import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "buzz_saved_videos";

interface SavedVideosStore {
  savedVideos: any[];
  loaded: boolean;
  loadSaved: () => Promise<void>;
  saveVideo: (item: any) => Promise<void>;
  unsaveVideo: (id: string) => Promise<void>;
  isSaved: (id: string) => boolean;
}

export const useSavedVideosStore = create<SavedVideosStore>((set, get) => ({
  savedVideos: [],
  loaded: false,

  loadSaved: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      set({ savedVideos: parsed, loaded: true });
    } catch {
      set({ savedVideos: [], loaded: true });
    }
  },

  saveVideo: async (item: any) => {
    const { savedVideos } = get();
    const already = savedVideos.some((v) => v._id === item._id);
    if (already) return;
    const updated = [item, ...savedVideos];
    set({ savedVideos: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  unsaveVideo: async (id: string) => {
    const { savedVideos } = get();
    const updated = savedVideos.filter((v) => v._id !== id);
    set({ savedVideos: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  isSaved: (id: string) => {
    return get().savedVideos.some((v) => v._id === id);
  },
}));
