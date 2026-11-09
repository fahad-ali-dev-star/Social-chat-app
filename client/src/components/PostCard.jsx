import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { usePostStore } from "../store/postStore";
import { useMessageStore } from "../store/messageStore";
import Avatar from "./Avatar";
import CommentPanel from "./CommentPanel";
import api from "../api/client";
import ReportButton from "./ReportButton";
import VerifiedBadge from "./VerifiedBadge";

function formatDate(iso) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const HeartIcon = ({ filled }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={filled ? 0 : 1.75}
    className="w-4 h-4 transition-all duration-150"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
    />
  </svg>
);

const CommentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
  </svg>
);

const BookmarkIcon = ({ filled }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : 1.75} className="w-4 h-4 transition-all duration-150">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
  </svg>
);

const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
  </svg>
);

export default function PostCard({ post, myUserId }) {
  const toggleLike = usePostStore((s) => s.toggleLike);
  const deletePost = usePostStore((s) => s.deletePost);
  const updatePost = usePostStore((s) => s.updatePost);
  const togglePinPost = usePostStore((s) => s.togglePinPost);
  const updateCommentCount = usePostStore((s) => s.updateCommentCount);
  const toggleBookmark = usePostStore((s) => s.toggleBookmark);
  const bookmarkedIds = usePostStore((s) => s.bookmarkedIds);

  const navigate = useNavigate();
  const getOrCreateConversation = useMessageStore((s) => s.getOrCreateConversation);
  const sendMessage = useMessageStore((s) => s.sendMessage);

  const [liked, setLiked] = useState(post._liked ?? false);
  const [likesCount, setLikesCount] = useState(
    post.likesCount ?? post.likes?.length ?? 0
  );
  const [commentCount, setCommentCount] = useState(post.commentCount ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);
  const [viewFit, setViewFit] = useState(post.mediaFit || "cover");

  // Edit post state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content || "");
  const [savingEdit, setSavingEdit] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Share state
  const [shareOpen, setShareOpen] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const [dmQuery, setDmQuery] = useState("");
  const [dmResults, setDmResults] = useState([]);
  const [dmSearching, setDmSearching] = useState(false);
  const [dmSending, setDmSending] = useState(null);
  const [dmSent, setDmSent] = useState(null);

  const scrollRef = useRef(null);
  const videoRef = useRef(null);
  const shareRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    return () => {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    };
  }, [location]);

  const handleVideoPlay = () => {
    const allVideos = document.querySelectorAll("video");
    allVideos.forEach((v) => {
      if (v !== videoRef.current && !v.paused) v.pause();
    });
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const idx = Math.round(scrollRef.current.scrollLeft / scrollRef.current.clientWidth);
      setActiveMediaIdx(idx);
    }
  };

  const scrollToIdx = (idx) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: idx * scrollRef.current.clientWidth,
        behavior: "smooth"
      });
      setActiveMediaIdx(idx);
    }
  };

  useEffect(() => {
    if (!shareOpen) return;
    const handler = (e) => {
      if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [shareOpen]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/post/${post._id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  };

  const handleDmSearch = async (q) => {
    setDmQuery(q);
    if (!q.trim()) { setDmResults([]); return; }
    setDmSearching(true);
    try {
      const { data } = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
      setDmResults(data.users || []);
    } catch { setDmResults([]); }
    finally { setDmSearching(false); }
  };

  const handleSendToDM = async (recipient) => {
    setDmSending(recipient._id);
    try {
      const conv = await getOrCreateConversation(recipient._id);
      const shareText = `📤 Shared a post:\n${post.content ? `"${post.content.slice(0, 120)}${post.content.length > 120 ? '…' : ''}"` : ''}\n🔗 ${window.location.origin}/post/${post._id}`;
      await sendMessage(conv._id, shareText);
      setDmSent(recipient._id);
      setTimeout(() => {
        setDmSent(null);
        setShareOpen(false);
        setDmQuery("");
        setDmResults([]);
      }, 1500);
    } catch { /* silently fail */ }
    finally { setDmSending(null); }
  };

  const authUser = useAuthStore((s) => s.user);
  const currentUserId = String(myUserId || authUser?.id || authUser?._id || "");
  const postAuthorId = typeof post.author === "string" ? post.author : String(post.author?._id || post.author?.id || "");
  const isBookmarked = bookmarkedIds.has(post._id);
  const isOwner = Boolean(currentUserId && postAuthorId && currentUserId === postAuthorId);
  const PREVIEW_LEN = 220;
  const longContent = post.content?.length > PREVIEW_LEN;

  useEffect(() => {
    setLiked(post._liked ?? false);
    setLikesCount(post.likesCount ?? post.likes?.length ?? 0);
    setCommentCount(post.commentCount ?? 0);
    setEditContent(post.content || "");
    setViewFit(post.mediaFit || "cover");
  }, [post]);

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      await updatePost(post._id, editContent);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save edit", err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((c) => c + (newLiked ? 1 : -1));
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 300);
    await toggleLike(post._id);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deletePost(post._id);
    } catch {
      setDeleting(false);
    }
  };

  const onCommentAdded = () => {
    setCommentCount((c) => c + 1);
    updateCommentCount(post._id, 1);
  };

  return (
    <article className="glass p-4 sm:p-5 relative animate-fade-in hover:border-slate-300 dark:hover:border-slate-700/80 transition-all">
      {/* Pinned Badge */}
      {post.isPinned && (
        <div className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 font-bold mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <span>📌 Pinned to profile</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <Link to={`/profile/${post.author?.username}`} className="flex items-center gap-3 group min-w-0">
          <Avatar
            src={post.author?.avatarUrl}
            name={post.author?.displayName}
            username={post.author?.username}
            size="md"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                {post.author?.displayName || post.author?.username}
              </p>
              {post.author?.isVerified && (
                <VerifiedBadge size="xs" />
              )}
            </div>
            <p className="text-xs text-slate-400">
              @{post.author?.username} · {formatDate(post.createdAt)}
              {post.isEdited && <span className="ml-1 text-[10px] text-slate-400">(edited)</span>}
            </p>
          </div>
        </Link>

        {/* Options Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            title="Post options"
          >
            •••
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1.5 w-44 glass-lg rounded-2xl shadow-popover z-30 p-1 animate-slide-up">
              {isOwner ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-all flex items-center gap-2"
                  >
                    ✏️ Edit Post
                  </button>
                  <button
                    onClick={() => {
                      togglePinPost(post._id);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-all flex items-center gap-2"
                  >
                    📌 {post.isPinned ? "Unpin Post" : "Pin Post"}
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleDelete();
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all flex items-center gap-2"
                  >
                    🗑️ Delete Post
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleCopyLink();
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-all flex items-center gap-2"
                  >
                    🔗 Copy Link
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      toggleBookmark(post._id);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-all flex items-center gap-2"
                  >
                    📑 {isBookmarked ? "Remove Bookmark" : "Save Bookmark"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post Body & Content */}
      <div className="mt-3 pl-0 sm:pl-[52px]">
        {isEditing ? (
          <div className="space-y-2 mb-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="field w-full text-sm resize-none"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsEditing(false)}
                className="btn-ghost text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="btn-brand text-xs py-1.5 px-3"
              >
                {savingEdit ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap break-words">
              {(() => {
                const rawText = longContent && !expanded ? post.content.slice(0, PREVIEW_LEN) + "…" : post.content;
                if (!rawText) return null;

                const parts = rawText.split(/(#[a-zA-Z0-9_]+)/g);
                return parts.map((part, i) => {
                  if (part.startsWith("#")) {
                    return (
                      <Link
                        key={i}
                        to={`/search?q=${encodeURIComponent(part)}`}
                        className="text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                      >
                        {part}
                      </Link>
                    );
                  }
                  return part;
                });
              })()}
            </div>
            {longContent && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline mt-1 font-semibold"
              >
                {expanded ? "Show less" : "See more"}
              </button>
            )}
          </>
        )}

        {/* Media (Photos, Carousel & Videos) */}
        {(() => {
          const mediaList = post.mediaUrls && post.mediaUrls.length > 0 ? post.mediaUrls : post.mediaUrl ? [post.mediaUrl] : [];
          if (mediaList.length === 0) return null;

          const isVideo = post.mediaType === "video" || mediaList[0]?.match(/\.(mp4|webm|ogg)$/i);

          return (
            <div className="mt-3 relative w-full max-h-[500px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 group/media flex items-center justify-center">
              {isVideo ? (
                <video
                  ref={videoRef}
                  src={mediaList[0]}
                  controls
                  onPlay={handleVideoPlay}
                  className={`w-full max-h-[500px] ${
                    viewFit === "cover" ? "object-cover" : "object-contain"
                  }`}
                />
              ) : mediaList.length === 1 ? (
                <img
                  src={mediaList[0]}
                  alt="Post media"
                  width="800"
                  height="500"
                  loading="lazy"
                  className={`w-full max-h-[500px] ${
                    viewFit === "cover" ? "object-cover" : "object-contain"
                  }`}
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              ) : (
                <div className="w-full max-h-[500px] relative group/carousel">
                  <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="w-full flex overflow-x-auto snap-x snap-mandatory scrollbar-none"
                  >
                    {mediaList.map((url, idx) => (
                      <div
                        key={idx}
                        className="w-full max-h-[500px] flex-shrink-0 snap-center flex items-center justify-center bg-slate-950"
                      >
                        <img
                          src={url}
                          alt="Post media"
                          width="800"
                          height="500"
                          loading="lazy"
                          className={`w-full max-h-[500px] ${
                            viewFit === "cover" ? "object-cover" : "object-contain"
                          }`}
                        />
                      </div>
                    ))}
                  </div>

                  {(activeMediaIdx || 0) > 0 && (
                    <button
                      onClick={() => scrollToIdx(activeMediaIdx - 1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm z-30 transition-all"
                    >
                      ◀
                    </button>
                  )}

                  {(activeMediaIdx || 0) < mediaList.length - 1 && (
                    <button
                      onClick={() => scrollToIdx(activeMediaIdx + 1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm z-30 transition-all"
                    >
                      ▶
                    </button>
                  )}

                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-30">
                    {mediaList.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => scrollToIdx(idx)}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          (activeMediaIdx || 0) === idx ? "bg-white scale-125" : "bg-white/40"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Fit Toggle Pill */}
              <button
                onClick={() => setViewFit((f) => (f === "cover" ? "contain" : "cover"))}
                className="absolute top-3 left-3 px-2 py-1 bg-black/60 hover:bg-black/80 text-white rounded-lg text-[10px] font-semibold backdrop-blur-sm transition-all z-40 opacity-0 group-hover/media:opacity-100"
              >
                {viewFit === "cover" ? "Fit" : "Fill"}
              </button>
            </div>
          );
        })()}

        {/* Action Bar */}
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-850">
          {/* Like */}
          <button
            onClick={handleLike}
            className={`post-action ${liked ? "text-rose-500 font-bold bg-rose-50 dark:bg-rose-500/10" : ""}`}
            aria-label={liked ? "Unlike" : "Like"}
          >
            <span className={liked && likeAnim ? "scale-125 transition-transform" : ""}>
              <HeartIcon filled={liked} />
            </span>
            <span>{likesCount}</span>
          </button>

          {/* Comment */}
          <button
            onClick={() => setShowComments((s) => !s)}
            className={`post-action ${showComments ? "text-brand-600 dark:text-brand-400 font-bold bg-brand-50 dark:bg-brand-500/10" : ""}`}
            aria-label="Comments"
          >
            <CommentIcon />
            <span>{commentCount}</span>
          </button>

          {/* Share */}
          <div className="relative" ref={shareRef}>
            <button
              onClick={() => { setShareOpen((o) => !o); setDmQuery(""); setDmResults([]); }}
              className={`post-action ${shareOpen ? "text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10" : ""}`}
              aria-label="Share post"
              title="Share post"
            >
              <ShareIcon />
              <span>Share</span>
            </button>

            {shareOpen && (
              <div className="absolute bottom-10 left-0 w-72 glass-lg rounded-2xl shadow-popover z-30 p-3.5 space-y-3 animate-slide-up">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Share Post</p>

                {/* Copy Link */}
                <button
                  onClick={handleCopyLink}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${
                    copyDone
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{copyDone ? "✓ Link Copied!" : "🔗 Copy Post Link"}</span>
                </button>

                <div className="border-t border-slate-100 dark:border-slate-800" />

                {/* Send to DM */}
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Send via Direct Message</p>
                  <input
                    type="text"
                    value={dmQuery}
                    onChange={(e) => handleDmSearch(e.target.value)}
                    placeholder="Search users…"
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500"
                  />
                  {dmSearching && <p className="text-center text-xs text-slate-400 py-1">Searching…</p>}
                  {dmResults.length > 0 && (
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {dmResults.map((u) => (
                        <button
                          key={u._id}
                          onClick={() => handleSendToDM(u)}
                          disabled={dmSending === u._id}
                          className="w-full flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-left"
                        >
                          <Avatar src={u.avatarUrl} name={u.displayName} username={u.username} size="xs" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{u.displayName || u.username}</p>
                            <p className="text-[10px] text-slate-400 truncate">@{u.username}</p>
                          </div>
                          <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex-shrink-0">
                            {dmSent === u._id ? "✓ Sent" : dmSending === u._id ? "…" : "Send"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {!isOwner && <ReportButton targetType="post" targetId={post._id} className="ml-1" />}

          {/* Bookmark */}
          <button
            onClick={() => toggleBookmark(post._id)}
            className={`post-action ml-auto ${isBookmarked ? "text-amber-500 font-bold bg-amber-50 dark:bg-amber-500/10" : ""}`}
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
            title={isBookmarked ? "Remove bookmark" : "Save post"}
          >
            <BookmarkIcon filled={isBookmarked} />
          </button>
        </div>

        {/* Comments Accordion */}
        {showComments && (
          <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 animate-slide-up">
            <CommentPanel postId={post._id} onCommentAdded={onCommentAdded} />
          </div>
        )}
      </div>
    </article>
  );
}
