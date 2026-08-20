import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api";
import { usePostStore } from "../postStore";
import { useAuthStore } from "../authStore";
import VerifiedBadge from "./VerifiedBadge";

const IG = {
  bg: "#000000",
  text: "#F5F5F5",
  secondary: "#A8A8A8",
  blue: "#0095F6",
  like: "#FF3040",
  border: "#363636",
};

interface Props {
  visible: boolean;
  postId: string | null;
  onClose: () => void;
}

function formatShortTime(iso?: string): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${Math.max(diff, 1)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function parentIdOf(comment: any): string | null {
  if (!comment?.parentComment) return null;
  return String(comment.parentComment?._id || comment.parentComment);
}

function Avatar({ author, size }: { author: any; size: number }) {
  if (author?.avatarUrl) {
    return (
      <Image
        source={{ uri: author.avatarUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#363636",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={{ color: IG.text, fontWeight: "600", fontSize: size * 0.4 }}>
        {(author?.displayName?.[0] || author?.username?.[0] || "U").toUpperCase()}
      </Text>
    </View>
  );
}

function CommentRow({
  item,
  isReply,
  onReply,
  onLike,
}: {
  item: any;
  isReply?: boolean;
  onReply: (c: any) => void;
  onLike: (id: string) => void;
}) {
  const likesCount = item.likesCount || 0;

  return (
    <View style={[styles.commentRow, isReply && styles.replyRow]}>
      <Avatar author={item.author} size={isReply ? 28 : 36} />

        <View style={styles.commentMain}>
        <View style={styles.commentTextBlock}>
          <Text style={styles.commentUsername}>
            {item.author?.username || "user"}
          </Text>
          {item.author?.isVerified ? (
            <View style={styles.badgeInline}>
              <VerifiedBadge size={11} />
            </View>
          ) : null}
          <Text style={styles.commentContent}>
            {item.author?.isVerified ? " " : " "}
            {item.content}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{formatShortTime(item.createdAt)}</Text>
          {likesCount > 0 && (
            <Text style={styles.metaText}>
              {likesCount} {likesCount === 1 ? "like" : "likes"}
            </Text>
          )}
          <TouchableOpacity onPress={() => onReply(item)} hitSlop={8}>
            <Text style={styles.replyLink}>Reply</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.likeBtn}
        onPress={() => onLike(item._id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={item._liked ? "heart" : "heart-outline"}
          size={14}
          color={item._liked ? IG.like : IG.secondary}
        />
      </TouchableOpacity>
    </View>
  );
}

export default function CommentModal({ visible, postId, onClose }: Props) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>(
    {}
  );
  const inputRef = useRef<TextInput>(null);

  const updateCommentCount = usePostStore((s) => s.updateCommentCount);
  const currentUser = useAuthStore((s) => s.user);

  useEffect(() => {
    if (visible && postId) {
      loadComments();
      setReplyTo(null);
      setContent("");
      setExpandedReplies({});
    }
  }, [visible, postId]);

  const loadComments = async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/posts/${postId}/comments`);
      setComments(data.comments || []);
    } catch (err) {
      console.error("Failed to load comments", err);
    } finally {
      setLoading(false);
    }
  };

  const topLevelComments = useMemo(
    () => comments.filter((c) => !parentIdOf(c)),
    [comments]
  );

  const repliesByParent = useMemo(() => {
    const map: Record<string, any[]> = {};
    comments.forEach((c) => {
      const pid = parentIdOf(c);
      if (!pid) return;
      if (!map[pid]) map[pid] = [];
      map[pid].push(c);
    });
    return map;
  }, [comments]);

  const startReply = useCallback((comment: any) => {
    // Instagram replies nest under the top-level parent
    const topParentId = parentIdOf(comment);
    const parent =
      topParentId != null
        ? comments.find((c) => String(c._id) === topParentId) || comment
        : comment;
    setReplyTo(parent);
    const uname = comment.author?.username;
    setContent(uname ? `@${uname} ` : "");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [comments]);

  const cancelReply = () => {
    setReplyTo(null);
    setContent("");
  };

  const handleSubmit = async () => {
    if (!content.trim() || !postId || submitting) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/posts/${postId}/comments`, {
        content: content.trim(),
        parentComment: replyTo?._id || null,
      });
      const newComment = {
        ...data.comment,
        likesCount: data.comment.likesCount ?? 0,
        _liked: data.comment._liked ?? false,
      };
      setComments((prev) => [...prev, newComment]);
      if (replyTo?._id) {
        setExpandedReplies((prev) => ({
          ...prev,
          [String(replyTo._id)]: true,
        }));
      }
      setContent("");
      setReplyTo(null);
      updateCommentCount(postId, 1);
    } catch (err) {
      console.error("Failed to post comment", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentLike = async (commentId: string) => {
    if (!postId) return;
    setComments((prev) =>
      prev.map((c) => {
        if (c._id !== commentId) return c;
        const liked = !c._liked;
        return {
          ...c,
          _liked: liked,
          likesCount: Math.max(0, (c.likesCount || 0) + (liked ? 1 : -1)),
        };
      })
    );
    try {
      const { data } = await api.post(
        `/posts/${postId}/comments/${commentId}/like`
      );
      setComments((prev) =>
        prev.map((c) =>
          c._id === commentId
            ? { ...c, _liked: data.liked, likesCount: data.likesCount }
            : c
        )
      );
    } catch (err) {
      console.error("Failed to like comment", err);
      setComments((prev) =>
        prev.map((c) => {
          if (c._id !== commentId) return c;
          const liked = !c._liked;
          return {
            ...c,
            _liked: liked,
            likesCount: Math.max(0, (c.likesCount || 0) + (liked ? 1 : -1)),
          };
        })
      );
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.dismissArea} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Comments</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={24} color={IG.text} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={IG.blue} size="large" />
            </View>
          ) : topLevelComments.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>No comments yet</Text>
              <Text style={styles.emptySub}>Start the conversation.</Text>
            </View>
          ) : (
            <FlatList
              data={topLevelComments}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const replies = repliesByParent[item._id] || [];
                const isExpanded = !!expandedReplies[item._id];
                return (
                  <View style={styles.thread}>
                    <CommentRow
                      item={item}
                      onReply={startReply}
                      onLike={handleCommentLike}
                    />
                    {replies.length > 0 && (
                      <View style={styles.repliesBlock}>
                        <TouchableOpacity
                          style={styles.viewRepliesBtn}
                          onPress={() => toggleReplies(item._id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.viewRepliesLine} />
                          <Text style={styles.viewRepliesText}>
                            {isExpanded
                              ? "Hide replies"
                              : `View ${replies.length} ${
                                  replies.length === 1 ? "reply" : "replies"
                                }`}
                          </Text>
                        </TouchableOpacity>
                        {isExpanded &&
                          replies.map((r) => (
                            <CommentRow
                              key={r._id}
                              item={r}
                              isReply
                              onReply={startReply}
                              onLike={handleCommentLike}
                            />
                          ))}
                      </View>
                    )}
                  </View>
                );
              }}
            />
          )}

          {replyTo && (
            <View style={styles.replyBar}>
              <Text style={styles.replyBarText} numberOfLines={1}>
                Replying to{" "}
                <Text style={styles.replyBarUser}>
                  @{replyTo.author?.username || "user"}
                </Text>
              </Text>
              <TouchableOpacity onPress={cancelReply} hitSlop={10}>
                <Ionicons name="close" size={18} color={IG.secondary} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputRow}>
            <Avatar author={currentUser} size={32} />
            <View style={styles.inputWrap}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder={
                  replyTo
                    ? `Reply to @${replyTo.author?.username || "user"}...`
                    : "Add a comment..."
                }
                placeholderTextColor={IG.secondary}
                value={content}
                onChangeText={setContent}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting || !content.trim()}
                hitSlop={8}
              >
                {submitting ? (
                  <ActivityIndicator color={IG.blue} size="small" />
                ) : (
                  <Text
                    style={[
                      styles.postBtn,
                      !content.trim() && styles.postBtnDisabled,
                    ]}
                  >
                    Post
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: IG.bg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "88%",
    minHeight: 420,
    paddingBottom: Platform.OS === "ios" ? 20 : 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: IG.border,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#555",
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: IG.border,
  },
  headerTitle: {
    color: IG.text,
    fontSize: 16,
    fontWeight: "700",
  },
  closeBtn: {
    position: "absolute",
    right: 14,
    top: 10,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    minHeight: 220,
  },
  emptyTitle: {
    color: IG.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySub: {
    color: IG.secondary,
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
  },
  thread: {
    marginBottom: 16,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  replyRow: {
    marginTop: 14,
  },
  commentMain: {
    flex: 1,
    paddingRight: 4,
  },
  commentTextBlock: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  badgeInline: {
    marginTop: 1,
  },
  commentUsername: {
    color: IG.text,
    fontWeight: "700",
    fontSize: 13,
  },
  commentContent: {
    color: IG.text,
    fontWeight: "400",
    fontSize: 13,
    lineHeight: 18,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
  metaText: {
    color: IG.secondary,
    fontSize: 12,
    fontWeight: "500",
  },
  replyLink: {
    color: IG.secondary,
    fontSize: 12,
    fontWeight: "600",
  },
  likeBtn: {
    paddingTop: 4,
    paddingLeft: 4,
  },
  repliesBlock: {
    marginTop: 10,
    marginLeft: 48,
  },
  viewRepliesBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  viewRepliesLine: {
    width: 24,
    height: StyleSheet.hairlineWidth,
    backgroundColor: IG.secondary,
  },
  viewRepliesText: {
    color: IG.secondary,
    fontSize: 12,
    fontWeight: "600",
  },
  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#111",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: IG.border,
  },
  replyBarText: {
    color: IG.secondary,
    fontSize: 13,
    flex: 1,
    marginRight: 12,
  },
  replyBarUser: {
    color: IG.text,
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: IG.border,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: IG.border,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 8 : 2,
    minHeight: 40,
    backgroundColor: IG.bg,
  },
  input: {
    flex: 1,
    color: IG.text,
    fontSize: 14,
    maxHeight: 80,
    paddingVertical: 6,
  },
  postBtn: {
    color: IG.blue,
    fontWeight: "700",
    fontSize: 14,
    marginLeft: 8,
  },
  postBtnDisabled: {
    opacity: 0.35,
  },
});
