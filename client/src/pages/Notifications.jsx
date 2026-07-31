import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useNotificationStore } from "../store/notificationStore";
import Avatar from "../components/Avatar";

function formatDate(iso) {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const typeConfig = {
  like: {
    icon: "❤️",
    label: (sender) => `${sender} liked your post`,
    color: "from-rose-500/20 to-rose-600/10",
    border: "border-rose-500/20",
  },
  comment: {
    icon: "💬",
    label: (sender) => `${sender} commented on your post`,
    color: "from-blue-500/20 to-blue-600/10",
    border: "border-blue-500/20",
  },
  follow: {
    icon: "👤",
    label: (sender) => `${sender} started following you`,
    color: "from-brand-500/20 to-brand-600/10",
    border: "border-brand-500/20",
  },
};

export default function Notifications() {
  const { notifications, loading, unreadCount, loadNotifications, markAllRead } =
    useNotificationStore();

  useEffect(() => {
    loadNotifications();
  }, []);

  const hasUnread = unreadCount > 0;

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          {hasUnread && (
            <p className="text-sm text-brand-400 mt-0.5 animate-fade-in">
              {unreadCount} unread
            </p>
          )}
        </div>
        {hasUnread && (
          <button
            onClick={markAllRead}
            className="btn-ghost text-xs"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass rounded-2xl p-4 flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-white/8" />
              <div className="flex-1">
                <div className="h-3 w-3/4 bg-white/8 rounded mb-2" />
                <div className="h-2.5 w-1/3 bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center animate-fade-in">
          <div className="text-5xl mb-4">🔔</div>
          <h3 className="text-lg font-bold text-white mb-2">All caught up!</h3>
          <p className="text-gray-500 text-sm">No notifications yet. Share posts and follow people!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => {
            const cfg = typeConfig[n.type] || typeConfig.like;
            const senderName = n.sender?.displayName || n.sender?.username || "Someone";

            return (
              <div
                key={n._id}
                className={`relative flex flex-col gap-3 p-3 sm:flex-row sm:items-start sm:gap-4 sm:p-4 rounded-2xl border transition-all duration-200 animate-fade-in
                  ${!n.read
                    ? `bg-gradient-to-r ${cfg.color} ${cfg.border}`
                    : "glass border-white/5 hover:border-white/10"
                  }`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* Unread dot */}
                {!n.read && (
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-brand-500 animate-pulse-ring" />
                )}

                {/* Type icon */}
                <div className="text-xl flex-shrink-0 mt-0.5 self-start">{cfg.icon}</div>

                {/* Sender avatar + text */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Link to={`/profile/${n.sender?.username}`}>
                    <Avatar
                      src={n.sender?.avatarUrl}
                      name={n.sender?.displayName}
                      username={n.sender?.username}
                      size="sm"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 leading-snug">
                      <Link
                        to={`/profile/${n.sender?.username}`}
                        className="font-semibold text-white hover:text-brand-400 transition-colors"
                      >
                        {senderName}
                      </Link>{" "}
                      {cfg.label("").replace(senderName, "").trim()}
                    </p>
                    {n.post?.content && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        "{n.post.content.slice(0, 80)}{n.post.content.length > 80 ? "…" : ""}"
                      </p>
                    )}
                    <p className="text-xs text-gray-600 mt-1">{formatDate(n.createdAt)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
