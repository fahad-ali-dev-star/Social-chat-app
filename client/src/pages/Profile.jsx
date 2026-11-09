import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuthStore } from "../store/authStore";
import { useMessageStore } from "../store/messageStore";
import Avatar from "../components/Avatar";
import PostCard from "../components/PostCard";
import UserListModal from "../components/UserListModal";
import ReportButton from "../components/ReportButton";
import VerifiedBadge from "../components/VerifiedBadge";

export default function Profile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [requested, setRequested] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ displayName: "", bio: "", avatarUrl: "", bannerUrl: "", isPrivate: false });
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const avatarFileRef = useRef(null);
  const bannerFileRef = useRef(null);

  // User list modal state
  const [userModal, setUserModal] = useState({ open: false, title: "", users: [] });

  const isOwn = currentUser?.username === username;

  useEffect(() => {
    setLoading(true);
    setPostsLoading(true);
    Promise.all([
      api.get(`/users/${username}`),
      api.get(`/users/${username}/posts`),
    ]).then(([profRes, postsRes]) => {
      const u = profRes.data.user;
      setProfile(u);
      setFollowersCount(u.followers?.length || 0);
      const relationship = profRes.data.relationship || {};
      setFollowing(Boolean(relationship.isFollowing));
      setRequested(false);
      setEditForm({
        isPrivate: Boolean(u.isPrivate),
        displayName: u.displayName || "",
        bio: u.bio || "",
        avatarUrl: u.avatarUrl || "",
        bannerUrl: u.bannerUrl || "",
      });
      setPosts(postsRes.data.posts || []);
    }).catch(console.error).finally(() => {
      setLoading(false);
      setPostsLoading(false);
    });
  }, [username, currentUser?.id]);

  const handleFollow = async () => {
    if (!profile) return;
    setFollowLoading(true);
    const prev = following;
    setFollowing(!prev);
    setFollowersCount((c) => c + (prev ? -1 : 1));
    try {
      const { data } = await api.post(`/users/${profile._id}/follow`);
      setFollowing(Boolean(data.following));
      setRequested(Boolean(data.requested));
      setFollowersCount(data.followersCount);
    } catch {
      setFollowing(prev);
      setFollowersCount((c) => c + (prev ? 1 : -1));
    } finally {
      setFollowLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!profile) return;
    if (!window.confirm(`${blocked ? "Unblock" : "Block"} @${profile.username}?`)) return;
    try {
      const { data } = await api.post(`/users/${profile._id}/block`);
      setBlocked(Boolean(data.blocked));
      if (data.blocked) {
        setFollowing(false);
        setRequested(false);
        setPosts([]);
      }
    } catch (err) { console.error("Failed to update block status", err); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put("/users/profile", editForm);
      setProfile(data.user);
      setEditing(false);
    } catch (err) {
      console.error("Failed to update profile", err);
      alert(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setEditForm((f) => ({ ...f, avatarUrl: data.url }));
    } catch (err) {
      console.error("Avatar upload failed", err);
      alert("Avatar upload failed. Please try again.");
    } finally {
      setAvatarUploading(false);
      if (avatarFileRef.current) avatarFileRef.current.value = "";
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setEditForm((f) => ({ ...f, bannerUrl: data.url }));
    } catch (err) {
      console.error("Banner upload failed", err);
      alert("Banner upload failed. Please try again.");
    } finally {
      setBannerUploading(false);
      if (bannerFileRef.current) bannerFileRef.current.value = "";
    }
  };

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="glass p-8 animate-pulse">
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-3 w-24 bg-slate-100 dark:bg-slate-850 rounded" />
          <div className="h-3 w-56 bg-slate-100 dark:bg-slate-850 rounded" />
        </div>
      </div>
    </div>
  );

  if (!profile) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <p className="text-slate-500 text-base">User not found.</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24 sm:pb-8 space-y-5">
      {/* Profile Header Card */}
      <div className="glass overflow-hidden animate-fade-in">
        {/* Banner */}
        <div
          className="h-40 w-full relative bg-cover bg-center"
          style={{
            backgroundImage: profile.bannerUrl
              ? `url(${profile.bannerUrl})`
              : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%)",
          }}
        />

        <div className="px-5 sm:px-6 pb-6">
          {/* Avatar + Actions Row */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 -mt-10 sm:-mt-12 mb-4">
            <Avatar
              src={profile.avatarUrl}
              name={profile.displayName}
              username={profile.username}
              size="xl"
              className="border-4 border-white dark:border-slate-900 shadow-md ring-2 ring-black/5 dark:ring-white/10"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {isOwn ? (
                <button
                  onClick={() => setEditing((e) => !e)}
                  className="btn-ghost text-xs px-4 py-2 font-semibold"
                >
                  {editing ? "Cancel" : "Edit Profile"}
                </button>
              ) : (
                <>
                  <button
                    onClick={async () => {
                      const getOrCreateConversation = useMessageStore.getState().getOrCreateConversation;
                      const selectConversation = useMessageStore.getState().selectConversation;
                      const conv = await getOrCreateConversation(profile._id);
                      selectConversation(conv);
                      navigate("/messages");
                    }}
                    className="btn-ghost text-xs px-3.5 py-2 flex items-center gap-1.5 font-semibold"
                  >
                    💬 Message
                  </button>
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={following ? "btn-ghost text-xs px-4 py-2" : "btn-brand text-xs px-4 py-2"}
                  >
                    {followLoading ? (
                      <svg className="w-3.5 h-3.5 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    ) : following ? "Unfollow" : requested ? "Requested" : "Follow"}
                  </button>
                  <button onClick={handleBlock} className="btn-ghost text-xs px-2.5 py-2 text-rose-500">
                    {blocked ? "Unblock" : "Block"}
                  </button>
                  {!blocked && <ReportButton targetType="user" targetId={profile._id} />}
                </>
              )}
            </div>
          </div>

          {/* Name & Bio */}
          {editing ? (
            <form onSubmit={handleSave} className="space-y-3.5 animate-fade-in pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">Display Name</label>
                <input
                  className="field"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
                  placeholder="Your Name"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">Bio</label>
                <textarea
                  className="field resize-none"
                  rows={3}
                  value={editForm.bio}
                  onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="Tell people about yourself…"
                  maxLength={280}
                />
              </div>
              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl px-3.5 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editForm.isPrivate)}
                  onChange={(e) => setEditForm((f) => ({ ...f, isPrivate: e.target.checked }))}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                Private account — only approved followers can see posts
              </label>

              {/* Upload Banner */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">Header Banner</label>
                <input
                  ref={bannerFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="banner-upload"
                  onChange={handleBannerUpload}
                />
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="banner-upload"
                    className={`btn-ghost text-xs cursor-pointer ${bannerUploading ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    {bannerUploading ? "Uploading…" : "Upload Banner"}
                  </label>
                  {editForm.bannerUrl && (
                    <button type="button" onClick={() => setEditForm((f) => ({ ...f, bannerUrl: "" }))} className="text-xs text-rose-500 hover:underline">
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Upload Avatar */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">Avatar Photo</label>
                <input
                  ref={avatarFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="avatar-upload"
                  onChange={handleAvatarUpload}
                />
                <div className="flex items-center gap-3">
                  {editForm.avatarUrl ? (
                    <img src={editForm.avatarUrl} alt="Avatar" width="40" height="40" className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 text-xs">?</div>
                  )}
                  <label
                    htmlFor="avatar-upload"
                    className={`btn-ghost text-xs cursor-pointer ${avatarUploading ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    {avatarUploading ? "Uploading…" : "Upload Avatar"}
                  </label>
                  {editForm.avatarUrl && (
                    <button type="button" onClick={() => setEditForm((f) => ({ ...f, avatarUrl: "" }))} className="text-xs text-rose-500 hover:underline">
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <button type="submit" disabled={saving || avatarUploading || bannerUploading} className="btn-brand text-xs px-4 py-2">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </form>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {profile.displayName || profile.username}
                </h1>
                {profile.isVerified === true && (
                  <VerifiedBadge size="md" />
                )}
              </div>
              <p className="text-xs font-medium text-slate-400">@{profile.username}</p>
              {profile.bio && (
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-2.5 leading-relaxed">{profile.bio}</p>
              )}
            </>
          )}

          {/* Stats Bar */}
          <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-base font-bold text-slate-900 dark:text-white">{posts.length}</p>
              <p className="text-xs text-slate-400">Posts</p>
            </div>
            <button
              onClick={() =>
                setUserModal({
                  open: true,
                  title: "Followers",
                  users: profile.followers || [],
                })
              }
              className="text-left hover:opacity-80 transition-opacity"
            >
              <p className="text-base font-bold text-slate-900 dark:text-white">{followersCount}</p>
              <p className="text-xs font-semibold text-brand-600 dark:text-brand-400">Followers</p>
            </button>
            <button
              onClick={() =>
                setUserModal({
                  open: true,
                  title: "Following",
                  users: profile.following || [],
                })
              }
              className="text-left hover:opacity-80 transition-opacity"
            >
              <p className="text-base font-bold text-slate-900 dark:text-white">{profile.following?.length || 0}</p>
              <p className="text-xs font-semibold text-brand-600 dark:text-brand-400">Following</p>
            </button>
          </div>
        </div>
      </div>

      {/* Followers / Following List Modal */}
      <UserListModal
        isOpen={userModal.open}
        title={userModal.title}
        users={userModal.users}
        onClose={() => setUserModal({ open: false, title: "", users: [] })}
      />

      {/* User's Posts */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Posts</h2>
        {postsLoading ? (
          <div className="flex justify-center py-8">
            <svg className="w-5 h-5 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        ) : posts.length === 0 ? (
          <div className="glass p-10 text-center">
            <div className="text-3xl mb-2">{profile.isPrivate && !following && !isOwn ? "🔒" : "📝"}</div>
            <p className="text-slate-500 text-xs">
              {profile.isPrivate && !following && !isOwn
                ? "This account is private. Follow to view posts."
                : "No posts published yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post._id} post={post} myUserId={currentUser?.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
