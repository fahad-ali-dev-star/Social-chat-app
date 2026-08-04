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
      const { data } = await api.put("/users/me", editForm);
      setProfile((p) => ({ ...p, ...data.user }));
      setEditing(false);
    } catch (err) {
      console.error("Failed to save", err);
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
      <div className="glass rounded-3xl p-8 animate-pulse">
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-white/10" />
          <div className="h-5 w-40 bg-white/10 rounded" />
          <div className="h-3 w-24 bg-white/8 rounded" />
          <div className="h-3 w-56 bg-white/5 rounded" />
        </div>
      </div>
    </div>
  );

  if (!profile) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <p className="text-gray-500 text-lg">User not found.</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-5">
      {/* Profile Card */}
      <div className="glass rounded-3xl overflow-hidden animate-fade-in">
        {/* Banner */}
        <div
          className="h-36 w-full relative bg-cover bg-center"
          style={{
            backgroundImage: profile.bannerUrl
              ? `url(${profile.bannerUrl})`
              : `linear-gradient(135deg, hsl(${(profile.username.charCodeAt(0) * 7) % 360}, 60%, 25%), hsl(${(profile.username.charCodeAt(0) * 7 + 120) % 360}, 60%, 20%))`,
          }}
        />

        <div className="px-6 pb-6">
          {/* Avatar + actions row */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 -mt-12 mb-4">
            <Avatar
              src={profile.avatarUrl}
              name={profile.displayName}
              username={profile.username}
              size="xl"
              ring
              className="border-4 border-surface-900"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {isOwn ? (
                <button
                  onClick={() => setEditing((e) => !e)}
                  className="btn-ghost"
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
                    className="btn-ghost text-xs px-4 py-2 flex items-center gap-1.5"
                  >
                    💬 Message
                  </button>
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      following
                        ? "bg-white/10 text-gray-300 hover:bg-red-500/10 hover:text-red-400 border border-white/10"
                        : "btn-brand"
                    }`}
                  >
                    {followLoading ? (
                      <svg className="w-4 h-4 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    ) : following ? "Unfollow" : requested ? "Requested" : "Follow"}
                  </button>
                  <button onClick={handleBlock} className="btn-ghost text-xs px-3 py-2 text-red-400">
                    {blocked ? "Unblock" : "Block"}
                  </button>
                  {!blocked && <ReportButton targetType="user" targetId={profile._id} />}
                </>
              )}
            </div>
          </div>

          {/* Name + bio */}
          {editing ? (
            <form onSubmit={handleSave} className="space-y-3 animate-fade-in">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Display Name</label>
                <input
                  className="field"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
                  placeholder="Display Name"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Bio</label>
                <textarea
                  className="field resize-none"
                  rows={3}
                  value={editForm.bio}
                  onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="Tell the world about yourself…"
                  maxLength={280}
                />
              </div>
              <label className="flex items-center gap-3 text-xs text-gray-300 bg-white/5 rounded-xl px-3 py-3">
                <input
                  type="checkbox"
                  checked={Boolean(editForm.isPrivate)}
                  onChange={(e) => setEditForm((f) => ({ ...f, isPrivate: e.target.checked }))}
                  className="accent-brand-500"
                />
                Private account — only approved followers can see posts
              </label>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Header Banner Cover</label>
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
                    {bannerUploading ? "Uploading Banner…" : "Upload Cover Banner"}
                  </label>
                  {editForm.bannerUrl && (
                    <button type="button" onClick={() => setEditForm((f) => ({ ...f, bannerUrl: "" }))} className="text-xs text-red-400 hover:text-red-300">
                      Remove Banner
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Profile Photo</label>
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
                    <img src={editForm.avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full object-cover border border-white/10" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-gray-500 text-xs">No photo</div>
                  )}
                  <label
                    htmlFor="avatar-upload"
                    className={`btn-ghost text-xs cursor-pointer ${avatarUploading ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    {avatarUploading ? "Uploading…" : "Upload Photo"}
                  </label>
                  {editForm.avatarUrl && (
                    <button type="button" onClick={() => setEditForm((f) => ({ ...f, avatarUrl: "" }))} className="text-xs text-red-400 hover:text-red-300">
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <button type="submit" disabled={saving || avatarUploading || bannerUploading} className="btn-brand">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </form>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-bold text-white">
                  {profile.displayName || profile.username}
                </h1>
                {profile.isVerified === true && (
                  <VerifiedBadge size="md" />
                )}
              </div>
              <p className="text-sm text-gray-500">@{profile.username}</p>
              {profile.bio && (
                <p className="text-sm text-gray-300 mt-2 leading-relaxed">{profile.bio}</p>
              )}
            </>
          )}

          {/* Stats */}
          <div className="flex flex-wrap gap-4 sm:gap-6 mt-4 pt-4 border-t border-white/8">
            <div>
              <p className="text-lg font-bold text-white">{posts.length}</p>
              <p className="text-xs text-gray-500">Posts</p>
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
              <p className="text-lg font-bold text-white">{followersCount}</p>
              <p className="text-xs text-brand-400 font-medium">Followers</p>
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
              <p className="text-lg font-bold text-white">{profile.following?.length || 0}</p>
              <p className="text-xs text-brand-400 font-medium">Following</p>
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

      {/* Posts */}
      <div>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Posts</h2>
        {postsLoading ? (
          <div className="flex justify-center py-8">
            <svg className="w-6 h-6 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        ) : posts.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <div className="text-4xl mb-3">{profile.isPrivate && !following && !isOwn ? "🔒" : "📝"}</div>
            <p className="text-gray-500 text-sm">{profile.isPrivate && !following && !isOwn ? "This account is private. Follow to see posts." : "No posts yet."}</p>
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
