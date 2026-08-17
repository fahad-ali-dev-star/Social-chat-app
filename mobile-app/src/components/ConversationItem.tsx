import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, Image } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "../authStore";
import VerifiedBadge from "./VerifiedBadge";

interface Props {
  conversation: any;
}

function formatListTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ConversationItem({ conversation }: Props) {
  const currentUser = useAuthStore((s) => s.user);

  const recipient =
    conversation.participants?.find(
      (p: any) => String(p._id || p.id) !== String(currentUser?.id)
    ) || conversation.participants?.[0];

  const handlePress = () => {
    router.push(`/chat/${conversation._id}` as any);
  };

  const unread = conversation.unreadCount || 0;
  const timeStr = formatListTime(conversation.updatedAt);

  return (
    <TouchableOpacity
      style={[styles.container, unread > 0 && styles.unreadContainer]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Avatar with Instagram-style gradient border effect */}
      <View style={styles.avatarBorder}>
        {recipient?.avatarUrl ? (
          <Image source={{ uri: recipient.avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>
              {recipient?.displayName?.[0] || recipient?.username?.[0] || "U"}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, unread > 0 && styles.unreadName]}
              numberOfLines={1}
            >
              {recipient?.displayName || recipient?.username || "User"}
            </Text>
            {recipient?.isVerified && <VerifiedBadge size={14} />}
          </View>
          {timeStr ? (
            <Text style={[styles.time, unread > 0 && styles.unreadTime]}>
              {timeStr}
            </Text>
          ) : null}
        </View>

        <View style={styles.bottomRow}>
          <Text
            style={[styles.lastMsg, unread > 0 && styles.unreadMsg]}
            numberOfLines={1}
          >
            {conversation.lastMessage || "Start a conversation"}
          </Text>
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unread > 9 ? "9+" : unread}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  unreadContainer: {
    backgroundColor: "#1e293b",
    borderColor: "#6366f1",
  },
  avatarBorder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    padding: 2.5,
    backgroundColor: "#6366f1", // Instagram-like brand color highlight
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 47,
    height: 47,
    borderRadius: 23.5,
  },
  avatarFallback: {
    width: 47,
    height: 47,
    borderRadius: 23.5,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
  },
  name: {
    color: "#f8fafc",
    fontWeight: "600",
    fontSize: 15,
  },
  unreadName: {
    color: "#fff",
    fontWeight: "800",
  },
  time: {
    color: "#64748b",
    fontSize: 12,
  },
  unreadTime: {
    color: "#38bdf8",
    fontWeight: "700",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  lastMsg: {
    color: "#94a3b8",
    fontSize: 13,
    flex: 1,
  },
  unreadMsg: {
    color: "#e2e8f0",
    fontWeight: "600",
  },
  badge: {
    backgroundColor: "#38bdf8",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#0f172a",
    fontSize: 11,
    fontWeight: "bold",
  },
});
