import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Avatar from "./Avatar";
import VerifiedBadge from "./VerifiedBadge";

export default function UserListModal({ title, users, isOpen, onClose }) {
  useEffect(() => {
    if (isOpen) {
      document.querySelectorAll("video, audio").forEach((m) => {
        if (!m.paused) m.pause();
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-lg w-full max-w-md rounded-3xl overflow-hidden shadow-popover flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white capitalize">{title}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div className="p-3 overflow-y-auto space-y-1 flex-1">
          {users.length === 0 ? (
            <p className="text-center text-slate-600 dark:text-slate-400 text-xs py-8">No users found.</p>
          ) : (
            users.map((u) => (
              <Link
                key={u._id || u.id}
                to={`/profile/${u.username}`}
                onClick={onClose}
                className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={u.avatarUrl}
                    name={u.displayName}
                    username={u.username}
                    size="md"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        {u.displayName || u.username}
                      </p>
                      {u.isVerified && <VerifiedBadge size="xs" />}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">@{u.username}</p>
                  </div>
                </div>

                <span className="text-xs text-brand-600 dark:text-brand-400 font-semibold px-3 py-1 rounded-full bg-brand-500/10 group-hover:bg-brand-500/20 transition-all">
                  Profile →
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
