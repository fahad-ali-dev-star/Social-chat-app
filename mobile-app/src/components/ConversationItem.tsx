import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, Image } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "../authStore";

interface Props {
  conversation: any;
}

export default function ConversationItem({ conversation }: Props) {
  const currentUser = useAuthStore((s) => s.user);

  const recipient = conversation.participants?.find(
    (p: any) => String(p._id || p.id) !== String(currentUser?.id)
  ) || conversation.participants?.[0];

  const handlePress = () => {
    router.push(`/chat/${conversation._id}` as any);
  };

  const unread = conversation.unreadCount || 0;

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {recipient?.displayName?.[0] || recipient?.username?.[0] || "U"}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={styles.name}>{recipient?.displayName || recipient?.username || "User"}</Text>
            {recipient?.isVerified && (
              <Image
                source={require("@/assets/images/5c6a9983d0c9eef8b3912a451cc8a27d.png")}
                style={{ width: 14, height: 14 }}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
        <Text style={[styles.lastMsg, unread > 0 && styles.unreadMsg]} numberOfLines={1}>
          {conversation.lastMessage || "No messages yet"}
        </Text>
      </View>

      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#6366f1",
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
    marginBottom: 4,
  },
  name: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  lastMsg: {
    color: "#94a3b8",
    fontSize: 13,
  },
  unreadMsg: {
    color: "#f8fafc",
    fontWeight: "bold",
  },
  badge: {
    backgroundColor: "#6366f1",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
});
