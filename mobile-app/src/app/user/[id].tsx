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
  const getOrCreateConversation = useMessageStore((s) => s.getOrCreateConversation);

  useEffect(() => {
    if (username) {
      loadProfile();
    }
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
    } catch (err) {
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
      setRelationship((prev: any) => ({ ...prev, isFollowing: data.following }));
    } catch (err) {
      console.error("Follow error", err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!profileData?._id) return;
    try {
      const conversation = await getOrCreateConversation(profileData._id);
      router.push(`/chat/${conversation._id}` as any);
    } catch (err) {
      console.error("Failed to start chat", err);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop }]}>
      {/* Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{username}</Text>
      </View>

      {loading && !profileData ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator color="#6366f1" size="large" />
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

              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                <Text style={styles.name}>{profileData?.displayName || profileData?.username}</Text>
                {profileData?.isVerified && <VerifiedBadge size={16} />}
              </View>
              <Text style={styles.username}>@{profileData?.username}</Text>
              {profileData?.bio ? <Text style={styles.bio}>{profileData.bio}</Text> : null}

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{posts.length}</Text>
                  <Text style={styles.statLabel}>Posts</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{profileData?.followers?.length || 0}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{profileData?.following?.length || 0}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[
                    styles.btn,
                    relationship?.isFollowing ? styles.btnOutline : styles.btnPrimary,
                  ]}
                  onPress={handleToggleFollow}
                  disabled={followLoading}
                >
                  <Text
                    style={[
                      styles.btnText,
                      relationship?.isFollowing ? styles.btnOutlineText : styles.btnPrimaryText,
                    ]}
                  >
                    {relationship?.isFollowing ? "Following" : "Follow"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.chatBtn} onPress={handleStartChat}>
                  <Text style={styles.chatBtnText}>💬 Message</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          renderItem={({ item }) => <PostCard post={item} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>This user hasn't posted anything yet.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    gap: 12,
  },
  backBtn: {
    paddingVertical: 4,
  },
  backText: {
    color: "#6366f1",
    fontSize: 16,
    fontWeight: "bold",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  centerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileHeader: {
    alignItems: "center",
    backgroundColor: "#1e293b",
    margin: 16,
    borderRadius: 20,
    overflow: "hidden",
    paddingBottom: 20,
  },
  bannerImage: {
    width: "100%",
    height: 100,
  },
  bannerFallback: {
    width: "100%",
    height: 100,
    backgroundColor: "#334155",
  },
  avatarWrapper: {
    marginTop: -40,
    marginBottom: 8,
  },
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
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 32,
  },
  name: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  username: {
    color: "#64748b",
    fontSize: 14,
    marginBottom: 8,
  },
  bio: {
    color: "#cbd5e1",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 32,
    marginBottom: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  statLabel: {
    color: "#64748b",
    fontSize: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    width: "90%",
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
  },
  btnPrimary: {
    backgroundColor: "#6366f1",
  },
  btnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#475569",
  },
  btnText: {
    fontWeight: "bold",
    fontSize: 14,
  },
  btnPrimaryText: {
    color: "#fff",
  },
  btnOutlineText: {
    color: "#94a3b8",
  },
  chatBtn: {
    flex: 1,
    backgroundColor: "#334155",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
  },
  chatBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  emptyText: {
    color: "#64748b",
    textAlign: "center",
    marginTop: 20,
  },
});
