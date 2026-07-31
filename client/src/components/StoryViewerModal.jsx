import { useEffect, useRef } from "react";
import { useStoryStore } from "../store/storyStore";
import { useAuthStore } from "../store/authStore";
import Avatar from "./Avatar";

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
  } = useStoryStore();

  const progressRef = useRef(null);

  const isOpen = activeGroupIndex !== null && storyGroups[activeGroupIndex];
  const group = isOpen ? storyGroups[activeGroupIndex] : null;
  const currentStory = group ? group.stories[activeStoryIndex] : null;

  useEffect(() => {
    if (currentStory && !currentStory.viewedByMe) {
      viewStory(currentStory._id);
    }
  }, [currentStory?._id]);

  // Auto-advance timer (30 seconds per story)
  useEffect(() => {
    if (!currentStory) return;
    const timer = setTimeout(() => {
      nextStory();
    }, 30000);
    return () => clearTimeout(timer);
  }, [activeGroupIndex, activeStoryIndex, currentStory?._id]);

  if (!isOpen || !currentStory) return null;

  const isMyStory = currentStory.user?._id === currentUser?.id || currentStory.user === currentUser?.id;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="relative w-full max-w-sm h-[80vh] bg-surface-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/10">
        {/* Top Progress Bars */}
        <div className="absolute top-0 left-0 right-0 z-20 p-3 flex gap-1 bg-gradient-to-b from-black/80 to-transparent">
          {group.stories.map((s, idx) => (
            <div key={s._id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className={`h-full bg-white transition-all duration-100 ${
                  idx < activeStoryIndex
                    ? "w-full"
                    : idx === activeStoryIndex
                    ? "w-full animate-progress"
                    : "w-0"
                }`}
                style={{
                  animationDuration: idx === activeStoryIndex ? "30s" : "0s",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header - Just Buttons Now */}
        <div className="absolute top-4 left-0 right-0 z-20 px-4 pt-2 flex items-center justify-end">

          <div className="flex items-center gap-2">
            {isMyStory && (
              <button
                onClick={() => deleteStory(currentStory._id)}
                className="text-xs text-red-400 hover:text-red-300 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur"
              >
                Delete
              </button>
            )}
            <button
              onClick={closeViewer}
              className="text-white/80 hover:text-white p-1 rounded-full bg-black/40 backdrop-blur"
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

        {/* Caption & Viewer Count Footer */}
        <div className="p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-20">
          {currentStory.caption && (
            <p className="text-sm text-white text-center font-medium mb-2">
              {currentStory.caption}
            </p>
          )}

          {isMyStory && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
              <span>👁️ {currentStory.views?.length || 0} views</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
