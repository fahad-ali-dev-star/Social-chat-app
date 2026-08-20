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
    strokeWidth={filled ? 0 : 1.5}
    className="w-4 h-4 transition-all duration-200"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
    />
  </svg>
);

const CommentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const BookmarkIcon = ({ filled }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : 1.5} className="w-4 h-4 transition-all duration-200">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
  </svg>
);

const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
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
  const shareRef = useRef(null);
  const scrollRef = useRef(null);
  const videoRef = useRef(null);
  const location = useLocation();

  // Stop video playback when navigating away, switching tabs, or unmounting
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const handleVisibilityChange = () => {
      if (document.hidden && videoEl) {
        try { videoEl.pause(); } catch {}
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Pause video when scrolled out of view
    let observer;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting && videoEl) {
              try { videoEl.pause(); } catch {}
            }
          });
        },
        { threshold: 0.2 }
      );
      observer.observe(videoEl);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (observer) observer.disconnect();
      if (videoEl) {
        try { videoEl.pause(); } catch {}
      }
    };
  }, [location, post._id]);

  const handleVideoPlay = (e) => {
    const allMedia = document.querySelectorAll("video, audio");
    allMedia.forEach((m) => {
      if (m !== e.target && !m.paused) {
        m.pause();
      }
    });
  };

  const handleScroll = (e) => {
    const container = e.target;
    const scrollLeft = container.scrollLeft;
    const width = container.clientWidth;
    if (width > 0) {
      const idx = Math.round(scrollLeft / width);
      setActiveMediaIdx(idx);
    }
  };

  const scrollToIdx = (idx) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: idx * scrollRef.current.clientWidth,
        behavior: "smooth",
      });
      setActiveMediaIdx(idx);
    }
  };

  // Close share modal on outside click
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
  const PREVIEW_LEN = 200;
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
    setTimeout(() => setLikeAnim(false), 400);
    await toggleLike(post._id);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this post?")) return;
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
    <article className="glass rounded-2xl p-3 sm:p-4 animate-fade-in hover:border-white/10 transition-all duration-300 relative">
      {/* Pinned Badge */}
      {post.isPinned && (
        <div className="flex items-center gap-1.5 text-xs text-brand-400 font-semibold mb-2.5 pb-2 border-b border-white/5">
          <span>📌 Pinned Post</span>
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
            className="group-hover:scale-105 transition-transform"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold text-white truncate group-hover:text-brand-400 transition-colors">
                {post.author?.displayName || post.author?.username}
              </p>
              {post.author?.isVerified && (
                <VerifiedBadge size="xs" />
              )}
            </div>
            <p className="text-xs text-gray-500">
              @{post.author?.username} · {formatDate(post.createdAt)}
              {post.isEdited && <span className="ml-1 text-[10px] text-gray-600">(edited)</span>}
            </p>
          </div>
        </Link>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="icon-btn text-gray-500 hover:text-white"
            title="Post Options"
          >
            •••
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-36 glass-lg rounded-xl overflow-hidden shadow-xl z-20 p-1 border border-white/10">
              {isOwner ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-white/10 rounded-lg transition-all flex items-center gap-2"
                  >
                    ✏️ Edit Post
                  </button>
                  <button
                    onClick={() => {
                      togglePinPost(post._id);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-white/10 rounded-lg transition-all flex items-center gap-2"
                  >
                    📌 {post.isPinned ? "Unpin Post" : "Pin to Profile"}
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleDelete();
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex items-center gap-2"
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
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-white/10 rounded-lg transition-all flex items-center gap-2"
                  >
                    🔗 Copy Link
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      toggleBookmark(post._id);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-white/10 rounded-lg transition-all flex items-center gap-2"
                  >
                    📑 {isBookmarked ? "Remove Bookmark" : "Save Post"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mt-3 pl-0 sm:pl-[52px]">
        {isEditing ? (
          <div className="space-y-2 animate-fade-in mb-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="field w-full text-sm resize-none"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsEditing(false)}
                className="btn-ghost text-xs py-1 px-3"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="btn-brand text-xs py-1 px-3"
              >
                {savingEdit ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap break-words">
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
                        className="text-brand-400 font-semibold hover:underline"
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
                className="text-xs text-brand-400 hover:text-brand-300 mt-1 font-medium"
              >
                {expanded ? "Show less" : "See more"}
              </button>
            )}
          </>
        )}

        {/* Media (Images, Video, and Layers) */}
        {(() => {
          const mediaList = post.mediaUrls && post.mediaUrls.length > 0 ? post.mediaUrls : post.mediaUrl ? [post.mediaUrl] : [];
          if (mediaList.length === 0) return null;

          const isVideo = post.mediaType === "video" || mediaList[0]?.match(/\.(mp4|webm|ogg)$/i);

          return (
            <div className="mt-3 relative w-full h-[320px] sm:h-[420px] md:h-[480px] bg-black/40 rounded-xl overflow-hidden border border-white/5 group/media flex items-center justify-center">
              {/* Media Element */}
              {isVideo ? (
                <video
                  ref={videoRef}
                  src={mediaList[0]}
                  controls
                  onPlay={handleVideoPlay}
                  className={`w-full h-full transition-all duration-300 ${
                    viewFit === "cover" ? "object-cover" : "object-contain"
                  }`}
                />
              ) : mediaList.length === 1 ? (
                <img
                  src={mediaList[0]}
                  alt="Post media"
                  loading="lazy"
                  className="w-full h-full transition-all duration-300 object-cover"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              ) : (
                <div className="w-full h-full relative group/carousel">
                  {/* Horizontally scrollable container with CSS snap */}
                  <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none"
                  >
                    {mediaList.map((url, idx) => (
                      <div
                        key={idx}
                        className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center"
                      >
                        <img
                          src={url}
                          alt="Post media"
                          loading="lazy"
                          className="w-full h-full transition-all duration-300 object-cover"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Previous button (hidden on touch, shown on hover) */}
                  {(activeMediaIdx || 0) > 0 && (
                    <button
                      onClick={() => scrollToIdx(activeMediaIdx - 1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur border border-white/10 transition-all z-30 hidden md:block opacity-0 group-hover/carousel:opacity-100"
                    >
                      ◀
                    </button>
                  )}

                  {/* Next button (hidden on touch, shown on hover) */}
                  {(activeMediaIdx || 0) < mediaList.length - 1 && (
                    <button
                      onClick={() => scrollToIdx(activeMediaIdx + 1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur border border-white/10 transition-all z-30 hidden md:block opacity-0 group-hover/carousel:opacity-100"
                    >
                      ▶
                    </button>
                  )}

                  {/* Dots indicator */}
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-30">
                    {mediaList.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => scrollToIdx(idx)}
                        className={`w-2 h-2 rounded-full transition-all p-0 border-none outline-none ${
                          (activeMediaIdx || 0) === idx ? "bg-white scale-125" : "bg-white/40"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}



              {/* Toggle Fit Button */}
              <button
                onClick={() => setViewFit((f) => (f === "cover" ? "contain" : "cover"))}
                title={viewFit === "cover" ? "Show Full Fit (Contain)" : "Show Crop (Cover)"}
                className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 hover:bg-black/80 text-white rounded-lg text-xs font-semibold backdrop-blur border border-white/10 opacity-0 group-hover/media:opacity-100 transition-all duration-200 z-40 flex items-center gap-1"
              >
                {viewFit === "cover" ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                    </svg>
                    <span>Fit</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>Fill</span>
                  </>
                )}
              </button>
            </div>
          );
        })()}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-1 mt-3 -ml-1">
          <button
            onClick={handleLike}
            className={`post-action ${liked ? "text-rose-400 hover:text-rose-300 hover:bg-rose-500/10" : ""}`}
            aria-label={liked ? "Unlike" : "Like"}
          >
            <span className={liked && likeAnim ? "animate-heart-pop inline-block" : "inline-block"}>
              <HeartIcon filled={liked} />
            </span>
            <span>{likesCount}</span>
          </button>

          <button
            onClick={() => setShowComments((s) => !s)}
            className={`post-action ${showComments ? "text-brand-400 hover:text-brand-300 hover:bg-brand-500/10" : ""}`}
            aria-label="Comments"
          >
            <CommentIcon />
            <span>{commentCount}</span>
          </button>

          {/* Share Button */}
          <div className="relative" ref={shareRef}>
            <button
              onClick={() => { setShareOpen((o) => !o); setDmQuery(""); setDmResults([]); }}
              className={`post-action ${shareOpen ? "text-emerald-400 bg-emerald-500/10" : ""}`}
              aria-label="Share post"
              title="Share post"
            >
              <ShareIcon />
              <span className="text-[11px]">Share</span>
            </button>

            {shareOpen && (
              <div className="absolute bottom-10 left-0 w-[min(18rem,calc(100vw-2rem))] glass-lg rounded-2xl border border-white/10 shadow-2xl z-30 p-3 space-y-3 animate-fade-in">
                <p className="text-xs font-bold text-white px-1">Share Post</p>

                {/* Copy Link */}
                <button
                  onClick={handleCopyLink}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    copyDone ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 hover:bg-white/10 text-gray-200"
                  }`}
                >
                  <span className="text-lg">{copyDone ? "✅" : "🔗"}</span>
                  <span className="font-medium text-xs">{copyDone ? "Link Copied!" : "Copy Post Link"}</span>
                </button>

                {/* Divider */}
                <div className="border-t border-white/8" />

                {/* Send to DM */}
                <div className="space-y-2">
                  <p className="text-[10px] text-gray-500 px-1 font-semibold uppercase tracking-wide">Forward to DM</p>
                  <input
                    type="text"
                    value={dmQuery}
                    onChange={(e) => handleDmSearch(e.target.value)}
                    placeholder="Search users…"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500/50 transition-all"
                  />
                  {dmSearching && <p className="text-center text-xs text-gray-500 py-1">Searching…</p>}
                  {dmResults.length > 0 && (
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {dmResults.map((u) => (
                        <button
                          key={u._id}
                          onClick={() => handleSendToDM(u)}
                          disabled={dmSending === u._id}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all text-left ${
                            dmSent === u._id
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "hover:bg-white/8 text-gray-200"
                          }`}
                        >
                          <Avatar src={u.avatarUrl} name={u.displayName} username={u.username} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{u.displayName || u.username}</p>
                            <p className="text-[10px] text-gray-500 truncate">@{u.username}</p>
                          </div>
                          <span className="text-xs flex-shrink-0">
                            {dmSent === u._id ? "✅ Sent" : dmSending === u._id ? "…" : "Send →"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {!isOwner && <ReportButton targetType="post" targetId={post._id} className="ml-2" />}

          <button
            onClick={() => toggleBookmark(post._id)}
            className={`post-action ml-auto ${isBookmarked ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10" : ""}`}
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
            title={isBookmarked ? "Remove bookmark" : "Save post"}
          >
            <BookmarkIcon filled={isBookmarked} />
          </button>
        </div>

        {/* Comments */}
        {showComments && (
          <div className="mt-3 animate-slide-up">
            <CommentPanel postId={post._id} onCommentAdded={onCommentAdded} />
          </div>
        )}
      </div>
    </article>
  );
}
