import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar as RNStatusBar,
  Modal,
  Alert,
  Keyboard,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Video, ResizeMode, Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import api from "../../api";
import { useMessageStore } from "../../messageStore";
import { useAuthStore } from "../../authStore";
import VerifiedBadge from "../../components/VerifiedBadge";

const EMOJIS = ["❤️", "😂", "😮", "😢", "👏", "🔥"];

function formatBubbleTime(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function VoiceNotePlayer({ uri, isMine }: { uri: string; isMine: boolean }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(1);

  useEffect(() => {
    return () => {
      sound?.unloadAsync();
    };
  }, [sound]);

  const togglePlay = async () => {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded) {
              setPos(status.positionMillis || 0);
              setDur(status.durationMillis || 1);
              setIsPlaying(status.isPlaying);
              if (status.didJustFinish) {
                setIsPlaying(false);
                setPos(0);
              }
            }
          }
        );
        setSound(newSound);
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Audio play error", err);
    }
  };

  const progress = Math.min(100, Math.max(0, (pos / dur) * 100));

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4, minWidth: 170 }}>
      <TouchableOpacity
        onPress={togglePlay}
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: isMine ? "rgba(255,255,255,0.25)" : "rgba(99,102,241,0.2)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 14 }}>{isPlaying ? "⏸️" : "▶️"}</Text>
      </TouchableOpacity>
      <View style={{ flex: 1, height: 4, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 2, overflow: "hidden" }}>
        <View style={{ width: `${progress}%`, height: "100%", backgroundColor: isMine ? "#fff" : "#6366f1" }} />
      </View>
      <Text style={{ fontSize: 11, color: isMine ? "#e2e8f0" : "#94a3b8" }}>
        {Math.floor(pos / 1000)}s
      </Text>
    </View>
  );
}

