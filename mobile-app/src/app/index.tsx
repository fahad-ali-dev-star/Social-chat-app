import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from "react-native";
import { useAuthStore } from "../authStore";
import api from "../api";

export default function App() {
  const { user, loading, login, logout, fetchMe } = useAuthStore();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Feed State
  const [posts, setPosts] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchMe();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </SafeAreaView>
    );
  }

  useEffect(() => {
    if (user) {
      loadFeed();
    }
  }, [user]);

  const handleLogin = async () => {
    if (!emailOrUsername.trim() || !password.trim()) {
      setErrorMsg("Please enter email/username and password.");
      return;
    }
    setLoginLoading(true);
    setErrorMsg("");
    try {
      await login(emailOrUsername, password);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || "Login failed.");
    } finally {
      setLoginLoading(false);
    }
  };

  const loadFeed = async () => {
    setFeedLoading(true);
    try {
      const { data } = await api.get("/posts?page=1&limit=20");
      setPosts(data.posts || []);
    } catch (err) {
      console.error("Feed error:", err);
    } finally {
      setFeedLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    setPosting(true);
    try {
      const { data } = await api.post("/posts", { content: newPostContent });
      setPosts([data.post, ...posts]);
      setNewPostContent("");
    } catch (err) {
      console.error("Post create error:", err);
    } finally {
      setPosting(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p: any) =>
        p._id === postId
          ? {
              ...p,
              _liked: !p._liked,
              likesCount: p._liked ? p.likesCount - 1 : p.likesCount + 1,
            }
          : p
      )
    );
    try {
      await api.post(`/posts/${postId}/like`);
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  // Login Screen
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View style={styles.authContainer}>
          <Text style={styles.logoText}>🐝 Buzz Chat</Text>
          <Text style={styles.subText}>Native Android & iPhone App</Text>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder="Username or Email"
            placeholderTextColor="#64748b"
            value={emailOrUsername}
            onChangeText={setEmailOrUsername}
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={handleLogin}
            disabled={loginLoading}
          >
            {loginLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Log In</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main Feed Screen
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logoTextSmall}>🐝 Buzz Chat</Text>
        <TouchableOpacity onPress={logout} style={styles.btnLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Create Post Box */}
      <View style={styles.createBox}>
        <TextInput
          style={styles.postInput}
          placeholder="What's on your mind?"
          placeholderTextColor="#64748b"
          value={newPostContent}
          onChangeText={setNewPostContent}
          multiline
        />
        <TouchableOpacity
          style={styles.btnPost}
          onPress={handleCreatePost}
          disabled={posting}
        >
          {posting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.btnPostText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Feed List */}
      {feedLoading && posts.length === 0 ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadFeed();
              }}
              tintColor="#6366f1"
            />
          }
          renderItem={({ item }) => (
            <View style={styles.postCard}>
              <View style={styles.postHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.author?.displayName?.[0] || item.author?.username?.[0] || "U"}
                  </Text>
                </View>
                <View>
                  <Text style={styles.authorName}>
                    {item.author?.displayName || item.author?.username}
                  </Text>
                  <Text style={styles.username}>@{item.author?.username}</Text>
                </View>
              </View>

              <Text style={styles.postContent}>{item.content}</Text>

              <View style={styles.postFooter}>
                <TouchableOpacity
                  style={styles.likeBtn}
                  onPress={() => handleToggleLike(item._id)}
                >
                  <Text style={styles.likeIcon}>{item._liked ? "❤️" : "🤍"}</Text>
                  <Text style={styles.likeCount}>{item.likesCount || 0}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
  authContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#f8fafc",
    textAlign: "center",
  },
  subText: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 32,
  },
  errorText: {
    color: "#ef4444",
    textAlign: "center",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#1e293b",
    color: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  btnPrimary: {
    backgroundColor: "#6366f1",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  logoTextSmall: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  btnLogout: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#1e293b",
    borderRadius: 8,
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "bold",
  },
  createBox: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  postInput: {
    flex: 1,
    backgroundColor: "#1e293b",
    color: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 80,
  },
  btnPost: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnPostText: {
    color: "#fff",
    fontWeight: "bold",
  },
  centerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  postCard: {
    backgroundColor: "#1e293b",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  authorName: {
    color: "#f8fafc",
    fontWeight: "bold",
    fontSize: 14,
  },
  username: {
    color: "#64748b",
    fontSize: 12,
  },
  postContent: {
    color: "#e2e8f0",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  postFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  likeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  likeIcon: {
    fontSize: 16,
  },
  likeCount: {
    color: "#94a3b8",
    fontSize: 14,
  },
});
