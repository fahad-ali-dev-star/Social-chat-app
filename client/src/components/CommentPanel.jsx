import { useState, useEffect, useRef } from "react";
import api from "../api/client";
import { useAuthStore } from "../store/authStore";
import Avatar from "./Avatar";
import ReportButton from "./ReportButton";
import VerifiedBadge from "./VerifiedBadge";

function formatDate(iso) {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CommentPanel({ postId, onCommentAdded }) {
  const user = useAuthStore((s) => s.user);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/posts/${postId}/comments`)
      .then(({ data }) => { if (!cancelled) setComments(data.comments || []); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [postId]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/posts/${postId}/comments`, {
        content: text.trim(),
        parentComment: replyTo?._id || null,
      });
      setComments((prev) => [...prev, data.comment]);
      setText("");
      setReplyTo(null);
      onCommentAdded?.();
    } catch (err) {
      console.error("Failed to add comment", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCommentLike = async (commentId) => {
    try {
      const { data } = await api.post(`/posts/${postId}/comments/${commentId}/like`);
      setComments((prev) =>
        prev.map((c) =>
          c._id === commentId ? { ...c, _liked: data.liked, likesCount: data.likesCount } : c
        )
      );
    } catch (err) {
      console.error("Failed to like comment", err);
    }
  };

  return (
    <div className="space-y-3">
      {/* Comment List */}
      {loading ? (
        <div className="flex justify-center py-4">
          <svg className="w-5 h-5 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {comments.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No comments yet. Start the conversation!</p>
          ) : (
            comments.filter((c) => !c.parentComment).map((c) => (
              <div key={c._id} className="animate-fade-in space-y-1.5">
                <div className="flex gap-2.5">
                  <Avatar src={c.author?.avatarUrl} name={c.author?.displayName} username={c.author?.username} size="xs" />
                  <div className="flex-1 bg-slate-100/90 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/50 rounded-2xl px-3.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {c.author?.displayName || c.author?.username}
                        </span>
                        {c.author?.isVerified && <VerifiedBadge size="xs" />}
                      </div>
                      <span className="text-[10px] text-slate-400">{formatDate(c.createdAt)}</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-200 mt-1 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] font-medium">
                      <button
                        onClick={() => handleCommentLike(c._id)}
                        className={`flex items-center gap-1 ${c._liked ? "text-rose-500 font-bold" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
                      >
                        ♥ <span>{c.likesCount || 0}</span>
                      </button>
                      <button
                        onClick={() => { setReplyTo(c); inputRef.current?.focus(); }}
                        className="text-slate-400 hover:text-brand-600 dark:hover:text-brand-400"
                      >
                        Reply
                      </button>
                      {String(c.author?._id) !== String(user?._id || user?.id) && (
                        <ReportButton targetType="comment" targetId={c._id} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Replies */}
                <div className="ml-9 space-y-1.5 border-l-2 border-slate-100 dark:border-slate-800 pl-3">
                  {comments.filter((r) => String(r.parentComment?._id || r.parentComment) === String(c._id)).map((r) => (
                    <div key={r._id} className="flex gap-2">
                      <Avatar src={r.author?.avatarUrl} name={r.author?.displayName} username={r.author?.username} size="xs" />
                      <div className="flex-1 bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 rounded-xl px-3 py-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100">
                            {r.author?.displayName || r.author?.username}
                          </span>
                          <span className="text-[10px] text-slate-400">{formatDate(r.createdAt)}</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">{r.content}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                          <button
                            onClick={() => handleCommentLike(r._id)}
                            className={r._liked ? "text-rose-500 font-bold" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}
                          >
                            ♥ {r.likesCount || 0}
                          </button>
                          {String(r.author?._id) !== String(user?._id || user?.id) && (
                            <ReportButton targetType="comment" targetId={r._id} />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Reply Banner */}
      {replyTo && (
        <div className="flex items-center justify-between rounded-xl bg-brand-500/10 border border-brand-500/20 px-3 py-1.5 text-xs text-brand-600 dark:text-brand-300 font-medium">
          <span>Replying to @{replyTo.author?.username}</span>
          <button type="button" onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="flex gap-2.5 items-center">
        <Avatar
          src={user?.avatarUrl}
          name={user?.displayName}
          username={user?.username}
          size="xs"
        />
        <div className="flex-1 flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Write a comment…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={500}
            className="flex-1 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none"
          />
          <button
            type="submit"
            disabled={!text.trim() || submitting}
            className="text-brand-600 dark:text-brand-400 hover:opacity-80 disabled:opacity-30 transition-all flex-shrink-0"
            title="Post comment"
          >
            {submitting ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
