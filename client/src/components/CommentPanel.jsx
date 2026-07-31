import { useState, useEffect, useRef } from "react";
import api from "../api/client";
import { useAuthStore } from "../store/authStore";
import Avatar from "./Avatar";
import ReportButton from "./ReportButton";

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
    // Focus input when panel opens
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/posts/${postId}/comments`, { content: text.trim(), parentComment: replyTo?._id || null });
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
      setComments((prev) => prev.map((c) => c._id === commentId ? { ...c, _liked: data.liked, likesCount: data.likesCount } : c));
    } catch (err) { console.error("Failed to like comment", err); }
  };

  return (
    <div className="space-y-3">
      {/* Comment list */}
      {loading ? (
        <div className="flex justify-center py-4">
          <svg className="w-5 h-5 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {comments.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-3">No comments yet. Be the first!</p>
          ) : (
            comments.filter((c) => !c.parentComment).map((c) => (
              <div key={c._id} className="animate-fade-in">
                <div className="flex gap-2.5">
                  <Avatar src={c.author?.avatarUrl} name={c.author?.displayName} username={c.author?.username} size="xs" />
                  <div className="flex-1 bg-white/4 rounded-xl px-3 py-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-gray-300">{c.author?.displayName || c.author?.username}</span>
                      <span className="text-[10px] text-gray-600">{formatDate(c.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-300 mt-0.5 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                    <div className="flex gap-3 mt-2 text-[10px]">
                      <button onClick={() => handleCommentLike(c._id)} className={c._liked ? "text-brand-400" : "text-gray-500 hover:text-gray-300"}>♥ {c.likesCount || 0}</button>
                      <button onClick={() => { setReplyTo(c); inputRef.current?.focus(); }} className="text-gray-500 hover:text-gray-300">Reply</button>
                      {String(c.author?._id) !== String(user?._id || user?.id) && <ReportButton targetType="comment" targetId={c._id} />}
                    </div>
                  </div>
                </div>
                <div className="ml-9 mt-1.5 space-y-1.5">
                  {comments.filter((r) => String(r.parentComment?._id || r.parentComment) === String(c._id)).map((r) => (
                    <div key={r._id} className="flex gap-2">
                      <Avatar src={r.author?.avatarUrl} name={r.author?.displayName} username={r.author?.username} size="xs" />
                      <div className="flex-1 bg-white/3 rounded-lg px-2.5 py-1.5">
                        <span className="text-[10px] font-semibold text-gray-300">{r.author?.displayName || r.author?.username}</span>
                        <p className="text-[11px] text-gray-400">{r.content}</p>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleCommentLike(r._id)} className={r._liked ? "text-brand-400 text-[10px]" : "text-gray-600 text-[10px]"}>♥ {r.likesCount || 0}</button>
                          {String(r.author?._id) !== String(user?._id || user?.id) && <ReportButton targetType="comment" targetId={r._id} />}
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

      {replyTo && (
        <div className="flex items-center justify-between rounded-lg bg-brand-500/10 border border-brand-500/20 px-3 py-2 text-[10px] text-brand-300">
          Replying to @{replyTo.author?.username}
          <button type="button" onClick={() => setReplyTo(null)} className="text-gray-500 hover:text-white">✕</button>
        </div>
      )}

      {/* Add comment */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <Avatar
          src={user?.avatarUrl}
          name={user?.displayName}
          username={user?.username}
          size="xs"
        />
        <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Write a comment…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={500}
            className="flex-1 bg-transparent text-xs text-gray-200 placeholder-gray-600 outline-none"
          />
          <button
            type="submit"
            disabled={!text.trim() || submitting}
            className="text-brand-400 hover:text-brand-300 disabled:text-gray-600 transition-colors flex-shrink-0"
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
