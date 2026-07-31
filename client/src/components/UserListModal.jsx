import { useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "./Avatar";

export default function UserListModal({ title, users, isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-lg w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
          <h3 className="text-base font-bold text-white capitalize">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-full text-sm font-semibold"
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {users.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-8">No users found.</p>
          ) : (
            users.map((u) => (
              <Link
                key={u._id || u.id}
                to={`/profile/${u.username}`}
                onClick={onClose}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={u.avatarUrl}
                    name={u.displayName}
                    username={u.username}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate group-hover:text-brand-400 transition-colors">
                      {u.displayName || u.username}
                    </p>
                    <p className="text-xs text-gray-500 truncate">@{u.username}</p>
                  </div>
                </div>

                <span className="text-xs text-brand-400 font-medium px-3 py-1 rounded-full bg-brand-500/10 group-hover:bg-brand-500/20 transition-all">
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
