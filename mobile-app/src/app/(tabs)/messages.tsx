import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMessageStore } from "../../messageStore";
import { useAuthStore } from "../../authStore";
import ConversationItem from "../../components/ConversationItem";
import { IG } from "../../constants/theme";

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 12);
  const { conversations, loading, loadConversations } = useMessageStore();
  const currentUser = useAuthStore((s) => s.user);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadConversations();
  }, []);

  const filteredConversations = conversations.filter((conv: any) => {
    if (!searchQuery.trim()) return true;
    const recipient =
      conv.participants?.find(
        (p: any) => String(p._id || p.id) !== String(currentUser?.id)
      ) || conv.participants?.[0];
    const name = (recipient?.displayName || recipient?.username || "").toLowerCase();
    return name.includes(searchQuery.toLowerCase().trim());
  });

  return (
    <SafeAreaView style={[styles.container, { paddingTop }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      {/* Web-Style Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search messages..."
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading && conversations.length === 0 ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator color={IG.accent} size="large" />
        </View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.centerLoading}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>
            {searchQuery ? "No results found" : "No conversations yet"}
          </Text>
          <Text style={styles.emptySub}>
            {searchQuery
              ? "Try searching for another name"
              : "Start a chat by searching for a friend!"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadConversations}
              tintColor={IG.accent}
            />
          }
          renderItem={({ item }) => <ConversationItem conversation={item} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: IG.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: IG.surface,
    color: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  centerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
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
    color: IG.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
});
