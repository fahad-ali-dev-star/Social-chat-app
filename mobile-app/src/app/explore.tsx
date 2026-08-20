import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Image,
} from "react-native";
import MobileHeader from "../components/MobileHeader";
import UserCard from "../components/UserCard";
import api from "../api";

export default function ExploreScreen() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Load all users (friends + new) on screen mount
  useEffect(() => {
    loadDefaultUsers();
  }, []);

  const loadDefaultUsers = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await api.get(`/users/search?q=`);
      setUsers(data.users || []);
    } catch (err) {
      console.error("Load users error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      // Reset to default all-users view
      loadDefaultUsers();
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
      setUsers(data.users || []);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Mobile Header with Logo, Msg Counter, Notification Red Dot & Real-time Alerts */}
      <MobileHeader />

      {/* Search Bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor="#64748b"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : searched && users.length === 0 ? (
        <View style={styles.centerLoading}>
          <Text style={styles.emptyText}>
            {query.trim() ? `No users found for "${query}"` : "No users found"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id || item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ListHeaderComponent={
            users.length > 0 ? (
              <Text style={styles.sectionTitle}>Suggestions</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <UserCard
              user={item}
              onFollowToggle={(newFollowing) => {
                setUsers((prev) =>
                  prev.map((u) =>
                    (u._id === item._id || u.id === item._id)
                      ? { ...u, isFollowing: newFollowing }
                      : u
                  )
                );
              }}
            />
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  searchRow: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#1e293b",
    color: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  searchBtn: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  searchBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  centerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
  },
  userCard: {
    backgroundColor: "#1e293b",
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  displayName: {
    color: "#f8fafc",
    fontWeight: "bold",
    fontSize: 14,
  },
  verifiedBadge: {
    color: "#1d9bf0",
    fontSize: 14,
    fontWeight: "bold",
  },
  username: {
    color: "#64748b",
    fontSize: 12,
  },
  bio: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 2,
  },
});
