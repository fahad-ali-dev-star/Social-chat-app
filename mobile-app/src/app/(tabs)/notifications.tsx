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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../../api";

import { useNotificationStore } from "../../notificationStore";

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 12);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const markNotificationsRead = useNotificationStore((s) => s.markNotificationsRead);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications || []);
      // Mark as read in API and store
      await markNotificationsRead();
    } catch (err) {
      console.error("Notifications load error", err);
    } finally {
      setLoading(false);
    }
  };

  const getNotifText = (notif: any) => {
    const name = notif.sender?.displayName || notif.sender?.username || "Someone";
    switch (notif.type) {
      case "like":
        return `${name} liked your post ❤️`;
      case "comment":
        return `${name} commented on your post 💬`;
      case "comment_reply":
        return `${name} replied to your comment 💬`;
      case "follow":
        return `${name} started following you 👤`;
      case "mention":
        return `${name} mentioned you 📢`;
      default:
        return `New notification from ${name}`;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator color="#6366f1" size="large" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerLoading}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={[styles.card, !item.read && styles.unreadCard]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.sender?.displayName?.[0] || item.sender?.username?.[0] || "U"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifText}>{getNotifText(item)}</Text>
                <Text style={styles.timeText}>
                  {new Date(item.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
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
  emptyText: {
    color: "#64748b",
    fontSize: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    gap: 12,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: "#6366f1",
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
  notifText: {
    color: "#f8fafc",
    fontSize: 14,
    lineHeight: 20,
  },
  timeText: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 4,
  },
});
