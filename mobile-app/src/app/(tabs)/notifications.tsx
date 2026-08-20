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
import { router } from "expo-router";
import api from "../../api";
import { useNotificationStore } from "../../notificationStore";
import { IG } from "../../constants/theme";

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 12);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const markNotificationsRead = useNotificationStore((s) => s.markNotificationsRead);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications || []);
      // Mark as read in API and store
      await markNotificationsRead();
    } catch (err) {
      console.error("Notifications load error", err);
      setError("Notifications are temporarily unavailable. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRespondFollowRequest = async (
    senderId: string,
    action: "accept" | "reject",
    notifId: string
  ) => {
    if (!senderId) return;
    setActionLoadingId(notifId);
    try {
      await api.post(`/users/${senderId}/follow-request`, { action });
      setNotifications((prev) => prev.filter((n) => n._id !== notifId));
    } catch (err) {
      console.error("Follow request response error", err);
    } finally {
      setActionLoadingId(null);
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
      case "follow_request":
        return `${name} requested to follow you 👤`;
      case "mention":
        return `${name} mentioned you 📢`;
      default:
        return `New notification from ${name}`;
    }
  };

  const handleUserPress = (username?: string) => {
    if (username) {
      router.push(`/user/${username}` as any);
    }
  };

  const handleNotificationPress = (notification: any) => {
    if (notification.conversation?._id || notification.conversation) {
      router.push(`/chat/${notification.conversation._id || notification.conversation}` as any);
      return;
    }
    handleUserPress(notification.sender?.username);
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
      ) : error ? (
        <View style={styles.centerLoading}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadNotifications}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerLoading}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const isFollowRequest = item.type === "follow_request";
            const senderId = item.sender?._id || item.sender?.id;

            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleNotificationPress(item)}
                style={[styles.card, !item.read && styles.unreadCard]}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleUserPress(item.sender?.username)}
                >
                  {item.sender?.avatarUrl ? (
                    <Image
                      source={{ uri: item.sender.avatarUrl }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(
                          item.sender?.displayName?.[0] ||
                          item.sender?.username?.[0] ||
                          "U"
                        ).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

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

                  {/* Accept / Reject buttons for follow_request */}
                  {isFollowRequest && (
                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        style={[styles.btn, styles.acceptBtn]}
                        disabled={actionLoadingId === item._id}
                        onPress={() =>
                          handleRespondFollowRequest(senderId, "accept", item._id)
                        }
                      >
                        {actionLoadingId === item._id ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.acceptBtnText}>Confirm</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.btn, styles.rejectBtn]}
                        disabled={actionLoadingId === item._id}
                        onPress={() =>
                          handleRespondFollowRequest(senderId, "reject", item._id)
                        }
                      >
                        <Text style={styles.rejectBtnText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
        </>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: IG.border,
  },
  title: {
    color: IG.text,
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
    color: IG.textSecondary,
    fontSize: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: IG.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    gap: 12,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: IG.accent,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: IG.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    color: IG.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  requestActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtn: {
    backgroundColor: IG.accent,
  },
  acceptBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 13,
  },
  rejectBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "#475569",
  },
  rejectBtnText: {
    color: "#94a3b8",
    fontWeight: "600",
    fontSize: 13,
  },
  errorText: {
    color: IG.danger,
    paddingHorizontal: 16,
    paddingVertical: 10,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: IG.accent,
    borderRadius: 8,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: IG.bg,
    fontWeight: "700",
  },
});
