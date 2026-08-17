import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Image } from "react-native";
import { router } from "expo-router";
import api from "../api";

interface Props {
  user: any;
  onFollowToggle?: () => void;
}

export default function UserCard({ user, onFollowToggle }: Props) {
  const [following, setFollowing] = useState(Boolean(user.isFollowing));
  const [loading, setLoading] = useState(false);

  const handleToggleFollow = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/users/${user._id || user.id}/follow`);
      setFollowing(data.following);
      if (onFollowToggle) onFollowToggle();
    } catch (err) {
      console.error("Follow error", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = () => {
    if (user.username) {
      router.push(`/user/${user.username}` as any);
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {user.displayName?.[0] || user.username?.[0] || "U"}
        </Text>
      </View>
      <View style={styles.info}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={styles.name}>{user.displayName || user.username}</Text>
          {user.isVerified && (
            <Image
              source={require("@/assets/images/5c6a9983d0c9eef8b3912a451cc8a27d.png")}
              style={{ width: 14, height: 14 }}
              resizeMode="contain"
            />
          )}
        </View>
        <Text style={styles.username}>@{user.username}</Text>
        {user.bio ? <Text style={styles.bio} numberOfLines={1}>{user.bio}</Text> : null}
      </View>

      <TouchableOpacity
        style={[styles.btn, following ? styles.btnOutline : styles.btnPrimary]}
        onPress={handleToggleFollow}
        disabled={loading}
      >
        <Text style={[styles.btnText, following ? styles.btnOutlineText : styles.btnPrimaryText]}>
          {following ? "Following" : "Follow"}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
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
    paddingVertical: 6,
    borderRadius: 16,
  },
  btnPrimary: {
    backgroundColor: "#6366f1",
  },
  btnOutline: {
    backgroundColor: "transparent",
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
    color: "#94a3b8",
  },
});
