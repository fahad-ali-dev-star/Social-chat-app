import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { usePostStore } from "../store/postStore";
import Avatar from "./Avatar";
import api from "../api/client";

const MAX_CHARS = 280;

const ImageIcon = () => (
  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-6-3.75h.008v.008H15V8.25z" />
  </svg>
);

const XIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function CreatePostBox() {
  const user = useAuthStore((s) => s.user);
  const createPost = usePostStore((s) => s.createPost);
  const [content, setContent] = useState("");
  const [mediaUrls, setMediaUrls] = useState([]);
  const [mediaType, setMediaType] = useState("image");
  const [visibility, setVisibility] = useState("public");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  const [mediaFit, setMediaFit] = useState("cover");
  const [activePreviewIdx, setActivePreviewIdx] = useState(0);

  useEffect(() => {
    return () => {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    };
  }, []);

  const remaining = MAX_CHARS - content.length;
  const canPost = (content.trim().length > 0 || mediaUrls.length > 0) && remaining >= 0 && !uploading;

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls = [];
      let detectedType = "image";

      for (const file of files) {
        if (file.type.startsWith("video")) detectedType = "video";
        const formData = new FormData();
        formData.append("file", file);
        const { data } = await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        uploadedUrls.push(data.url);
      }

      setMediaUrls((prev) => {
        const nextList = [...prev, ...uploadedUrls];
        setActivePreviewIdx(prev.length);
        return nextList;
      });
      setMediaType(detectedType);
    } catch (err) {
      console.error("Upload failed", err);
      alert("Media upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePost = async () => {
    if (!canPost || loading) return;
    setLoading(true);
    try {
      await createPost(content.trim(), mediaUrls[0] || "", mediaUrls, mediaType, visibility, mediaFit);
      setContent("");
      setMediaUrls([]);
      setMediaType("image");
      setMediaFit("cover");
      setActivePreviewIdx(0);
      setFocused(false);
    } catch (err) {
      console.error("Failed to create post", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handlePost();
  };

  const charCountColor =
    remaining < 0
      ? "text-rose-500 font-bold"
      : remaining < 30
      ? "text-amber-500 font-medium"
      : "text-slate-400";

  return (
    <div className={`glass p-3.5 sm:p-4.5 transition-all duration-200 ${focused ? "ring-2 ring-brand-500/20" : ""}`}>
      <div className="flex gap-3.5">
        <Avatar
          src={user?.avatarUrl}
          name={user?.displayName}
          username={user?.username}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            rows={focused ? 3 : 2}
            placeholder="Share something with your network..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={handleKeyDown}
            maxLength={MAX_CHARS + 10}
            className="w-full bg-transparent resize-none text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm leading-relaxed outline-none transition-all"
          />

          {/* Media preview */}
          {(mediaUrls.length > 0 || uploading) && (
            <div className="mt-2.5 relative animate-fade-in">
              {uploading ? (
                <div className="h-28 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 text-slate-500 text-xs font-medium">
                  <svg className="w-4 h-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Uploading media…
                </div>
              ) : (
                <div className="relative w-full max-h-[360px] bg-slate-950 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex items-center justify-center group/preview">
                  {mediaType === "video" ? (
                    <video
                      ref={videoRef}
                      src={mediaUrls[activePreviewIdx || 0]}
                      controls
                      className={`w-full max-h-[360px] ${
                        mediaFit === "cover" ? "object-cover" : "object-contain"
                      }`}
                    />
                  ) : (
                    <img
                      src={mediaUrls[activePreviewIdx || 0]}
                      alt="Preview"
                      className={`w-full max-h-[360px] ${
                        mediaFit === "cover" ? "object-cover" : "object-contain"
                      }`}
                    />
                  )}

                  {/* Previous Button */}
                  {(activePreviewIdx || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setActivePreviewIdx((i) => i - 1)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full text-white text-xs flex items-center justify-center backdrop-blur-sm z-20"
                    >
                      ◀
                    </button>
                  )}

                  {/* Next Button */}
                  {(activePreviewIdx || 0) < mediaUrls.length - 1 && (
                    <button
                      type="button"
                      onClick={() => setActivePreviewIdx((i) => i + 1)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full text-white text-xs flex items-center justify-center backdrop-blur-sm z-20"
                    >
                      ▶
                    </button>
                  )}

                  {/* Remove Slide */}
                  <button
                    type="button"
                    onClick={() => {
                      setMediaUrls((list) => {
                        const newList = list.filter((_, i) => i !== activePreviewIdx);
                        if (activePreviewIdx >= newList.length && newList.length > 0) {
                          setActivePreviewIdx(newList.length - 1);
                        }
                        return newList;
                      });
                    }}
                    className="absolute top-2.5 right-2.5 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-all z-20"
                    title="Remove item"
                  >
                    <XIcon />
                  </button>

                  {/* Slide index badge */}
                  {mediaUrls.length > 1 && (
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-black/60 text-white rounded-md text-[10px] font-semibold backdrop-blur-sm z-20">
                      {activePreviewIdx + 1} / {mediaUrls.length}
                    </div>
                  )}

                  {/* Dots Indicator */}
                  {mediaUrls.length > 1 && (
                    <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5 z-20">
                      {mediaUrls.map((_, idx) => (
                        <span
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${
                            (activePreviewIdx || 0) === idx ? "bg-white scale-125" : "bg-white/40"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              {/* File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileSelect}
                id="post-file-input"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-50"
              >
                <ImageIcon />
                <span>{mediaUrls.length > 0 ? `${mediaUrls.length} File${mediaUrls.length > 1 ? "s" : ""}` : "Photo / Video"}</span>
              </button>

              {/* Visibility Selector */}
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="public">🌍 Public</option>
                <option value="followers">👥 Followers</option>
                <option value="private">🔒 Only me</option>
              </select>

              {/* Fit Mode Button */}
              {mediaUrls.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMediaFit((f) => (f === "cover" ? "contain" : "cover"))}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  title="Toggle Crop / Contain"
                >
                  {mediaFit === "cover" ? "Cover" : "Contain"}
                </button>
              )}
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 ml-auto">
              <span className={`text-xs tabular-nums ${charCountColor}`}>
                {remaining}
              </span>
              <button
                onClick={handlePost}
                disabled={!canPost || loading}
                className="btn-brand text-xs px-4 py-2"
              >
                {loading ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  "Post"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
