import { useEffect, useState } from "react";
import api from "../api/client";
import PostCard from "../components/PostCard";
import { useAuthStore } from "../store/authStore";
import { usePostStore } from "../store/postStore";

export default function Bookmarks() {
  const currentUser = useAuthStore((s) => s.user);
  const bookmarkedIds = usePostStore((s) => s.bookmarkedIds);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/users/bookmarks")
      .then(({ data }) => setPosts(data.posts || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Remove posts from list if user un-bookmarks them
  const visiblePosts = posts.filter((p) => bookmarkedIds.has(p._id));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-amber-400">
              <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Bookmarks</h1>
            <p className="text-sm text-gray-500">Your saved posts</p>
          </div>
        </div>
      </div>

      {/* Posts */}
      {loading ? (
        <div className="flex justify-center py-12">
          <svg className="w-6 h-6 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      ) : visiblePosts.length === 0 ? (
        <div className="glass rounded-2xl p-14 text-center">
          <div className="text-5xl mb-4">🔖</div>
          <p className="text-gray-400 font-medium">No bookmarks yet</p>
          <p className="text-gray-600 text-sm mt-2">
            Tap the bookmark icon on any post to save it here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visiblePosts.map((post) => (
            <PostCard key={post._id} post={post} myUserId={currentUser?.id} />
          ))}
          {visiblePosts.length < posts.length && (
            <p className="text-center text-xs text-gray-600 py-2">
              {posts.length - visiblePosts.length} post(s) removed from bookmarks
            </p>
          )}
        </div>
      )}
    </div>
  );
}
