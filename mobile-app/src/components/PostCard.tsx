import React, { useState, useRef, useEffect } from "react";
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
  Animated,
  Share,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { usePostStore } from "../postStore";
import { useAuthStore } from "../authStore";
import { resolveMediaUrl } from "../config";
import CommentModal from "./CommentModal";
import ReportModal from "./ReportModal";
import VerifiedBadge from "./VerifiedBadge";
import ShareReelModal from "./ShareReelModal";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_PADDING = 32; // marginHorizontal 16 * 2
const MEDIA_WIDTH = SCREEN_WIDTH - CARD_PADDING;
// 4:3 ratio for responsive image height
const MEDIA_HEIGHT = Math.round(MEDIA_WIDTH * 0.75);

interface Props {
  post: any;
  isVisible?: boolean;
}

function isVideoUrl(url: string): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|ogg|m4v|3gp)(\?.*)?$/i.test(url) || /\/video\//i.test(url);
}

function PostCard({ post, isVisible = false }: Props) {
  const isFocused = useIsFocused();
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [mediaModalVisible, setMediaModalVisible] = useState(false);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [editContent, setEditContent] = useState(post.content || "");
  const [savingEdit, setSavingEdit] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [fullscreenIdx, setFullscreenIdx] = useState(0);
  const [showFloatingHeart, setShowFloatingHeart] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const fullscreenScrollRef = useRef<ScrollView>(null);
  const videoRef = useRef<Video>(null);
  const lastTapRef = useRef<number>(0);
  const heartAnim = useRef(new Animated.Value(0)).current;

  const shouldPlayVideo = isVisible && isFocused && !commentModalVisible && !reportModalVisible && !mediaModalVisible && !optionsModalVisible && !editModalVisible;

  useEffect(() => {
    if (!shouldPlayVideo && videoRef.current) {
      videoRef.current.pauseAsync().catch(() => {});
    }
  }, [shouldPlayVideo]);

  const toggleLike = usePostStore((s) => s.toggleLike);
  const toggleBookmark = usePostStore((s) => s.toggleBookmark);
  const deletePost = usePostStore((s) => s.deletePost);
  const updatePost = usePostStore((s) => s.updatePost);
  const bookmarkedIds = usePostStore((s) => s.bookmarkedIds);
  const currentUser = useAuthStore((s) => s.user);

  const handleSaveEdit = async () => {
    if (!editContent.trim()) {
      Alert.alert("Error", "Post content cannot be empty.");
      return;
    }
    setSavingEdit(true);
    try {
      await updatePost(post._id, editContent.trim());
      setEditModalVisible(false);
    } catch (err) {
      Alert.alert("Error", "Failed to update post.");
    } finally {
      setSavingEdit(false);
    }
  };

  const isLiked = Boolean(post._liked);
  const isBookmarked = bookmarkedIds.has(post._id);
  const currentUserId = String(currentUser?._id || currentUser?.id || "");
  const postAuthorId =
    typeof post.author === "string"
      ? post.author
      : String(post.author?._id || post.author?.id || "");
  const isOwnPost = Boolean(
    currentUserId && postAuthorId && currentUserId === postAuthorId
  );

  // Build media list — support both mediaUrls array and legacy mediaUrl
  const rawMediaList: string[] =
    post.mediaUrls && post.mediaUrls.length > 0
      ? post.mediaUrls
      : post.mediaUrl
      ? [post.mediaUrl]
      : [];

  const mediaList: string[] = rawMediaList.map(resolveMediaUrl);

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

  const triggerHeartAnimation = () => {
    heartAnim.setValue(0);
    setShowFloatingHeart(true);
    Animated.sequence([
      Animated.spring(heartAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.timing(heartAnim, {
        toValue: 0,
        duration: 250,
        delay: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowFloatingHeart(false);
    });
  };

  const handleMediaPress = (idx: number) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (lastTapRef.current && now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected!
      triggerHeartAnimation();
      if (!isLiked) {
        toggleLike(post._id);
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      const tapTime = now;
      setTimeout(() => {
        if (lastTapRef.current === tapTime) {
          openFullscreen(idx);
          lastTapRef.current = 0;
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  const handleShare = () => {
    setShareModalVisible(true);
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
              {post.isEdited ? <Text style={{ color: "#64748B", fontSize: 11 }}> (edited)</Text> : null}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setOptionsModalVisible(true)}
          style={styles.moreBtn}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Post Text Content */}
      {post.content ? (
        <Text style={styles.content}>{post.content}</Text>
      ) : null}

      {/* ── Media Section ── */}
      {mediaList.length > 0 && (
        <View style={styles.mediaWrapper}>
          {showFloatingHeart && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.floatingHeartContainer,
                {
                  opacity: heartAnim,
                  transform: [
                    {
                      scale: heartAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.3, 1.25, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.floatingHeartText}>❤️</Text>
            </Animated.View>
          )}
          {isVideo ? (
            /* ── Video Player ── */
            <Video
              ref={videoRef}
              source={{ uri: mediaList[0] }}
              style={styles.mediaVideo}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={shouldPlayVideo}
            />
          ) : mediaList.length === 1 ? (
            /* ── Single Image ── */
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={() => handleMediaPress(0)}
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
                    onPress={() => handleMediaPress(idx)}
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

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleShare}
        >
          <Text style={styles.actionIcon}>📤</Text>
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

      {/* Options Menu Modal */}
      <Modal
        visible={optionsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setOptionsModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.optionsSheet}>
            <View style={styles.sheetHandle} />

            {isOwnPost ? (
              <>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setOptionsModalVisible(false);
                    setEditContent(post.content || "");
                    setEditModalVisible(true);
                  }}
                >
                  <Ionicons name="create-outline" size={20} color="#38BDF8" />
                  <Text style={styles.optionText}>Edit Post</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.optionItem, { borderBottomWidth: 0 }]}
                  onPress={() => {
                    setOptionsModalVisible(false);
                    handleDelete();
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  <Text style={[styles.optionText, { color: "#EF4444" }]}>Delete Post</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setOptionsModalVisible(false);
                    setReportModalVisible(true);
                  }}
                >
                  <Ionicons name="flag-outline" size={20} color="#F59E0B" />
                  <Text style={styles.optionText}>Report Post</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.optionItem, { borderBottomWidth: 0 }]}
                  onPress={() => {
                    setOptionsModalVisible(false);
                    toggleBookmark(post._id);
                  }}
                >
                  <Ionicons
                    name={isBookmarked ? "bookmark" : "bookmark-outline"}
                    size={20}
                    color="#C084FC"
                  />
                  <Text style={styles.optionText}>
                    {isBookmarked ? "Remove Bookmark" : "Save Post"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Edit Post Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { justifyContent: "center", padding: 20 }]}
          activeOpacity={1}
          onPress={() => setEditModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.editBox}>
            <View style={styles.editHeader}>
              <Text style={styles.editTitle}>Edit Post</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.editInput}
              multiline
              value={editContent}
              onChangeText={setEditContent}
              placeholder="What's on your mind?"
              placeholderTextColor="#64748B"
            />

            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Share Reel / Post Modal */}
      <ShareReelModal
        visible={shareModalVisible}
        reel={post}
        onClose={() => setShareModalVisible(false)}
      />
    </View>
  );
}

export default React.memo(PostCard);

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
    width: "100%",
  },
  mediaVideo: {
    width: "100%",
    height: MEDIA_HEIGHT,
    backgroundColor: "#000",
  },
  mediaSingle: {
    width: "100%",
    height: MEDIA_HEIGHT,
  },
  mediaCarouselItem: {
    height: MEDIA_HEIGHT,
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
    height: SCREEN_HEIGHT,
  },
  fullscreenVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  floatingHeartContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -40,
    marginLeft: -40,
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99,
  },
  floatingHeartText: {
    fontSize: 64,
  },

  /* ── Options Sheet & Edit Modal Styles ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  optionsSheet: {
    backgroundColor: "#1e293b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#475569",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  optionText: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "500",
  },
  editBox: {
    backgroundColor: "#1e293b",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  editHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  editTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "bold",
  },
  editInput: {
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    borderRadius: 14,
    padding: 14,
    minHeight: 120,
    textAlignVertical: "top",
    fontSize: 15,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#334155",
  },
  cancelBtnText: {
    color: "#94a3b8",
    fontWeight: "600",
    fontSize: 14,
  },
  saveBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#6366f1",
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
