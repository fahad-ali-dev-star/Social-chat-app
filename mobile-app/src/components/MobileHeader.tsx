import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Image,
  Platform,
  StatusBar as RNStatusBar,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../authStore";
import { useNotificationStore } from "../notificationStore";

export default function MobileHeader({ title }: { title?: string }) {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, Platform.OS === "android" ? RNStatusBar.currentHeight || 12 : 12);
  const { user, logout } = useAuthStore();
  const {
    unreadNotifCount,
    unreadMsgCount,
    notifications,
    conversations,
    loadingNotifs,
    loadingConvs,
    activeToast,
    clearToast,
    initSocketAndPolling,
    fetchUnreadCounts,
    loadNotifications,
    markNotificationsRead,
    fetchConversations,
  } = useNotificationStore();

  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [msgModalOpen, setMsgModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      initSocketAndPolling();

      // Fallback polling interval every 8 seconds
      const timer = setInterval(() => {
        fetchUnreadCounts();
      }, 8000);
      return () => clearInterval(timer);
    }
  }, [user]);

  const handleOpenNotifications = () => {
    loadNotifications();
    setNotifModalOpen(true);
  };

  const handleOpenMessages = () => {
    fetchConversations();
    setMsgModalOpen(true);
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  return (
    <View style={styles.container}>
      {/* Real-Time Floating Alert Toast */}
      {activeToast && (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.toastBanner}
          onPress={() => {
            clearToast();
            if (activeToast.type === "notification") {
              handleOpenNotifications();
            } else {
              handleOpenMessages();
            }
          }}
        >
          <View style={styles.toastContent}>
            <Text style={styles.toastTitle}>{activeToast.title}</Text>
            <Text style={styles.toastBody} numberOfLines={1}>
              {activeToast.body}
            </Text>
          </View>
          <TouchableOpacity onPress={clearToast} style={{ padding: 4 }}>
            <Text style={{ color: "#94a3b8", fontSize: 12 }}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Mobile Top Navbar Bar */}
      <View style={[styles.navbar, { paddingTop }]}>
        {/* App Logo */}
        <View style={styles.logoRow}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.headerLogoImage}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>Buzz Chat</Text>

          {/* Message Counter Badge right on App Logo / Header */}
          <TouchableOpacity
            style={styles.badgeBtn}
            onPress={handleOpenMessages}
            activeOpacity={0.7}
          >
            <Text style={styles.iconText}>💬</Text>
            {unreadMsgCount > 0 && (
              <View style={styles.redDot}>
                <Text style={styles.dotText}>
                  {unreadMsgCount > 9 ? "9+" : unreadMsgCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Right side controls */}
        <View style={styles.rightControls}>
          {/* Notification Bell Icon with Red Dot */}
          <TouchableOpacity
            style={styles.badgeBtn}
            onPress={handleOpenNotifications}
            activeOpacity={0.7}
          >
            <Text style={styles.iconText}>🔔</Text>
            {unreadNotifCount > 0 && (
              <View style={styles.redDot}>
                <Text style={styles.dotText}>
                  {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Logout Button */}
          {user && (
            <TouchableOpacity onPress={handleLogout} style={styles.btnLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Notifications Modal */}
      <Modal
        visible={notifModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setNotifModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.modalTitle}>🔔 Notifications</Text>
                {unreadNotifCount > 0 && (
                  <View style={styles.headerCountBadge}>
                    <Text style={styles.headerCountText}>{unreadNotifCount} unread</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => setNotifModalOpen(false)}>
                <Text style={styles.closeBtnText}>✕ Close</Text>
              </TouchableOpacity>
            </View>

            {unreadNotifCount > 0 && (
              <TouchableOpacity
                style={styles.markReadBtn}
                onPress={markNotificationsRead}
              >
                <Text style={styles.markReadText}>Mark all as read</Text>
              </TouchableOpacity>
            )}

            {loadingNotifs ? (
              <ActivityIndicator size="large" color="#6366f1" style={{ marginVertical: 30 }} />
            ) : notifications.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🎉</Text>
                <Text style={styles.emptyTitle}>All caught up!</Text>
                <Text style={styles.emptySub}>No notifications yet.</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item, index) => item._id || String(index)}
                renderItem={({ item }) => {
                  const senderName = item.sender?.displayName || item.sender?.username || "Someone";
                  let actionText = "";
                  if (item.type === "like") actionText = "liked your post ❤️";
                  else if (item.type === "comment") actionText = "commented on your post 💬";
                  else if (item.type === "follow") actionText = "started following you 👤";
                  else if (item.type === "mention") actionText = "mentioned you 📢";
                  else actionText = "sent a notification";

                  return (
                    <View style={[styles.notifItem, !item.read && styles.unreadNotifItem]}>
                      <View style={styles.notifAvatar}>
                        <Text style={styles.avatarLetter}>
                          {senderName[0]?.toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.notifText}>
                          <Text style={{ fontWeight: "700", color: "#fff" }}>{senderName}</Text>{" "}
                          {actionText}
                        </Text>
                      </View>
                      {!item.read && <View style={styles.unreadIndicator} />}
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Messages Modal */}
      <Modal
        visible={msgModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMsgModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.modalTitle}>💬 Messages</Text>
                {unreadMsgCount > 0 && (
                  <View style={styles.headerCountBadge}>
                    <Text style={styles.headerCountText}>{unreadMsgCount} new</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => setMsgModalOpen(false)}>
                <Text style={styles.closeBtnText}>✕ Close</Text>
              </TouchableOpacity>
            </View>

            {loadingConvs ? (
              <ActivityIndicator size="large" color="#6366f1" style={{ marginVertical: 30 }} />
            ) : conversations.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>💬</Text>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptySub}>Start a conversation with friends!</Text>
              </View>
            ) : (
              <FlatList
                data={conversations}
                keyExtractor={(item, index) => item._id || String(index)}
                renderItem={({ item }) => {
                  const otherUser = item.participants?.find((p: any) => p._id !== user?.id) || item.participants?.[0];
                  const name = otherUser?.displayName || otherUser?.username || "Chat";
                  const lastMsg = item.lastMessage?.body || "Tap to chat";

                  return (
                    <View style={styles.convItem}>
                      <View style={styles.notifAvatar}>
                        <Text style={styles.avatarLetter}>{name[0]?.toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.convName}>{name}</Text>
                        <Text style={styles.convMsg} numberOfLines={1}>{lastMsg}</Text>
                      </View>
                      {item.unreadCount > 0 && (
                        <View style={styles.convUnreadBadge}>
                          <Text style={styles.convUnreadText}>{item.unreadCount}</Text>
                        </View>
                      )}
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#0f172a",
    zIndex: 100,
  },
  toastBanner: {
    position: "absolute",
    top: 50,
    left: 12,
    right: 12,
    backgroundColor: "#1e1b4b",
    borderColor: "#6366f1",
    borderWidth: 1,
    padding: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 999,
  },
  toastContent: {
    flex: 1,
    paddingRight: 8,
  },
  toastTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#a5b4fc",
  },
  toastBody: {
    fontSize: 12,
    color: "#ffffff",
    marginTop: 2,
  },
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    backgroundColor: "#0f172a",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerLogoImage: {
    width: 30,
    height: 30,
    borderRadius: 7,
  },
  logoText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#38bdf8",
  },
  badgeBtn: {
    position: "relative",
    padding: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  iconText: {
    fontSize: 16,
  },
  redDot: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#0f172a",
  },
  dotText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "900",
  },
  rightControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  btnLogout: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  logoutText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#1e293b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    minHeight: "50%",
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
  },
  headerCountBadge: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  headerCountText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  closeBtnText: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "600",
  },
  markReadBtn: {
    alignSelf: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginVertical: 8,
    backgroundColor: "rgba(99,102,241,0.15)",
    borderRadius: 8,
  },
  markReadText: {
    color: "#818cf8",
    fontSize: 12,
    fontWeight: "600",
  },
  notifItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
    marginBottom: 8,
    gap: 12,
  },
  unreadNotifItem: {
    backgroundColor: "rgba(99,102,241,0.15)",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.3)",
  },
  notifAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#475569",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  notifText: {
    color: "#cbd5e1",
    fontSize: 13,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#6366f1",
  },
  convItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
    marginBottom: 8,
    gap: 12,
  },
  convName: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  convMsg: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 2,
  },
  convUnreadBadge: {
    backgroundColor: "#6366f1",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  convUnreadText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  emptySub: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
  },
});
