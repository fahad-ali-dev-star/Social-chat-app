import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import Avatar from "./Avatar";

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
    <div className="glass rounded-2xl p-4">
      <div className="h-4 w-32 bg-white/8 rounded animate-pulse mb-4" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-white/8 animate-pulse" />
          <div className="flex-1">
            <div className="h-3 w-24 bg-white/8 rounded animate-pulse mb-1" />
            <div className="h-2.5 w-16 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );

  if (users.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-4 animate-fade-in">
      <h3 className="text-sm font-bold text-white mb-4">Who to Follow</h3>
      <div className="space-y-3">
        {users.map((u) => {
          const isFollowing = following[u._id];
          return (
            <div key={u._id} className="flex items-center gap-3 group">
              <Link to={`/profile/${u.username}`}>
                <Avatar
                  src={u.avatarUrl}
                  name={u.displayName}
                  username={u.username}
                  size="sm"
                  className="group-hover:scale-105 transition-transform"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/profile/${u.username}`}>
                  <p className="text-sm font-semibold text-gray-200 truncate hover:text-brand-400 transition-colors leading-tight">
                    {u.displayName || u.username}
                  </p>
                  <p className="text-xs text-gray-500 truncate">@{u.username}</p>
                </Link>
              </div>
              <button
                onClick={() => handleFollow(u._id)}
                className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all duration-200 ${
                  isFollowing
                    ? "bg-white/8 text-gray-400 hover:bg-red-500/10 hover:text-red-400"
                    : "btn-brand py-1.5 px-3"
                }`}
              >
                {isFollowing ? "Unfollow" : "Follow"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
