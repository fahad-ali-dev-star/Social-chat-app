import React, { useEffect, useState } from "react";
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
} from "react-native";
import api from "../api";
import { usePostStore } from "../postStore";
import VerifiedBadge from "./VerifiedBadge";

interface Props {
  visible: boolean;
  postId: string | null;
  onClose: () => void;
}

export default function CommentModal({ visible, postId, onClose }: Props) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const updateCommentCount = usePostStore((s) => s.updateCommentCount);

  useEffect(() => {
    if (visible && postId) {
      loadComments();
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

  const handleSubmit = async () => {
    if (!content.trim() || !postId) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/posts/${postId}/comments`, { content: content.trim() });
      setComments((prev) => [...prev, data.comment]);
      setContent("");
      updateCommentCount(postId, 1);
    } catch (err) {
      console.error("Failed to post comment", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Comments</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* List */}
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color="#6366f1" size="large" />
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>No comments yet. Say something!</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
              renderItem={({ item }) => (
                <View style={styles.commentItem}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {item.author?.displayName?.[0] || item.author?.username?.[0] || "U"}
                    </Text>
                  </View>
                  <View style={styles.commentBody}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Text style={styles.authorName}>
                        {item.author?.displayName || item.author?.username}
                      </Text>
                      {item.author?.isVerified && <VerifiedBadge size={14} />}
                    </View>
                    <Text style={styles.commentText}>{item.content}</Text>
                  </View>
                </View>
              )}
            />
          )}

          {/* Input Box */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Add a comment..."
              placeholderTextColor="#64748b"
              value={content}
              onChangeText={setContent}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, !content.trim() && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={submitting || !content.trim()}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.sendText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#1e293b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    minHeight: 400,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    color: "#94a3b8",
    fontSize: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
  },
  commentItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  commentBody: {
    flex: 1,
    backgroundColor: "#0f172a",
    padding: 12,
    borderRadius: 12,
  },
  authorName: {
    color: "#f8fafc",
    fontWeight: "bold",
    fontSize: 13,
    marginBottom: 2,
  },
  commentText: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  input: {
    flex: 1,
    backgroundColor: "#0f172a",
    color: "#fff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 80,
  },
  sendBtn: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});
