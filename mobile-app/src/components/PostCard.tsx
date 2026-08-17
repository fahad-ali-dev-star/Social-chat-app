import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { usePostStore } from "../postStore";
import { useAuthStore } from "../authStore";
import CommentModal from "./CommentModal";
import ReportModal from "./ReportModal";
import VerifiedBadge from "./VerifiedBadge";

interface Props {
  post: any;
}

export default function PostCard({ post }: Props) {
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [mediaModalVisible, setMediaModalVisible] = useState(false);

  const toggleLike = usePostStore((s) => s.toggleLike);
  const toggleBookmark = usePostStore((s) => s.toggleBookmark);
  const deletePost = usePostStore((s) => s.deletePost);
  const bookmarkedIds = usePostStore((s) => s.bookmarkedIds);
  const currentUser = useAuthStore((s) => s.user);

  const isLiked = Boolean(post._liked);
  const isBookmarked = bookmarkedIds.has(post._id);
  const isOwnPost = String(post.author?._id || post.author?.id) === String(currentUser?.id);

  const mediaUrl = post.mediaUrls?.[0] || post.mediaUrl;

  const handleOpenProfile = () => {
    if (post.author?.username) {
      router.push(`/user/${post.author.username}` as any);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deletePost(post._id),
        },
      ]
    );
  };

  const formattedDate = post.createdAt
    ? new Date(post.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.authorSection} onPress={handleOpenProfile}>
          {post.author?.avatarUrl ? (
            <Image source={{ uri: post.author.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {post.author?.displayName?.[0] || post.author?.username?.[0] || "U"}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={styles.authorName}>
                {post.author?.displayName || post.author?.username}
              </Text>
              {post.author?.isVerified && <VerifiedBadge size={14} />}
            </View>
            <Text style={styles.username}>@{post.author?.username} · {formattedDate}</Text>
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {!isOwnPost && (
            <TouchableOpacity onPress={() => setReportModalVisible(true)} style={styles.moreBtn}>
              <Text style={styles.moreText}>🚩</Text>
            </TouchableOpacity>
          )}
          {isOwnPost && (
            <TouchableOpacity onPress={handleDelete} style={styles.moreBtn}>
              <Text style={styles.moreText}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Post Text Content */}
      {post.content ? <Text style={styles.content}>{post.content}</Text> : null}

      {/* Media Attachment */}
      {mediaUrl ? (
        <TouchableOpacity onPress={() => setMediaModalVisible(true)}>
          <Image
            source={{ uri: mediaUrl }}
            style={styles.mediaImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      ) : null}

      {/* Action Bar */}
      <View style={styles.footer}>
        {/* Like */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => toggleLike(post._id)}
        >
          <Text style={styles.actionIcon}>{isLiked ? "❤️" : "🤍"}</Text>
          <Text style={[styles.actionCount, isLiked && styles.likedText]}>
            {post.likesCount || 0}
          </Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setCommentModalVisible(true)}
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>{post.commentCount || 0}</Text>
        </TouchableOpacity>

        {/* Bookmark */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => toggleBookmark(post._id)}
        >
          <Text style={styles.actionIcon}>{isBookmarked ? "🔖" : "📑"}</Text>
        </TouchableOpacity>
      </View>

      {/* Comments Modal */}
      <CommentModal
        visible={commentModalVisible}
        postId={post._id}
        onClose={() => setCommentModalVisible(false)}
      />

      {/* Report Modal */}
      <ReportModal
        visible={reportModalVisible}
        targetType="post"
        targetId={post._id}
        onClose={() => setReportModalVisible(false)}
      />

      {/* Full-Screen Media Modal */}
      {mediaUrl && (
        <Modal visible={mediaModalVisible} transparent animationType="fade" onRequestClose={() => setMediaModalVisible(false)}>
          <View style={styles.fullMediaContainer}>
            <TouchableOpacity style={styles.closeMediaBtn} onPress={() => setMediaModalVisible(false)}>
              <Text style={styles.closeMediaText}>✕</Text>
            </TouchableOpacity>
            <Image source={{ uri: mediaUrl }} style={styles.fullMediaImage} resizeMode="contain" />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1e293b",
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  authorSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#6366f1",
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
  authorName: {
    color: "#f8fafc",
    fontWeight: "bold",
    fontSize: 15,
  },
  username: {
    color: "#64748b",
    fontSize: 12,
  },
  moreBtn: {
    padding: 4,
  },
  moreText: {
    fontSize: 15,
  },
  content: {
    color: "#e2e8f0",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  mediaImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#0f172a",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 28,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionIcon: {
    fontSize: 16,
  },
  actionCount: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "500",
  },
  likedText: {
    color: "#ef4444",
    fontWeight: "bold",
  },
  fullMediaContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullMediaImage: {
    width: "100%",
    height: "100%",
  },
  closeMediaBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  closeMediaText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
