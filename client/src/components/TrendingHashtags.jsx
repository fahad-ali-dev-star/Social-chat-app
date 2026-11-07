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
      <div className="glass p-4 mb-4">
        <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-3" />
        <div className="h-3 w-36 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-2" />
        <div className="h-3 w-24 bg-slate-100 dark:bg-slate-850 rounded animate-pulse" />
      </div>
    );
  }

  if (hashtags.length === 0) return null;

  return (
    <div className="glass p-4 mb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Trending Topics</h3>
        <span className="text-[11px] text-slate-400 font-medium">Explore</span>
      </div>
      <div className="space-y-1.5">
        {hashtags.map(({ tag, count }) => (
          <div
            key={tag}
            onClick={() => navigate(`/search?q=${encodeURIComponent(tag)}`)}
            className="flex items-center justify-between cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-800/70 p-2 rounded-xl transition-all"
          >
            <div>
              <p className="text-xs font-bold text-brand-600 dark:text-brand-400 group-hover:underline">
                {tag}
              </p>
              <p className="text-[10px] text-slate-400">{count} {count === 1 ? "post" : "posts"}</p>
            </div>
            <span className="text-xs text-slate-300 dark:text-slate-600 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">→</span>
          </div>
        ))}
      </div>
    </div>
  );
}
