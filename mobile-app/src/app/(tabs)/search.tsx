import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../../api";
import UserCard from "../../components/UserCard";
import PostCard from "../../components/PostCard";
import { IG } from "../../constants/theme";

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 12);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "posts">("users");
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [hashtags, setHashtags] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDiscoverData();
  }, []);

  const loadDiscoverData = async () => {
    try {
      const [sugRes, hashRes] = await Promise.all([
        api.get("/users/suggestions"),
        api.get("/posts/trending"),
      ]);
      setSuggestions(sugRes.data.suggestions || []);
      setHashtags(hashRes.data.hashtags || []);
    } catch (err) {
      console.error("Failed to load discover data", err);
      setError("We could not load discovery right now.");
    }
  };

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setUsers([]);
      setPosts([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (activeTab === "users") {
        const { data } = await api.get(`/users/search?q=${encodeURIComponent(text.trim())}`);
        setUsers(data.users || []);
      } else {
        const { data } = await api.get(`/posts/search?q=${encodeURIComponent(text.trim())}`);
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error("Search error", err);
      setError("Search is temporarily unavailable. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleHashtagClick = (tag: string) => {
    setActiveTab("posts");
    handleSearch(tag);
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop }]}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search people or #hashtags..."
          placeholderTextColor="#64748b"
          value={query}
          onChangeText={handleSearch}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "users" && styles.activeTab]}
          onPress={() => {
            setActiveTab("users");
            if (query) handleSearch(query);
          }}
        >
          <Text style={[styles.tabText, activeTab === "users" && styles.activeTabText]}>
            People
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "posts" && styles.activeTab]}
          onPress={() => {
            setActiveTab("posts");
            if (query) handleSearch(query);
          }}
        >
          <Text style={[styles.tabText, activeTab === "posts" && styles.activeTabText]}>
            Posts
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results or Discover Section */}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator color="#6366f1" size="large" />
        </View>
      ) : query.trim() ? (
        activeTab === "users" ? (
          <FlatList
            data={users}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => <UserCard user={item} />}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No people found matching "{query}"</Text>
            }
          />
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => <PostCard post={item} />}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No posts found matching "{query}"</Text>
            }
          />
        )
      ) : (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          {/* Trending Hashtags */}
          {hashtags.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.sectionTitle}>🔥 Trending Hashtags</Text>
              <View style={styles.hashtagRow}>
                {hashtags.map((h) => (
                  <TouchableOpacity
                    key={h.tag}
                    style={styles.hashtagPill}
                    onPress={() => handleHashtagClick(h.tag)}
                  >
                    <Text style={styles.hashtagText}>{h.tag}</Text>
                    <Text style={styles.hashtagCount}>{h.count}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Suggested People */}
          <Text style={styles.sectionTitle}>Suggested People</Text>
          {suggestions.map((u) => (
            <UserCard key={u._id} user={u} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: IG.bg,
  },
  searchHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: IG.border,
  },
  searchInput: {
    backgroundColor: IG.surface,
    color: "#fff",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: IG.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: IG.accent,
  },
  tabText: {
    color: IG.textSecondary,
    fontWeight: "600",
    fontSize: 14,
  },
  activeTabText: {
    color: IG.accent,
    fontWeight: "bold",
  },
  centerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: IG.textSecondary,
    textAlign: "center",
    marginTop: 32,
    fontSize: 14,
  },
  sectionTitle: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  hashtagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  hashtagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: IG.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  hashtagText: {
    color: IG.accent,
    fontWeight: "bold",
    fontSize: 13,
  },
  hashtagCount: {
    color: IG.textSecondary,
    fontSize: 11,
  },
  errorText: {
    color: IG.danger,
    paddingHorizontal: 16,
    paddingVertical: 10,
    textAlign: "center",
  },
});
