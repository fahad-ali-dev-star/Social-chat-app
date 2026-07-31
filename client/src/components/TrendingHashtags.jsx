import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

export default function TrendingHashtags() {
  const [hashtags, setHashtags] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/posts/trending")
      .then(({ data }) => setHashtags(data.hashtags || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-4 mb-4">
        <div className="h-4 w-28 bg-white/8 rounded animate-pulse mb-3" />
        <div className="h-3 w-36 bg-white/5 rounded animate-pulse mb-2" />
        <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
      </div>
    );
  }

  if (hashtags.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-4 mb-4 animate-fade-in">
      <h3 className="text-sm font-bold text-white mb-3">🔥 Trending Topics</h3>
      <div className="space-y-2.5">
        {hashtags.map(({ tag, count }) => (
          <div
            key={tag}
            onClick={() => navigate(`/search?q=${encodeURIComponent(tag)}`)}
            className="flex items-center justify-between cursor-pointer group hover:bg-white/5 p-2 rounded-xl transition-all"
          >
            <div>
              <p className="text-sm font-semibold text-brand-400 group-hover:text-brand-300 transition-colors">
                {tag}
              </p>
              <p className="text-[11px] text-gray-500">{count} {count === 1 ? "post" : "posts"}</p>
            </div>
            <span className="text-xs text-gray-500 group-hover:text-white transition-colors">→</span>
          </div>
        ))}
      </div>
    </div>
  );
}
