import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../api";

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 12);
  const [stats, setStats] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "reports" | "users">("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statRes, repRes, userRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/reports?status=pending"),
        api.get("/admin/users"),
      ]);
      setStats(statRes.data.stats);
      setReports(repRes.data.reports || []);
      setUsers(userRes.data.users || []);
    } catch (err) {
      console.error("Admin data load error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReport = async (reportId: string, status: string) => {
    try {
      await api.patch(`/admin/reports/${reportId}`, { status });
      loadData();
    } catch (err) {
      Alert.alert("Error", "Failed to update report");
    }
  };

  const handleToggleVerifyUser = async (userId: string, currentVal: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}`, { isVerified: !currentVal });
      setUsers((list) => list.map((u) => (u._id === userId ? { ...u, isVerified: !currentVal } : u)));
    } catch (err) {
      Alert.alert("Error", "Failed to update verification status");
    }
  };

  const handleToggleSuspendUser = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      await api.patch(`/admin/users/${userId}`, { accountStatus: nextStatus });
      setUsers((list) => list.map((u) => (u._id === userId ? { ...u, accountStatus: nextStatus } : u)));
    } catch (err) {
      Alert.alert("Error", "Failed to update user status");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop }]}>
      {/* Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🛡️ Admin Dashboard</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "overview" && styles.tabBtnActive]}
          onPress={() => setActiveTab("overview")}
        >
          <Text style={[styles.tabText, activeTab === "overview" && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "reports" && styles.tabBtnActive]}
          onPress={() => setActiveTab("reports")}
        >
          <Text style={[styles.tabText, activeTab === "reports" && styles.tabTextActive]}>
            Reports ({reports.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "users" && styles.tabBtnActive]}
          onPress={() => setActiveTab("users")}
        >
          <Text style={[styles.tabText, activeTab === "users" && styles.tabTextActive]}>
            Users ({users.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator color="#6366f1" size="large" />
        </View>
      ) : activeTab === "overview" ? (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <View style={styles.statsGrid}>
            {stats &&
              Object.entries(stats).map(([key, val]) => (
                <View key={key} style={styles.statCard}>
                  <Text style={styles.statKey}>{key.replace(/([A-Z])/g, " $1")}</Text>
                  <Text style={styles.statVal}>{String(val)}</Text>
                </View>
              ))}
          </View>
        </ScrollView>
      ) : activeTab === "reports" ? (
        <FlatList
          data={reports}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.reportCard}>
              <View style={styles.reportRow}>
                <Text style={styles.reportTarget}>{item.targetType?.toUpperCase()} REPORT</Text>
                <Text style={styles.reportReason}>{item.reason}</Text>
              </View>
              <Text style={styles.reportSub}>
                By @{item.reporter?.username || "user"} · {new Date(item.createdAt).toLocaleDateString()}
              </Text>
              {item.details ? <Text style={styles.reportDetails}>"{item.details}"</Text> : null}
              <View style={styles.reportActions}>
                <TouchableOpacity
                  style={styles.actionResolve}
                  onPress={() => handleUpdateReport(item._id, "resolved")}
                >
                  <Text style={styles.actionText}>Resolve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionDismiss}
                  onPress={() => handleUpdateReport(item._id, "dismissed")}
                >
                  <Text style={styles.actionText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No pending reports.</Text>}
        />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{item.displayName || item.username}</Text>
                <Text style={styles.userSub}>@{item.username} · Role: {item.role}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  style={[styles.miniBtn, item.isVerified ? styles.btnVerified : styles.btnNotVerified]}
                  onPress={() => handleToggleVerifyUser(item._id, item.isVerified)}
                >
                  <Text style={styles.miniBtnText}>{item.isVerified ? "✓ Verified" : "Verify"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.miniBtn, item.accountStatus === "suspended" ? styles.btnActive : styles.btnDanger]}
                  onPress={() => handleToggleSuspendUser(item._id, item.accountStatus)}
                >
                  <Text style={styles.miniBtnText}>
                    {item.accountStatus === "suspended" ? "Unsuspend" : "Suspend"}
                  </Text>
                </TouchableOpacity>
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
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    gap: 12,
  },
  backBtn: {
    paddingVertical: 4,
  },
  backText: {
    color: "#6366f1",
    fontSize: 16,
    fontWeight: "bold",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#6366f1",
  },
  tabText: {
    color: "#64748b",
    fontWeight: "600",
    fontSize: 13,
  },
  tabTextActive: {
    color: "#6366f1",
    fontWeight: "bold",
  },
  centerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 16,
  },
  statKey: {
    color: "#64748b",
    fontSize: 12,
    textTransform: "uppercase",
  },
  statVal: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 6,
  },
  reportCard: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  reportRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  reportTarget: {
    color: "#6366f1",
    fontWeight: "bold",
    fontSize: 12,
  },
  reportReason: {
    color: "#ef4444",
    fontWeight: "600",
    fontSize: 13,
  },
  reportSub: {
    color: "#64748b",
    fontSize: 12,
    marginBottom: 8,
  },
  reportDetails: {
    color: "#cbd5e1",
    fontSize: 13,
    backgroundColor: "#0f172a",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  reportActions: {
    flexDirection: "row",
    gap: 10,
  },
  actionResolve: {
    backgroundColor: "#10b981",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionDismiss: {
    backgroundColor: "#475569",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  userName: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  userSub: {
    color: "#64748b",
    fontSize: 12,
  },
  miniBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnVerified: {
    backgroundColor: "#312e81",
  },
  btnNotVerified: {
    backgroundColor: "#334155",
  },
  btnActive: {
    backgroundColor: "#10b981",
  },
  btnDanger: {
    backgroundColor: "#ef4444",
  },
  miniBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  emptyText: {
    color: "#64748b",
    textAlign: "center",
    marginTop: 32,
  },
});
