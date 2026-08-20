import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Video, ResizeMode } from "expo-av";
import api from "../api";
import { useAuthStore } from "../authStore";
import VerifiedBadge from "./VerifiedBadge";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const STORY_DURATION = 5000; // 5 seconds per image story

function formatTimeAgo(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function StoryBar() {
  const [storyGroups, setStoryGroups] = useState<any[]>([]);
  const [activeGroupIdx, setActiveGroupIdx] = useState<number | null>(null);
  const [activeStoryIdx, setActiveStoryIdx] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const user = useAuthStore((s) => s.user);

  // Animated progress bar
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const { data } = await api.get("/stories/feed");
      setStoryGroups(data.storyGroups || data.stories || []);
    } catch (err) {
      console.error("Failed to load stories", err);
    }
  };

  const handleAddStory = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Needed", "Please allow media access to post a story.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setUploading(true);
      try {
        const formData = new FormData();
        const asset = result.assets[0];
        const uri = asset.uri;
        const filename = uri.split("/").pop() || "story.jpg";
        const isVideo = asset.type === "video" || /\.(mp4|mov|webm)$/i.test(filename);
        const fileType = isVideo ? "video/mp4" : "image/jpeg";

        formData.append("file", { uri, name: filename, type: fileType } as any);

        const uploadRes = await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        await api.post("/stories", {
          mediaUrl: uploadRes.data.url,
          mediaType: isVideo ? "video" : "image",
        });

        await loadStories();
      } catch (err) {
        console.error("Story upload failed", err);
        Alert.alert("Error", "Failed to upload story");
      } finally {
        setUploading(false);
      }
    }
  };

  const currentGroup =
    activeGroupIdx !== null ? storyGroups[activeGroupIdx] : null;
  const currentStory = currentGroup?.stories?.[activeStoryIdx];
  const isMyStory =
    String(currentStory?.user?._id || currentStory?.user || "") ===
    String(user?.id || user?._id);

  // Start / restart animated progress whenever active story changes
  const startProgress = useCallback(() => {
    // Stop any running animation
    if (progressAnimRef.current) {
      progressAnimRef.current.stop();
      progressAnimRef.current = null;
    }
    progressAnim.setValue(0);

    const isVideo =
      currentStory?.mediaType === "video" ||
      /\.(mp4|mov|webm)$/i.test(currentStory?.mediaUrl || "");

    // For videos, progress is driven by playback; for images, use timer
    if (!isVideo) {
      const anim = Animated.timing(progressAnim, {
        toValue: 1,
        duration: STORY_DURATION,
        useNativeDriver: false,
      });
      progressAnimRef.current = anim;
      anim.start(({ finished }) => {
        if (finished) {
          handleNextStory();
        }
      });
    }
  }, [activeGroupIdx, activeStoryIdx, currentStory]);

  useEffect(() => {
    if (activeGroupIdx !== null && currentStory) {
      startProgress();
    } else {
      // Viewer closed – reset
      if (progressAnimRef.current) {
        progressAnimRef.current.stop();
        progressAnimRef.current = null;
      }
      progressAnim.setValue(0);
    }
  }, [activeGroupIdx, activeStoryIdx]);

  const handleNextStory = () => {
    if (!currentGroup) return;
    if (activeStoryIdx < currentGroup.stories.length - 1) {
      setActiveStoryIdx((prev) => prev + 1);
    } else if (activeGroupIdx! < storyGroups.length - 1) {
      setActiveGroupIdx((prev) => prev! + 1);
      setActiveStoryIdx(0);
    } else {
      setActiveGroupIdx(null);
    }
  };

  const handlePrevStory = () => {
    if (!currentGroup) return;
    if (activeStoryIdx > 0) {
      setActiveStoryIdx((prev) => prev - 1);
    } else if (activeGroupIdx! > 0) {
      const prevIdx = activeGroupIdx! - 1;
      setActiveGroupIdx(prevIdx);
      setActiveStoryIdx(storyGroups[prevIdx].stories.length - 1);
    }
  };

  const handleDeleteStory = async () => {
    if (!currentStory?._id) return;
    Alert.alert("Delete Story", "Are you sure you want to delete this story?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/stories/${currentStory._id}`);
            setActiveGroupIdx(null);
            loadStories();
          } catch {
            Alert.alert("Error", "Could not delete story.");
          }
        },
      },
    ]);
  };

  const handleToggleLikeStory = async () => {
    if (!currentStory?._id) return;
    try {
      const { data } = await api.post(`/stories/${currentStory._id}/like`);
      setStoryGroups((prev) =>
        prev.map((g, gIdx) => {
          if (gIdx !== activeGroupIdx) return g;
          return {
            ...g,
            stories: g.stories.map((s: any, sIdx: number) => {
              if (sIdx !== activeStoryIdx) return s;
              return {
                ...s,
                likedByMe: data.liked,
                likesCount: data.likesCount,
              };
            }),
          };
        })
      );
    } catch {
      console.error("Failed to like story");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Your Story / Add Story Circle ── */}
        <TouchableOpacity
          style={styles.storyItem}
          onPress={handleAddStory}
          disabled={uploading}
        >
          <View style={styles.addCircleBorder}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.storyAvatar} />
            ) : (
              <View style={styles.storyAvatarFallback}>
                <Text style={styles.storyAvatarText}>
                  {user?.displayName?.[0] || user?.username?.[0] || "U"}
                </Text>
              </View>
            )}
            <View style={styles.plusBadge}>
              {uploading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.plusText}>＋</Text>
              )}
            </View>
          </View>
          <Text style={styles.label} numberOfLines={1}>
            Your Story
          </Text>
        </TouchableOpacity>

        {/* ── Active User Stories ── */}
        {storyGroups.map((group, gIdx) => {
          const author = group.user;
          const hasUnviewed = group.hasUnviewed ?? true;

          return (
            <TouchableOpacity
              key={author?._id || author?.id || gIdx}
              style={styles.storyItem}
              onPress={() => {
                setActiveGroupIdx(gIdx);
                setActiveStoryIdx(0);
              }}
            >
              <View
                style={[
                  styles.storyCircleBorder,
                  hasUnviewed ? styles.unviewedBorder : styles.viewedBorder,
                ]}
              >
                {author?.avatarUrl ? (
                  <Image source={{ uri: author.avatarUrl }} style={styles.storyAvatar} />
                ) : (
                  <View style={styles.storyAvatarFallback}>
                    <Text style={styles.storyAvatarText}>
                      {author?.displayName?.[0] || author?.username?.[0] || "U"}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.label} numberOfLines={1}>
                {author?.displayName || author?.username}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Full-Screen Instagram-Style Story Viewer ── */}
      {currentGroup && currentStory && (
        <Modal
          visible
          animationType="fade"
          onRequestClose={() => setActiveGroupIdx(null)}
        >
          <View style={styles.viewerContainer}>
            {/* Top Progress Segment Bar */}
            <View style={styles.progressContainer}>
              {currentGroup.stories.map((s: any, idx: number) => {
                const isActive = idx === activeStoryIdx;
                const isPast = idx < activeStoryIdx;

                return (
                  <View key={s._id || idx} style={styles.progressSegmentBg}>
                    {isActive ? (
                      <Animated.View
                        style={[
                          styles.progressSegmentFill,
                          {
                            width: progressAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ["0%", "100%"],
                            }),
                          },
                        ]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.progressSegmentFill,
                          { width: isPast ? "100%" : "0%" },
                        ]}
                      />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Header: User Info & Controls */}
            <View style={styles.viewerHeader}>
              <View style={styles.authorBadge}>
                {currentGroup.user?.avatarUrl ? (
                  <Image
                    source={{ uri: currentGroup.user.avatarUrl }}
                    style={styles.headerAvatar}
                  />
                ) : (
                  <View style={styles.headerAvatarFallback}>
                    <Text style={styles.headerAvatarText}>
                      {currentGroup.user?.displayName?.[0] || "U"}
                    </Text>
                  </View>
                )}
                <Text style={styles.headerName} numberOfLines={1}>
                  {currentGroup.user?.displayName || currentGroup.user?.username}
                </Text>
                {currentGroup.user?.isVerified && <VerifiedBadge size={12} />}
                <Text style={styles.headerTime}>
                  • {formatTimeAgo(currentStory.createdAt)}
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                {isMyStory && (
                  <TouchableOpacity
                    style={styles.deleteStoryBtn}
                    onPress={handleDeleteStory}
                  >
                    <Text style={styles.deleteStoryText}>🗑️ Delete</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.closeViewerBtn}
                  onPress={() => setActiveGroupIdx(null)}
                >
                  <Text style={styles.closeViewerText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Main Media Content */}
            <View style={styles.mediaContainer}>
              {currentStory.mediaType === "video" ||
              /\.(mp4|mov|webm)$/i.test(currentStory.mediaUrl) ? (
                <Video
                  source={{ uri: currentStory.mediaUrl }}
                  style={styles.fullMedia}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay
                  isLooping={false}
                  progressUpdateIntervalMillis={100}
                  onPlaybackStatusUpdate={(status: any) => {
                    // Drive progress bar from video playback position
                    if (status.isLoaded && status.durationMillis) {
                      const pct = status.positionMillis / status.durationMillis;
                      progressAnim.setValue(Math.min(pct, 1));
                    }
                    if (status.didJustFinish) handleNextStory();
                  }}
                />
              ) : (
                <Image
                  source={{ uri: currentStory.mediaUrl }}
                  style={styles.fullMedia}
                  resizeMode="cover"
                />
              )}

              {/* Tap left / right navigation touch targets */}
              <TouchableOpacity
                style={styles.tapLeft}
                onPress={handlePrevStory}
                activeOpacity={1}
              />
              <TouchableOpacity
                style={styles.tapRight}
                onPress={handleNextStory}
                activeOpacity={1}
              />
            </View>

            {/* Bottom Footer: Like & View Count */}
            <View style={styles.viewerFooter}>
              {isMyStory && (
                <View style={styles.viewsBadge}>
                  <Text style={styles.viewsText}>
                    👁️ {currentStory.views?.length || 0} views
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.likeBtn,
                  currentStory.likedByMe && styles.likeBtnActive,
                ]}
                onPress={handleToggleLikeStory}
              >
                <Text style={styles.likeIcon}>
                  {currentStory.likedByMe ? "❤️" : "🤍"}
                </Text>
                <Text style={styles.likeCount}>
                  {currentStory.likesCount || 0}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    backgroundColor: "#0f172a",
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 14,
  },
  storyItem: {
    alignItems: "center",
    width: 66,
  },

  /* ── Add Circle ── */
  addCircleBorder: {
    position: "relative",
    width: 58,
    height: 58,
    borderRadius: 29,
    padding: 2,
    borderWidth: 2,
    borderColor: "#6366f1",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  plusBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#6366f1",
    borderWidth: 2,
    borderColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },
  plusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: -1,
  },

  /* ── Story Circles ── */
  storyCircleBorder: {
    width: 58,
    height: 58,
    borderRadius: 29,
    padding: 2.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  unviewedBorder: {
    backgroundColor: "#ec4899", // Instagram pink/purple highlight
  },
  viewedBorder: {
    backgroundColor: "#334155",
  },
  storyAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  storyAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
  },
  storyAvatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  label: {
    color: "#94a3b8",
    fontSize: 11,
    textAlign: "center",
  },

  /* ── Full-Screen Viewer ── */
  viewerContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "space-between",
  },
  progressContainer: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 12,
    paddingTop: 50,
    zIndex: 20,
  },
  progressSegmentBg: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressSegmentFill: {
    height: "100%",
    backgroundColor: "#fff",
  },
  viewerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 20,
  },
  authorBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  headerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  headerAvatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
  },
  headerAvatarText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  headerName: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
  },
  headerTime: {
    color: "#94a3b8",
    fontSize: 11,
  },
  deleteStoryBtn: {
    backgroundColor: "rgba(239,68,68,0.3)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  deleteStoryText: {
    color: "#f87171",
    fontSize: 12,
    fontWeight: "bold",
  },
  closeViewerBtn: {
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  closeViewerText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  /* ── Media ── */
  mediaContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  fullMedia: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
  tapLeft: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: "35%",
    zIndex: 10,
  },
  tapRight: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: "65%",
    zIndex: 10,
  },

  /* ── Footer ── */
  viewerFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 40,
    zIndex: 20,
  },
  viewsBadge: {
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewsText: {
    color: "#cbd5e1",
    fontSize: 12,
  },
  likeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginLeft: "auto",
  },
  likeBtnActive: {
    backgroundColor: "rgba(239,68,68,0.2)",
    borderColor: "#ef4444",
  },
  likeIcon: {
    fontSize: 16,
  },
  likeCount: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
});
