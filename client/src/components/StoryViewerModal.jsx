import { useEffect, useRef } from "react";
import { useStoryStore } from "../store/storyStore";
import { useAuthStore } from "../store/authStore";
import Avatar from "./Avatar";

function formatTimeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function StoryViewerModal() {
  const currentUser = useAuthStore((s) => s.user);
  const {
    storyGroups,
    activeGroupIndex,
    activeStoryIndex,
    closeViewer,
    nextStory,
    prevStory,
    viewStory,
    deleteStory,
    toggleLikeStory,
  } = useStoryStore();

  const isOpen = activeGroupIndex !== null && storyGroups[activeGroupIndex];
  const group = isOpen ? storyGroups[activeGroupIndex] : null;
  const currentStory = group ? group.stories[activeStoryIndex] : null;

  useEffect(() => {
    if (currentStory && !currentStory.viewedByMe) {
      viewStory(currentStory._id);
    }
  }, [currentStory?._id]);

  // Auto-advance timer (20 seconds per story like Instagram)
  useEffect(() => {
    if (!currentStory) return;
    const timer = setTimeout(() => {
      nextStory();
    }, 20000);
    return () => clearTimeout(timer);
  }, [activeGroupIndex, activeStoryIndex, currentStory?._id]);

  if (!isOpen || !currentStory) return null;

  const isMyStory = currentStory.user?._id === currentUser?.id || currentStory.user === currentUser?.id;
  const storyUser = currentStory.user || group?.user;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="relative w-full max-w-sm h-[85vh] sm:h-[80vh] bg-surface-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/10">
        {/* Top Progress Bars (20 seconds completed line) */}
        <div className="absolute top-0 left-0 right-0 z-20 p-3 flex gap-1 bg-gradient-to-b from-black/90 via-black/40 to-transparent">
          {group.stories.map((s, idx) => (
            <div key={s._id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className={`h-full bg-white transition-all ${
                  idx < activeStoryIndex
                    ? "w-full"
                    : idx === activeStoryIndex
                    ? "animate-progress"
                    : "w-0"
                }`}
                style={{
                  animationDuration: idx === activeStoryIndex ? "20s" : "0s",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header - User Info + Time + Action Buttons */}
        <div className="absolute top-4 left-0 right-0 z-20 px-3 pt-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <Avatar
              src={storyUser?.avatarUrl}
              name={storyUser?.displayName}
              username={storyUser?.username}
              size="xs"
            />
            <span className="text-xs font-semibold text-white truncate max-w-[110px]">
              {storyUser?.displayName || storyUser?.username}
            </span>
            <span className="text-[10px] text-gray-300">
              • {formatTimeAgo(currentStory.createdAt)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isMyStory && (
              <button
                onClick={() => deleteStory(currentStory._id)}
                className="text-xs text-red-400 hover:text-red-300 bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-md border border-white/10"
              >
                Delete
              </button>
            )}
            <button
              onClick={closeViewer}
              className="text-white/80 hover:text-white p-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Story Media */}
        <div className="relative flex-1 bg-black flex items-center justify-center">
          <img
            src={currentStory.mediaUrl}
            alt="Story"
            className="w-full h-full object-contain"
          />

          {/* Navigation Click Overlay */}
          <div
            onClick={prevStory}
            className="absolute left-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer"
          />
          <div
            onClick={nextStory}
            className="absolute right-0 top-0 bottom-0 w-2/3 z-10 cursor-pointer"
          />
        </div>

        {/* Caption & Like/View Footer */}
        <div className="p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-20 flex flex-col gap-2">
          {currentStory.caption && (
            <p className="text-sm text-white text-center font-medium drop-shadow">
              {currentStory.caption}
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            {/* View Count for story owner */}
            {isMyStory ? (
              <div className="flex items-center gap-1.5 text-xs text-gray-300 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md">
                <span>👁️ {currentStory.views?.length || 0} views</span>
              </div>
            ) : (
              <div />
            )}

            {/* Story Like Button (For all users) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleLikeStory(currentStory._id);
              }}
              className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border transition-all duration-200 ${
                currentStory.likedByMe
                  ? "bg-red-500/20 text-red-500 border-red-500/40 scale-105"
                  : "bg-black/40 text-gray-300 border-white/10 hover:text-white"
              }`}
            >
              <span className={`text-base ${currentStory.likedByMe ? "animate-heart-pop" : ""}`}>
                {currentStory.likedByMe ? "❤️" : "🤍"}
              </span>
              <span className="text-xs font-semibold">
                {currentStory.likesCount || 0}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
