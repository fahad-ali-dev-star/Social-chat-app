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
    <div className="glass p-3.5 sm:p-4 mb-4 overflow-x-auto scrollbar-none flex items-center gap-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Add / View My Story Circle */}
      <div
        className="flex flex-col items-center justify-center text-center gap-1.5 flex-shrink-0 cursor-pointer group"
        style={{ width: "68px", minWidth: "68px", maxWidth: "68px" }}
      >
        <div
          onClick={() => {
            if (myGroup && myGroup.stories.length > 0) {
              openViewer(myGroupIndex);
            } else {
              fileInputRef.current?.click();
            }
          }}
          style={{ width: "56px", height: "56px", minWidth: "56px", minHeight: "56px" }}
          className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[2.5px] flex items-center justify-center flex-shrink-0 overflow-hidden transition-transform duration-200 group-hover:scale-105 ${
            myGroup && myGroup.stories.length > 0
              ? myGroup.hasUnviewed
                ? "bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600"
                : "bg-slate-300 dark:bg-slate-700"
              : "border-2 border-dashed border-brand-500/60"
          }`}
        >
          <Avatar
            src={currentUser?.avatarUrl}
            name={currentUser?.displayName}
            username={currentUser?.username}
            size="lg"
            className="border-2 border-white dark:border-slate-900"
          />

          {/* Plus Badge */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={uploading}
            className="absolute bottom-0 right-0 w-5 h-5 rounded-full btn-brand text-white flex items-center justify-center text-xs font-bold border-2 border-white dark:border-slate-900 shadow-xs"
            title="Add new story"
          >
            {uploading ? "…" : "+"}
          </button>
        </div>
        <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[68px]">
          Your Story
        </span>
      </div>

      {/* Other Users' Stories */}
      {storyGroups.map((group, idx) => {
        if (group.user?._id === currentUser?.id || group.user === currentUser?.id) {
          return null;
        }

        return (
          <div
            key={group.user._id}
            onClick={() => openViewer(idx)}
            className="flex flex-col items-center justify-center text-center gap-1.5 flex-shrink-0 cursor-pointer group"
            style={{ width: "68px", minWidth: "68px", maxWidth: "68px" }}
          >
            <div
              style={{ width: "56px", height: "56px", minWidth: "56px", minHeight: "56px" }}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[2.5px] flex items-center justify-center flex-shrink-0 overflow-hidden transition-transform duration-200 group-hover:scale-105 ${
                group.hasUnviewed
                  ? "bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600"
                  : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <Avatar
                src={group.user?.avatarUrl}
                name={group.user?.displayName}
                username={group.user?.username}
                size="lg"
                className="border-2 border-white dark:border-slate-900"
              />
            </div>
            <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[68px]">
              {group.user?.displayName || group.user?.username}
            </span>
          </div>
        );
      })}
    </div>
  );
}
