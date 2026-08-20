import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Image } from "react-native";
import { router } from "expo-router";
import api from "../api";
import VerifiedBadge from "./VerifiedBadge";

interface Props {
  user: any;
  onFollowToggle?: (isFollowing?: boolean, requested?: boolean) => void;
}

export default function UserCard({ user, onFollowToggle }: Props) {
  const [following, setFollowing] = useState(Boolean(user.isFollowing));
  const [requested, setRequested] = useState(Boolean(user.requested));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFollowing(Boolean(user.isFollowing));
    setRequested(Boolean(user.requested));
  }, [user.isFollowing, user.requested, user._id, user.id]);

  const handleToggleFollow = async () => {
    const targetId = user._id || user.id;
    if (!targetId) return;

    const prevFollowing = following;
    const prevRequested = requested;

    // Optimistic UI Update (matches Web logic)
    if (prevFollowing || prevRequested) {
      setFollowing(false);
      setRequested(false);
    } else if (user.isPrivate) {
      setRequested(true);
    } else {
      setFollowing(true);
    }

    setLoading(true);
    try {
      const { data } = await api.post(`/users/${targetId}/follow`);
      const newFollowing = Boolean(data.following);
      const newRequested = Boolean(data.requested);
      setFollowing(newFollowing);
      setRequested(newRequested);
      user.isFollowing = newFollowing;
      user.requested = newRequested;
      if (onFollowToggle) onFollowToggle(newFollowing, newRequested);
    } catch (err) {
      console.error("Follow error", err);
      // Rollback to previous state on error
      setFollowing(prevFollowing);
      setRequested(prevRequested);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = () => {
    if (user.username) {
      router.push(`/user/${user.username}` as any);
    }
  };

  const getButtonText = () => {
    if (loading) return "...";
    if (following) return "Unfollow";
    if (requested) return "Requested";
    return "Follow";
  };

  const getButtonStyle = () => {
    if (following) return styles.btnOutline;
    if (requested) return styles.btnRequested;
    return styles.btnPrimary;
  };

  const getButtonTextStyle = () => {
    if (following) return styles.btnOutlineText;
    if (requested) return styles.btnRequestedText;
    return styles.btnPrimaryText;
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.leftRow} onPress={handlePress} activeOpacity={0.8}>
        {user.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user.displayName?.[0] || user.username?.[0] || "U").toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.info}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={styles.name}>{user.displayName || user.username}</Text>
            {user.isVerified && <VerifiedBadge size={14} />}
          </View>
          <Text style={styles.username}>@{user.username}</Text>
          {user.bio ? <Text style={styles.bio} numberOfLines={1}>{user.bio}</Text> : null}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, getButtonStyle()]}
        onPress={handleToggleFollow}
        disabled={loading}
        activeOpacity={0.8}
      >
        <Text style={[styles.btnText, getButtonTextStyle()]}>
          {getButtonText()}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    gap: 12,
  },
  leftRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  info: {
    flex: 1,
  },
  name: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  username: {
    color: "#64748b",
    fontSize: 12,
  },
  bio: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 2,
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: {
    backgroundColor: "#6366f1",
  },
  btnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  btnRequested: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "#475569",
  },
  btnText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  btnPrimaryText: {
    color: "#fff",
  },
  btnOutlineText: {
    color: "#ef4444",
  },
  btnRequestedText: {
    color: "#94a3b8",
  },
});
