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
  TextInput,
  ActivityIndicator,
  Pressable,
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
const MEDIA_WIDTH = SCREEN_WIDTH;
// Instagram default portrait posts are often 4:5; square fallback for feed consistency
const MEDIA_HEIGHT = Math.round(MEDIA_WIDTH * (5 / 4));

const IG = {
  bg: "#000000",
  text: "#FFFFFF",
  secondary: "#A8A8A8",
  blue: "#0095F6",
  like: "#FF3040",
  border: "#262626",
  sheet: "#262626",
};

interface Props {
  post: any;
  isVisible?: boolean;
}

function isVideoUrl(url: string): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|ogg|m4v|3gp)(\?.*)?$/i.test(url) || /\/video\//i.test(url);
}

function formatLikes(count: number): string {
  if (count >= 1_000_000) {
    const v = count / 1_000_000;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}M`;
  }
  if (count >= 10_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return count.toLocaleString("en-US");
}

function formatRelativeTime(iso?: string): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${Math.max(diff, 1)} SECONDS AGO`;
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return `${m} ${m === 1 ? "MINUTE" : "MINUTES"} AGO`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return `${h} ${h === 1 ? "HOUR" : "HOURS"} AGO`;
  }
  if (diff < 604800) {
    const d = Math.floor(diff / 86400);
    return `${d} ${d === 1 ? "DAY" : "DAYS"} AGO`;
  }
  if (diff < 2592000) {
    const w = Math.floor(diff / 604800);
    return `${w} ${w === 1 ? "WEEK" : "WEEKS"} AGO`;
  }
  return new Date(iso)
    .toLocaleDateString("en-US", { month: "long", day: "numeric" })
    .toUpperCase();
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
  const [captionExpanded, setCaptionExpanded] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const fullscreenScrollRef = useRef<ScrollView>(null);
  const videoRef = useRef<Video>(null);
  const lastTapRef = useRef<number>(0);
  const heartAnim = useRef(new Animated.Value(0)).current;
  const storyViewerOpen = usePostStore((s) => s.storyViewerOpen);

  const shouldPlayVideo =
    isVisible &&
    isFocused &&
    !commentModalVisible &&
    !reportModalVisible &&
    !mediaModalVisible &&
    !optionsModalVisible &&
    !editModalVisible &&
    !storyViewerOpen;

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

  const username = post.author?.username || "user";
  const likesCount = post.likesCount || 0;
  const commentCount = post.commentCount || 0;
  const caption = post.content || "";
  const CAPTION_LIMIT = 125;
  const captionNeedsMore = caption.length > CAPTION_LIMIT;

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
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deletePost(post._id),
      },
    ]);
  };

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
      {/* ── Header (Instagram) ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.authorSection}
          onPress={handleOpenProfile}
          activeOpacity={0.7}
        >
          {post.author?.avatarUrl ? (
            <Image
              source={{ uri: post.author.avatarUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(post.author?.displayName?.[0] ||
                  post.author?.username?.[0] ||
                  "U"
                ).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.authorMeta}>
            <View style={styles.usernameRow}>
              <Text style={styles.username} numberOfLines={1}>
                {username}
              </Text>
              {post.author?.isVerified && <VerifiedBadge size={12} />}
              {post.visibility === "followers" && (
                <View style={styles.visibilityBadge}>
                  <Text style={styles.visibilityBadgeText}>👥 Followers</Text>
                </View>
              )}
              {post.visibility === "private" && (
                <View style={styles.visibilityBadge}>
                  <Text style={styles.visibilityBadgeText}>🔒 Private</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setOptionsModalVisible(true)}
          style={styles.moreBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={IG.text} />
        </TouchableOpacity>
      </View>

      {/* ── Media (full-bleed) ── */}
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
              <Ionicons name="heart" size={90} color="#fff" />
            </Animated.View>
          )}

          {isVideo ? (
            <Video
              ref={videoRef}
              source={{ uri: mediaList[0] }}
              style={styles.mediaVideo}
              useNativeControls
              resizeMode={ResizeMode.COVER}
              shouldPlay={shouldPlayVideo}
              isLooping
            />
          ) : mediaList.length === 1 ? (
            <Pressable onPress={() => handleMediaPress(0)}>
              <Image
                source={{ uri: mediaList[0] }}
                style={styles.mediaSingle}
                resizeMode="cover"
              />
            </Pressable>
          ) : (
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
                  <Pressable key={idx} onPress={() => handleMediaPress(idx)}>
                    <Image
                      source={{ uri: url }}
                      style={[styles.mediaCarouselItem, { width: MEDIA_WIDTH }]}
                      resizeMode="cover"
                    />
                  </Pressable>
                ))}
              </ScrollView>

              <View style={styles.pageCounter}>
                <Text style={styles.pageCounterText}>
                  {activeIdx + 1}/{mediaList.length}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ── Actions ── */}
      <View style={styles.actionsRow}>
        <View style={styles.actionsLeft}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => toggleLike(post._id)}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={26}
              color={isLiked ? IG.like : IG.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setCommentModalVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Ionicons name="chatbubble-outline" size={24} color={IG.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleShare}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Ionicons name="paper-plane-outline" size={24} color={IG.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.actionsCenter}>
          {!isVideo && mediaList.length > 1 && (
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
          )}
        </View>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => toggleBookmark(post._id)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isBookmarked ? "bookmark" : "bookmark-outline"}
            size={24}
            color={isBookmarked ? "#FACC15" : IG.secondary}
          />
        </TouchableOpacity>
      </View>

      {/* ── Likes ── */}
      {likesCount > 0 && (
        <TouchableOpacity style={styles.likesRow} activeOpacity={0.7}>
          <Text style={styles.likesText}>
            {formatLikes(likesCount)} {likesCount === 1 ? "like" : "likes"}
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Caption ── */}
      {caption ? (
        <View style={styles.captionRow}>
          <Text style={styles.captionText}>
            <Text style={styles.captionUsername} onPress={handleOpenProfile}>
              {username}{" "}
            </Text>
            {captionExpanded || !captionNeedsMore
              ? caption
              : `${caption.slice(0, CAPTION_LIMIT).trimEnd()}... `}
            {captionNeedsMore && !captionExpanded && (
              <Text
                style={styles.moreLink}
                onPress={() => setCaptionExpanded(true)}
              >
                more
              </Text>
            )}
            {post.isEdited ? (
              <Text style={styles.editedTag}> · Edited</Text>
            ) : null}
          </Text>
        </View>
      ) : null}

      {/* ── View comments ── */}
      {commentCount > 0 && (
        <TouchableOpacity
          style={styles.viewCommentsBtn}
          onPress={() => setCommentModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.viewCommentsText}>
            View {commentCount === 1 ? "1 comment" : `all ${commentCount} comments`}
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Timestamp ── */}
      {post.createdAt ? (
        <Text style={styles.timestamp}>{formatRelativeTime(post.createdAt)}</Text>
      ) : null}

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
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setMediaModalVisible(false)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>

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

            {!isVideo && mediaList.length > 1 && (
              <View style={[styles.dotsRow, styles.fullscreenDots]}>
                {mediaList.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      fullscreenIdx === idx
                        ? styles.dotActive
                        : styles.dotInactiveWhite,
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
                  <Text style={styles.optionText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.optionItem, styles.optionItemLast]}
                  onPress={() => {
                    setOptionsModalVisible(false);
                    handleDelete();
                  }}
                >
                  <Text style={[styles.optionText, styles.optionDanger]}>
                    Delete
                  </Text>
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
                  <Text style={[styles.optionText, styles.optionDanger]}>
                    Report
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.optionItem, styles.optionItemLast]}
                  onPress={() => {
                    setOptionsModalVisible(false);
                    toggleBookmark(post._id);
                  }}
                >
                  <Text style={styles.optionText}>
                    {isBookmarked ? "Remove from Saved" : "Save"}
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
          style={[styles.modalOverlay, styles.editOverlay]}
          activeOpacity={1}
          onPress={() => setEditModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.editBox}>
            <View style={styles.editHeader}>
              <Text style={styles.editTitle}>Edit Post</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={IG.secondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.editInput}
              multiline
              value={editContent}
              onChangeText={setEditContent}
              placeholder="Write a caption..."
              placeholderTextColor={IG.secondary}
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
                  <Text style={styles.saveBtnText}>Done</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
    backgroundColor: IG.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: IG.border,
    paddingBottom: 12,
    marginBottom: 4,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 52,
  },
  authorSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#363636",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: IG.border,
  },
  avatarText: {
    color: IG.text,
    fontWeight: "600",
    fontSize: 13,
  },
  authorMeta: {
    flex: 1,
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  username: {
    color: IG.text,
    fontWeight: "600",
    fontSize: 14,
  },
  visibilityBadge: {
    backgroundColor: "#1e1b4b",
    borderWidth: 1,
    borderColor: "#4f46e5",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  visibilityBadgeText: {
    color: "#a5b4fc",
    fontSize: 10,
    fontWeight: "600",
  },
  moreBtn: {
    padding: 4,
    marginLeft: 8,
  },

  /* Media */
  mediaWrapper: {
    width: MEDIA_WIDTH,
    backgroundColor: "#111",
    overflow: "hidden",
  },
  mediaVideo: {
    width: MEDIA_WIDTH,
    height: MEDIA_HEIGHT,
    backgroundColor: "#000",
  },
  mediaSingle: {
    width: MEDIA_WIDTH,
    height: MEDIA_HEIGHT,
  },
  mediaCarouselItem: {
    height: MEDIA_HEIGHT,
  },
  pageCounter: {
    position: "absolute",
    top: 14,
    right: 14,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pageCounterText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  /* Actions */
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 6,
    minHeight: 44,
  },
  actionsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    width: 110,
  },
  actionsCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtn: {
    padding: 2,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: IG.blue,
  },
  dotInactive: {
    backgroundColor: "#A8A8A8",
    opacity: 0.4,
  },
  dotInactiveWhite: {
    backgroundColor: "rgba(255,255,255,0.4)",
  },

  /* Likes / caption / meta */
  likesRow: {
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  likesText: {
    color: IG.text,
    fontWeight: "600",
    fontSize: 14,
  },
  captionRow: {
    paddingHorizontal: 14,
    paddingBottom: 2,
  },
  captionText: {
    color: IG.text,
    fontSize: 14,
    lineHeight: 18,
  },
  captionUsername: {
    fontWeight: "600",
    color: IG.text,
  },
  moreLink: {
    color: IG.secondary,
  },
  editedTag: {
    color: IG.secondary,
    fontSize: 13,
  },
  viewCommentsBtn: {
    paddingHorizontal: 14,
    paddingTop: 4,
  },
  viewCommentsText: {
    color: IG.secondary,
    fontSize: 14,
  },
  timestamp: {
    color: IG.secondary,
    fontSize: 10,
    letterSpacing: 0.2,
    paddingHorizontal: 14,
    paddingTop: 6,
  },

  /* Fullscreen */
  fullscreenBg: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 50,
    right: 16,
    zIndex: 20,
    padding: 8,
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
  fullscreenDots: {
    position: "absolute",
    bottom: 40,
  },
  floatingHeartContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -45,
    marginLeft: -45,
    width: 90,
    height: 90,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99,
  },

  /* Sheets */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  optionsSheet: {
    backgroundColor: IG.sheet,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingTop: 10,
    paddingBottom: 28,
    overflow: "hidden",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#555",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  optionItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#363636",
  },
  optionItemLast: {
    borderBottomWidth: 0,
  },
  optionText: {
    color: IG.text,
    fontSize: 15,
    fontWeight: "500",
  },
  optionDanger: {
    color: "#ED4956",
    fontWeight: "600",
  },
  editOverlay: {
    justifyContent: "center",
    padding: 20,
  },
  editBox: {
    backgroundColor: IG.sheet,
    borderRadius: 14,
    padding: 18,
    width: "100%",
  },
  editHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  editTitle: {
    color: IG.text,
    fontSize: 16,
    fontWeight: "600",
  },
  editInput: {
    backgroundColor: "#1a1a1a",
    color: IG.text,
    borderRadius: 8,
    padding: 12,
    minHeight: 110,
    textAlignVertical: "top",
    fontSize: 15,
    marginBottom: 16,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: IG.secondary,
    fontWeight: "600",
    fontSize: 14,
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: IG.blue,
    minWidth: 72,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
