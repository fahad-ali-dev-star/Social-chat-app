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
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../../api";
import { useAuthStore } from "../../authStore";
import PostCard from "../../components/PostCard";
import VerifiedBadge from "../../components/VerifiedBadge";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 12);
  const { user, logout, fetchMe } = useAuthStore();
  const [profileData, setProfileData] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit Modal State
  const [editVisible, setEditVisible] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.username) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const [profRes, postRes] = await Promise.all([
        api.get(`/users/${user.username}`),
        api.get(`/users/${user.username}/posts`),
      ]);
      setProfileData(profRes.data.user);
      setPosts(postRes.data.posts || []);
      setDisplayName(profRes.data.user?.displayName || "");
      setBio(profRes.data.user?.bio || "");
      setAvatarUrl(profRes.data.user?.avatarUrl || "");
      setBannerUrl(profRes.data.user?.bannerUrl || "");
      setIsPrivate(Boolean(profRes.data.user?.isPrivate));
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

  return (
    <SafeAreaView style={[styles.container, { paddingTop }]}>
      {loading && !profileData ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator color="#6366f1" size="large" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={
            <View style={styles.headerContainer}>
              {/* Top Bar */}
              <View style={styles.topBar}>
                <Text style={styles.title}>My Profile</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {isAdmin && (
                    <TouchableOpacity
                      style={styles.adminBtn}
                      onPress={() => router.push("/admin" as any)}
                    >
                      <Text style={styles.adminText}>🛡️ Admin</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                    <Text style={styles.logoutText}>Log Out</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Profile Card */}
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

                {/* Info */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <Text style={styles.name}>{profileData?.displayName || profileData?.username}</Text>
                  {profileData?.isVerified && <VerifiedBadge size={16} />}
                  {profileData?.isPrivate && (
                    <Text style={styles.privateBadge}>🔒</Text>
                  )}
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

                {/* Edit Button */}
                <TouchableOpacity style={styles.editBtn} onPress={() => setEditVisible(true)}>
                  <Text style={styles.editText}>Edit Profile & Photos</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionHeader}>My Posts</Text>
            </View>
          }
          renderItem={({ item }) => <PostCard post={item} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>You haven't posted anything yet.</Text>
          }
        />
      )}

      {/* Edit Profile Modal */}
      <Modal visible={editVisible} animationType="slide" transparent onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            {/* Profile Photo Upload */}
            <Text style={styles.label}>Profile Photo</Text>
            <View style={styles.uploadRow}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.previewAvatar} />
              ) : (
                <View style={[styles.previewAvatar, { backgroundColor: "#6366f1", justifyContent: "center", alignItems: "center" }]}>
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
                <Image source={{ uri: bannerUrl }} style={styles.previewBanner} />
              ) : (
                <View style={[styles.previewBanner, { backgroundColor: "#334155", justifyContent: "center", alignItems: "center" }]}>
                  <Text style={{ color: "#94a3b8", fontSize: 12 }}>No Cover</Text>
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
                  <Text style={styles.uploadBtnText}>Change Cover</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Display Name"
              placeholderTextColor="#64748b"
            />

            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people about yourself..."
              placeholderTextColor="#64748b"
              multiline
            />

            {/* Private / Public Account Toggle */}
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
                trackColor={{ false: "#334155", true: "#6366f1" }}
                thumbColor={isPrivate ? "#a5b4fc" : "#94a3b8"}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={saving || uploadingAvatar || uploadingBanner}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  centerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContainer: {
    padding: 16,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  adminBtn: {
    backgroundColor: "#312e81",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#6366f1",
  },
  adminText: {
    color: "#a5b4fc",
    fontWeight: "bold",
    fontSize: 12,
  },
  logoutBtn: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  logoutText: {
    color: "#ef4444",
    fontWeight: "bold",
    fontSize: 12,
  },
  profileHeader: {
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 20,
    overflow: "hidden",
    paddingBottom: 20,
    marginBottom: 20,
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
    marginBottom: 16,
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
  editBtn: {
    backgroundColor: "#334155",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    width: "90%",
    alignItems: "center",
  },
  editText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  sectionHeader: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  emptyText: {
    color: "#64748b",
    textAlign: "center",
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1e293b",
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  label: {
    color: "#94a3b8",
    fontSize: 13,
    marginBottom: 6,
  },
  privateBadge: {
    fontSize: 14,
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
  },
  privacyLabel: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  privacyHint: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 16,
  },
  uploadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  previewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  previewBanner: {
    width: 90,
    height: 48,
    borderRadius: 8,
  },
  uploadBtn: {
    backgroundColor: "#334155",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  uploadBtnText: {
    color: "#a5b4fc",
    fontWeight: "600",
    fontSize: 13,
  },
  input: {
    backgroundColor: "#0f172a",
    color: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelText: {
    color: "#94a3b8",
  },
  saveBtn: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  saveText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
