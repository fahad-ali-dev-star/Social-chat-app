import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import Avatar from "./Avatar";
import VerifiedBadge from "./VerifiedBadge";

export default function SuggestedUsers() {
  const [users, setUsers] = useState([]);
  const [following, setFollowing] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/users/suggestions")
      .then(({ data }) => setUsers(data.suggestions || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleFollow = async (userId) => {
    const prev = following[userId];
    setFollowing((f) => ({ ...f, [userId]: !prev }));
    try {
      await api.post(`/users/${userId}/follow`);
    } catch {
      setFollowing((f) => ({ ...f, [userId]: prev }));
    }
  };

  if (loading) return (
    <div className="glass p-4">
      <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-4" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="flex-1">
            <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-1" />
            <div className="h-2.5 w-16 bg-slate-100 dark:bg-slate-850 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );

  if (users.length === 0) return null;

  return (
    <div className="glass p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Who to follow</h3>
        <span className="text-[11px] text-slate-400 font-medium">Suggestions</span>
      </div>
      <div className="space-y-3">
        {users.map((u) => {
          const isFollowing = following[u._id];
          return (
            <div key={u._id} className="flex items-center gap-3 group justify-between">
              <Link to={`/profile/${u.username}`} className="flex items-center gap-2.5 min-w-0 flex-1">
                <Avatar
                  src={u.avatarUrl}
                  name={u.displayName}
                  username={u.username}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {u.displayName || u.username}
                    </p>
                    {u.isVerified && <VerifiedBadge size="xs" />}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">@{u.username}</p>
                </div>
              </Link>
              <button
                onClick={() => handleFollow(u._id)}
                className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
                  isFollowing
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500"
                    : "btn-brand text-xs py-1 px-3"
                }`}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
