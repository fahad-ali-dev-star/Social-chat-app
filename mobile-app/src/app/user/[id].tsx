import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../../api";
import PostCard from "../../components/PostCard";
import VerifiedBadge from "../../components/VerifiedBadge";
import { useMessageStore } from "../../messageStore";

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 12);
  const { id: username } = useLocalSearchParams<{ id: string }>();
  const [profileData, setProfileData] = useState<any>(null);
  const [relationship, setRelationship] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const getOrCreateConversation = useMessageStore((s) => s.getOrCreateConversation);

  useEffect(() => {
    if (username) loadProfile();
  }, [username]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const [profRes, postRes] = await Promise.all([
        api.get(`/users/${username}`),
        api.get(`/users/${username}/posts`),
      ]);
      setProfileData(profRes.data.user);
      setRelationship(profRes.data.relationship);
      setPosts(postRes.data.posts || []);
      setIsBlocked(false);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setIsBlocked(true);
      }
      console.error("Profile load error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!profileData?._id) return;
    setFollowLoading(true);
    try {
      const { data } = await api.post(`/users/${profileData._id}/follow`);
      setRelationship((prev: any) => ({
        ...prev,
        isFollowing: data.following,
        requested: data.requested,
        followersCount: data.followersCount,
      }));
      // Update follower count on the profile
      setProfileData((prev: any) => ({
        ...prev,
        followers: {
          length: data.followersCount,
        },
      }));
    } catch (err) {
      Alert.alert("Error", "Could not update follow status.");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!profileData?._id) return;
    const action = isBlocked ? "Unblock" : "Block";
    Alert.alert(
      `${action} @${profileData.username}`,
      isBlocked
        ? "Unblock this user? They will be able to see your posts and follow you."
        : "Block this user? They won't be able to see your profile or contact you.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action,
          style: isBlocked ? "default" : "destructive",
          onPress: async () => {
            setBlockLoading(true);
            try {
              const { data } = await api.post(`/users/${profileData._id}/block`);
              setIsBlocked(data.blocked);
              if (data.blocked) {
                // After blocking, unfollow state clears
                setRelationship((prev: any) => ({
                  ...prev,
                  isFollowing: false,
                  requested: false,
                }));
                Alert.alert("Blocked", `@${profileData.username} has been blocked.`);
              } else {
                Alert.alert("Unblocked", `@${profileData.username} has been unblocked.`);
              }
            } catch {
              Alert.alert("Error", "Could not update block status.");
            } finally {
              setBlockLoading(false);
              setMenuVisible(false);
            }
          },
        },
      ]
    );
  };

  const handleStartChat = async () => {
    if (!profileData?._id) return;
    try {
      const conversation = await getOrCreateConversation(profileData._id);
      router.push(`/chat/${conversation._id}` as any);
    } catch {
      Alert.alert("Error", "Could not open conversation.");
    }
  };

  /** Follow button label logic (same as web app) */
  const getFollowLabel = () => {
    if (followLoading) return "…";
    if (relationship?.isFollowing) return "Following ✓";
    if (relationship?.requested) return "Requested ⏳";
    return "Follow";
  };

  const followBtnStyle = relationship?.isFollowing
    ? styles.btnOutline
    : relationship?.requested
    ? styles.btnRequested
    : styles.btnPrimary;

  const followTextStyle = relationship?.isFollowing
    ? styles.btnOutlineText
    : styles.btnPrimaryText;

  return (
    <SafeAreaView style={[styles.container, { paddingTop }]}>
      {/* Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{username}</Text>

        {/* Three-dot menu (non-own profiles only) */}
        {profileData && !relationship?.isOwn && (
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setMenuVisible(true)}
          >
            <Text style={styles.menuDots}>⋯</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && !profileData ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator color="#6366f1" size="large" />
        </View>
      ) : isBlocked ? (
        /* ── Blocked state ── */
        <View style={styles.blockedContainer}>
          <Text style={styles.blockedIcon}>🚫</Text>
          <Text style={styles.blockedTitle}>Profile Unavailable</Text>
          <Text style={styles.blockedSub}>
            You've blocked this user or they have blocked you.
          </Text>
          {isBlocked && profileData && (
            <TouchableOpacity
              style={styles.unblockBtn}
              onPress={handleToggleBlock}
              disabled={blockLoading}
            >
              <Text style={styles.unblockText}>Unblock</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={
            <View style={styles.profileHeader}>
              {/* Banner */}
              {profileData?.bannerUrl ? (
                <Image source={{ uri: profileData.bannerUrl }} style={styles.bannerImage} />
              ) : (
                <View style={styles.bannerFallback} />
              )}

              {/* Avatar */}
              <View style={styles.avatarWrapper}>
                {profileData?.avatarUrl ? (
                  <Image source={{ uri: profileData.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {profileData?.displayName?.[0] || profileData?.username?.[0] || "U"}
                    </Text>
                  </View>
                )}
              </View>

              {/* Name row */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                <Text style={styles.name}>
                  {profileData?.displayName || profileData?.username}
                </Text>
                {profileData?.isVerified && <VerifiedBadge size={16} />}
                {profileData?.isPrivate && (
                  <Text style={styles.privateBadge}>🔒</Text>
                )}
              </View>
              <Text style={styles.username}>@{profileData?.username}</Text>
              {profileData?.bio ? (
                <Text style={styles.bio}>{profileData.bio}</Text>
              ) : null}

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{posts.length}</Text>
                  <Text style={styles.statLabel}>Posts</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {relationship?.followersCount ?? profileData?.followers?.length ?? 0}
                  </Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {profileData?.following?.length ?? 0}
                  </Text>
                  <Text style={styles.statLabel}>Following</Text>
                </View>
              </View>

              {/* Action Buttons */}
              {!relationship?.isOwn && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.btn, followBtnStyle]}
                    onPress={handleToggleFollow}
                    disabled={followLoading}
                  >
                    <Text style={[styles.btnText, followTextStyle]}>
                      {getFollowLabel()}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.chatBtn} onPress={handleStartChat}>
                    <Text style={styles.chatBtnText}>💬 Message</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Private account restricted message */}
              {relationship?.isPrivate && !relationship?.isFollowing && !relationship?.isOwn && (
                <View style={styles.privateLock}>
                  <Text style={styles.privateLockIcon}>🔒</Text>
                  <Text style={styles.privateLockTitle}>Private Account</Text>
                  <Text style={styles.privateLockSub}>
                    Follow this account to see their posts.
                  </Text>
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => <PostCard post={item} />}
          ListEmptyComponent={
            relationship?.isPrivate && !relationship?.isFollowing ? null : (
              <Text style={styles.emptyText}>No posts yet.</Text>
            )
          }
        />
      )}

      {/* ── 3-dot Options Menu ── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuSheet}>
            <Text style={styles.menuHandle} />
            <Text style={styles.menuTitle}>@{profileData?.username}</Text>

            <TouchableOpacity
              style={[styles.menuItem, blockLoading && { opacity: 0.5 }]}
              onPress={handleToggleBlock}
              disabled={blockLoading}
            >
              <Text style={styles.menuItemIconDanger}>
                {isBlocked ? "🔓" : "🚫"}
              </Text>
              <Text style={styles.menuItemTextDanger}>
                {blockLoading ? "Updating…" : isBlocked ? "Unblock User" : "Block User"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                // Navigate to report (use existing ReportModal logic)
                Alert.alert("Report", `Report @${profileData?.username}?`, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Report", style: "destructive", onPress: () => {} },
                ]);
              }}
            >
              <Text style={styles.menuItemIcon}>🚩</Text>
              <Text style={styles.menuItemText}>Report User</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemCancel]}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.menuItemText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    gap: 12,
  },
  backBtn: { paddingVertical: 4 },
  backText: { color: "#6366f1", fontSize: 16, fontWeight: "bold" },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "bold", flex: 1 },
  menuBtn: { padding: 4 },
  menuDots: { color: "#94a3b8", fontSize: 22, fontWeight: "bold" },
  centerLoading: { flex: 1, justifyContent: "center", alignItems: "center" },

  /* ── Blocked state ── */
  blockedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 10,
  },
  blockedIcon: { fontSize: 52 },
  blockedTitle: { color: "#f1f5f9", fontSize: 20, fontWeight: "bold" },
  blockedSub: {
    color: "#64748b",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  unblockBtn: {
    marginTop: 12,
    backgroundColor: "#334155",
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
  },
  unblockText: { color: "#fff", fontWeight: "bold" },

  /* ── Profile card ── */
  profileHeader: {
    alignItems: "center",
    backgroundColor: "#1e293b",
    margin: 16,
    borderRadius: 20,
    overflow: "hidden",
    paddingBottom: 20,
  },
  bannerImage: { width: "100%", height: 100 },
  bannerFallback: { width: "100%", height: 100, backgroundColor: "#334155" },
  avatarWrapper: { marginTop: -40, marginBottom: 8 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#1e293b",
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "#1e293b",
  },
  avatarText: { color: "#fff", fontWeight: "bold", fontSize: 32 },
  name: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  privateBadge: { fontSize: 14 },
  username: { color: "#64748b", fontSize: 14, marginBottom: 8 },
  bio: {
    color: "#cbd5e1",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statsRow: { flexDirection: "row", gap: 32, marginBottom: 20 },
  statItem: { alignItems: "center" },
  statNumber: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  statLabel: { color: "#64748b", fontSize: 12 },

  /* ── Buttons ── */
  actionRow: {
    flexDirection: "row",
    gap: 12,
    width: "90%",
    marginBottom: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
  },
  btnPrimary: { backgroundColor: "#6366f1" },
  btnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#475569",
  },
  btnRequested: {
    backgroundColor: "#1e3a5f",
    borderWidth: 1,
    borderColor: "#3b82f6",
  },
  btnText: { fontWeight: "bold", fontSize: 14 },
  btnPrimaryText: { color: "#fff" },
  btnOutlineText: { color: "#94a3b8" },
  chatBtn: {
    flex: 1,
    backgroundColor: "#334155",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
  },
  chatBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },

  /* ── Private lock ── */
  privateLock: {
    alignItems: "center",
    padding: 24,
    gap: 6,
    marginTop: 8,
  },
  privateLockIcon: { fontSize: 40 },
  privateLockTitle: { color: "#f1f5f9", fontSize: 18, fontWeight: "bold" },
  privateLockSub: { color: "#64748b", fontSize: 14, textAlign: "center" },

  emptyText: { color: "#64748b", textAlign: "center", marginTop: 20 },

  /* ── Options modal ── */
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    backgroundColor: "#1e293b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  menuHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#475569",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  menuTitle: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  menuItemCancel: {
    marginTop: 4,
    backgroundColor: "#334155",
    justifyContent: "center",
  },
  menuItemIcon: { fontSize: 18 },
  menuItemIconDanger: { fontSize: 18 },
  menuItemText: { color: "#e2e8f0", fontSize: 16, fontWeight: "500" },
  menuItemTextDanger: { color: "#f87171", fontSize: 16, fontWeight: "600" },
});
