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
} from "react-native";
import { router } from "expo-router";
import api from "../../api";
import { useAuthStore } from "../../authStore";
import PostCard from "../../components/PostCard";

export default function ProfileScreen() {
  const { user, logout, fetchMe } = useAuthStore();
  const [profileData, setProfileData] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit Modal State
  const [editVisible, setEditVisible] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
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
    } catch (err) {
      console.error("Profile load error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/users/me", {
        displayName: displayName.trim(),
        bio: bio.trim(),
      });
      setProfileData(data.user);
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
    <SafeAreaView style={styles.container}>
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

              {/* Avatar & Main Info */}
              <View style={styles.profileHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {profileData?.displayName?.[0] || profileData?.username?.[0] || "U"}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 12 }}>
                  <Text style={styles.name}>{profileData?.displayName || profileData?.username}</Text>
                  {profileData?.isVerified && (
                    <Image
                      source={require("@/assets/images/5c6a9983d0c9eef8b3912a451cc8a27d.png")}
                      style={{ width: 16, height: 16 }}
                      resizeMode="contain"
                    />
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
                  <Text style={styles.editText}>Edit Profile</Text>
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

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

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
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
    padding: 20,
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
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
    width: "100%",
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
    padding: 24,
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
