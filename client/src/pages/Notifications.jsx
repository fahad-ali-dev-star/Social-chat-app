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
    bgLight: "bg-rose-50/70 border-rose-200/60",
    bgDark: "bg-rose-500/10 border-rose-500/20",
  },
  comment: {
    icon: "💬",
    label: (sender) => `${sender} commented on your post`,
    bgLight: "bg-blue-50/70 border-blue-200/60",
    bgDark: "bg-blue-500/10 border-blue-500/20",
  },
  comment_reply: {
    icon: "💬",
    label: (sender) => `${sender} replied to your comment`,
    bgLight: "bg-blue-50/70 border-blue-200/60",
    bgDark: "bg-blue-500/10 border-blue-500/20",
  },
  follow: {
    icon: "👤",
    label: (sender) => `${sender} started following you`,
    bgLight: "bg-brand-50/70 border-brand-200/60",
    bgDark: "bg-brand-500/10 border-brand-500/20",
  },
  mention: {
    icon: "📢",
    label: (sender) => `${sender} mentioned you in a post`,
    bgLight: "bg-amber-50/70 border-amber-200/60",
    bgDark: "bg-amber-500/10 border-amber-500/20",
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
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24 sm:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Notifications</h1>
          {hasUnread && (
            <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 mt-0.5">
              {unreadCount} unread alert{unreadCount > 1 ? "s" : ""}
            </p>
          )}
        </div>
        {hasUnread && (
          <button
            onClick={markAllRead}
            className="btn-ghost text-xs font-semibold py-1.5 px-3"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Skeletons */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass p-4 flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="flex-1">
                <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
                <div className="h-2.5 w-1/3 bg-slate-100 dark:bg-slate-850 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        /* Empty State */
        <div className="glass p-14 text-center">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center text-xl mx-auto mb-3">
            🔔
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">No notifications yet</h3>
          <p className="text-slate-600 dark:text-slate-400 text-xs max-w-xs mx-auto">
            When someone likes your posts, comments or follows you, you'll see it here in real time.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const cfg = typeConfig[n.type] || typeConfig.like;
            const senderName = n.sender?.displayName || n.sender?.username || "Someone";

            return (
              <div
                key={n._id}
                className={`p-3.5 rounded-2xl border transition-all duration-200 flex items-center gap-3.5 ${
                  !n.read
                    ? `${cfg.bgLight} dark:${cfg.bgDark}`
                    : "glass hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="relative">
                  <Avatar
                    src={n.sender?.avatarUrl}
                    name={n.sender?.displayName}
                    username={n.sender?.username}
                    size="md"
                  />
                  <span className="absolute -bottom-1 -right-1 text-xs">
                    {cfg.icon}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-800 dark:text-slate-200">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {senderName}
                    </span>{" "}
                    {n.type === "like"
                      ? "liked your post"
                      : n.type === "comment"
                      ? "commented on your post"
                      : n.type === "comment_reply"
                      ? "replied to your comment"
                      : n.type === "follow"
                      ? "started following you"
                      : n.type === "mention"
                      ? "mentioned you"
                      : "interacted with your content"}
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">{formatDate(n.createdAt)}</p>
                </div>

                {!n.read && (
                  <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
