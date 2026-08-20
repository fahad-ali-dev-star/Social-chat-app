import React from "react";
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import VerifiedBadge from "./VerifiedBadge";

interface UserItem {
  _id?: string;
  id?: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  isVerified?: boolean;
}

interface Props {
  isOpen: boolean;
  title: string;
  users: UserItem[];
  onClose: () => void;
}

export default function UserListModal({ isOpen, title, users, onClose }: Props) {
  if (!isOpen) return null;

  const handleUserPress = (username: string) => {
    onClose();
    if (username) {
      router.push(`/user/${username}` as any);
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Users List */}
          {users.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No users found.</Text>
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item, index) => item._id || item.id || String(index)}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.userRow}
                  activeOpacity={0.8}
                  onPress={() => handleUserPress(item.username)}
                >
                  {item.avatarUrl ? (
                    <Image
                      source={{ uri: item.avatarUrl }}
                      style={styles.avatar}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarText}>
                        {(item.displayName || item.username || "U")[0].toUpperCase()}
                      </Text>
                    </View>
                  )}

                  <View style={styles.userInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.displayName} numberOfLines={1}>
                        {item.displayName || item.username}
                      </Text>
                      {item.isVerified && <VerifiedBadge size={14} />}
                    </View>
                    <Text style={styles.username} numberOfLines={1}>
                      @{item.username}
                    </Text>
                  </View>

                  <View style={styles.profileBadge}>
                    <Text style={styles.profileBadgeText}>Profile</Text>
                    <Ionicons name="chevron-forward" size={14} color="#a5b4fc" />
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    width: "100%",
    maxHeight: "75%",
    backgroundColor: "#1e293b",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#334155",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  title: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  closeBtn: {
    padding: 4,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
  },
  list: {
    width: "100%",
  },
  listContent: {
    padding: 12,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#0f172a",
    marginBottom: 8,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  displayName: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "bold",
  },
  username: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },
  profileBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  profileBadgeText: {
    color: "#a5b4fc",
    fontSize: 12,
    fontWeight: "600",
  },
});