function ChatVideoPlayer({ uri }: { uri: string }) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<Video>(null);

  return (
    <View style={styles.chatVideoContainer}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={styles.chatVideo}
        resizeMode={ResizeMode.COVER}
        useNativeControls={playing}
        shouldPlay={playing}
        isLooping
      />
      {!playing && (
        <TouchableOpacity
          style={styles.chatVideoPlayOverlay}
          activeOpacity={0.8}
          onPress={() => setPlaying(true)}
        >
          <Ionicons name="play-circle" size={48} color="rgba(255, 255, 255, 0.9)" />
          <Text style={styles.chatVideoBadge}>Reel 🎬</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    messages,
    messagesLoading,
    loadMessages,
    sendMessage,
    deleteMessage,
    reactToMessage,
  } = useMessageStore();
  const currentUser = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recipient, setRecipient] = useState<any>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Context Menu State
  const [selectedMsg, setSelectedMsg] = useState<any>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [muted, setMuted] = useState(false);

  // Voice Recording State
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  const flatListRef = useRef<FlatList>(null);

  const paddingTop = Math.max(
    insets.top,
    Platform.OS === "android" ? RNStatusBar.currentHeight || 12 : 12
  );
  const paddingBottom = keyboardVisible ? 8 : Math.max(insets.bottom, 17);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 80);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (id) {
      loadMessages(id);
      fetchConversationDetails();
    }
  }, [id]);

  const fetchConversationDetails = async () => {
    try {
      const { data } = await api.get("/messages");
      const conv = (data.conversations || []).find((c: any) => c._id === id);
      if (conv) {
        const other = conv.participants?.find(
          (p: any) => String(p._id || p.id) !== String(currentUser?.id)
        );
        setRecipient(other);
        setMuted(Boolean(conv.muted));
      }
    } catch (err) {
      console.error("Failed to fetch conversation details", err);
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Camera access is needed to take photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      await processImageUpload(result.assets[0].uri);
    }
  };

  const handlePickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Allow photo library access to select photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      await processImageUpload(result.assets[0].uri);
    }
  };

  const processImageUpload = async (uri: string) => {
    setUploading(true);
    try {
      const formData = new FormData();
      const filename = uri.split("/").pop() || "photo.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const fileType = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append("file", { uri, name: filename, type: fileType } as any);

      const { data } = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMediaUrl(data.url);
      setMediaType("image");
    } catch (err) {
      Alert.alert("Upload Failed", "Could not upload image.");
    } finally {
      setUploading(false);
    }
  };

  const handlePickImage = () => {
    Alert.alert(
      "Attach Photo",
      "Choose an option:",
      [
        {
          text: "📷 Take Photo (Camera)",
          onPress: handleTakePhoto,
        },
        {
          text: "🖼️ Choose from Gallery",
          onPress: handlePickFromLibrary,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const handleSend = async () => {
    if ((!text.trim() && !mediaUrl) || !id) return;
    const body = text.trim();
    const url = mediaUrl;
    const type = mediaType;
    const replyId = replyingTo?._id || null;

    setText("");
    setMediaUrl("");
    setMediaType("");
    setReplyingTo(null);
    setSending(true);

    try {
      await sendMessage(id, body, url, type, replyId);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error("Send error", err);
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission Required", "Microphone permission is needed to record voice notes.");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording", err);
      Alert.alert("Error", "Could not start audio recording.");
    }
  };

  const stopRecordingAndSend = async () => {
    if (!recording) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setSending(true);

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      setRecording(null);

      if (uri && id) {
        const formData = new FormData();
        const filename = `voice_${Date.now()}.m4a`;
        formData.append("file", {
          uri,
          name: filename,
          type: "audio/m4a",
        } as any);

        const { data } = await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        await sendMessage(id, "🎤 Voice note", data.url, "audio", replyingTo?._id || null);
        setReplyingTo(null);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (err) {
      console.error("Failed to send voice note", err);
      Alert.alert("Failed", "Could not send voice note.");
    } finally {
      setSending(false);
      setRecordingSeconds(0);
    }
  };

  const cancelRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      } catch (e) {}
    }
    setRecording(null);
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const handleToggleMute = async () => {
    try {
      const newMuted = !muted;
      setMuted(newMuted);
      await api.patch(`/messages/${id}/settings`, { muted: newMuted });
    } catch (err) {
      console.error("Failed to toggle mute", err);
    }
  };

  const handleLongPress = (msg: any) => {
    if (msg.deletedAt) return;
    setSelectedMsg(msg);
    setMenuVisible(true);
  };

  const handleReact = async (emoji: string) => {
    if (!selectedMsg?._id) return;
    setMenuVisible(false);
    await reactToMessage(selectedMsg._id, emoji);
  };

  const handleDeleteMsg = async () => {
    if (!selectedMsg?._id) return;
    setMenuVisible(false);
    Alert.alert("Delete Message", "Are you sure you want to delete this message?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMessage(selectedMsg._id),
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop }]}>
      {/* ── Web/Instagram Style Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.recipientInfo}
          onPress={() => {
            if (recipient?.username) {
              router.push(`/user/${recipient.username}` as any);
            }
          }}
        >
          {recipient?.avatarUrl ? (
            <Image source={{ uri: recipient.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {recipient?.displayName?.[0] || recipient?.username?.[0] || "U"}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={styles.recipientName}>
                {recipient?.displayName || recipient?.username || "Chat"}
              </Text>
              {recipient?.isVerified && <VerifiedBadge size={14} />}
            </View>
            {recipient?.username ? (
              <Text style={styles.username}>@{recipient.username}</Text>
            ) : null}
          </View>
        </TouchableOpacity>

        {/* Header Action Buttons */}
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleToggleMute} style={styles.headerIconBtn}>
            <Text style={styles.headerIcon}>{muted ? "🔕" : "🔔"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (recipient?.username) {
                router.push(`/user/${recipient.username}` as any);
              }
            }}
            style={styles.headerIconBtn}
          >
            <Text style={styles.headerIcon}>ℹ️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Chat Messages ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        {messagesLoading && messages.length === 0 ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator color="#6366f1" size="large" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ padding: 16, gap: 6 }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const myUserId = String(currentUser?._id || currentUser?.id || "");
              const senderUserId = typeof item.sender === "object"
                ? String(item.sender?._id || item.sender?.id || "")
                : String(item.sender || "");
              const isMine = Boolean(myUserId && senderUserId && myUserId === senderUserId);
              const isDeleted = Boolean(item.deletedAt);

              return (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onLongPress={() => handleLongPress(item)}
                  style={[
                    styles.rowContainer,
                    isMine ? styles.myRow : styles.theirRow,
                  ]}
                >
                  {/* Avatar for incoming message */}
                  {!isMine && (
                    <View style={styles.msgAvatarWrapper}>
                      {recipient?.avatarUrl ? (
                        <Image
                          source={{ uri: recipient.avatarUrl }}
                          style={styles.msgAvatar}
                        />
                      ) : (
                        <View style={styles.msgAvatarFallback}>
                          <Text style={styles.msgAvatarText}>
                            {recipient?.displayName?.[0] || recipient?.username?.[0] || "U"}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Message Bubble Box */}
                  <View style={{ maxWidth: "76%" }}>
                    {/* Quoted Reply Preview */}
                    {item.replyTo && !isDeleted && (
                      <View style={styles.quotedBox}>
                        <Text style={styles.quotedSender}>
                          {item.replyTo.sender?.displayName || "Reply"}
                        </Text>
                        <Text style={styles.quotedText} numberOfLines={1}>
                          {item.replyTo.body || "📎 Media attachment"}
                        </Text>
                      </View>
                    )}

                    <View
                      style={[
                        styles.bubble,
                        isMine ? styles.myBubble : styles.theirBubble,
                      ]}
                    >
                      {/* Image, Video, or Audio Attachment */}
                      {item.mediaUrl && !isDeleted && (
                        (item.mediaType === "audio" || (item.body === "🎤 Voice note" && !item.mediaUrl.match(/\.(png|jpg|jpeg|gif|webp)$/i))) ? (
                          <VoiceNotePlayer uri={item.mediaUrl} isMine={isMine} />
                        ) : (item.mediaType === "video" || item.mediaType === "reel" || item.body?.includes("🎬") || item.mediaUrl.match(/\.(mp4|webm|mov|m4v|3gp)(\?.*)?$/i)) ? (
                          <ChatVideoPlayer uri={item.mediaUrl} />
                        ) : (
                          <Image
                            source={{ uri: item.mediaUrl }}
                            style={styles.mediaImage}
                            resizeMode="cover"
                          />
                        )
                      )}

                      {/* Text Body */}
                      {isDeleted ? (
                        <Text style={styles.deletedText}>Message deleted</Text>
                      ) : item.body ? (
                        <Text
                          style={[
                            styles.bubbleText,
                            isMine ? styles.myText : styles.theirText,
                          ]}
                        >
                          {item.body}
                        </Text>
                      ) : null}

                      {/* Emoji Reactions Badge */}
                      {item.reactions && item.reactions.length > 0 && !isDeleted && (
                        <View
                          style={[
                            styles.reactionRow,
                            isMine ? { alignSelf: "flex-end" } : { alignSelf: "flex-start" },
                          ]}
                        >
                          {item.reactions.map((r: any, idx: number) => (
                            <Text key={idx} style={styles.reactionBadge}>
                              {r.emoji}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>

                    {/* Time & Read Receipts */}
                    {!isDeleted && (
                      <View
                        style={[
                          styles.timeRow,
                          isMine ? { justifyContent: "flex-end" } : { justifyContent: "flex-start" },
                        ]}
                      >
                        <Text style={styles.timeText}>
                          {formatBubbleTime(item.createdAt)}
                        </Text>
                        {isMine && (
                          <Text
                            style={[
                              styles.readStatus,
                              item.readAt && { color: "#38bdf8" },
                            ]}
                          >
                            {item.readAt ? "✓✓" : "✓"}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* ── Quoted Reply Preview Bar ── */}
        {replyingTo && (
          <View style={styles.replyBar}>
            <View style={styles.replyIndicator} />
            <View style={{ flex: 1 }}>
              <Text style={styles.replyBarTitle}>
                Replying to {replyingTo.sender?.displayName || replyingTo.sender?.username || "user"}
              </Text>
              <Text style={styles.replyBarText} numberOfLines={1}>
                {replyingTo.body || "📎 Attachment"}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Text style={styles.closeReplyText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Media Upload Preview Bar ── */}
        {(mediaUrl || uploading) && (
          <View style={styles.mediaPreviewBar}>
            {uploading ? (
              <ActivityIndicator color="#6366f1" size="small" />
            ) : (
              <View style={styles.mediaPreviewContainer}>
                <Image source={{ uri: mediaUrl }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeMediaBtn}
                  onPress={() => {
                    setMediaUrl("");
                    setMediaType("");
                  }}
                >
                  <Text style={styles.removeMediaText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── Input Bar ── */}
        <View style={[styles.inputContainer, { paddingBottom }]}>
          {isRecording ? (
            /* Recording Mode Bar */
            <View style={styles.recordingRow}>
              <TouchableOpacity onPress={cancelRecording} style={styles.cancelRecBtn}>
                <Text style={styles.cancelRecText}>✕ Cancel</Text>
              </TouchableOpacity>
              <View style={styles.recordingTimerBadge}>
                <Text style={styles.recordingDot}>🔴</Text>
                <Text style={styles.recordingTimerText}>
                  {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, "0")}
                </Text>
              </View>
              <TouchableOpacity onPress={stopRecordingAndSend} style={styles.sendVoiceBtn}>
                <Text style={styles.sendVoiceText}>Send 🎙️</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Normal Input Bar */
            <>
              {/* Photo Picker Button */}
              <TouchableOpacity
                style={styles.photoBtn}
                onPress={handlePickImage}
                disabled={uploading}
              >
                <Text style={styles.photoIcon}>📷</Text>
              </TouchableOpacity>

              {/* Voice Record Button */}
              <TouchableOpacity
                style={styles.voiceBtn}
                onPress={startRecording}
                disabled={uploading || sending}
              >
                <Text style={styles.voiceIcon}>🎤</Text>
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Message..."
                placeholderTextColor="#64748b"
                value={text}
                onChangeText={setText}
                onFocus={() => {
                  setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                }}
                multiline
              />

              <TouchableOpacity
                style={[styles.sendBtn, (!text.trim() && !mediaUrl) && { opacity: 0.5 }]}
                onPress={handleSend}
                disabled={sending || (!text.trim() && !mediaUrl)}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.sendText}>Send</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* ── Quick Reaction & Action Modal ── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuSheet}>
            {/* Quick Emoji Bar */}
            <Text style={styles.menuSectionTitle}>React</Text>
            <View style={styles.emojiBar}>
              {EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => handleReact(emoji)}
                  style={styles.emojiBtn}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Menu Options */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setReplyingTo(selectedMsg);
                setMenuVisible(false);
              }}
            >
              <Text style={styles.menuItemIcon}>↩️</Text>
              <Text style={styles.menuItemText}>Reply</Text>
            </TouchableOpacity>

            {String(selectedMsg?.sender?._id || selectedMsg?.sender?.id || selectedMsg?.sender) ===
              String(currentUser?._id || currentUser?.id) && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleDeleteMsg}
              >
                <Text style={styles.menuItemIconDanger}>🗑️</Text>
                <Text style={styles.menuItemTextDanger}>Delete Message</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.menuItem, styles.cancelMenuItem]}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  header: {
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
  recipientInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  recipientName: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  username: {
    color: "#64748b",
    fontSize: 11,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerIconBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  headerIcon: {
    fontSize: 16,
  },
  centerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  /* ── Rows & Avatars ── */
  rowContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginVertical: 2,
  },
  myRow: {
    justifyContent: "flex-end",
  },
  theirRow: {
    justifyContent: "flex-start",
  },
  msgAvatarWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
  },
  msgAvatar: {
    width: 28,
    height: 28,
  },
  msgAvatarFallback: {
    width: 28,
    height: 28,
    backgroundColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
  },
  msgAvatarText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },

  /* ── Bubbles ── */
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  myBubble: {
    backgroundColor: "#6366f1", // Vibrant Web brand gradient look
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: "#1e293b",
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myText: {
    color: "#ffffff",
  },
  theirText: {
    color: "#f1f5f9",
  },
  deletedText: {
    color: "#94a3b8",
    fontStyle: "italic",
    fontSize: 13,
  },
  mediaImage: {
    width: 210,
    height: 150,
    borderRadius: 12,
    marginBottom: 6,
  },
  chatVideoContainer: {
    width: 210,
    height: 150,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
    marginBottom: 6,
    position: "relative",
  },
  chatVideo: {
    width: "100%",
    height: "100%",
  },
  chatVideoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  chatVideoBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  /* ── Quoted Reply Box ── */
  quotedBox: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderLeftWidth: 3,
    borderLeftColor: "#38bdf8",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  quotedSender: {
    color: "#38bdf8",
    fontSize: 11,
    fontWeight: "bold",
  },
  quotedText: {
    color: "#cbd5e1",
    fontSize: 12,
  },

  /* ── Reactions ── */
  reactionRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 4,
  },
  reactionBadge: {
    fontSize: 13,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },

  /* ── Timestamp ── */
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
    paddingHorizontal: 4,
  },
  timeText: {
    color: "#64748b",
    fontSize: 10,
  },
  readStatus: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "bold",
  },

  /* ── Reply Bar ── */
  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    gap: 10,
  },
  replyIndicator: {
    width: 3,
    height: 32,
    backgroundColor: "#38bdf8",
    borderRadius: 2,
  },
  replyBarTitle: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "bold",
  },
  replyBarText: {
    color: "#94a3b8",
    fontSize: 12,
  },
  closeReplyText: {
    color: "#94a3b8",
    fontSize: 16,
    padding: 4,
  },

  /* ── Media Preview ── */
  mediaPreviewBar: {
    backgroundColor: "#1e293b",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  mediaPreviewContainer: {
    position: "relative",
    width: 60,
    height: 60,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  removeMediaBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#ef4444",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  removeMediaText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },

  /* ── Input Bar ── */
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingTop: 4,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    backgroundColor: "#0f172a",
  },
  photoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
  },
  photoIcon: {
    fontSize: 16,
  },
  voiceBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
  },
  voiceIcon: {
    fontSize: 16,
  },
  input: {
    flex: 1,
    backgroundColor: "#1e293b",
    color: "#fff",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    fontSize: 15,
    minHeight: 38,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },

  /* ── Modal Options ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    backgroundColor: "#1e293b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  menuSectionTitle: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 10,
  },
  emojiBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 10,
    marginBottom: 16,
  },
  emojiBtn: {
    padding: 6,
  },
  emojiText: {
    fontSize: 24,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  cancelMenuItem: {
    marginTop: 8,
    backgroundColor: "#334155",
    borderRadius: 12,
    justifyContent: "center",
  },
  menuItemIcon: {
    fontSize: 18,
  },
  menuItemIconDanger: {
    fontSize: 18,
  },
  menuItemText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  menuItemTextDanger: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelText: {
    color: "#94a3b8",
    fontSize: 15,
    fontWeight: "bold",
  },
  recordingRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    height: 40,
  },
  cancelRecBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  cancelRecText: {
    color: "#ef4444",
    fontWeight: "bold",
    fontSize: 13,
  },
  recordingTimerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  recordingDot: {
    fontSize: 10,
  },
  recordingTimerText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  sendVoiceBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#6366f1",
  },
  sendVoiceText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
  },
});
