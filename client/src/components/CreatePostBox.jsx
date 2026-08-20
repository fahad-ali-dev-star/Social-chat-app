import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { usePostStore } from "../store/postStore";
import Avatar from "./Avatar";
import api from "../api/client";

const MAX_CHARS = 280;

const ImageIcon = () => (
  <svg className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-6-3.75h.008v.008H15V8.25z" />
  </svg>
);

const XIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

  // Custom media fit and carousel preview state
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
        // Focus on the first newly added image
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

  const charRingColor =
    remaining < 0 ? "text-red-400" :
    remaining < 40 ? "text-amber-400" :
    "text-brand-400";

  return (
    <div className={`glass rounded-2xl p-3 sm:p-4 transition-all duration-300 ${focused ? "shadow-brand" : ""}`}>
      <div className="flex gap-3">
        <Avatar
          src={user?.avatarUrl}
          name={user?.displayName}
          username={user?.username}
          size="md"
          ring={focused}
        />
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            rows={focused ? 3 : 1}
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={handleKeyDown}
            maxLength={MAX_CHARS + 10}
            className="w-full bg-transparent resize-none text-gray-100 placeholder-gray-500 text-sm leading-relaxed outline-none transition-all duration-200"
          />

          {/* Media preview */}
          {(mediaUrls.length > 0 || uploading) && (
            <div className="mt-2 relative animate-fade-in">
              {uploading ? (
                <div className="h-32 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-gray-400 text-sm">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Uploading…
                </div>
              ) : (
                <div className="relative w-full h-[280px] sm:h-[360px] bg-black/40 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center group/preview">
                  {mediaType === "video" ? (
                    <video
                      ref={videoRef}
                      src={mediaUrls[activePreviewIdx || 0]}
                      controls
                      className={`w-full h-full ${
                        mediaFit === "cover" ? "object-cover" : "object-contain"
                      }`}
                    />
                  ) : (
                    <img
                      src={mediaUrls[activePreviewIdx || 0]}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Previous Button */}
                  {(activePreviewIdx || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setActivePreviewIdx(i => i - 1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/80 border border-white/10 rounded-full text-white text-xs backdrop-blur z-20"
                    >
                      ◀
                    </button>
                  )}

                  {/* Next Button */}
                  {(activePreviewIdx || 0) < mediaUrls.length - 1 && (
                    <button
                      type="button"
                      onClick={() => setActivePreviewIdx(i => i + 1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/80 border border-white/10 rounded-full text-white text-xs backdrop-blur z-20"
                    >
                      ▶
                    </button>
                  )}

                  {/* Remove Current Slide Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setMediaUrls(list => {
                        const newList = list.filter((_, i) => i !== activePreviewIdx);
                        if (activePreviewIdx >= newList.length && newList.length > 0) {
                          setActivePreviewIdx(newList.length - 1);
                        }
                        return newList;
                      });
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full hover:bg-black/90 text-white transition-all z-20"
                    title="Remove this image"
                  >
                    <XIcon />
                  </button>

                  {/* Slide index label */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white rounded text-[10px] font-semibold backdrop-blur border border-white/5 z-20">
                    {activePreviewIdx + 1} / {mediaUrls.length}
                  </div>

                  {/* Dots Indicator */}
                  {mediaUrls.length > 1 && (
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-20">
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

                  {/* Fit mode display text */}
                  <div className="absolute bottom-3 left-3 px-2 py-0.5 bg-black/60 text-white rounded text-[10px] font-semibold backdrop-blur border border-white/5 z-20">
                    {mediaFit === "cover" ? "Crop (Cover)" : "Full Fit (Contain)"}
                  </div>
                </div>
              )}
            </div>
          )}

          {(focused || content || mediaUrls.length > 0) && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-3 pt-3 border-t border-white/8 animate-fade-in">
              <div className="flex flex-wrap items-center gap-1">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  id="post-file-input"
                />
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-gray-300 outline-none"
                  title="Post visibility"
                >
                  <option value="public">🌍 Public</option>
                  <option value="followers">👥 Followers</option>
                  <option value="private">🔒 Only me</option>
                </select>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload Image/Video"
                  disabled={uploading}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 hover:border-emerald-500/40 bg-white/5 hover:bg-emerald-500/10 transition-all duration-200 ${
                    mediaUrls.length > 0 ? "border-emerald-500/50 bg-emerald-500/15" : ""
                  } disabled:opacity-40`}
                >
                  <ImageIcon />
                  <span className="text-xs font-semibold text-gray-300 group-hover:text-emerald-400 transition-colors">
                    {mediaUrls.length > 0 ? `${mediaUrls.length} Media` : "Photo/Video"}
                  </span>
                </button>

                {/* Media Fit Toggle Button */}
                {mediaUrls.length > 0 && (
                  <button
                    onClick={() => setMediaFit((f) => (f === "cover" ? "contain" : "cover"))}
                    type="button"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 transition-all duration-200"
                    title="Toggle Crop (Cover) / Full Fit (Contain)"
                  >
                    {mediaFit === "cover" ? "⬜ Cover" : "⛶ Fit"}
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3">
                <span className={`text-xs font-medium tabular-nums ${charRingColor}`}>
                  {remaining}
                </span>
                <button
                  onClick={handlePost}
                  disabled={!canPost || loading}
                  className="btn-brand px-5 py-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
                >
                  {loading ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <>Post <span className="opacity-60 text-[10px]">⌘↵</span></>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
