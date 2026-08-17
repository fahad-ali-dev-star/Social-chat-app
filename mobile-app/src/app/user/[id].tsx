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
  Dimensions,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import api from "../../api";
import PostCard from "../../components/PostCard";
import VerifiedBadge from "../../components/VerifiedBadge";
import { useMessageStore } from "../../messageStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 40) / 3;

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
  const [activeTab, setActiveTab] = useState<"grid" | "feed" | "saved">("grid");

  // Story Status State
  const [userStoryGroup, setUserStoryGroup] = useState<any | null>(null);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [activeStoryIdx, setActiveStoryIdx] = useState(0);

  const getOrCreateConversation = useMessageStore((s) => s.getOrCreateConversation);

  useEffect(() => {
    if (username) loadProfile();
  }, [username]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const [profRes, postRes, storiesRes] = await Promise.all([
        api.get(`/users/${username}`),
        api.get(`/users/${username}/posts`),
        api.get("/stories/feed").catch(() => ({ data: {} })),
      ]);
      setProfileData(profRes.data.user);
      setRelationship(profRes.data.relationship);
      setPosts(postRes.data.posts || []);
      setIsBlocked(false);

      // Check if this profile user has an active story
      const groups = storiesRes.data?.storyGroups || storiesRes.data?.stories || [];
      const found = groups.find(
        (g: any) =>
          g.user?.username === username ||
          String(g.user?._id || g.user?.id) === String(profRes.data.user?._id || profRes.data.user?.id)
      );
      setUserStoryGroup(found || null);
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

  const gridMediaPosts = posts.filter(
    (p) => p.mediaUrl || p.mediaUrls?.length || p.image || p.imageUrl
  );
  const displayGrid = gridMediaPosts.length > 0 ? gridMediaPosts : posts;

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Navigation Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#F1F5F9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{profileData?.username || username}</Text>
        {profileData && !relationship?.isOwn ? (
          <TouchableOpacity style={styles.iconBtn} onPress={() => setMenuVisible(true)}>
            <Feather name="menu" size={24} color="#F1F5F9" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Avatar Container - Story Highlight Ring shown ONLY when user has active status/story */}
      <View style={styles.avatarSection}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            if (userStoryGroup && userStoryGroup.stories?.length > 0) {
              setActiveStoryIdx(0);
              setShowStoryViewer(true);
            }
          }}
        >
          {userStoryGroup && userStoryGroup.stories?.length > 0 ? (
            <LinearGradient
              colors={
                userStoryGroup.hasUnviewed !== false
                  ? ["#F9CE34", "#EE2A7B", "#6228D7"]
                  : ["#475569", "#334155"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientRing}
            >
              <View style={styles.avatarInnerContainer}>
                {profileData?.avatarUrl ? (
                  <Image source={{ uri: profileData.avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitials}>
                      {(profileData?.displayName || profileData?.username || "U")
                        .substring(0, 2)
                        .toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          ) : (
            <View style={styles.plainRing}>
              <View style={styles.avatarInnerContainer}>
                {profileData?.avatarUrl ? (
                  <Image source={{ uri: profileData.avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitials}>
                      {(profileData?.displayName || profileData?.username || "U")
                        .substring(0, 2)
                        .toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Name & Verified Badge */}
      <View style={styles.userInfoSection}>
        <View style={styles.nameRow}>
          <Text style={styles.nameText}>
            {profileData?.displayName || profileData?.username}
          </Text>
          {profileData?.isVerified && <VerifiedBadge size={18} />}
          {profileData?.isPrivate && (
            <Ionicons name="lock-closed" size={16} color="#94A3B8" style={{ marginLeft: 4 }} />
          )}
        </View>
      </View>

      {/* Stats Counter Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{posts.length}</Text>
          <Text style={styles.statLabel}>POSTS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>
            {relationship?.followersCount ?? profileData?.followers?.length ?? 0}
          </Text>
          <Text style={styles.statLabel}>FOLLOWERS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{profileData?.following?.length ?? 0}</Text>
          <Text style={styles.statLabel}>FOLLOWING</Text>
        </View>
      </View>

      {/* Action Buttons Row */}
      {!relationship?.isOwn && (
        <View style={styles.actionRow}>
          {relationship?.isFollowing ? (
            <TouchableOpacity
              style={styles.followingOutlineBtn}
              onPress={handleToggleFollow}
              disabled={followLoading}
              activeOpacity={0.8}
            >
              {followLoading ? (
                <ActivityIndicator color="#EC4899" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#EC4899" />
                  <Text style={styles.followingBtnText} numberOfLines={1} adjustsFontSizeToFit>
                    Following
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.gradientBtnWrapper}
              onPress={handleToggleFollow}
              disabled={followLoading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#C084FC", "#F97316"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBtn}
              >
                {followLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={18} color="#FFFFFF" />
                    <Text style={styles.gradientBtnText} numberOfLines={1} adjustsFontSizeToFit>
                      {relationship?.requested ? "Requested" : "Follow"}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.messageBtn}
            onPress={handleStartChat}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-outline" size={18} color="#FFFFFF" />
            <Text style={styles.messageBtnText} numberOfLines={1} adjustsFontSizeToFit>
              Message
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bio text if present */}
      {profileData?.bio ? (
        <Text style={styles.bioText}>{profileData.bio}</Text>
      ) : null}

      {/* Private account restriction banner */}
      {relationship?.isPrivate && !relationship?.isFollowing && !relationship?.isOwn ? (
        <View style={styles.privateLockBox}>
          <Ionicons name="lock-closed-outline" size={36} color="#94A3B8" />
          <Text style={styles.privateLockTitle}>This Account is Private</Text>
          <Text style={styles.privateLockSub}>Follow this account to see their photos and posts.</Text>
        </View>
      ) : (
        /* Post View Switcher Tabs */
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === "grid" && styles.activeTabItem]}
            onPress={() => setActiveTab("grid")}
          >
            <Ionicons
              name={activeTab === "grid" ? "grid" : "grid-outline"}
              size={22}
              color={activeTab === "grid" ? "#FFFFFF" : "#64748B"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === "feed" && styles.activeTabItem]}
            onPress={() => setActiveTab("feed")}
          >
            <Ionicons
              name={activeTab === "feed" ? "square" : "square-outline"}
              size={22}
              color={activeTab === "feed" ? "#FFFFFF" : "#64748B"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === "saved" && styles.activeTabItem]}
            onPress={() => setActiveTab("saved")}
          >
            <Ionicons
              name={activeTab === "saved" ? "person" : "person-outline"}
              size={22}
              color={activeTab === "saved" ? "#FFFFFF" : "#64748B"}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { paddingTop }]}>
      {loading && !profileData ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator color="#EC4899" size="large" />
        </View>
      ) : isBlocked ? (
        <View style={styles.blockedContainer}>
          <Ionicons name="ban-outline" size={60} color="#EF4444" />
          <Text style={styles.blockedTitle}>Profile Unavailable</Text>
          <Text style={styles.blockedSub}>
            You've blocked this user or they have blocked you.
          </Text>
          <TouchableOpacity
            style={styles.unblockBtn}
            onPress={handleToggleBlock}
            disabled={blockLoading}
          >
            <Text style={styles.unblockText}>Unblock User</Text>
          </TouchableOpacity>
        </View>
      ) : activeTab === "grid" && !(relationship?.isPrivate && !relationship?.isFollowing) ? (
        <FlatList
          key="user-grid-list"
          data={displayGrid}
          keyExtractor={(item) => item._id}
          numColumns={3}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const mediaUri = item.mediaUrl || item.mediaUrls?.[0] || item.image || item.imageUrl;
            return (
              <TouchableOpacity
                style={styles.gridThumbContainer}
                activeOpacity={0.8}
                onPress={() => setActiveTab("feed")}
              >
                {mediaUri ? (
                  <Image source={{ uri: mediaUri }} style={styles.gridThumbImage} />
                ) : (
                  <View style={styles.gridThumbFallback}>
                    <Text style={styles.gridThumbText} numberOfLines={3}>
                      {item.content || item.text || "Post"}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="images-outline" size={40} color="#475569" />
              <Text style={styles.emptyText}>No posts yet.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          key="user-feed-list"
          data={relationship?.isPrivate && !relationship?.isFollowing ? [] : posts}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <PostCard post={item} />}
          ListEmptyComponent={
            relationship?.isPrivate && !relationship?.isFollowing ? null : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No posts yet.</Text>
              </View>
            )
          }
        />
      )}

      {/* 3-dot Options Menu */}
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
            <View style={styles.menuHandle} />
            <Text style={styles.menuTitle}>@{profileData?.username}</Text>

            <TouchableOpacity
              style={[styles.menuItem, blockLoading && { opacity: 0.5 }]}
              onPress={handleToggleBlock}
              disabled={blockLoading}
            >
              <Ionicons name="ban-outline" size={20} color="#EF4444" />
              <Text style={styles.menuItemTextDanger}>
                {blockLoading ? "Updating…" : isBlocked ? "Unblock User" : "Block User"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                Alert.alert("Report", `Report @${profileData?.username}?`, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Report", style: "destructive", onPress: () => {} },
                ]);
              }}
            >
              <Ionicons name="flag-outline" size={20} color="#E2E8F0" />
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

      {/* Active Story Viewer Modal */}
      <Modal
        visible={showStoryViewer}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setShowStoryViewer(false)}
        statusBarTranslucent
      >
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <StatusBar barStyle="light-content" backgroundColor="#000" />
          {userStoryGroup && userStoryGroup.stories?.[activeStoryIdx] && (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <Image
                source={{ uri: userStoryGroup.stories[activeStoryIdx].mediaUrl }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="contain"
              />
              <TouchableOpacity
                onPress={() => setShowStoryViewer(false)}
                style={{
                  position: "absolute",
                  top: 50,
                  right: 16,
                  backgroundColor: "rgba(0,0,0,0.6)",
                  padding: 10,
                  borderRadius: 20,
                }}
              >
                <Ionicons name="close" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#11151D",
  },
  centerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: 32,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    alignItems: "center",
  },
  topBar: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1E232E",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700",
  },

  /* Avatar Section */
  avatarSection: {
    marginBottom: 14,
    alignItems: "center",
  },
  gradientRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  plainRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    padding: 3,
    backgroundColor: "#1E232E",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInnerContainer: {
    width: 98,
    height: 98,
    borderRadius: 49,
    backgroundColor: "#11151D",
    padding: 3,
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: 46,
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 46,
    backgroundColor: "#252B37",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    color: "#F8FAFC",
    fontSize: 28,
    fontWeight: "bold",
  },

  /* User Info */
  userInfoSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nameText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
    alignItems: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#333D4F",
  },
  activeDot: {
    backgroundColor: "#FFFFFF",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bioText: {
    color: "#CBD5E1",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 24,
  },

  /* Stats Row */
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    paddingVertical: 14,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  statLabel: {
    color: "#8E97A6",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#232936",
  },

  /* Actions Row */
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  gradientBtnWrapper: {
    flex: 1,
    borderRadius: 9999,
    overflow: "hidden",
  },
  gradientBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 9999,
    shadowColor: "#C084FC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  gradientBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  followingOutlineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 9999,
    backgroundColor: "#1E232E",
    borderWidth: 1.5,
    borderColor: "#EC4899",
    overflow: "hidden",
  },
  followingBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  messageBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 9999,
    backgroundColor: "#1E232E",
    borderWidth: 1,
    borderColor: "#2D3444",
    overflow: "hidden",
  },
  messageBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  /* Private Lock Container */
  privateLockBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    marginVertical: 12,
    backgroundColor: "#191E28",
    borderRadius: 20,
    width: "100%",
    gap: 10,
  },
  privateLockTitle: {
    color: "#F1F5F9",
    fontSize: 17,
    fontWeight: "700",
  },
  privateLockSub: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
  },

  /* Tabs Switcher */
  tabsRow: {
    flexDirection: "row",
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#1E232E",
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTabItem: {
    borderBottomColor: "#FFFFFF",
  },

  /* Grid Thumbnails */
  gridThumbContainer: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    margin: 3,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#1E232E",
  },
  gridThumbImage: {
    width: "100%",
    height: "100%",
  },
  gridThumbFallback: {
    flex: 1,
    padding: 8,
    backgroundColor: "#1E232E",
    justifyContent: "center",
    alignItems: "center",
  },
  gridThumbText: {
    color: "#94A3B8",
    fontSize: 11,
    textAlign: "center",
  },

  emptyBox: {
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    color: "#64748B",
    fontSize: 14,
    textAlign: "center",
  },

  /* Blocked State */
  blockedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  blockedTitle: { color: "#F1F5F9", fontSize: 20, fontWeight: "bold" },
  blockedSub: {
    color: "#64748B",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  unblockBtn: {
    marginTop: 12,
    backgroundColor: "#1E232E",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2D3444",
  },
  unblockText: { color: "#FFFFFF", fontWeight: "bold" },

  /* Menu Modal */
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    backgroundColor: "#1B202B",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#2D3444",
  },
  menuHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#333D4F",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  menuTitle: {
    color: "#94A3B8",
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
    marginTop: 8,
    backgroundColor: "#252B37",
    justifyContent: "center",
  },
  menuItemText: { color: "#E2E8F0", fontSize: 16, fontWeight: "500" },
  menuItemTextDanger: { color: "#EF4444", fontSize: 16, fontWeight: "600" },
});
