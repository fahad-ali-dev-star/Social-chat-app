import React, { useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import { useMessageStore } from "../../messageStore";
import ConversationItem from "../../components/ConversationItem";

export default function MessagesScreen() {
  const { conversations, loading, loadConversations } = useMessageStore();

  useEffect(() => {
    loadConversations();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      {loading && conversations.length === 0 ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator color="#6366f1" size="large" />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.centerLoading}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySub}>Start a chat by searching for a friend!</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadConversations} tintColor="#6366f1" />
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
    backgroundColor: "#0f172a",
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  centerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
});
