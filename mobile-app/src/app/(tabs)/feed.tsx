import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
  Text,
} from "react-native";
import MobileHeader from "../../components/MobileHeader";
import StoryBar from "../../components/StoryBar";
import PostCard from "../../components/PostCard";
import CreatePostModal from "../../components/CreatePostModal";
import { usePostStore } from "../../postStore";

export default function FeedScreen() {
  const { posts, loading, hasMore, loadFeed } = usePostStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [createModalVisible, setCreateModalVisible] = useState(false);

  useEffect(() => {
    loadFeed(true, activeTab);
  }, [activeTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeed(true, activeTab);
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <MobileHeader />

      {/* Stories */}
      <StoryBar />

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterBtn, activeTab === "all" && styles.filterBtnActive]}
          onPress={() => setActiveTab("all")}
        >
          <Text style={[styles.filterText, activeTab === "all" && styles.filterTextActive]}>
            ✨ For You
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, activeTab === "following" && styles.filterBtnActive]}
          onPress={() => setActiveTab("following")}
        >
          <Text style={[styles.filterText, activeTab === "following" && styles.filterTextActive]}>
            👥 Following
          </Text>
        </TouchableOpacity>
      </View>

      {/* Feed List */}
      {loading && posts.length === 0 ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🌟</Text>
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptySub}>Be the first to post something!</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#6366f1" />
          }
          renderItem={({ item }) => <PostCard post={item} />}
          onEndReached={() => {
            if (!loading && hasMore) loadFeed(false, activeTab);
          }}
          onEndReachedThreshold={0.5}
        />
      )}

      {/* Floating Action Button (New Post) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setCreateModalVisible(true)}
      >
        <Text style={styles.fabIcon}>＋</Text>
      </TouchableOpacity>

      {/* Create Post Modal */}
      <CreatePostModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#1e293b",
  },
  filterBtnActive: {
    backgroundColor: "#6366f1",
  },
  filterText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
  },
  filterTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },
  centerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  emptySub: {
    color: "#64748b",
    fontSize: 14,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  fabIcon: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
  },
});
