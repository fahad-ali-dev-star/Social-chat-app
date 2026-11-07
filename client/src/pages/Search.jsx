import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import api from "../api/client";
import PostCard from "../components/PostCard";
import Avatar from "../components/Avatar";
import VerifiedBadge from "../components/VerifiedBadge";
import { useAuthStore } from "../store/authStore";

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
  </svg>
);

function SearchUserCard({ user, currentUserId }) {
  const [following, setFollowing] = useState(Boolean(user.isFollowing));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFollowing(Boolean(user.isFollowing));
  }, [user.isFollowing, user._id]);

  const handleToggleFollow = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      const { data } = await api.post(`/users/${user._id}/follow`);
      setFollowing(Boolean(data.following));
    } catch (err) {
      console.error("Follow error:", err);
    } finally {
      setLoading(false);
    }
  };

  const isOwn = currentUserId === user._id;

  return (
    <div className="glass p-4 flex items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
      <Link to={`/profile/${user.username}`} className="flex items-center gap-3.5 flex-1 min-w-0 group">
        <Avatar src={user.avatarUrl} name={user.displayName} username={user.username} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors flex items-center gap-1">
            {user.displayName || user.username}
            {user.isVerified && <VerifiedBadge size="xs" />}
          </p>
          <p className="text-xs text-slate-400">@{user.username}</p>
          {user.bio && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 truncate">{user.bio}</p>}
        </div>
      </Link>

      {!isOwn && (
        <button
          onClick={handleToggleFollow}
          disabled={loading}
          className={`px-4 py-1.5 text-xs font-semibold rounded-xl transition-all flex-shrink-0 ${
            following
              ? "btn-ghost"
              : "btn-brand text-xs py-1.5 px-4"
          }`}
        >
          {loading ? "..." : following ? "Following" : "Follow"}
        </button>
      )}
    </div>
  );
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const initialQ = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQ);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("people");
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q) => {
    setLoading(true);
    setSearched(true);
    try {
      const [usersRes, postsRes] = await Promise.all([
        api.get(`/users/search?q=${encodeURIComponent(q)}`),
        q.trim() ? api.get(`/posts/search?q=${encodeURIComponent(q)}`) : Promise.resolve({ data: { posts: [] } }),
      ]);
      setUsers(usersRes.data.users || []);
      setPosts(postsRes.data.posts || []);
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = searchParams.get("q") || "";
    setQuery(q);
    doSearch(q);
  }, [searchParams.get("q")]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 sm:pb-8 space-y-5">
      {/* Search Header Form */}
      <form onSubmit={handleSubmit} className="glass p-3.5 sm:p-4">
        <div className="flex gap-2.5">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <SearchIcon />
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people, tags or posts..."
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={!query.trim()}
            className="btn-brand px-5 py-2.5 text-xs font-semibold disabled:opacity-40"
          >
            Search
          </button>
        </div>
      </form>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-8">
          <svg className="w-5 h-5 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      )}

      {/* Results */}
      {!loading && searched && (
        <>
          {/* Segmented Filter Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
            {["people", "posts"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-xs font-bold capitalize transition-all border-b-2 -mb-px ${
                  activeTab === tab
                    ? "border-brand-500 text-brand-600 dark:text-brand-400"
                    : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                {tab === "people" ? `People (${users.length})` : `Posts (${posts.length})`}
              </button>
            ))}
          </div>

          {/* People list */}
          {activeTab === "people" && (
            <div className="space-y-3">
              {users.length === 0 ? (
                <div className="glass p-10 text-center">
                  <div className="text-3xl mb-2">👥</div>
                  <p className="text-slate-500 text-xs">
                    {query.trim() ? `No people found matching "${query}"` : "No results"}
                  </p>
                </div>
              ) : (
                users.map((u) => (
                  <SearchUserCard key={u._id} user={u} currentUserId={currentUser?.id} />
                ))
              )}
            </div>
          )}

          {/* Posts list */}
          {activeTab === "posts" && (
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="glass p-10 text-center">
                  <div className="text-3xl mb-2">📝</div>
                  <p className="text-slate-500 text-xs">
                    {query.trim() ? `No posts found matching "${query}"` : "Search for topics or keywords"}
                  </p>
                </div>
              ) : (
                posts.map((post) => (
                  <PostCard key={post._id} post={post} myUserId={currentUser?.id} />
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
