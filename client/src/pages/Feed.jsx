import { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { usePostStore } from "../store/postStore";
import PostCard from "../components/PostCard";
import CreatePostBox from "../components/CreatePostBox";
import SuggestedUsers from "../components/SuggestedUsers";
import StoryBar from "../components/StoryBar";
import StoryViewerModal from "../components/StoryViewerModal";
import TrendingHashtags from "../components/TrendingHashtags";

export default function Feed() {
  const user = useAuthStore((s) => s.user);
  const { posts, loading, hasMore, loadFeed } = usePostStore();
  const [activeTab, setActiveTab] = useState("all"); // "all" | "following"
  const [activeMediaType, setActiveMediaType] = useState(""); // "" | "image" | "video"

  useEffect(() => {
    loadFeed(true, activeTab, activeMediaType);
  }, [activeTab, activeMediaType]);

  const safePosts = Array.isArray(posts) ? posts : [];

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <StoryBar />
      <StoryViewerModal />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Main feed */}
        <main className="min-w-0">
          {/* Create post */}
          <div className="mb-5">
            <CreatePostBox />
          </div>

          {/* Feed Filter Tabs */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between glass rounded-2xl px-3 sm:px-4 py-2 mb-4 border border-white/5">
            <div className="flex flex-wrap gap-2 sm:gap-4">
              <button
                onClick={() => setActiveTab("all")}
                className={`text-xs font-bold py-1 px-3 rounded-xl transition-all ${
                  activeTab === "all" ? "bg-brand-600 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                ✨ For You
              </button>
              <button
                onClick={() => setActiveTab("following")}
                className={`text-xs font-bold py-1 px-3 rounded-xl transition-all ${
                  activeTab === "following" ? "bg-brand-600 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                👥 Following
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 bg-white/5 p-1 rounded-xl">
              <button
                onClick={() => setActiveMediaType("")}
                className={`text-[11px] font-medium px-2.5 py-0.5 rounded-lg transition-all ${
                  activeMediaType === "" ? "bg-white/20 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveMediaType("image")}
                className={`text-[11px] font-medium px-2.5 py-0.5 rounded-lg transition-all ${
                  activeMediaType === "image" ? "bg-white/20 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                📷 Photos
              </button>
              <button
                onClick={() => setActiveMediaType("video")}
                className={`text-[11px] font-medium px-2.5 py-0.5 rounded-lg transition-all ${
                  activeMediaType === "video" ? "bg-white/20 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                🎥 Videos
              </button>
            </div>
          </div>

          {/* Posts */}
          <div className="space-y-4">
            {loading && safePosts.length === 0 ? (
              // Skeleton
              [1, 2, 3].map((i) => (
                <div key={i} className="glass rounded-2xl p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/8" />
                    <div className="flex-1">
                      <div className="h-3 w-32 bg-white/8 rounded mb-2" />
                      <div className="h-2.5 w-24 bg-white/5 rounded" />
                    </div>
                  </div>
                  <div className="mt-3 pl-[52px] space-y-2">
                    <div className="h-3 bg-white/8 rounded w-full" />
                    <div className="h-3 bg-white/8 rounded w-4/5" />
                    <div className="h-3 bg-white/5 rounded w-2/3" />
                  </div>
                </div>
              ))
            ) : safePosts.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <div className="text-5xl mb-4">🌟</div>
                <h3 className="text-lg font-bold text-white mb-2">No posts yet</h3>
                <p className="text-gray-500 text-sm">Be the first to share something!</p>
              </div>
            ) : (
              safePosts.map((post) => (
                <PostCard key={post?._id} post={post} myUserId={user?.id} />
              ))
            )}

            {/* Load more */}
            {!loading && hasMore && posts.length > 0 && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => loadFeed(false)}
                  className="btn-ghost"
                >
                  Load more posts
                </button>
              </div>
            )}

            {/* Loading more indicator */}
            {loading && posts.length > 0 && (
              <div className="flex justify-center py-4">
                <svg className="w-5 h-5 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <p className="text-center text-xs text-gray-600 py-4">You've reached the end ✨</p>
            )}
          </div>
        </main>

        {/* Right sidebar */}
        <aside className="hidden xl:block space-y-4">
          {/* Profile snapshot */}
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}
              >
                {(user?.displayName || user?.username || "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{user?.displayName || user?.username}</p>
                <p className="text-xs text-gray-500">@{user?.username}</p>
              </div>
            </div>
          </div>

          {/* Suggestions */}
          <SuggestedUsers />

          {/* Footer */}
          <p className="text-xs text-gray-700 px-1">
            © 2025 Nexus · Built with MERN
          </p>
        </aside>
      </div>
    </div>
  );
}
