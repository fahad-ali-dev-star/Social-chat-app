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
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Switch,
  Dimensions,
  Share,
  StatusBar,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import api from "../../api";
import { useAuthStore } from "../../authStore";
import { useSavedVideosStore } from "../../savedVideosStore";
import PostCard from "../../components/PostCard";
import VerifiedBadge from "../../components/VerifiedBadge";
import UserListModal from "../../components/UserListModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 40) / 3;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 12);
  const { user, logout, fetchMe } = useAuthStore();
  const [profileData, setProfileData] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"grid" | "feed" | "saved">("grid");
  const [userModal, setUserModal] = useState<{ open: boolean; title: string; users: any[] }>({ open: false, title: "", users: [] });

  // Edit Modal State
  const [editVisible, setEditVisible] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [saving, setSaving] = useState(false);

  // Story Status State
  const [userStoryGroup, setUserStoryGroup] = useState<any | null>(null);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [activeStoryIdx, setActiveStoryIdx] = useState(0);

  const { savedVideos, loadSaved } = useSavedVideosStore();

  const handleShareProfile = async () => {
    try {
      const profileUrl = `https://buzzchat.app/user/${profileData?.username || user?.username}`;
      await Share.share({
        message: `Connect with @${profileData?.username || user?.username} on Buzz Chat!\n${profileUrl}`,
        url: profileUrl,
        title: "Buzz Chat Profile",
      });
    } catch (err) {
      console.error("Share profile error", err);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  useEffect(() => {
    if (user?.username) {
      loadProfile();
      loadSaved();
    }
  }, [user]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const [profRes, postRes, storiesRes] = await Promise.all([
        api.get(`/users/${user.username}`),
        api.get(`/users/${user.username}/posts`),
        api.get("/stories/feed").catch(() => ({ data: {} })),
      ]);
      setProfileData(profRes.data.user);
      setPosts(postRes.data.posts || []);
      setDisplayName(profRes.data.user?.displayName || "");
      setBio(profRes.data.user?.bio || "");
      setAvatarUrl(profRes.data.user?.avatarUrl || "");
      setBannerUrl(profRes.data.user?.bannerUrl || "");
      setIsPrivate(Boolean(profRes.data.user?.isPrivate));

      // Check if current profile user has active story
      const groups = storiesRes.data?.storyGroups || storiesRes.data?.stories || [];
      const found = groups.find(
        (g: any) =>
          g.user?.username === user?.username ||
          String(g.user?._id || g.user?.id) === String(user?._id || user?.id)
      );
      setUserStoryGroup(found || null);
    } catch (err) {
      console.error("Profile load error", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePickMedia = async (type: "avatar" | "banner") => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow photo access to upload images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      const uri = result.assets[0].uri;
      if (type === "avatar") setUploadingAvatar(true);
      else setUploadingBanner(true);

      try {
        const formData = new FormData();
        const filename = uri.split("/").pop() || `${type}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const fileType = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append("file", { uri, name: filename, type: fileType } as any);

        const { data } = await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (type === "avatar") setAvatarUrl(data.url);
        else setBannerUrl(data.url);
      } catch (err: any) {
        Alert.alert("Upload Failed", err?.response?.data?.message || "Failed to upload image.");
      } finally {
        setUploadingAvatar(false);
        setUploadingBanner(false);
      }
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/users/me", {
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl,
        bannerUrl,
        isPrivate,
      });
      setProfileData(data.user);
      setIsPrivate(Boolean(data.user?.isPrivate));
      await fetchMe();
      setEditVisible(false);
    } catch (err) {
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = user?.role === "admin" || user?.role === "moderator";

  // Filter posts with image media for grid display
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
        <Text style={styles.headerTitle}>@{profileData?.username || user?.username}</Text>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setQrVisible(true)}>
            <Ionicons name="qr-code-outline" size={22} color="#F1F5F9" />
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity
              style={styles.adminHeaderBtn}
              onPress={() => router.push("/admin" as any)}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color="#C084FC" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.iconBtn} onPress={() => setEditVisible(true)}>
            <Feather name="menu" size={24} color="#F1F5F9" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Avatar Container - Story Highlight Ring shown ONLY when user has active status/story */}
      <View style={styles.avatarSection}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            if (userStoryGroup && userStoryGroup.stories?.length > 0) {
              setActiveStoryIdx(0);
              setShowStoryViewer(true);
            } else {
              setEditVisible(true);
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
                  <Image source={{ uri: profileData.avatarUrl }} style={styles.avatarImg} resizeMode="cover" />
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
                  <Image source={{ uri: profileData.avatarUrl }} style={styles.avatarImg} resizeMode="cover" />
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
          {profileData?.isPrivate && <Ionicons name="lock-closed" size={16} color="#94A3B8" style={{ marginLeft: 4 }} />}
        </View>
      </View>

      {/* Stats Counter Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{posts.length}</Text>
          <Text style={styles.statLabel}>POSTS</Text>
        </View>
        <View style={styles.statDivider} />
        <TouchableOpacity
          style={styles.statBox}
          onPress={() =>
            setUserModal({
              open: true,
              title: "Followers",
              users: Array.isArray(profileData?.followers) ? profileData.followers : [],
            })
          }
          activeOpacity={0.7}
        >
          <Text style={styles.statNumber}>{profileData?.followers?.length || 0}</Text>
          <Text style={styles.statLabel}>FOLLOWERS</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity
          style={styles.statBox}
          onPress={() =>
            setUserModal({
              open: true,
              title: "Following",
              users: Array.isArray(profileData?.following) ? profileData.following : [],
            })
          }
          activeOpacity={0.7}
        >
          <Text style={styles.statNumber}>{profileData?.following?.length || 0}</Text>
          <Text style={styles.statLabel}>FOLLOWING</Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons Row */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.gradientBtnWrapper}
          onPress={() => setEditVisible(true)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#C084FC", "#F97316"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientBtn}
          >
            <Ionicons name="create-outline" size={18} color="#FFFFFF" />
            <Text style={styles.gradientBtnText} numberOfLines={1} adjustsFontSizeToFit>
              Edit Profile
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={() => setQrVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="qr-code-outline" size={18} color="#6366F1" />
          <Text style={[styles.outlineBtnText, { color: "#6366F1" }]} numberOfLines={1} adjustsFontSizeToFit>
            QR Code
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.outlineBtn, { flex: 0.8 }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={[styles.outlineBtnText, { color: "#EF4444" }]} numberOfLines={1} adjustsFontSizeToFit>
            Logout
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bio text if present */}
      {profileData?.bio ? (
        <Text style={styles.bioText}>{profileData.bio}</Text>
      ) : null}

      {/* Post View Switcher Tabs */}
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
            name={activeTab === "saved" ? "bookmark" : "bookmark-outline"}
            size={22}
            color={activeTab === "saved" ? "#F59E0B" : "#64748B"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { paddingTop }]}>
      {loading && !profileData ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator color="#EC4899" size="large" />
        </View>
      ) : activeTab === "grid" ? (
        <FlatList
          key="grid-list"
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
                  <Image source={{ uri: mediaUri }} style={styles.gridThumbImage} resizeMode="cover" />
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
              <Text style={styles.emptyText}>No posts to show.</Text>
            </View>
          }
        />
      ) : activeTab === "saved" ? (
        <FlatList
          key="saved-list"
          data={savedVideos}
          keyExtractor={(item) => item._id}
          numColumns={3}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const mediaUri = item.mediaUrl || item.mediaUrls?.[0];
            const isVid = item.mediaType === "video" || mediaUri?.match(/\.(mp4|webm|mov)(\?.*)?$/i);
            return (
              <TouchableOpacity
                style={styles.gridThumbContainer}
                activeOpacity={0.85}
                onPress={() => setSelectedVideo(item)}
              >
                {mediaUri ? (
                  <Image source={{ uri: mediaUri }} style={styles.gridThumbImage} resizeMode="cover" />
                ) : (
                  <View style={styles.gridThumbFallback}>
                    <Text style={styles.gridThumbText} numberOfLines={2}>
                      {item.content || "Reel"}
                    </Text>
                  </View>
                )}
                {isVid && (
                  <View style={styles.videoIconBadge}>
                    <Ionicons name="videocam" size={11} color="#fff" />
                  </View>
                )}
                <View style={styles.playOverlay}>
                  <Ionicons name="play-circle" size={32} color="rgba(255,255,255,0.85)" />
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="bookmark-outline" size={40} color="#475569" />
              <Text style={styles.emptyText}>No saved videos yet.</Text>
              <Text style={[styles.emptyText, { fontSize: 12, marginTop: 4 }]}>Tap the bookmark on any reel to save it.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          key="feed-list"
          data={posts}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <PostCard post={item} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>You haven't posted anything yet.</Text>
            </View>
          }
        />
      )}

      {/* Edit Profile Modal */}
      <Modal
        visible={editVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)}>
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Profile Photo Upload */}
            <Text style={styles.label}>Profile Photo</Text>
            <View style={styles.uploadRow}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.previewAvatar} resizeMode="cover" />
              ) : (
                <View style={[styles.previewAvatar, styles.avatarFallback]}>
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>U</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={() => handlePickMedia("avatar")}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.uploadBtnText}>Change Photo</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Cover Banner Upload */}
            <Text style={styles.label}>Cover Banner</Text>
            <View style={styles.uploadRow}>
              {bannerUrl ? (
                <Image source={{ uri: bannerUrl }} style={styles.previewBanner} resizeMode="cover" />
              ) : (
                <View style={[styles.previewBanner, { backgroundColor: "#1E293B", justifyContent: "center", alignItems: "center" }]}>
                  <Text style={{ color: "#94A3B8", fontSize: 12 }}>No Banner</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={() => handlePickMedia("banner")}
                disabled={uploadingBanner}
              >
                {uploadingBanner ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.uploadBtnText}>Change Banner</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Display Name"
              placeholderTextColor="#64748B"
            />

            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people about yourself..."
              placeholderTextColor="#64748B"
              multiline
            />

            {/* Private Account Toggle */}
            <View style={styles.privacyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.privacyLabel}>
                  {isPrivate ? "🔒 Private Account" : "🌐 Public Account"}
                </Text>
                <Text style={styles.privacyHint}>
                  {isPrivate
                    ? "Only approved followers can see your posts."
                    : "Anyone can see your posts and follow you."}
                </Text>
              </View>
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{ false: "#334155", true: "#EC4899" }}
                thumbColor={isPrivate ? "#FFFFFF" : "#94A3B8"}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveProfile}
                disabled={saving || uploadingAvatar || uploadingBanner}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Profile QR Code Modal */}
      <Modal
        visible={qrVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setQrVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Profile QR Code</Text>
              <TouchableOpacity onPress={() => setQrVisible(false)}>
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.qrContainer}>
              <Image
                source={{
                  uri: `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
                    `https://buzzchat.app/user/${profileData?.username || user?.username}`
                  )}&color=6366f1&bgcolor=0f172a`,
                }}
                style={styles.qrImage}
              />
              <View style={styles.qrUserInfo}>
                <Text style={styles.qrNameText}>
                  {profileData?.displayName || profileData?.username || user?.username}
                </Text>
                <Text style={styles.qrUsernameText}>
                  @{profileData?.username || user?.username}
                </Text>
                <Text style={styles.qrHintText}>Scan to connect on Buzz Chat</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.qrShareBtn} onPress={handleShareProfile}>
              <Ionicons name="share-social" size={18} color="#fff" />
              <Text style={styles.qrShareText}>Share Profile Link</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Saved Video Player Modal */}
      <Modal
        visible={!!selectedVideo}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setSelectedVideo(null)}
        statusBarTranslucent
      >
        <View style={styles.videoPlayerModal}>
          <StatusBar barStyle="light-content" backgroundColor="#000" />

          {/* Close & title bar */}
          <View style={styles.videoPlayerTopBar}>
            <TouchableOpacity
              onPress={() => setSelectedVideo(null)}
              style={styles.videoPlayerCloseBtn}
            >
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.videoPlayerTitle} numberOfLines={1}>
              {selectedVideo?.content || selectedVideo?.author?.displayName || "Saved Reel"}
            </Text>
          </View>

          {/* Video */}
          {selectedVideo && (
            <Video
              source={{ uri: selectedVideo.mediaUrl || selectedVideo.mediaUrls?.[0] }}
              style={styles.videoPlayerFull}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping
              useNativeControls
            />
          )}

          {/* Author info */}
          {selectedVideo?.author && (
            <View style={styles.videoPlayerAuthor}>
              {selectedVideo.author.avatarUrl ? (
                <Image
                  source={{ uri: selectedVideo.author.avatarUrl }}
                  style={styles.videoPlayerAvatar}
                />
              ) : (
                <View style={[styles.videoPlayerAvatar, { backgroundColor: "#6366F1", justifyContent: "center", alignItems: "center" }]}>
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    {selectedVideo.author.displayName?.[0] || "U"}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.videoPlayerAuthorName}>
                  {selectedVideo.author.displayName || selectedVideo.author.username}
                </Text>
                <Text style={styles.videoPlayerAuthorUser}>
                  @{selectedVideo.author.username}
                </Text>
              </View>
            </View>
          )}
        </View>
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
                resizeMode="cover"
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

      {/* Followers / Following List Modal */}
      <UserListModal
        isOpen={userModal.open}
        title={userModal.title}
        users={userModal.users}
        onClose={() => setUserModal({ open: false, title: "", users: [] })}
      />
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
  adminHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1E232E",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C084FC",
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
    paddingHorizontal: 12,
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
  outlineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 9999,
    backgroundColor: "#1E232E",
    borderWidth: 1,
    borderColor: "#2D3444",
    overflow: "hidden",
  },
  outlineBtnText: {
    color: "#F1F5F9",
    fontSize: 14,
    fontWeight: "700",
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
  videoIconBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 8,
    padding: 3,
  },
  playOverlay: {
    position: "absolute",
    bottom: 6,
    left: 6,
  },

  /* Fullscreen Video Player Modal */
  videoPlayerModal: {
    flex: 1,
    backgroundColor: "#000",
  },
  videoPlayerTopBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  videoPlayerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoPlayerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  videoPlayerFull: {
    flex: 1,
    width: "100%",
  },
  videoPlayerAuthor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  videoPlayerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#6366F1",
  },
  videoPlayerAuthorName: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  videoPlayerAuthorUser: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
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

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1B202B",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2D3444",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  label: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  uploadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  previewAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  previewBanner: {
    width: 90,
    height: 52,
    borderRadius: 10,
  },
  uploadBtn: {
    backgroundColor: "#28303F",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  uploadBtnText: {
    color: "#C084FC",
    fontWeight: "600",
    fontSize: 13,
  },
  input: {
    backgroundColor: "#11151D",
    color: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#28303F",
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#11151D",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
    gap: 12,
  },
  privacyLabel: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  privacyHint: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelText: {
    color: "#94A3B8",
    fontWeight: "600",
  },
  saveBtn: {
    backgroundColor: "#EC4899",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  saveText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  qrModalContent: {
    backgroundColor: "#1B202B",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#2D3444",
    alignItems: "center",
  },
  qrContainer: {
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 20,
    padding: 20,
    marginVertical: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "#334155",
  },
  qrImage: {
    width: 200,
    height: 200,
    borderRadius: 16,
  },
  qrUserInfo: {
    alignItems: "center",
    marginTop: 14,
  },
  qrNameText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  qrUsernameText: {
    color: "#C084FC",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
  qrHintText: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 6,
  },
  qrShareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#6366F1",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 4,
  },
  qrShareText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },
});
