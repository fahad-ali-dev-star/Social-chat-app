import React, { useState, useEffect, useRef } from "react";
import { useIsFocused } from "@react-navigation/native";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Share,
  Animated,
  ViewToken,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostStore } from "../../postStore";
import { useSavedVideosStore } from "../../savedVideosStore";
import CommentModal from "../../components/CommentModal";
import VerifiedBadge from "../../components/VerifiedBadge";
import CreatePostModal from "../../components/CreatePostModal";
import ShareReelModal from "../../components/ShareReelModal";
import { IG } from "../../constants/theme";

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get("window");

interface ReelItemProps {
  item: any;
  isActive: boolean;
  itemHeight: number;
  onSharePress: (item: any) => void;
}

function ReelItem({ item, isActive, itemHeight, onSharePress }: ReelItemProps) {
  const [commentVisible, setCommentVisible] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [paused, setPaused] = useState(false);
  const videoRef = useRef<Video>(null);
  const heartAnim = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleLike = usePostStore((s) => s.toggleLike);
  const isLiked = Boolean(item._liked);
  const { saveVideo, unsaveVideo, isSaved } = useSavedVideosStore();
  const saved = isSaved(item._id);

  useEffect(() => {
    if (!isActive || paused) {
      if (videoRef.current) {
        videoRef.current.pauseAsync().catch(() => {});
      }
    }
    if (!isActive) {
      setPaused(false);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isActive, paused]);

  const triggerHeartAnim = () => {
    heartAnim.setValue(0);
    setShowHeart(true);
    Animated.sequence([
      Animated.spring(heartAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.timing(heartAnim, {
        toValue: 0,
        duration: 250,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setShowHeart(false));
  };

  const handlePress = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (lastTapRef.current && now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      lastTapRef.current = 0;
      triggerHeartAnim();
      if (!isLiked) {
        toggleLike(item._id);
      }
    } else {
      lastTapRef.current = now;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        setPaused((prev) => !prev);
        timerRef.current = null;
        lastTapRef.current = 0;
      }, DOUBLE_TAP_DELAY);
    }
  };

  const handleShare = () => {
    onSharePress(item);
  };

  return (
    <View style={[styles.reelContainer, { height: itemHeight }]}>
      {/* Video Player */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handlePress}
        style={StyleSheet.absoluteFill}
      >
        <Video
          ref={videoRef}
          source={{ uri: item.mediaUrl }}
          style={styles.videoPlayer}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isActive && !paused}
          isLooping
          isMuted={false}
        />
      </TouchableOpacity>

      {/* Paused Play Icon Overlay */}
      {paused && (
        <View pointerEvents="none" style={styles.pausedOverlay}>
          <Ionicons name="play-circle" size={72} color="rgba(255, 255, 255, 0.85)" />
        </View>
      )}

      {/* Floating Heart Animation Overlay */}
      {showHeart && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.floatingHeart,
            {
              opacity: heartAnim,
              transform: [
                {
                  scale: heartAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 1.3, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={{ fontSize: 72 }}>❤️</Text>
        </Animated.View>
      )}

      {/* Dark Overlay Gradient for text legibility */}
      <View pointerEvents="none" style={styles.gradientOverlay} />

      {/* Right Side Action Bar */}
      <View style={styles.rightActions}>
        {/* Author Avatar with Plus Badge */}
        <TouchableOpacity
          onPress={() => {
            if (item.author?.username) {
              router.push(`/user/${item.author.username}` as any);
            }
          }}
          style={styles.avatarWrapper}
        >
          {item.author?.avatarUrl ? (
            <Image source={{ uri: item.author.avatarUrl }} style={styles.actionAvatar} />
          ) : (
            <View style={[styles.actionAvatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>
                {item.author?.displayName?.[0] || item.author?.username?.[0] || "U"}
              </Text>
            </View>
          )}
          <View style={styles.plusBadge}>
            <Ionicons name="add" size={10} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Like Button */}
        <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(item._id)}>
          <Text style={styles.actionIcon}>{isLiked ? "❤️" : "🤍"}</Text>
          <Text style={styles.actionCount}>
            {(item.likesCount || 0) + (isLiked ? 1 : 0)}
          </Text>
        </TouchableOpacity>

        {/* Comment Button */}
        <TouchableOpacity style={styles.actionBtn} onPress={() => setCommentVisible(true)}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>{item.commentCount || 0}</Text>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
          <Text style={styles.actionIcon}>📤</Text>
          <Text style={styles.actionCount}>Share</Text>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => saved ? unsaveVideo(item._id) : saveVideo(item)}
        >
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={26}
            color={saved ? "#F59E0B" : "#fff"}
          />
          <Text style={styles.actionCount}>{saved ? "Saved" : "Save"}</Text>
        </TouchableOpacity>

        {/* Audio Vinyl Record Disc */}
        <View style={styles.vinylDisc}>
          <Text style={{ fontSize: 14 }}>🎵</Text>
        </View>
      </View>

      {/* Bottom Info Section */}
      <View style={styles.bottomInfo}>
        <TouchableOpacity
          onPress={() => {
            if (item.author?.username) {
              router.push(`/user/${item.author.username}` as any);
            }
          }}
          style={styles.authorRow}
        >
          <Text style={styles.authorName}>
            @{item.author?.username || "user"}
          </Text>
          {item.author?.isVerified && <VerifiedBadge size={14} />}
        </TouchableOpacity>

        {item.content ? (
          <Text style={styles.captionText} numberOfLines={2}>
            {item.content}
          </Text>
        ) : null}

        <View style={styles.audioRow}>
          <Ionicons name="musical-notes" size={12} color="#fff" />
          <Text style={styles.audioText} numberOfLines={1}>
            Original Sound - @{item.author?.username || "buzzchat"}
          </Text>
        </View>
      </View>

      {/* Comment Modal */}
      <CommentModal
        visible={commentVisible}
        postId={item._id}
        onClose={() => setCommentVisible(false)}
      />
    </View>
  );
}

export default function ReelsScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const tabBarHeight = 60 + Math.max(insets.bottom, 12);
  const reelHeight = WINDOW_HEIGHT - tabBarHeight;

  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedReel, setSelectedReel] = useState<any>(null);

  const loadSaved = useSavedVideosStore((s) => s.loadSaved);
  const loadFeed = usePostStore((s) => s.loadFeed);

  useEffect(() => {
    loadSaved();
    fetchReels();
  }, []);

  const fetchReels = async () => {
    setLoading(true);
    try {
      const videoPosts = await loadFeed(true, "all", "video");
      setReels(videoPosts || []);
    } catch (err) {
      setReels([]);
    } finally {
      setLoading(false);
    }
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIdx(viewableItems[0].index);
      }
    }
  ).current;

  return (
    <View style={styles.screen}>
      {/* Top Header */}
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity
          style={styles.addReelBtn}
          onPress={() => setCreateModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reels 🎬</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={IG.accent} />
        </View>
      ) : reels.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="videocam-outline" size={52} color={IG.textSecondary} />
          <Text style={styles.emptyTitle}>No reels yet</Text>
          <Text style={styles.emptyText}>Share a video and it will appear here.</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => setCreateModalVisible(true)}>
            <Ionicons name="add" size={18} color={IG.bg} />
            <Text style={styles.emptyButtonText}>Create a reel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reels}
          keyExtractor={(item, index) => item._id || String(index)}
          pagingEnabled
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          snapToInterval={reelHeight}
          snapToAlignment="start"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 70 }}
          renderItem={({ item, index }) => (
            <ReelItem
              item={item}
              isActive={isFocused && index === activeIdx}
              itemHeight={reelHeight}
              onSharePress={(r) => {
                setSelectedReel(r);
                setShareModalVisible(true);
              }}
            />
          )}
        />
      )}

      {/* Create Reel / Post Modal */}
      <CreatePostModal
        visible={createModalVisible}
        onClose={() => {
          setCreateModalVisible(false);
          fetchReels();
        }}
      />

      {/* Share Reel Modal */}
      <ShareReelModal
        visible={shareModalVisible}
        reel={selectedReel}
        onClose={() => setShareModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: IG.bg,
  },
  topHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  addReelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  reelContainer: {
    width: WINDOW_WIDTH,
    position: "relative",
    backgroundColor: "#05070a",
  },
  videoPlayer: {
    width: "100%",
    height: "100%",
  },
  gradientOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 45,
    backgroundColor: "rgba(0,0,0,0.10)",
  },
  floatingHeart: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -40,
    marginLeft: -40,
    zIndex: 20,
  },
  pausedOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -36,
    marginLeft: -36,
    zIndex: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  rightActions: {
    position: "absolute",
    right: 12,
    bottom: 2,
    alignItems: "center",
    gap: 8,
    zIndex: 15,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 2,
  },
  actionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarFallback: {
    backgroundColor: IG.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  plusBadge: {
    position: "absolute",
    bottom: -4,
    alignSelf: "center",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#EC4899",
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtn: {
    alignItems: "center",
  },
  actionIcon: {
    fontSize: 22,
  },
  actionCount: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 0,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  vinylDisc: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: IG.surface,
    borderWidth: 2,
    borderColor: IG.border,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  bottomInfo: {
    position: "absolute",
    left: 12,
    right: 68,
    bottom: 2,
    zIndex: 15,
    gap: 1,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  authorName: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  captionText: {
    color: "#f1f5f9",
    fontSize: 14,
    lineHeight: 18,
  },
  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  audioText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  emptyTitle: {
    color: IG.text,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 14,
  },
  emptyText: {
    color: IG.textSecondary,
    fontSize: 14,
    marginTop: 6,
    textAlign: "center",
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: IG.accent,
    borderRadius: 8,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyButtonText: {
    color: IG.bg,
    fontWeight: "700",
  },
});
