import { useEffect, useRef, useState } from "react";
import { useStoryStore } from "../store/storyStore";
import { useAuthStore } from "../store/authStore";
import Avatar from "./Avatar";
import api from "../api/client";

export default function StoryBar() {
  const currentUser = useAuthStore((s) => s.user);
  const { storyGroups, loadFeedStories, openViewer, createStory } = useStoryStore();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadFeedStories();
  }, []);

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
      await createStory(data.url);
    } catch (err) {
      console.error("Failed to upload story", err);
      alert("Story upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const myGroupIndex = storyGroups.findIndex(
    (g) => g.user?._id === currentUser?.id || g.user === currentUser?.id
  );
  const myGroup = myGroupIndex !== -1 ? storyGroups[myGroupIndex] : null;

  return (
    <div className="glass rounded-2xl p-4 mb-4 overflow-x-auto no-scrollbar flex items-center gap-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Add / View My Story Circle */}
      <div className="flex flex-col items-center justify-center text-center gap-1 flex-shrink-0 cursor-pointer group">
        <div
          onClick={() => {
            if (myGroup && myGroup.stories.length > 0) {
              openViewer(myGroupIndex);
            } else {
              fileInputRef.current?.click();
            }
          }}
          className={`relative w-16 h-16 rounded-full p-[3px] transition-transform duration-200 group-hover:scale-105 ${
            myGroup && myGroup.stories.length > 0
              ? myGroup.hasUnviewed
                ? "bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]"
                : "bg-surface-700"
              : "border-2 border-dashed border-brand-500/50"
          }`}
        >
          <Avatar
            src={currentUser?.avatarUrl}
            name={currentUser?.displayName}
            username={currentUser?.username}
            size="lg"
            className="w-full h-full rounded-full border-[3px] border-surface-900 object-cover"
          />

          {/* Plus Badge */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={uploading}
            className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold border-2 border-surface-900 shadow-md"
            title="Add new story"
          >
            {uploading ? "…" : "+"}
          </button>
        </div>
        <span className="text-[11px] text-gray-300 font-medium text-center truncate max-w-[68px]">
          Your Story
        </span>
      </div>

      {/* Other Users' Stories */}
      {storyGroups.map((group, idx) => {
        if (group.user?._id === currentUser?.id || group.user === currentUser?.id) {
          return null; // Skip current user (already rendered first)
        }

        return (
          <div
            key={group.user._id}
            onClick={() => openViewer(idx)}
            className="flex flex-col items-center justify-center text-center gap-1 flex-shrink-0 cursor-pointer group"
          >
            <div
              className={`w-16 h-16 rounded-full p-[3px] transition-transform duration-200 group-hover:scale-105 ${
                group.hasUnviewed
                  ? "bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]"
                  : "bg-surface-700"
              }`}
            >
              <Avatar
                src={group.user?.avatarUrl}
                name={group.user?.displayName}
                username={group.user?.username}
                size="lg"
                className="w-full h-full rounded-full border-[3px] border-surface-900 object-cover"
              />
            </div>
            <span className="text-[11px] text-gray-300 font-medium text-center truncate max-w-[68px]">
              {group.user?.displayName || group.user?.username}
            </span>
          </div>
        );
      })}
    </div>
  );
}
