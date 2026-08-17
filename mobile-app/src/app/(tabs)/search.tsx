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
} from "react-native";
import api from "../../api";
import UserCard from "../../components/UserCard";
import PostCard from "../../components/PostCard";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "posts">("users");
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      const { data } = await api.get("/users/suggestions");
      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error("Failed to load suggestions", err);
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search people or posts..."
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

      {/* Results */}
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
        <View style={{ flex: 1, padding: 16 }}>
          <Text style={styles.sectionTitle}>Suggested People</Text>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => <UserCard user={item} />}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  searchHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  searchInput: {
    backgroundColor: "#1e293b",
    color: "#fff",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#6366f1",
  },
  tabText: {
    color: "#64748b",
    fontWeight: "600",
    fontSize: 14,
  },
  activeTabText: {
    color: "#6366f1",
    fontWeight: "bold",
  },
  centerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#64748b",
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
});
