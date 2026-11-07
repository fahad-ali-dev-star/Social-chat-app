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
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24 sm:pb-8">
      {/* Stories Carousel */}
      <StoryBar />
      <StoryViewerModal />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_340px] gap-6">
        {/* Main Feed Column */}
        <main className="min-w-0">
          {/* Create Post Card */}
          <div className="mb-4">
            <CreatePostBox />
          </div>

          {/* Feed Filter Controls */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between glass px-3.5 py-2.5 mb-4">
            {/* Primary Feed Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab("all")}
                className={`text-xs font-semibold py-1.5 px-3.5 rounded-lg transition-all ${
                  activeTab === "all"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                For You
              </button>
              <button
                onClick={() => setActiveTab("following")}
                className={`text-xs font-semibold py-1.5 px-3.5 rounded-lg transition-all ${
                  activeTab === "following"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Following
              </button>
            </div>

            {/* Media Filter Pills */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[11px] font-medium text-slate-400 mr-1 hidden sm:inline">Filter:</span>
              <button
                onClick={() => setActiveMediaType("")}
                className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-all ${
                  activeMediaType === ""
                    ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveMediaType("image")}
                className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-all ${
                  activeMediaType === "image"
                    ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40"
                }`}
              >
                📷 Photos
              </button>
              <button
                onClick={() => setActiveMediaType("video")}
                className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-all ${
                  activeMediaType === "video"
                    ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40"
                }`}
              >
                🎥 Videos
              </button>
            </div>
          </div>

          {/* Posts Feed Stream */}
          <div className="space-y-4">
            {loading && safePosts.length === 0 ? (
              // Skeleton loading placeholders
              [1, 2, 3].map((i) => (
                <div key={i} className="glass p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800" />
                    <div className="flex-1">
                      <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
                      <div className="h-2.5 w-20 bg-slate-100 dark:bg-slate-850 rounded" />
                    </div>
                  </div>
                  <div className="mt-3.5 space-y-2">
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-4/5" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-850 rounded w-2/3" />
                  </div>
                </div>
              ))
            ) : safePosts.length === 0 ? (
              // Clean Empty State
              <div className="glass p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center text-2xl mx-auto mb-3.5">
                  ✨
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Your feed is quiet</h3>
                <p className="text-slate-500 text-xs max-w-xs mx-auto mb-4">
                  Follow interesting people or share what's on your mind right now!
                </p>
                <button
                  onClick={() => setActiveTab("all")}
                  className="btn-brand text-xs py-1.5 px-4"
                >
                  Explore All Posts
                </button>
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
                  className="btn-ghost text-xs px-5 py-2 font-semibold"
                >
                  Load More Posts
                </button>
              </div>
            )}

            {/* Loading more spinner */}
            {loading && posts.length > 0 && (
              <div className="flex justify-center py-4">
                <svg className="w-5 h-5 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <p className="text-center text-xs text-slate-400 py-6">You're all caught up ✨</p>
            )}
          </div>
        </main>

        {/* Right Sidebar on Desktop (Fix: hidden lg:block instead of hidden xl:block) */}
        <aside className="hidden lg:block space-y-4">
          {/* User profile snapshot card */}
          <div className="glass p-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-xs"
                style={{ background: "var(--brand-gradient)" }}
              >
                {(user?.displayName || user?.username || "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {user?.displayName || user?.username}
                </p>
                <p className="text-xs text-slate-500 truncate">@{user?.username}</p>
              </div>
            </div>
          </div>

          {/* Trending Hashtags (was missing from sidebar) */}
          <TrendingHashtags />

          {/* Suggested Users */}
          <SuggestedUsers />

          {/* Footer */}
          <div className="text-[11px] text-slate-400 px-1 space-y-1">
            <p>© 2026 Buzz Chat · Final Year Project</p>
            <p className="text-slate-500">MERN Social Platform with Realtime WebSockets</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
