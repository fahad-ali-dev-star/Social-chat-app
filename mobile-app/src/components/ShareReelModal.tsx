import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Share,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api";
import { useMessageStore } from "../messageStore";
import { useAuthStore } from "../authStore";
import VerifiedBadge from "./VerifiedBadge";

interface Props {
  visible: boolean;
  reel: any;
  onClose: () => void;
}

export default function ShareReelModal({ visible, reel, onClose }: Props) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);

  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = String(currentUser?._id || currentUser?.id || "");

  const getOrCreateConversation = useMessageStore((s) => s.getOrCreateConversation);
  const sendMessage = useMessageStore((s) => s.sendMessage);

  useEffect(() => {
    if (visible) {
      loadInAppUsers();
    } else {
      setSentMap({});
    }
  }, [visible]);

  const loadInAppUsers = async () => {
    setLoading(true);
    try {
      const [sugRes, searchRes] = await Promise.all([
        api.get("/users/suggestions").catch(() => ({ data: { suggestions: [] } })),
        api.get("/users/search?q=a").catch(() => ({ data: { users: [] } })),
      ]);
      const combined = [
        ...(sugRes.data.suggestions || []),
        ...(searchRes.data.users || []),
      ];
      // Deduplicate and exclude current user
      const uniqueMap = new Map();
      combined.forEach((u) => {
        if (!u) return;
        const uid = String(u._id || u.id);
        if (uid && uid !== currentUserId) {
          uniqueMap.set(uid, u);
        }
      });
      setUsers(Array.from(uniqueMap.values()));
    } catch (err) {
      console.error("Failed to load users for sharing", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendToUser = async (targetUser: any) => {
    const targetId = String(targetUser._id || targetUser.id);
    if (!targetId || !reel || targetId === currentUserId) return;

    setSendingId(targetId);
    try {
      const conv = await getOrCreateConversation(targetId);
      const reelCaption = reel.content
        ? `🎬 Reel: "${reel.content.slice(0, 100)}"`
        : "🎬 Shared a Reel";

      // Only send mediaUrl if it's a real hosted URL (not sample/external-only)
      const mediaUri = reel.mediaUrl || reel.mediaUrls?.[0] || "";
      const isExternalOnly = mediaUri.includes("mixkit.co") || mediaUri.includes("assets.mixkit");

      await sendMessage(
        conv._id,
        reelCaption,
        isExternalOnly ? "" : mediaUri,
        isExternalOnly ? "" : "video"
      );
      setSentMap((prev) => ({ ...prev, [targetId]: true }));
    } catch (err: any) {
      console.error("Failed to send reel in chat", err);
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || "Could not send reel in chat.";
      if (status === 403) {
        Alert.alert("Cannot Send", msg);
      } else {
        Alert.alert("Error", msg);
      }
    } finally {
      setSendingId(null);
    }
  };

  const handleCopyLink = async () => {
    try {
      const reelId = reel?._id || reel?.id || "";
      const shareUrl = `https://buzzchat.app/reel/${reelId}`;
      Alert.alert("Link Copied! 🔗", `Reel link copied to clipboard:\n${shareUrl}`);
    } catch (e) {
      console.error("Copy link error", e);
    }
  };

  const handleSystemShare = async () => {
    if (!reel) return;
    try {
      const reelId = reel?._id || reel?.id || "";
      const shareUrl = `https://buzzchat.app/reel/${reelId}`;
      const caption = reel.content ? `"${reel.content.slice(0, 120)}${reel.content.length > 120 ? '...' : ''}"` : "Check out this Reel!";

      await Share.share({
        message: `Watch this Reel on Buzz Chat! 🎥\n${caption}\n${shareUrl}`,
        url: reel.mediaUrl || shareUrl,
        title: "Share Reel",
      });
    } catch (err) {
      console.error("System share error", err);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.handle} />

          {/* Title */}
          <View style={styles.header}>
            <Text style={styles.title}>Share Reel 🎬</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Section 1: In-App Trends & Friends */}
          <Text style={styles.sectionTitle}>Send to Friends on Buzz Chat 💬</Text>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#6366f1" size="small" />
            </View>
          ) : users.length === 0 ? (
            <Text style={styles.emptyText}>No recent contacts found</Text>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item) => String(item._id || item.id)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.userListContent}
              renderItem={({ item }) => {
                const targetId = String(item._id || item.id);
                const isSent = Boolean(sentMap[targetId]);
                const isSending = sendingId === targetId;

                return (
                  <View style={styles.userCard}>
                    {item.avatarUrl ? (
                      <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarText}>
                          {(item.displayName || item.username || "U")[0].toUpperCase()}
                        </Text>
                      </View>
                    )}

                    <View style={styles.nameContainer}>
                      <Text style={styles.userName} numberOfLines={1}>
                        {item.displayName || item.username}
                      </Text>
                      {item.isVerified && <VerifiedBadge size={12} />}
                    </View>
                    <Text style={styles.userHandle} numberOfLines={1}>
                      @{item.username}
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.sendBtn,
                        isSent && styles.sentBtn,
                      ]}
                      onPress={() => handleSendToUser(item)}
                      disabled={isSending || isSent}
                    >
                      {isSending ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={[styles.sendBtnText, isSent && styles.sentBtnText]}>
                          {isSent ? "Sent ✓" : "Send"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Section 2: Other Platforms */}
          <Text style={styles.sectionTitle}>Share to Other Platforms 🌐</Text>
          <View style={styles.otherPlatformsRow}>
            <TouchableOpacity style={styles.platformBtn} onPress={handleCopyLink}>
              <View style={[styles.platformIconBg, { backgroundColor: "rgba(56, 189, 248, 0.15)" }]}>
                <Ionicons name="link" size={22} color="#38bdf8" />
              </View>
              <Text style={styles.platformLabel}>Copy Link</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.platformBtn} onPress={handleSystemShare}>
              <View style={[styles.platformIconBg, { backgroundColor: "rgba(99, 102, 241, 0.15)" }]}>
                <Ionicons name="share-social" size={22} color="#6366f1" />
              </View>
              <Text style={styles.platformLabel}>More Apps</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.platformBtn} onPress={handleSystemShare}>
              <View style={[styles.platformIconBg, { backgroundColor: "rgba(236, 72, 153, 0.15)" }]}>
                <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
              </View>
              <Text style={styles.platformLabel}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.platformBtn} onPress={handleSystemShare}>
              <View style={[styles.platformIconBg, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
                <Ionicons name="logo-instagram" size={22} color="#E1306C" />
              </View>
              <Text style={styles.platformLabel}>Stories</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1e293b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 28,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  handle: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#475569",
    alignSelf: "center",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "bold",
  },
  closeBtn: {
    padding: 4,
  },
  sectionTitle: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  loadingBox: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 13,
    marginVertical: 16,
    textAlign: "center",
  },
  userListContent: {
    gap: 12,
    paddingBottom: 8,
  },
  userCard: {
    width: 100,
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginBottom: 6,
  },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    maxWidth: "100%",
  },
  userName: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "bold",
  },
  userHandle: {
    color: "#64748b",
    fontSize: 10,
    marginBottom: 8,
  },
  sendBtn: {
    width: "100%",
    backgroundColor: "#6366f1",
    paddingVertical: 5,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sentBtn: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderWidth: 1,
    borderColor: "#10b981",
  },
  sendBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  sentBtnText: {
    color: "#10b981",
  },
  divider: {
    height: 1,
    backgroundColor: "#334155",
    marginVertical: 16,
  },
  otherPlatformsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 4,
  },
  platformBtn: {
    alignItems: "center",
    gap: 6,
  },
  platformIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  platformLabel: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "500",
  },
});
