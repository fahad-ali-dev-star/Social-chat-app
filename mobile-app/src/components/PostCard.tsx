import React, { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { router } from "expo-router";
import { Video, ResizeMode } from "expo-av";
import { usePostStore } from "../postStore";
import { useAuthStore } from "../authStore";
import CommentModal from "./CommentModal";
import ReportModal from "./ReportModal";
import VerifiedBadge from "./VerifiedBadge";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_PADDING = 32; // marginHorizontal 16 * 2
const MEDIA_WIDTH = SCREEN_WIDTH - CARD_PADDING;

interface Props {
  post: any;
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(url);
}

export default function PostCard({ post }: Props) {
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [mediaModalVisible, setMediaModalVisible] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [fullscreenIdx, setFullscreenIdx] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const fullscreenScrollRef = useRef<ScrollView>(null);

  const toggleLike = usePostStore((s) => s.toggleLike);
  const toggleBookmark = usePostStore((s) => s.toggleBookmark);
  const deletePost = usePostStore((s) => s.deletePost);
  const bookmarkedIds = usePostStore((s) => s.bookmarkedIds);
  const currentUser = useAuthStore((s) => s.user);

  const isLiked = Boolean(post._liked);
  const isBookmarked = bookmarkedIds.has(post._id);
  const isOwnPost =
    String(post.author?._id || post.author?.id) === String(currentUser?.id);

  // Build media list — support both mediaUrls array and legacy mediaUrl
  const mediaList: string[] =
    post.mediaUrls && post.mediaUrls.length > 0
      ? post.mediaUrls
      : post.mediaUrl
      ? [post.mediaUrl]
      : [];

  const isVideo =
    post.mediaType === "video" ||
    (mediaList.length > 0 && isVideoUrl(mediaList[0]));

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

  const handleCarouselScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const idx = Math.round(offsetX / MEDIA_WIDTH);
    setActiveIdx(idx);
  };

  const handleFullscreenScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const idx = Math.round(offsetX / SCREEN_WIDTH);
    setFullscreenIdx(idx);
  };

  const openFullscreen = (idx: number) => {
    setFullscreenIdx(idx);
    setMediaModalVisible(true);
    // Scroll to the tapped index after the modal opens
    setTimeout(() => {
      fullscreenScrollRef.current?.scrollTo({
        x: idx * SCREEN_WIDTH,
        animated: false,
      });
    }, 80);
  };

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
            <Text style={styles.username}>
              @{post.author?.username} · {formattedDate}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {!isOwnPost && (
            <TouchableOpacity
              onPress={() => setReportModalVisible(true)}
              style={styles.moreBtn}
            >
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
      {post.content ? (
        <Text style={styles.content}>{post.content}</Text>
      ) : null}

      {/* ── Media Section ── */}
      {mediaList.length > 0 && (
        <View style={styles.mediaWrapper}>
          {isVideo ? (
            /* ── Video Player ── */
            <Video
              source={{ uri: mediaList[0] }}
              style={styles.mediaVideo}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={false}
            />
          ) : mediaList.length === 1 ? (
            /* ── Single Image ── */
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={() => openFullscreen(0)}
            >
              <Image
                source={{ uri: mediaList[0] }}
                style={styles.mediaSingle}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : (
            /* ── Multi-image Horizontal Carousel ── */
            <View>
              <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleCarouselScroll}
                scrollEventThrottle={16}
                style={{ width: MEDIA_WIDTH }}
                contentContainerStyle={{ width: MEDIA_WIDTH * mediaList.length }}
              >
                {mediaList.map((url, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.95}
                    onPress={() => openFullscreen(idx)}
                  >
                    <Image
                      source={{ uri: url }}
                      style={[styles.mediaCarouselItem, { width: MEDIA_WIDTH }]}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Page counter badge (top-right) */}
              <View style={styles.pageCounter}>
                <Text style={styles.pageCounterText}>
                  {activeIdx + 1}/{mediaList.length}
                </Text>
              </View>

              {/* Dot indicators (bottom-center) */}
              <View style={styles.dotsRow}>
                {mediaList.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      activeIdx === idx ? styles.dotActive : styles.dotInactive,
                    ]}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Action Bar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => toggleLike(post._id)}
        >
          <Text style={styles.actionIcon}>{isLiked ? "❤️" : "🤍"}</Text>
          <Text style={[styles.actionCount, isLiked && styles.likedText]}>
            {post.likesCount || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setCommentModalVisible(true)}
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>{post.commentCount || 0}</Text>
        </TouchableOpacity>

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

      {/* ── Full-Screen Media Viewer ── */}
      {mediaList.length > 0 && (
        <Modal
          visible={mediaModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMediaModalVisible(false)}
        >
          <View style={styles.fullscreenBg}>
            {/* Close button */}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setMediaModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>

            {/* Page counter (fullscreen) */}
            {mediaList.length > 1 && (
              <View style={styles.fullscreenCounter}>
                <Text style={styles.pageCounterText}>
                  {fullscreenIdx + 1}/{mediaList.length}
                </Text>
              </View>
            )}

            {isVideo ? (
              <Video
                source={{ uri: mediaList[0] }}
                style={styles.fullscreenVideo}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
              />
            ) : (
              <ScrollView
                ref={fullscreenScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleFullscreenScroll}
                scrollEventThrottle={16}
              >
                {mediaList.map((url, idx) => (
                  <Image
                    key={idx}
                    source={{ uri: url }}
                    style={styles.fullscreenImage}
                    resizeMode="contain"
                  />
                ))}
              </ScrollView>
            )}

            {/* Dots (fullscreen) */}
            {!isVideo && mediaList.length > 1 && (
              <View style={[styles.dotsRow, { position: "absolute", bottom: 40 }]}>
                {mediaList.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      fullscreenIdx === idx ? styles.dotActive : styles.dotInactiveWhite,
                    ]}
                  />
                ))}
              </View>
            )}
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

  /* ── Media ── */
  mediaWrapper: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#0f172a",
  },
  mediaVideo: {
    width: "100%",
    height: 240,
    backgroundColor: "#000",
  },
  mediaSingle: {
    width: "100%",
    height: 240,
  },
  mediaCarouselItem: {
    height: 240,
  },

  /* ── Carousel indicators ── */
  pageCounter: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pageCounterText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: "#38bdf8",
    transform: [{ scale: 1.3 }],
  },
  dotInactive: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  dotInactiveWhite: {
    backgroundColor: "rgba(255,255,255,0.4)",
  },

  /* ── Action bar ── */
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

  /* ── Full-screen viewer ── */
  fullscreenBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  fullscreenCounter: {
    position: "absolute",
    top: 55,
    left: 20,
    zIndex: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: "100%",
  },
  fullscreenVideo: {
    width: SCREEN_WIDTH,
    height: 340,
  },
});
